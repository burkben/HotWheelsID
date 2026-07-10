import base64
import unittest
from datetime import datetime, timezone

from analyze_mattel_ids import analyze_capture, decode_mattel_id, timestamp_candidates


REAL_ID = "AQBBrl5bAAAGAF0TKZcEKn6i8WKA"
REAL_UID = "2A:7E:A2:F1:62:80"


class DecodeMattelIdTests(unittest.TestCase):
    def test_decodes_real_capture_without_claiming_a_date(self):
        report = analyze_capture(
            REAL_ID,
            expected_uid=REAL_UID,
            expected_serial="1101946459",
        )

        self.assertEqual(report["decoded"]["misc"], "000006005d13299704")
        self.assertTrue(report["integrity"]["uidMatches"])
        self.assertTrue(report["integrity"]["serialMatches"])
        self.assertEqual(
            [
                candidate
                for candidate in report["timestampCandidates"]
                if candidate["bytes"] == "5d132997" and candidate["byteOrder"] == "big"
            ][0]["utc"],
            "2019-06-26T08:15:19Z",
        )
        self.assertIn("no manufacture timestamp is verified", report["conclusion"])

    def test_reports_integrity_mismatches(self):
        report = analyze_capture(
            REAL_ID,
            expected_uid="11:22:33:44:55:66",
            expected_serial="1",
        )
        self.assertFalse(report["integrity"]["uidMatches"])
        self.assertFalse(report["integrity"]["serialMatches"])

    def test_rejects_short_and_malformed_ids(self):
        with self.assertRaisesRegex(ValueError, "too short"):
            decode_mattel_id("AQBB")
        with self.assertRaisesRegex(ValueError, "base64url"):
            decode_mattel_id("not valid!")

    def test_short_valid_id_has_no_misc_candidates(self):
        report = analyze_capture("AQBBrl5b")
        self.assertNotIn("misc", report["decoded"])
        self.assertEqual(report["timestampCandidates"], [])


class TimestampCandidateTests(unittest.TestCase):
    def test_reports_offsets_endianness_and_confidence(self):
        candidates = timestamp_candidates(
            "000006005d13299704",
            since=datetime(2019, 1, 1, tzinfo=timezone.utc),
            until=datetime(2020, 1, 1, tzinfo=timezone.utc),
        )
        candidate = next(item for item in candidates if item["bytes"] == "5d132997")
        self.assertEqual(candidate["miscOffset"], 4)
        self.assertEqual(candidate["absoluteOffset"], 10)
        self.assertEqual(candidate["byteOrder"], "big")
        self.assertEqual(candidate["confidence"], "unverified")

    def test_considers_both_byte_orders(self):
        seconds = 1_577_065_422
        little = seconds.to_bytes(4, "little")
        misc = base64.b16encode(little + b"\x00" * 5).decode().lower()
        candidates = timestamp_candidates(
            misc,
            since=datetime(2019, 1, 1, tzinfo=timezone.utc),
            until=datetime(2021, 1, 1, tzinfo=timezone.utc),
        )
        self.assertTrue(
            any(
                item["bytes"] == little.hex() and item["byteOrder"] == "little"
                for item in candidates
            )
        )

    def test_rejects_invalid_misc_hex(self):
        with self.assertRaisesRegex(ValueError, "hexadecimal"):
            timestamp_candidates("not-hex")


if __name__ == "__main__":
    unittest.main()
