#!/usr/bin/env python3
"""Offline tests for the seed tooling (seed_lib) — no repo files needed.

Run from the ``python/`` directory::

    python tools/test_seed.py

Exercises validation (happy path + every rejection) and majority-vote aggregation
(winner, tie-omission) against a synthetic catalog. Stdlib only; asserts like the
sibling ``test_mpid.py``.
"""

from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from seed_lib import (  # noqa: E402
    EXPECTED_SCHEMA,
    Contribution,
    aggregate,
    product_id_from_casting_key,
    seed_json,
    validate_payload,
)

CATALOG = {"70-dodge-charger-r-t", "2014-corvette-c7-r"}


def _payload(*rows: dict) -> dict:
    return {
        "schema": EXPECTED_SCHEMA,
        "generatedAt": "2026-07-12T00:00:00.000Z",
        "count": len(rows),
        "identifications": list(rows),
    }


# 1) productId derivation matches the TS helper (verified PR #46 sample).
assert product_id_from_casting_key("41ae5e5b") == 1101946459
assert product_id_from_casting_key("uid:ABCD") is None
assert product_id_from_casting_key("41ae") is None

# 2) A clean payload validates and yields one row.
rows, errors = validate_payload(
    _payload({"castingKey": "41ae5e5b", "productId": 1101946459, "catalogId": "70-dodge-charger-r-t"}),
    CATALOG,
    "clean.json",
)
assert errors == [], errors
assert len(rows) == 1 and rows[0].casting_key == "41ae5e5b"

# 3) Rejections: bad schema, uid: key, uppercase/short key, off-catalog id,
#    productId mismatch, duplicate key, count mismatch, non-object.
bad_schema = validate_payload({"schema": "nope", "identifications": []}, CATALOG, "s.json")[1]
assert any("schema" in e for e in bad_schema), bad_schema

synthetic = validate_payload(
    _payload({"castingKey": "uid:04AABB", "catalogId": "70-dodge-charger-r-t"}), CATALOG, "u.json"
)
assert synthetic[0] == [] and any("castingKey" in e for e in synthetic[1]), synthetic

uppercase = validate_payload(
    _payload({"castingKey": "41AE5E5B", "catalogId": "70-dodge-charger-r-t"}), CATALOG, "up.json"
)
assert uppercase[0] == [], "uppercase hex must be rejected"

offcatalog = validate_payload(
    _payload({"castingKey": "41ae5e5b", "catalogId": "no-such-car"}), CATALOG, "o.json"
)
assert offcatalog[0] == [] and any("catalog" in e for e in offcatalog[1]), offcatalog

pid_mismatch = validate_payload(
    _payload({"castingKey": "41ae5e5b", "productId": 999, "catalogId": "70-dodge-charger-r-t"}),
    CATALOG,
    "p.json",
)
assert pid_mismatch[0] == [] and any("productId" in e for e in pid_mismatch[1]), pid_mismatch

dup = validate_payload(
    _payload(
        {"castingKey": "41ae5e5b", "catalogId": "70-dodge-charger-r-t"},
        {"castingKey": "41ae5e5b", "catalogId": "2014-corvette-c7-r"},
    ),
    CATALOG,
    "d.json",
)
assert len(dup[0]) == 1 and any("duplicate" in e for e in dup[1]), dup

count_bad = validate_payload(
    {"schema": EXPECTED_SCHEMA, "count": 5, "identifications": []}, CATALOG, "c.json"
)
assert any("count" in e for e in count_bad[1]), count_bad

not_obj = validate_payload([1, 2, 3], CATALOG, "arr.json")
assert not_obj[0] == [] and not_obj[1], not_obj

print("validate: happy path + 9 rejection cases OK")

# 4) Aggregation: majority winner across files, tie omitted + reported.
rows = [
    Contribution("41ae5e5b", "70-dodge-charger-r-t", "a.json"),
    Contribution("41ae5e5b", "70-dodge-charger-r-t", "b.json"),
    Contribution("41ae5e5b", "2014-corvette-c7-r", "c.json"),  # loses 2-1
    Contribution("deadbeef", "70-dodge-charger-r-t", "a.json"),
    Contribution("deadbeef", "2014-corvette-c7-r", "b.json"),  # 1-1 tie
]
seed, conflicts = aggregate(rows)
assert seed == {"41ae5e5b": "70-dodge-charger-r-t"}, seed
assert len(conflicts) == 1 and conflicts[0].casting_key == "deadbeef", conflicts
print("aggregate: majority winner + tie-omission OK")

# 5) Empty seed serialises exactly like the committed identity-seed.json.
assert seed_json({}) == "{}\n", repr(seed_json({}))
# Populated seed is sorted and newline-terminated.
assert seed_json({"b": "2", "a": "1"}).startswith('{\n  "a": "1",'), seed_json({"b": "2", "a": "1"})
print("seed_json: formatting OK")

print("\nALL SEED TESTS PASSED")
