import json
import tempfile
import unittest
import zipfile
from pathlib import Path

from inspect_hwid_apk import inspect_apk


class InspectHwidApkTests(unittest.TestCase):
    def _fixture(self, payload):
        temp = tempfile.TemporaryDirectory()
        root = Path(temp.name)
        catalog = root / "catalog.json"
        catalog.write_text(
            json.dumps(
                [
                    {
                        "id": "car-a",
                        "name": "Car A",
                        "toyNumber": "FXB03",
                    }
                ]
            ),
            encoding="utf-8",
        )
        apk = root / "fixture.apk"
        with zipfile.ZipFile(apk, "w") as archive:
            archive.writestr("AndroidManifest.xml", b"com.mattel.hwid")
            archive.writestr("assets/metadata.txt", b"AssetBundles toyNumber carproductids")
            archive.writestr("assets/cars.json", json.dumps(payload))
        return temp, apk, catalog

    def test_records_only_direct_structured_mapping(self):
        temp, apk, catalog = self._fixture(
            {
                "productId": 0x41AE5E5B,
                "toyNumber": "FXB03",
                "uid": "AA:BB:CC:DD:EE:FF",
            }
        )
        self.addCleanup(temp.cleanup)

        report = inspect_apk(apk, catalog)

        self.assertEqual(
            report["verifiedMappings"],
            [
                {
                    "productId": 0x41AE5E5B,
                    "castingKey": "41ae5e5b",
                    "catalogId": "car-a",
                    "toyNumber": "FXB03",
                    "source": "assets/cars.json",
                    "confidence": "direct-structured-record",
                }
            ],
        )
        self.assertNotIn("uid", json.dumps(report).lower())

    def test_reports_negative_result_when_markers_are_not_a_mapping(self):
        temp, apk, catalog = self._fixture({"name": "Car A"})
        self.addCleanup(temp.cleanup)

        report = inspect_apk(apk, catalog)

        self.assertEqual(report["verifiedMappings"], [])
        self.assertIn("no independently verifiable", report["conclusion"])
        self.assertIn("AssetBundles", report["inspection"]["contentHints"])

    def test_accepts_decimal_string_product_id(self):
        temp, apk, catalog = self._fixture(
            {"productId": str(0x41AE5E5B), "toyNumber": "FXB03"}
        )
        self.addCleanup(temp.cleanup)

        report = inspect_apk(apk, catalog)

        self.assertEqual(report["verifiedMappings"][0]["productId"], 0x41AE5E5B)

    def test_does_not_choose_between_duplicate_toy_numbers(self):
        temp, apk, catalog = self._fixture(
            {"productId": 0x41AE5E5B, "toyNumber": "FXB03"}
        )
        self.addCleanup(temp.cleanup)
        catalog.write_text(
            json.dumps(
                [
                    {"id": "car-a", "name": "Car A", "toyNumber": "FXB03"},
                    {"id": "car-b", "name": "Car B", "toyNumber": "FXB03"},
                ]
            ),
            encoding="utf-8",
        )

        report = inspect_apk(apk, catalog)

        self.assertEqual(report["verifiedMappings"], [])

    def test_does_not_verify_conflicting_records_for_one_product_id(self):
        temp, apk, catalog = self._fixture(
            [
                {"productId": 0x41AE5E5B, "toyNumber": "FXB03"},
                {"productId": 0x41AE5E5B, "toyNumber": "FXB04"},
            ]
        )
        self.addCleanup(temp.cleanup)
        catalog.write_text(
            json.dumps(
                [
                    {"id": "car-a", "name": "Car A", "toyNumber": "FXB03"},
                    {"id": "car-b", "name": "Car B", "toyNumber": "FXB04"},
                ]
            ),
            encoding="utf-8",
        )

        report = inspect_apk(apk, catalog)

        self.assertEqual(report["verifiedMappings"], [])
        self.assertEqual(report["mappingConflicts"][0]["castingKey"], "41ae5e5b")


if __name__ == "__main__":
    unittest.main()
