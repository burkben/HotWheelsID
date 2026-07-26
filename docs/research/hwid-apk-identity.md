# Official Hot Wheels id APK identity inspection

## Scope and boundaries

This research asks one narrow interoperability question: does the publicly archived official Android
package contain a directly verifiable `productId -> Hot Wheels catalog car` map?

The APK is an external input. It is downloaded to local/session storage, read as a ZIP, and never
executed. The repository does not contain or redistribute the APK, extracted assets, artwork, bulk
strings, or decompiled proprietary code. Inspection does not bypass authentication, DRM,
obfuscation, or network controls. Only package provenance, allowlisted code/content markers, and
independently verifiable product-to-catalog facts may be recorded.

## Provenance

| Field | Value |
|---|---|
| Internet Archive item | `hot-wheels-id` |
| Archived filename | `com.mattel.hwid.apk` |
| Package | `com.mattel.hwid` |
| App version | `3.6.1` (Unity player metadata) |
| Size | `63,798,996` bytes |
| SHA-1 | `4e751f62b324a684858fe6953d57492ac56fab56` |
| SHA-256 | `cbc7a9f141d894f9bf7c862f89cd2f56252c345f5a915a951b876f2a55343a02` |
| ZIP entries | 133 |

The SHA-1 and size match Internet Archive metadata. The SHA-256 was computed locally.

## Reproduce locally

Download the archive input outside the repository, then run:

```bash
python3 python/tools/inspect_hwid_apk.py /path/to/com.mattel.hwid.apk
python3 python/tools/inspect_hwid_apk.py /path/to/com.mattel.hwid.apk --json
python3 python/tools/decode_descriptor.py /path/to/com.mattel.hwid.apk
```

The inspector reads the APK in place. It checks package evidence, hashes, `pid.mattel` URLs, exact
toy-number markers from the public bundled catalog, structured JSON records that directly pair
`productId` with toy number, and allowlisted signs that catalog data lives elsewhere.

## Result

No independently verifiable mapping was found:

- package evidence was present in `AndroidManifest.xml`, Unity metadata, `classes.dex`, and resources;
- the APK contained zero `pid.mattel` URLs;
- it contained zero exact packaging toy numbers from the 146-car catalog;
- it contained zero structured records pairing a product ID with a catalog toy number;
- Unity metadata contained identity code markers such as `GetCarProductID`, `carproductids`, and
  `toyNumber`, but symbols alone do not contain mapping data;
- the base APK references Android OBB storage, remote asset bundles, and content-catalog loading;
- the Internet Archive item contains the APK but no corresponding OBB or content bundle.

Some catalog names occur in mission/localization symbols, but they are not associated with product
IDs or packaging toy numbers and were not treated as mappings.

The previously recovered HWiD protobuf descriptor remains reproducible directly from the APK through
`decode_descriptor.py`; it describes portal messages, not the car catalog.

## Confidence rubric

A future APK-derived row may enter the contribution pipeline only when one structured record directly
associates an unsigned 32-bit product ID with a toy number or name, and that catalog identifier
independently resolves to the public bundled catalog. Integer-range guesses, string proximity,
symbol names, asset ordering, and filenames are insufficient.

**Conclusion:** the archived base APK corroborates that product identity and catalog-loading code
existed, but it does not provide the missing `productId -> catalogId` data. The community seed remains
the only operational naming path.
