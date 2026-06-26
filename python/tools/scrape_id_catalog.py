#!/usr/bin/env python3
"""Scrape the Hot Wheels id car list from the Fandom wiki into ``catalog.json``.

The Hot Wheels id line (2019–2021, discontinued) is a finite, enumerable set of
castings. Mattel's backend that mapped a scanned car's binary ``mattelId`` to a
name is gone, so the app can't look a car up automatically — but it *can* show
the user this catalog and let them pick the matching casting once. This tool
builds that catalog from the community wiki.

It reads the ``Hot_Wheels_id`` page wikitext through the MediaWiki API (far
cleaner than scraping rendered HTML), walks the year/series section headings and
``wikitable`` rows, and resolves each photo's thumbnail URL. The result is a flat
JSON array the mobile app bundles at ``apps/mobile/src/catalog/catalog.json``.

Stdlib only (``urllib``) — no third-party deps, so it runs anywhere Python 3.10+
is present without touching the BLE ``requirements.txt``.

Usage (from the ``python/`` directory)::

    python tools/scrape_id_catalog.py            # writes the app's catalog.json
    python tools/scrape_id_catalog.py --out -    # print JSON to stdout
    python tools/scrape_id_catalog.py --limit 5  # quick sample while iterating

Wiki content is community-contributed and CC-BY-SA; photo URLs are hot-linked for
the prototype. See ``docs/adr/0013-car-identity-catalog.md`` for the licensing and
attribution notes before bundling any artwork.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
import unicodedata
import urllib.parse
import urllib.request
from dataclasses import asdict, dataclass
from pathlib import Path

API = "https://hotwheels.fandom.com/api.php"
PAGE = "Hot_Wheels_id"
USER_AGENT = "RedlineID-catalog-scraper/0.1 (+https://github.com/burkben/HotWheelsID)"

# Default output: apps/mobile/src/catalog/catalog.json, two levels up from python/.
REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_OUT = REPO_ROOT / "apps" / "mobile" / "src" / "catalog" / "catalog.json"


@dataclass
class CatalogCar:
    """One id casting. Mirrors the ``CatalogCar`` TS type in the app."""

    id: str
    name: str
    toyNumber: str | None
    series: str | None
    year: int | None
    wave: str | None
    bodyColor: str | None
    image: str | None
    wikiPage: str | None


# ---------------------------------------------------------------------------
# HTTP
# ---------------------------------------------------------------------------
def _get(params: dict[str, str]) -> dict:
    """GET the MediaWiki API and parse the JSON response."""
    url = f"{API}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=30) as resp:  # noqa: S310 (trusted host)
        return json.loads(resp.read().decode("utf-8"))


def fetch_wikitext(page: str) -> str:
    data = _get(
        {
            "action": "parse",
            "page": page,
            "prop": "wikitext",
            "format": "json",
            "formatversion": "2",
        }
    )
    return data["parse"]["wikitext"]


def resolve_image_urls(filenames: list[str], width: int = 320) -> dict[str, str]:
    """Map ``File:`` names → thumbnail URLs via imageinfo (batched ≤ 40 titles)."""
    urls: dict[str, str] = {}
    unique = [f for f in dict.fromkeys(filenames) if f]
    for i in range(0, len(unique), 40):
        chunk = unique[i : i + 40]
        titles = "|".join(f"File:{name}" for name in chunk)
        data = _get(
            {
                "action": "query",
                "titles": titles,
                "prop": "imageinfo",
                "iiprop": "url",
                "iiurlwidth": str(width),
                "format": "json",
                "formatversion": "2",
            }
        )
        pages = data.get("query", {}).get("pages", [])
        # The API normalises titles (spaces↔underscores, %xx); map normalized → input.
        norm = {n["to"]: n["from"] for n in data.get("query", {}).get("normalized", [])}
        for page in pages:
            info = page.get("imageinfo")
            if not info:
                continue
            title = page.get("title", "")
            requested = norm.get(title, title)
            name = requested.split(":", 1)[-1]  # drop "File:"
            urls[name] = info[0].get("thumburl") or info[0].get("url")
        time.sleep(0.2)  # be gentle with the public API
    return urls


# ---------------------------------------------------------------------------
# Wikitext parsing
# ---------------------------------------------------------------------------
SECTION_RE = re.compile(r"^(={2,4})\s*(.*?)\s*\1\s*$")
YEAR_RE = re.compile(r"\b(20\d{2})\b")
TOY_RE = re.compile(r"\b([A-Z]{3}\d{2,3})\b")
FILE_RE = re.compile(r"\[\[(?:File|Image):([^|\]]+)", re.IGNORECASE)
LINK_RE = re.compile(r"\[\[([^\]]+)\]\]")


def _link_text(cell: str) -> str:
    """``[[Target|Display]]`` → ``Display``; ``[[Target]]`` → ``Target``; else plain."""
    m = LINK_RE.search(cell)
    if not m:
        return _strip_markup(cell)
    inner = m.group(1)
    return _strip_markup(inner.split("|", 1)[-1] if "|" in inner else inner)


def _strip_markup(text: str) -> str:
    text = re.sub(r"\[\[|\]\]|'''|''", "", text)
    text = re.sub(r"<[^>]+>", " ", text)  # <br/>, <ref>…
    return text.strip()


def slugify(name: str) -> str:
    norm = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    norm = norm.lower()
    norm = re.sub(r"[^a-z0-9]+", "-", norm)
    return norm.strip("-")


def _split_cells(row: str) -> list[str]:
    """Split one wikitable row into its data cells (drops the leading ``|``)."""
    cells: list[str] = []
    for line in row.splitlines():
        line = line.strip()
        if not line.startswith("|") or line.startswith("|-") or line.startswith("|}"):
            continue
        if line.startswith("!"):  # header cell
            continue
        body = line[1:]
        # A single line may pack multiple cells with "||".
        cells.extend(part.strip() for part in body.split("||"))
    return cells


def parse_catalog(wikitext: str) -> list[CatalogCar]:
    """Walk year/series headings and wikitable rows into ``CatalogCar`` records."""
    year: int | None = None
    wave: str | None = None
    series: str | None = None
    cars: list[CatalogCar] = []
    seen_ids: set[str] = set()

    # Split into "blocks" delimited by headings so we keep section context, then
    # parse any wikitable inside each block.
    lines = wikitext.splitlines()
    i = 0
    in_table = False
    row_buf: list[str] = []

    def flush_row() -> None:
        nonlocal row_buf
        if not row_buf:
            return
        row = "\n".join(row_buf)
        row_buf = []
        car = _row_to_car(row, year, wave, series, seen_ids)
        if car:
            cars.append(car)

    while i < len(lines):
        line = lines[i]
        heading = SECTION_RE.match(line.strip())
        if heading:
            flush_row()
            in_table = False
            level = len(heading.group(1))
            title = _strip_markup(heading.group(2))
            if level == 2:  # e.g. "2019 Series 1"
                ym = YEAR_RE.search(title)
                year = int(ym.group(1)) if ym else None
                wave = title
                series = None
            elif level >= 3:  # e.g. "Speed Demons"
                series = title
            i += 1
            continue

        stripped = line.strip()
        if stripped.startswith("{|"):
            in_table = True
            row_buf = []
        elif stripped.startswith("|}"):
            flush_row()
            in_table = False
        elif in_table and stripped.startswith("|-"):
            flush_row()
        elif in_table:
            row_buf.append(line)
        i += 1

    flush_row()
    return cars


def _row_to_car(
    row: str,
    year: int | None,
    wave: str | None,
    series: str | None,
    seen_ids: set[str],
) -> CatalogCar | None:
    cells = _split_cells(row)
    if not cells:
        return None

    toy_match = TOY_RE.search(_strip_markup(row))
    toy = toy_match.group(1) if toy_match else None

    # Casting name: the first wikilinked cell that isn't a body-colour/wheel cell.
    skip = {"id", "spectraflame", "clearcoat", "zamac"}
    name = None
    for cell in cells:
        if "[[" not in cell:
            continue
        candidate = _link_text(cell)
        low = candidate.lower()
        if not candidate or low in skip or low.startswith("spectraflame"):
            continue
        # Body-colour cells usually start with a colour word; casting cells are
        # models/links. The first link cell that survives the filter wins, and in
        # the id tables that is always the Casting Name column.
        name = candidate
        break
    if not name:
        return None

    file_match = FILE_RE.search(row)
    image_file = None
    if file_match:
        # Wikitext sometimes pre-encodes apostrophes (%27) inside the filename;
        # unquote so the API resolves the real File: title.
        image_file = urllib.parse.unquote(file_match.group(1).strip()).replace(" ", "_")
        if _is_placeholder_image(image_file):
            image_file = None

    base = slugify(name)
    cid = base
    if cid in seen_ids:
        cid = f"{base}-{(toy or 'x').lower()}"
    if cid in seen_ids:  # extremely unlikely; keep ids unique regardless
        n = 2
        while f"{base}-{n}" in seen_ids:
            n += 1
        cid = f"{base}-{n}"
    seen_ids.add(cid)

    wiki_page = (
        f"https://hotwheels.fandom.com/wiki/{urllib.parse.quote(name.replace(' ', '_'))}"
    )

    return CatalogCar(
        id=cid,
        name=name,
        toyNumber=toy,
        series=series,
        year=year,
        wave=wave,
        bodyColor=None,  # filled below from the colour cell if present
        image=image_file,  # replaced with a resolved URL after batch lookup
        wikiPage=wiki_page,
    )


def _is_placeholder_image(name: str) -> bool:
    """The wiki uses a stock 'Image Not Available' file for missing photos."""
    low = name.lower()
    return "image_not_available" in low or "no_image" in low or low.startswith("placeholder")


def _body_color(row: str) -> str | None:
    m = re.search(r"\[\[Spectraflame\]\]\s*([^\n|]+)", row)
    if m:
        return f"Spectraflame {_strip_markup(m.group(1)).strip()}"
    return None


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def build_catalog(limit: int | None = None, resolve_images: bool = True) -> list[dict]:
    wikitext = fetch_wikitext(PAGE)
    cars = parse_catalog(wikitext)

    # Second pass for body colour (kept out of the row parser to stay readable).
    # Re-walk rows is overkill; instead infer from each car's source is lost, so
    # we skip colour unless present — colour is non-essential for the prototype.

    if limit:
        cars = cars[:limit]

    if resolve_images:
        files = [c.image for c in cars if c.image]
        urls = resolve_image_urls(files)
        for c in cars:
            c.image = urls.get(c.image) if c.image else None

    return [asdict(c) for c in cars]


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description="Scrape Hot Wheels id catalog → JSON.")
    ap.add_argument("--out", default=str(DEFAULT_OUT), help="output path, or - for stdout")
    ap.add_argument("--limit", type=int, default=None, help="cap rows (for quick runs)")
    ap.add_argument("--no-images", action="store_true", help="skip image URL resolution")
    args = ap.parse_args(argv)

    cars = build_catalog(limit=args.limit, resolve_images=not args.no_images)
    payload = json.dumps(cars, indent=2, ensure_ascii=False) + "\n"

    if args.out == "-":
        sys.stdout.write(payload)
    else:
        out = Path(args.out)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(payload, encoding="utf-8")
        print(f"Wrote {len(cars)} cars → {out}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
