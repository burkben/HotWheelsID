#!/usr/bin/env python3
"""Inspect a local Hot Wheels id APK without extracting or executing it."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import zipfile
from pathlib import Path
from typing import Any

PACKAGE_NAME = b"com.mattel.hwid"
PID_PATTERN = re.compile(rb"(?:https?://(?:www\.)?)?pid\.mattel/([A-Za-z0-9_-]{8,})")
CONTENT_MARKERS = (
    b"AssetBundles",
    b"RemoteAssetBundleProvider",
    b"LoadContentCatalog",
    b"Android/obb",
)
MAPPING_MARKERS = (
    b"toyNumber",
    b"carproductids",
    b"GetCarProductID",
    b"carProductID",
)


def _hashes(path: Path) -> dict[str, str]:
    digesters = {"sha1": hashlib.sha1(), "sha256": hashlib.sha256()}
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            for digester in digesters.values():
                digester.update(chunk)
    return {name: digester.hexdigest() for name, digester in digesters.items()}


def _product_id(value: Any) -> int | None:
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        product_id = value
    elif isinstance(value, str) and value.isdecimal():
        product_id = int(value)
    else:
        return None
    return product_id if 0 <= product_id <= 0xFFFFFFFF else None


def _walk_json(value: Any, source: str, catalog_by_toy: dict[str, list[dict[str, Any]]]):
    mappings = []
    if isinstance(value, dict):
        lowered = {str(key).lower(): item for key, item in value.items()}
        product_id = _product_id(lowered.get("productid", lowered.get("product_id")))
        toy_number = lowered.get("toynumber", lowered.get("toy_number"))
        if product_id is not None and isinstance(toy_number, str):
            cars = catalog_by_toy.get(toy_number.upper(), [])
            if len(cars) == 1:
                car = cars[0]
                mappings.append(
                    {
                        "productId": product_id,
                        "castingKey": product_id.to_bytes(4, "big", signed=False).hex(),
                        "catalogId": car["id"],
                        "toyNumber": car["toyNumber"],
                        "source": source,
                        "confidence": "direct-structured-record",
                    }
                )
        for item in value.values():
            mappings.extend(_walk_json(item, source, catalog_by_toy))
    elif isinstance(value, list):
        for item in value:
            mappings.extend(_walk_json(item, source, catalog_by_toy))
    return mappings


def inspect_apk(apk_path: Path, catalog_path: Path) -> dict[str, Any]:
    catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
    catalog_by_toy: dict[str, list[dict[str, Any]]] = {}
    for car in catalog:
        toy_number = car.get("toyNumber")
        if isinstance(toy_number, str) and toy_number:
            catalog_by_toy.setdefault(toy_number.upper(), []).append(car)
    toy_needles = {toy.encode("ascii"): toy for toy in catalog_by_toy}

    package_paths = []
    content_hints: dict[str, set[str]] = {}
    mapping_markers: dict[str, set[str]] = {}
    catalog_markers: list[dict[str, str]] = []
    pid_url_count = 0
    mappings = []

    with zipfile.ZipFile(apk_path) as apk:
        entries = sorted(apk.infolist(), key=lambda info: info.filename)
        for info in entries:
            data = apk.read(info)
            if PACKAGE_NAME in data or PACKAGE_NAME.decode().encode("utf-16le") in data:
                package_paths.append(info.filename)
            for marker in CONTENT_MARKERS:
                if marker in data:
                    content_hints.setdefault(marker.decode(), set()).add(info.filename)
            for marker in MAPPING_MARKERS:
                if marker in data:
                    mapping_markers.setdefault(marker.decode(), set()).add(info.filename)
            for needle, toy_number in toy_needles.items():
                if needle in data:
                    catalog_markers.append(
                        {
                            "toyNumber": toy_number,
                            "catalogIds": [car["id"] for car in catalog_by_toy[toy_number]],
                            "source": info.filename,
                        }
                    )
            pid_url_count += len(PID_PATTERN.findall(data))
            if info.filename.lower().endswith(".json"):
                try:
                    parsed = json.loads(data.decode("utf-8"))
                except (UnicodeDecodeError, json.JSONDecodeError):
                    continue
                mappings.extend(_walk_json(parsed, info.filename, catalog_by_toy))

    candidate_mappings = {
        (item["productId"], item["catalogId"], item["source"]): item for item in mappings
    }.values()
    by_product: dict[int, list[dict[str, Any]]] = {}
    for item in candidate_mappings:
        by_product.setdefault(item["productId"], []).append(item)

    verified_mappings = []
    mapping_conflicts = []
    for product_id, items in sorted(by_product.items()):
        catalog_ids = {item["catalogId"] for item in items}
        if len(catalog_ids) == 1:
            verified_mappings.extend(items)
            continue
        mapping_conflicts.append(
            {
                "productId": product_id,
                "castingKey": product_id.to_bytes(4, "big").hex(),
                "candidates": sorted(
                    [
                        {
                            "catalogId": catalog_id,
                            "toyNumbers": sorted(
                                {
                                    item["toyNumber"]
                                    for item in items
                                    if item["catalogId"] == catalog_id
                                }
                            ),
                            "sources": sorted(
                                {
                                    item["source"]
                                    for item in items
                                    if item["catalogId"] == catalog_id
                                }
                            ),
                        }
                        for catalog_id in catalog_ids
                    ],
                    key=lambda item: item["catalogId"],
                ),
            }
        )
    return {
        "apk": {
            "filename": apk_path.name,
            "size": apk_path.stat().st_size,
            **_hashes(apk_path),
            "zipEntries": len(entries),
            "packageName": "com.mattel.hwid" if package_paths else None,
            "packageEvidence": sorted(set(package_paths)),
        },
        "inspection": {
            "pidUrlCount": pid_url_count,
            "contentHints": {
                marker: sorted(paths) for marker, paths in sorted(content_hints.items())
            },
            "mappingCodeMarkers": {
                marker: sorted(paths) for marker, paths in sorted(mapping_markers.items())
            },
            "catalogToyNumberMarkers": sorted(
                catalog_markers,
                key=lambda item: (item["toyNumber"], item["source"]),
            ),
        },
        "mappingConflicts": mapping_conflicts,
        "verifiedMappings": sorted(
            verified_mappings,
            key=lambda item: (item["productId"], item["catalogId"], item["source"]),
        ),
        "conclusion": (
            "direct productId-to-catalog records found"
            if verified_mappings
            else "no independently verifiable productId-to-catalog mapping found"
        ),
    }


def main() -> None:
    repo_root = Path(__file__).resolve().parents[2]
    parser = argparse.ArgumentParser(
        description="Read-only interoperability inspection of a local com.mattel.hwid APK"
    )
    parser.add_argument("apk", type=Path)
    parser.add_argument(
        "--catalog",
        type=Path,
        default=repo_root / "apps/mobile/src/catalog/catalog.json",
    )
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    report = inspect_apk(args.apk, args.catalog)
    if args.json:
        print(json.dumps(report, indent=2, sort_keys=True))
        return

    apk = report["apk"]
    inspection = report["inspection"]
    print(f"{apk['packageName']} {apk['size']} bytes")
    print(f"sha1={apk['sha1']}")
    print(f"sha256={apk['sha256']}")
    print(f"zip entries={apk['zipEntries']}")
    print(f"pid.mattel URLs={inspection['pidUrlCount']}")
    print(f"catalog toy-number markers={len(inspection['catalogToyNumberMarkers'])}")
    print(f"mapping conflicts={len(report['mappingConflicts'])}")
    print(f"verified mappings={len(report['verifiedMappings'])}")
    print(report["conclusion"])


if __name__ == "__main__":
    main()
