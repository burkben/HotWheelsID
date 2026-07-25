# Third-party notices

Redline ID is licensed under the MIT License except for third-party material
identified below. The project does not grant additional rights to that material.

## Hot Wheels id catalog metadata

The bundled car catalog contains factual metadata derived from the community-run
[Hot Wheels Wiki page “Hot Wheels id”][catalog-source]:

- **Source page:** Hot Wheels Wiki, “Hot Wheels id”
- **Pinned revision:** `782123` (`2026-06-10T15:05:55Z`)
- **Contributors:** credited through the [source page history][catalog-history]
- **Machine-readable provenance:**
  [`apps/mobile/src/catalog/catalog-provenance.json`](apps/mobile/src/catalog/catalog-provenance.json)

Fandom's [general licensing page][fandom-license] says wiki text is CC BY-SA 3.0
unless a community uses an approved alternate license. The Hot Wheels Wiki's own
[copyright notice][wiki-copyright] references GFDL 1.2 or later and warns that the
notice may be outdated. This project preserves both references rather than
overstating which source term controls. Reusers should review the source terms.

## Hot Wheels id catalog artwork

The app bundles 135 car photographs from the same wiki. They are redistributed
under the Creative Commons Attribution-ShareAlike terms that Fandom applies to
user contributions.

- **Photographers:** 1steditionman, Autobot Scamper, Biddiblush, BigBadBrad01,
  Cyko9, Disoneiscool8746, GTRTURTLE, Grunty89, JohnW51, Justinizawesome05,
  Kevblokey, LesneyFan, MazdaL10B, Nezz79, Shnezman, Skingld, Tikinet, WorpeX
- **Per-image provenance:**
  [`apps/mobile/src/catalog/artwork.json`](apps/mobile/src/catalog/artwork.json)
  records the original `File:` page, uploader, licensing basis, source URL, and a
  SHA-256 of the bundled bytes for every photo
- **Modifications:** photos are scaled to a maximum width of 640px and renamed to
  the catalog car id. Image content is otherwise unaltered
- **Reproducible:** [`python/tools/fetch_catalog_artwork.py`](python/tools/fetch_catalog_artwork.py)
  regenerates the assets and the manifest from the wiki
- **Never fetched at runtime:** the photos ship inside the app binary. The app
  makes no network request to display them

Two licensing bases are recorded separately, because they are different claims:

| Basis | Images | Meaning |
| --- | --- | --- |
| `uploader-self` | 92 | The file page carries a `{{Self}}` template — the uploader asserts the photo is their own work, released under CC BY-SA |
| `wiki-default` | 43 | The file page carries no licensing template. Fandom's Terms of Use license user contributions under CC BY-SA, which is the basis relied on here |

Neither basis independently verifies that an uploader held the rights they
granted. If you are a rights holder and object to an image, please open an issue.
Each photo is isolated in `artwork.json`, so removing one is a single change.

“Hot Wheels” and “Hot Wheels id” are trademarks of Mattel, Inc. They are used only
to identify compatible discontinued hardware. Redline ID is not affiliated with,
endorsed by, or sponsored by Mattel, Inc. or Fandom, Inc.

[catalog-source]: https://hotwheels.fandom.com/wiki/Hot_Wheels_id?oldid=782123
[catalog-history]: https://hotwheels.fandom.com/wiki/Hot_Wheels_id?action=history
[fandom-license]: https://www.fandom.com/licensing
[wiki-copyright]: https://hotwheels.fandom.com/wiki/Hot_Wheels_Wiki:Copyrights
