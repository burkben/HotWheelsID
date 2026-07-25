#!/usr/bin/env python3
"""Regenerate the bundled car-identity seed from community contributions (ADR-0014).

Aggregates every valid ``community/contributions/*.json`` payload into
``apps/mobile/src/catalog/identity-seed.json`` by **majority vote per casting**
(ties are omitted, not guessed — see :func:`seed_lib.aggregate`). The app bundles
that file so a scanned casting auto-names with zero taps.

Usage (from the ``python/`` directory)::

    python tools/build_seed.py             # rewrite identity-seed.json
    python tools/build_seed.py --check     # fail if the committed seed is stale
    python tools/build_seed.py --out -     # print the seed to stdout

``--check`` runs in CI so a pull request that changes contributions must also
commit the regenerated seed (keeps the repo the single source of truth).

Stdlib only; no third-party deps.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from seed_lib import SEED_PATH, aggregate, seed_json, validate_dir


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description="Build identity-seed.json from contributions.")
    ap.add_argument("--out", default=str(SEED_PATH), help="output path, or - for stdout")
    ap.add_argument(
        "--check",
        action="store_true",
        help="don't write; exit non-zero if the committed seed differs",
    )
    args = ap.parse_args(argv)

    rows, errors = validate_dir()
    if errors:
        print(
            f"✗ refusing to build: {len(errors)} invalid contribution(s). "
            f"Run validate_seed_contributions.py for details.",
            file=sys.stderr,
        )
        return 1

    seed, conflicts = aggregate(rows)
    for c in conflicts:
        print(
            f"⚠ casting {c.casting_key}: tie {c.tally} — omitted pending review",
            file=sys.stderr,
        )
    payload = seed_json(seed)

    if args.check:
        current = Path(SEED_PATH).read_text(encoding="utf-8") if Path(SEED_PATH).exists() else ""
        if current != payload:
            print(
                "✗ identity-seed.json is out of date. Run "
                "`python tools/build_seed.py` and commit the result.",
                file=sys.stderr,
            )
            return 1
        print(f"✓ identity-seed.json is up to date ({len(seed)} casting(s))")
        return 0

    if args.out == "-":
        sys.stdout.write(payload)
    else:
        out = Path(args.out)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(payload, encoding="utf-8")
        print(f"Wrote {len(seed)} casting(s) → {out}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
