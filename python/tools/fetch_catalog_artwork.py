#!/usr/bin/env python3
"""Download Hot Wheels Wiki catalog artwork and bundle it with the mobile app.

Redline ID used to hot-link the Fandom CDN for catalog photos. That broke the
app's "no network requests" promise, depended on a fan wiki's CDN staying up for
a discontinued product, and left no record of where any individual image came
from. This tool replaces that with a reproducible, attributed, offline bundle.

For every catalog row that has a Photo cell it resolves the wiki file, records
who uploaded it and on what licensing basis, downloads a downscaled rendition,
and emits:

* ``apps/mobile/assets/catalog/<car-id>.<ext>``  — the bundled image
* ``apps/mobile/src/catalog/artwork.json``       — attribution + integrity data
* ``apps/mobile/src/catalog/artworkAssets.ts``   — a static ESM import map

The import map has to be generated because Metro resolves asset paths at build
time and cannot take a computed string.

Licensing basis is recorded per file rather than assumed. The Hot Wheels Wiki is
CC BY-SA site-wide (``meta=siteinfo&siprop=rightsinfo``); some file pages further
declare ``{{Self}}`` (uploader asserts own work). Both are reusable with
attribution, but they are *different claims*, so they are stored distinctly —
that keeps ``THIRD_PARTY_NOTICES.md`` accurate and makes pulling any single image
a one-line change.

Downscaling is delegated to the CDN's ``scale-to-width-down`` rendition, so this
stays stdlib-only with no image-processing dependency.

A full run is all-or-nothing. Any download failure aborts before the manifest is
rewritten, because a partial run would prune assets that are still good and
silently ship a smaller bundle. ``--limit`` is therefore a read-only sample: it
downloads, but never writes the manifest, the asset map, or prunes.

Usage (from the ``python/`` directory)::

    python tools/fetch_catalog_artwork.py
    python tools/fetch_catalog_artwork.py --limit 5      # sample; writes nothing
    python tools/fetch_catalog_artwork.py --width 480
    python tools/fetch_catalog_artwork.py --revision 782123
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from scrape_id_catalog import (  # noqa: E402  (path shim must precede import)
    API,
    PAGE,
    REPO_ROOT,
    SourceRevision,
    fetch_source_revision,
    fetch_wikitext,
    parse_catalog_with_photos,
)

USER_AGENT = "RedlineID-artwork-fetcher/1.0 (+https://github.com/burkben/HotWheelsID)"
FILE_PAGE_BASE = "https://hotwheels.fandom.com/wiki/File:"

DEFAULT_ASSET_DIR = REPO_ROOT / "apps" / "mobile" / "assets" / "catalog"
DEFAULT_METADATA_OUT = REPO_ROOT / "apps" / "mobile" / "src" / "catalog" / "artwork.json"
DEFAULT_ASSETS_MODULE = (
    REPO_ROOT / "apps" / "mobile" / "src" / "catalog" / "artworkAssets.ts"
)

# Widest on-screen use is the car-detail hero; 640px covers it at @3x without
# bloating the bundle. The wiki's own thumbnailer does the resizing.
DEFAULT_WIDTH = 640

# MediaWiki caps multi-title queries at 50 for unprivileged clients.
API_BATCH = 40

LICENSING_SECTION_RE = re.compile(r"==\s*Licensing\s*==(.*?)(?:\n==|\Z)", re.S | re.I)
TEMPLATE_RE = re.compile(r"\{\{\s*([^}|\n]+)")
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}

# The Fandom CDN content-negotiates and will happily return WebP bytes for a URL
# ending in .jpg. Metro keys asset handling off the file extension, so ask for
# formats we intend to ship and verify what actually arrived.
IMAGE_ACCEPT = "image/jpeg,image/png,image/gif;q=0.9,*/*;q=0.8"

MAGIC_EXTENSIONS: tuple[tuple[bytes, str], ...] = (
    (b"\xff\xd8\xff", ".jpg"),
    (b"\x89PNG\r\n\x1a\n", ".png"),
    (b"GIF8", ".gif"),
)

# Rows with no photo point at the wiki's own "no image" graphic. Bundling that
# would be strictly worse than the app's placeholder, which at least matches the
# surrounding design.
PLACEHOLDER_FILES = {"image not available.jpg", "no image.jpg", "noimage.jpg"}


@dataclass(frozen=True)
class ArtworkFile:
    """One wiki image resolved for one catalog car."""

    car_id: str
    wiki_file: str
    uploader: str | None
    license_template: str | None
    original_url: str

    @property
    def license_basis(self) -> str:
        """Why we believe this image is redistributable, stated precisely.

        ``uploader-self`` — the file page carries ``{{Self}}``: the uploader
        asserts it is their own work, released under the wiki's CC BY-SA terms.
        ``wiki-default`` — the file page declares nothing, so only Fandom's
        site-wide CC BY-SA licensing of user contributions applies.
        """
        if self.license_template and self.license_template.strip().lower() == "self":
            return "uploader-self"
        return "wiki-default"

    @property
    def file_page(self) -> str:
        return FILE_PAGE_BASE + urllib.parse.quote(self.wiki_file.replace(" ", "_"))


def _get_json(url: str) -> dict:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=60) as response:
        return json.load(response)


def resolve_files(photos: dict[str, str]) -> tuple[list[ArtworkFile], list[str]]:
    """Look up uploader + licensing for each car's wiki file.

    Returns the resolved files and the ids whose file does not exist on the wiki
    (rows can reference an image that was later deleted or never uploaded).
    """
    by_title: dict[str, list[str]] = {}
    for car_id, name in sorted(photos.items()):
        if name.strip().lower() in PLACEHOLDER_FILES:
            continue
        by_title.setdefault(f"File:{name}", []).append(car_id)

    titles = sorted(by_title)
    pages: dict[str, dict] = {}
    aliases: dict[str, str] = {}

    for start in range(0, len(titles), API_BATCH):
        batch = titles[start : start + API_BATCH]
        query = urllib.parse.urlencode(
            {
                "action": "query",
                "format": "json",
                "prop": "revisions|imageinfo",
                "rvprop": "content",
                "rvslots": "main",
                "iiprop": "url|user",
                "titles": "|".join(batch),
            }
        )
        payload = _get_json(f"{API}?{query}")["query"]
        # MediaWiki rewrites titles (underscores, capitalisation) and follows
        # redirects, so track both mappings to get back to our original keys.
        for entry in payload.get("normalized", []):
            aliases[entry["to"]] = entry["from"]
        for entry in payload.get("redirects", []):
            aliases[entry["to"]] = entry["from"]
        for page in payload["pages"].values():
            pages[page["title"]] = page
        print(
            f"  resolved {min(start + API_BATCH, len(titles))}/{len(titles)}",
            file=sys.stderr,
        )
        time.sleep(0.4)

    resolved: list[ArtworkFile] = []
    missing: list[str] = []

    for title, page in pages.items():
        original = aliases.get(title, title)
        car_ids = by_title.get(original) or by_title.get(title) or []
        if not car_ids:
            continue
        if "missing" in page or not page.get("imageinfo"):
            missing.extend(car_ids)
            continue

        revisions = page.get("revisions") or []
        text = revisions[0]["slots"]["main"]["*"] if revisions else ""
        section = LICENSING_SECTION_RE.search(text)
        template = None
        if section:
            match = TEMPLATE_RE.search(section.group(1))
            if match:
                template = match.group(1).strip() or None

        info = page["imageinfo"][0]
        # One record per car: two catalog entries may legitimately share a photo,
        # and each still needs its own bundled asset and attribution row.
        for car_id in car_ids:
            resolved.append(
                ArtworkFile(
                    car_id=car_id,
                    wiki_file=title.removeprefix("File:"),
                    uploader=info.get("user"),
                    license_template=template,
                    original_url=info["url"],
                )
            )

    resolved.sort(key=lambda f: f.car_id)
    return resolved, sorted(missing)


def thumbnail_url(original_url: str, width: int) -> str:
    """Ask the wiki CDN for a width-limited rendition of a full-size image URL.

    Wikia URLs look like ``.../NAME.jpg/revision/latest?cb=…``; the thumbnailer
    slots in between the revision and the cache-buster.

    ``format=original`` suppresses the CDN's automatic WebP transcoding. It still
    honours ``scale-to-width-down``, so we get a downscaled image in the file's
    native format — which keeps the bundled extension honest and avoids relying
    on platform WebP decoding.
    """
    split = urllib.parse.urlsplit(original_url)
    path = split.path.rstrip("/")
    if "/scale-to-width-down/" not in path:
        path = f"{path}/scale-to-width-down/{width}"
    query = urllib.parse.parse_qs(split.query)
    query["format"] = ["original"]
    return urllib.parse.urlunsplit(
        split._replace(path=path, query=urllib.parse.urlencode(query, doseq=True))
    )


def _extension(wiki_file: str, blob: bytes) -> str:
    """Pick an extension from the bytes themselves, not the wiki's filename.

    A file named ``.jpg`` on the wiki can come back as PNG (or WebP, if the CDN
    ignores our Accept header), and a bundled asset whose extension lies about
    its contents is a decoding bug waiting to happen.
    """
    for magic, ext in MAGIC_EXTENSIONS:
        if blob.startswith(magic):
            return ext
    if blob[:4] == b"RIFF" and blob[8:12] == b"WEBP":
        return ".webp"
    ext = Path(wiki_file).suffix.lower()
    return ext if ext in ALLOWED_EXTENSIONS else ".jpg"


def download(
    files: list[ArtworkFile], asset_dir: Path, width: int
) -> tuple[dict[str, dict], list[tuple[str, str]]]:
    """Fetch each rendition into ``asset_dir``.

    Returns ``(images, failures)``. Callers must treat a non-empty ``failures``
    list as fatal: a partial ``images`` dict would prune assets that are still
    good, so it must never reach the manifest writers.
    """
    asset_dir.mkdir(parents=True, exist_ok=True)
    images: dict[str, dict] = {}
    failures: list[tuple[str, str]] = []
    # Cars that share a wiki photo each get their own asset, but only one fetch.
    cache: dict[str, bytes] = {}

    for index, art in enumerate(files, start=1):
        url = thumbnail_url(art.original_url, width)
        blob = cache.get(url)
        if blob is None:
            request = urllib.request.Request(
                url, headers={"User-Agent": USER_AGENT, "Accept": IMAGE_ACCEPT}
            )
            try:
                with urllib.request.urlopen(request, timeout=90) as response:
                    blob = response.read()
            except (urllib.error.URLError, TimeoutError) as exc:
                print(f"  !! {art.car_id}: {exc}", file=sys.stderr)
                failures.append((art.car_id, str(exc)))
                continue
            cache[url] = blob
            time.sleep(0.15)

        filename = f"{art.car_id}{_extension(art.wiki_file, blob)}"
        (asset_dir / filename).write_bytes(blob)
        images[art.car_id] = {
            "file": filename,
            "bytes": len(blob),
            "sha256": hashlib.sha256(blob).hexdigest(),
            "wikiFile": art.wiki_file,
            "filePage": art.file_page,
            "uploader": art.uploader,
            "licenseBasis": art.license_basis,
            "licenseTemplate": art.license_template,
        }
        if index % 20 == 0 or index == len(files):
            print(f"  downloaded {index}/{len(files)}", file=sys.stderr)
        time.sleep(0.15)

    return dict(sorted(images.items())), failures


def build_metadata(
    images: dict[str, dict], revision: SourceRevision, width: int
) -> dict:
    uploaders = sorted({img["uploader"] for img in images.values() if img["uploader"]})
    basis_counts: dict[str, int] = {}
    for img in images.values():
        basis_counts[img["licenseBasis"]] = basis_counts.get(img["licenseBasis"], 0) + 1

    return {
        "schemaVersion": 1,
        "generator": "python/tools/fetch_catalog_artwork.py",
        "source": {
            "name": "Hot Wheels Wiki — Hot Wheels id",
            "pageId": revision.page_id,
            "revisionId": revision.revision_id,
            "revisionUrl": (
                f"https://hotwheels.fandom.com/wiki/{PAGE}?oldid={revision.revision_id}"
            ),
        },
        "license": {
            "name": "Creative Commons Attribution-ShareAlike",
            "abbreviation": "CC BY-SA",
            "url": "https://www.fandom.com/licensing",
            "wikiCopyrightUrl": (
                "https://hotwheels.fandom.com/wiki/Hot_Wheels_Wiki:Copyrights"
            ),
            "modifications": (
                f"Renditions are resized to a maximum width of {width}px by the "
                "Fandom CDN thumbnailer and renamed to the catalog id. Image "
                "content is otherwise unaltered."
            ),
            "basisCounts": dict(sorted(basis_counts.items())),
        },
        "uploaders": uploaders,
        "imageCount": len(images),
        "images": images,
    }


def _identifier(car_id: str) -> str:
    """A valid, collision-free JS identifier for a catalog id.

    Catalog ids are ``[a-z0-9-]`` and unique, so swapping hyphens for underscores
    behind a fixed prefix stays unique and keeps the generated imports readable.
    """
    return "img_" + re.sub(r"[^A-Za-z0-9]", "_", car_id)


def render_assets_module(images: dict[str, dict]) -> str:
    """Emit the static asset map Metro needs to bundle the images.

    Uses ESM ``import`` rather than ``require``: both work under Metro, but only
    static imports go through the test runner's module resolution, so this keeps
    catalog artwork testable without a native bundler.
    """
    header = [
        "/**",
        " * Static asset map for bundled catalog artwork.",
        " *",
        " * @generated by python/tools/fetch_catalog_artwork.py — do not edit by hand.",
        " *",
        " * Metro resolves asset paths at build time, so this map has to be literal.",
        " * Attribution and licensing for every entry live in artwork.json.",
        " */",
        'import type { ImageSourcePropType } from "react-native";',
        "",
    ]
    imports = [
        f'import {_identifier(car_id)} from "../../assets/catalog/{img["file"]}";'
        for car_id, img in images.items()
    ]
    body = [
        "",
        "export const ARTWORK_ASSETS: Readonly<Record<string, ImageSourcePropType>> = {",
        *(f"  {json.dumps(car_id)}: {_identifier(car_id)}," for car_id in images),
        "};",
        "",
    ]
    return "\n".join(header + imports + body)


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(
        description="Download + bundle Hot Wheels id catalog artwork."
    )
    parser.add_argument("--revision", type=int, default=None, help="MediaWiki revision id")
    parser.add_argument("--width", type=int, default=DEFAULT_WIDTH, help="max image width")
    parser.add_argument("--asset-dir", default=str(DEFAULT_ASSET_DIR))
    parser.add_argument("--metadata-out", default=str(DEFAULT_METADATA_OUT))
    parser.add_argument("--assets-module-out", default=str(DEFAULT_ASSETS_MODULE))
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="cap files for a quick sample; skips manifest writes and pruning",
    )
    args = parser.parse_args(argv)

    revision = fetch_source_revision(PAGE, args.revision)
    _cars, photos = parse_catalog_with_photos(fetch_wikitext(revision))
    print(f"Catalog rows with a Photo cell: {len(photos)}", file=sys.stderr)

    sample_only = bool(args.limit)
    if sample_only:
        photos = dict(sorted(photos.items())[: args.limit])

    print("Resolving wiki files…", file=sys.stderr)
    files, missing = resolve_files(photos)
    if missing:
        print(f"  {len(missing)} row(s) reference a missing file: {missing}", file=sys.stderr)

    print(f"Downloading {len(files)} image(s) at ≤{args.width}px…", file=sys.stderr)
    asset_dir = Path(args.asset_dir)
    # A sample run must not touch the shipped bundle at all. Downloading into the
    # real asset dir would overwrite committed images (at a different --width, with
    # no matching manifest update), so it gets a throwaway directory instead.
    sample_dir = tempfile.TemporaryDirectory(prefix="redline-artwork-sample-") if sample_only else None
    target_dir = Path(sample_dir.name) if sample_dir else asset_dir
    try:
        images, failures = download(files, target_dir, args.width)

        if failures:
            # A partial run must never reach the writers: the stale-asset sweep below
            # keys off `images`, so proceeding would delete artwork that is still good
            # and quietly ship a smaller bundle.
            print(
                f"\nAborting: {len(failures)} image(s) failed to download. "
                "No manifest or asset changes were written.",
                file=sys.stderr,
            )
            for car_id, reason in failures:
                print(f"  {car_id}: {reason}", file=sys.stderr)
            return 1

        if sample_only:
            total = sum(img["bytes"] for img in images.values())
            print(
                f"\nSample run (--limit {args.limit}): fetched {len(images)} image(s), "
                f"{total / 1024 / 1024:.1f} MB, into a temp dir. The bundled artwork, "
                "manifest, and asset map were left untouched.",
                file=sys.stderr,
            )
            return 0
    finally:
        if sample_dir:
            sample_dir.cleanup()

    # Write the manifest and the asset map before pruning, so an interrupted run
    # can never leave imports pointing at files that were already deleted.
    metadata = build_metadata(images, revision, args.width)
    metadata_out = Path(args.metadata_out)
    metadata_out.parent.mkdir(parents=True, exist_ok=True)
    metadata_out.write_text(
        json.dumps(metadata, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )

    module_out = Path(args.assets_module_out)
    module_out.write_text(render_assets_module(images), encoding="utf-8")

    # Drop stale assets so a re-run never leaves an orphan in the app bundle.
    keep = {img["file"] for img in images.values()}
    for existing in sorted(asset_dir.iterdir()):
        if existing.is_file() and existing.name not in keep:
            existing.unlink()
            print(f"  removed stale asset {existing.name}", file=sys.stderr)

    total = sum(img["bytes"] for img in images.values())
    print(
        f"Bundled {len(images)} image(s), {total / 1024 / 1024:.1f} MB → {asset_dir}",
        file=sys.stderr,
    )
    print(f"Wrote metadata → {metadata_out}", file=sys.stderr)
    print(f"Wrote asset map → {module_out}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
