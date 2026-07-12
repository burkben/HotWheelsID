#!/usr/bin/env python3
"""Validate crowd-sourced car-identity contributions (ADR-0014).

Checks every ``community/contributions/*.json`` payload against the shared rules
in :mod:`seed_lib` — schema tag, 8-hex casting keys (no synthetic ``uid:`` keys),
catalog membership, and productId↔castingKey consistency. Prints every problem
and exits non-zero if any file is malformed, so a pull request that adds bad data
fails CI before it can be merged.

Usage (from the ``python/`` directory)::

    python tools/validate_seed_contributions.py

Stdlib only; no third-party deps.
"""

from __future__ import annotations

import sys

from seed_lib import CONTRIB_DIR, aggregate, iter_contribution_files, validate_dir


def main() -> int:
    files = iter_contribution_files()
    rows, errors = validate_dir()

    if errors:
        print(f"✗ {len(errors)} problem(s) in community/contributions:", file=sys.stderr)
        for err in errors:
            print(f"  - {err}", file=sys.stderr)
        return 1

    # A clean set still surfaces disagreements (they're omitted from the seed, not
    # an error) so reviewers can see what needs a tie-break.
    _seed, conflicts = aggregate(rows)
    for c in conflicts:
        print(
            f"⚠ casting {c.casting_key}: tie {c.tally} — omitted from seed pending review",
            file=sys.stderr,
        )

    print(
        f"✓ {len(files)} contribution file(s), {len(rows)} valid identification(s), "
        f"{len(conflicts)} unresolved tie(s) "
        f"[{CONTRIB_DIR.relative_to(CONTRIB_DIR.parents[1])}]"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
