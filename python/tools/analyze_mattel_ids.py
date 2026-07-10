#!/usr/bin/env python3
"""Report unverified timestamp candidates from Mattel ID misc bytes."""

from __future__ import annotations

import argparse
import base64
import binascii
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

MODEL_ID_OFFSET = 2
MODEL_ID_LENGTH = 4
MISC_OFFSET = 6
MISC_LENGTH = 9
TAG_UID_OFFSET = 15
TAG_UID_LENGTH = 6
MIN_DECODABLE_LENGTH = MODEL_ID_OFFSET + MODEL_ID_LENGTH
DEFAULT_SINCE = datetime(2010, 1, 1, tzinfo=timezone.utc)
DEFAULT_UNTIL = datetime(2035, 1, 1, tzinfo=timezone.utc)


def _decode_base64url(value: str) -> bytes:
    if not value or any(char.isspace() for char in value):
        raise ValueError("Mattel ID must be a non-empty base64url string")
    padded = value + "=" * (-len(value) % 4)
    try:
        return base64.b64decode(padded, altchars=b"-_", validate=True)
    except (binascii.Error, ValueError) as error:
        raise ValueError("Mattel ID is not valid base64url") from error


def _format_uid(value: bytes) -> str:
    return ":".join(f"{byte:02X}" for byte in value)


def _normalize_uid(value: str) -> str:
    return "".join(char for char in value if char.isalnum()).upper()


def decode_mattel_id(value: str) -> dict[str, Any]:
    data = _decode_base64url(value)
    if len(data) < MIN_DECODABLE_LENGTH:
        raise ValueError("Mattel ID is too short to contain a product ID")

    model = data[MODEL_ID_OFFSET : MODEL_ID_OFFSET + MODEL_ID_LENGTH]
    decoded: dict[str, Any] = {
        "byteLength": len(data),
        "version": data[:MODEL_ID_OFFSET].hex(),
        "modelId": model.hex(),
        "productId": int.from_bytes(model, "big"),
    }
    if len(data) >= MISC_OFFSET + MISC_LENGTH:
        decoded["misc"] = data[MISC_OFFSET : MISC_OFFSET + MISC_LENGTH].hex()
    if len(data) >= TAG_UID_OFFSET + TAG_UID_LENGTH:
        decoded["tagUid"] = _format_uid(data[TAG_UID_OFFSET : TAG_UID_OFFSET + TAG_UID_LENGTH])
    return decoded


def timestamp_candidates(
    misc_hex: str,
    *,
    since: datetime = DEFAULT_SINCE,
    until: datetime = DEFAULT_UNTIL,
) -> list[dict[str, Any]]:
    try:
        misc = bytes.fromhex(misc_hex)
    except ValueError as error:
        raise ValueError("misc must be even-length hexadecimal") from error

    candidates: list[dict[str, Any]] = []
    for relative_offset in range(max(len(misc) - 3, 0)):
        window = misc[relative_offset : relative_offset + 4]
        for byte_order in ("big", "little"):
            seconds = int.from_bytes(window, byte_order)
            try:
                decoded = datetime.fromtimestamp(seconds, timezone.utc)
            except (OverflowError, OSError, ValueError):
                continue
            if since <= decoded < until:
                candidates.append(
                    {
                        "miscOffset": relative_offset,
                        "absoluteOffset": MISC_OFFSET + relative_offset,
                        "bytes": window.hex(),
                        "byteOrder": byte_order,
                        "unixSeconds": seconds,
                        "utc": decoded.isoformat().replace("+00:00", "Z"),
                        "confidence": "unverified",
                    }
                )
    return candidates


def analyze_capture(
    mattel_id: str,
    *,
    expected_uid: str | None = None,
    expected_serial: str | int | None = None,
    since: datetime = DEFAULT_SINCE,
    until: datetime = DEFAULT_UNTIL,
) -> dict[str, Any]:
    decoded = decode_mattel_id(mattel_id)
    uid_match = None
    if expected_uid and decoded.get("tagUid"):
        uid_match = _normalize_uid(expected_uid) == _normalize_uid(decoded["tagUid"])

    serial_match = None
    if expected_serial is not None and str(expected_serial).strip():
        try:
            serial_match = decoded["productId"] == int(str(expected_serial).strip())
        except ValueError:
            serial_match = False

    return {
        "mattelId": mattel_id,
        "decoded": decoded,
        "integrity": {
            "uidMatches": uid_match,
            "serialMatches": serial_match,
        },
        "timestampCandidates": timestamp_candidates(
            decoded.get("misc", ""),
            since=since,
            until=until,
        ),
        "conclusion": "diagnostic-only; no manufacture timestamp is verified",
    }


def _load_captures(path: Path) -> list[dict[str, Any]]:
    raw = json.loads(path.read_text(encoding="utf-8"))
    captures = raw.get("captures") if isinstance(raw, dict) else raw
    if not isinstance(captures, list):
        raise ValueError("input JSON must be an array or an object with a captures array")

    normalized: list[dict[str, Any]] = []
    for index, capture in enumerate(captures):
        if not isinstance(capture, dict) or not isinstance(capture.get("mattelId"), str):
            raise ValueError(f"capture {index} must contain a string mattelId")
        normalized.append(capture)
    return normalized


def _parse_utc_date(value: str) -> datetime:
    try:
        return datetime.fromisoformat(value).replace(tzinfo=timezone.utc)
    except ValueError as error:
        raise argparse.ArgumentTypeError("expected an ISO date such as 2010-01-01") from error


def main() -> None:
    parser = argparse.ArgumentParser(
        description=(
            "Analyze Mattel ID misc bytes for timestamp candidates. "
            "Candidates are hypotheses, not manufacture dates."
        )
    )
    parser.add_argument("mattel_ids", nargs="*", help="base64url Mattel IDs")
    parser.add_argument("--input", type=Path, help="local JSON capture file")
    parser.add_argument("--uid", help="expected UID for a single positional ID")
    parser.add_argument("--serial", help="expected portal serial for a single positional ID")
    parser.add_argument("--since", type=_parse_utc_date, default=DEFAULT_SINCE)
    parser.add_argument("--until", type=_parse_utc_date, default=DEFAULT_UNTIL)
    parser.add_argument("--json", action="store_true", help="emit machine-readable JSON")
    args = parser.parse_args()

    captures: list[dict[str, Any]] = []
    if args.input:
        captures.extend(_load_captures(args.input))
    captures.extend({"mattelId": value} for value in args.mattel_ids)
    if not captures:
        parser.error("provide at least one Mattel ID or --input capture file")
    if (args.uid or args.serial) and len(captures) != 1:
        parser.error("--uid and --serial apply only when analyzing one capture")

    if len(captures) == 1:
        captures[0].setdefault("uid", args.uid)
        captures[0].setdefault("serial", args.serial)

    reports = [
        analyze_capture(
            capture["mattelId"],
            expected_uid=capture.get("uid"),
            expected_serial=capture.get("serial"),
            since=args.since,
            until=args.until,
        )
        for capture in captures
    ]
    if args.json:
        print(json.dumps({"status": "unverified", "captures": reports}, indent=2, sort_keys=True))
        return

    print("UNVERIFIED timestamp diagnostics - do not present candidates as manufacture dates")
    for report in reports:
        decoded = report["decoded"]
        print(f"\nproductId={decoded['productId']} modelId={decoded['modelId']}")
        print(
            "integrity "
            f"uid={report['integrity']['uidMatches']} "
            f"serial={report['integrity']['serialMatches']}"
        )
        if not report["timestampCandidates"]:
            print("timestamp candidates: none in requested date window")
        for candidate in report["timestampCandidates"]:
            print(
                "candidate "
                f"offset={candidate['absoluteOffset']} "
                f"bytes={candidate['bytes']} "
                f"endian={candidate['byteOrder']} "
                f"utc={candidate['utc']}"
            )


if __name__ == "__main__":
    main()
