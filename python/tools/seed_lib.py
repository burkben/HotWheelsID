#!/usr/bin/env python3
"""Shared helpers for the crowd-sourced car-identity **seed** (ADR-0014).

The seed is managed *as a repo*, not a hosted service (see the ADR-0014 addendum):

  1. A user taps **Settings > Community > Share** in the app, which emits a JSON
     ``IdentityExportPayload`` (schema ``redlineid.identity-seed/1``).
  2. They add that payload as a file under ``community/contributions/`` and open
     a pull request.
  3. CI runs :mod:`validate_seed_contributions` to reject malformed / off-catalog
     rows, and :mod:`build_seed` ``--check`` to prove the committed seed is in sync.
  4. A maintainer reviews the PR (the moderation gate) and merges.
  5. :mod:`build_seed` regenerates ``apps/mobile/src/catalog/identity-seed.json``
     by **majority vote per casting**; it ships in the next app build.

This module is the single source of truth for the contribution schema, the
validation rules, and the aggregation logic, so the validator, the builder, and
the tests all agree. Stdlib only (matches the other ``python/tools`` scripts) so
it runs anywhere Python 3.9+ is present without touching ``requirements.txt``.
"""

from __future__ import annotations

import json
import re
from collections import Counter
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

# python/tools/seed_lib.py -> repo root is two levels up.
REPO_ROOT = Path(__file__).resolve().parents[2]
CATALOG_PATH = REPO_ROOT / "apps" / "mobile" / "src" / "catalog" / "catalog.json"
SEED_PATH = REPO_ROOT / "apps" / "mobile" / "src" / "catalog" / "identity-seed.json"
CONTRIB_DIR = REPO_ROOT / "community" / "contributions"

# Must match IDENTITY_EXPORT_SCHEMA in apps/mobile/src/catalog/identityExport.ts.
EXPECTED_SCHEMA = "redlineid.identity-seed/1"

# A shareable casting key is the 4 Mattel model-id bytes as lowercase hex.
# Synthetic device-local keys (``uid:...``) and anything else are rejected.
CASTING_KEY_RE = re.compile(r"^[0-9a-f]{8}$")


def load_catalog_ids(catalog_path: Path = CATALOG_PATH) -> set[str]:
    """The set of valid catalog car ids the seed is allowed to point at."""
    cars = json.loads(catalog_path.read_text(encoding="utf-8"))
    return {c["id"] for c in cars if isinstance(c, dict) and "id" in c}


def product_id_from_casting_key(casting_key: str) -> int | None:
    """Big-endian uint32 productId for an 8-hex castingKey, else ``None``.

    Mirrors ``productIdFromCastingKey`` in ``identityExport.ts``.
    """
    if not CASTING_KEY_RE.match(casting_key):
        return None
    return int(casting_key, 16)


@dataclass
class Contribution:
    """One validated ``castingKey -> catalogId`` fact from a contribution file."""

    casting_key: str
    catalog_id: str
    source: str  # contribution file name, for vote attribution / diagnostics


def iter_contribution_files(contrib_dir: Path = CONTRIB_DIR) -> list[Path]:
    """All contribution payloads, sorted for deterministic aggregation."""
    if not contrib_dir.is_dir():
        return []
    return sorted(p for p in contrib_dir.glob("*.json") if p.is_file())


def validate_payload(
    payload: object,
    catalog_ids: set[str],
    source: str,
) -> tuple[list[Contribution], list[str]]:
    """Validate one parsed contribution payload.

    Returns ``(rows, errors)``. ``rows`` are the accepted facts; ``errors`` is a
    list of human-readable problems (empty means the file is clean). A file with
    any error is rejected wholesale by the CLI so a PR can't merge partial junk.
    """
    errors: list[str] = []

    if not isinstance(payload, dict):
        return [], [f"{source}: top-level value must be a JSON object"]

    schema = payload.get("schema")
    if schema != EXPECTED_SCHEMA:
        errors.append(
            f"{source}: schema must be {EXPECTED_SCHEMA!r}, got {schema!r}"
        )

    ids = payload.get("identifications")
    if not isinstance(ids, list):
        errors.append(f"{source}: 'identifications' must be an array")
        return [], errors

    declared = payload.get("count")
    if isinstance(declared, int) and declared != len(ids):
        errors.append(
            f"{source}: count {declared} != {len(ids)} identifications"
        )

    rows: list[Contribution] = []
    seen: set[str] = set()
    for i, row in enumerate(ids):
        where = f"{source}[{i}]"
        if not isinstance(row, dict):
            errors.append(f"{where}: entry must be an object")
            continue

        key = row.get("castingKey")
        cat = row.get("catalogId")

        if not isinstance(key, str) or not CASTING_KEY_RE.match(key):
            errors.append(
                f"{where}: castingKey must be 8 lowercase hex chars "
                f"(no synthetic 'uid:' keys), got {key!r}"
            )
            continue
        if key in seen:
            errors.append(f"{where}: duplicate castingKey {key!r} in this file")
            continue
        seen.add(key)

        if not isinstance(cat, str) or cat not in catalog_ids:
            errors.append(
                f"{where}: catalogId {cat!r} is not in the bundled catalog"
            )
            continue

        pid = row.get("productId")
        if pid is not None:
            expected = product_id_from_casting_key(key)
            if pid != expected:
                errors.append(
                    f"{where}: productId {pid} != {expected} derived from "
                    f"castingKey {key!r}"
                )
                continue

        rows.append(Contribution(casting_key=key, catalog_id=cat, source=source))

    return rows, errors


def validate_dir(
    contrib_dir: Path = CONTRIB_DIR,
    catalog_path: Path = CATALOG_PATH,
) -> tuple[list[Contribution], list[str]]:
    """Validate every contribution file in a directory. ``(rows, errors)``."""
    catalog_ids = load_catalog_ids(catalog_path)
    all_rows: list[Contribution] = []
    all_errors: list[str] = []
    for path in iter_contribution_files(contrib_dir):
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            all_errors.append(f"{path.name}: invalid JSON — {exc}")
            continue
        rows, errors = validate_payload(payload, catalog_ids, path.name)
        all_rows.extend(rows)
        all_errors.extend(errors)
    return all_rows, all_errors


@dataclass
class Conflict:
    """A casting the community disagrees on — omitted from the seed pending review."""

    casting_key: str
    tally: dict[str, int]


def aggregate(rows: Iterable[Contribution]) -> tuple[dict[str, str], list[Conflict]]:
    """Fold validated rows into a seed by **majority vote per castingKey**.

    One vote per contribution file. The catalogId with the most votes wins. A tie
    for first place is a genuine disagreement, so that casting is **omitted** and
    reported as a :class:`Conflict` rather than guessed — the app already lets the
    user pick manually, and a wrong seed row could mislabel a casting.

    Returns ``(seed, conflicts)`` with ``seed`` sorted by castingKey.
    """
    votes: dict[str, Counter] = {}
    for row in rows:
        votes.setdefault(row.casting_key, Counter())[row.catalog_id] += 1

    seed: dict[str, str] = {}
    conflicts: list[Conflict] = []
    for key in sorted(votes):
        tally = votes[key]
        ranked = tally.most_common()
        top_id, top_n = ranked[0]
        tied = len(ranked) > 1 and ranked[1][1] == top_n
        if tied:
            conflicts.append(Conflict(casting_key=key, tally=dict(tally)))
        else:
            seed[key] = top_id
    return seed, conflicts


def seed_json(seed: dict[str, str]) -> str:
    """Serialise a seed exactly as the committed ``identity-seed.json`` (sorted, LF)."""
    return json.dumps(seed, indent=2, ensure_ascii=False, sort_keys=True) + "\n"
