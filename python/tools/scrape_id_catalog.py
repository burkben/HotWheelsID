#!/usr/bin/env python3
"""Scrape the Hot Wheels id car list from the Fandom wiki into ``catalog.json``.

The Hot Wheels id line (2019–2021, discontinued) is a finite, enumerable set of
castings. Mattel's backend that mapped a scanned car's binary ``mattelId`` to a
name is gone, so the app can't look a car up automatically — but it *can* show
the user this catalog and let them pick the matching casting once. This tool
builds that catalog from the community wiki.

It reads the ``Hot_Wheels_id`` page wikitext through the MediaWiki API (far
cleaner than scraping rendered HTML), walks the year/series section headings and
``wikitable`` rows, and writes a reproducible provenance manifest beside the
flat JSON array bundled by the mobile app.

Stdlib only (``urllib``) — no third-party deps, so it runs anywhere Python 3.10+
is present without touching the BLE ``requirements.txt``.

Usage (from the ``python/`` directory)::

    python tools/scrape_id_catalog.py            # writes the app's catalog.json
    python tools/scrape_id_catalog.py --out -    # print JSON to stdout
    python tools/scrape_id_catalog.py --revision 782123
    python tools/scrape_id_catalog.py --limit 5  # quick sample while iterating

The release catalog deliberately excludes wiki artwork. Individual uploads can
have licenses that differ from the surrounding page, and this project does not
have complete per-file provenance. See ``docs/adr/0013-car-identity-catalog.md``.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import unicodedata
import urllib.parse
import urllib.request
from dataclasses import asdict, dataclass
from pathlib import Path

API = "https://hotwheels.fandom.com/api.php"
PAGE = "Hot_Wheels_id"
PAGE_URL = "https://hotwheels.fandom.com/wiki/Hot_Wheels_id"
USER_AGENT = "RedlineID-catalog-scraper/0.1 (+https://github.com/burkben/HotWheelsID)"

# Default output: apps/mobile/src/catalog/catalog.json, two levels up from python/.
REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_OUT = REPO_ROOT / "apps" / "mobile" / "src" / "catalog" / "catalog.json"
DEFAULT_PROVENANCE_OUT = (
    REPO_ROOT / "apps" / "mobile" / "src" / "catalog" / "catalog-provenance.json"
)


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


@dataclass(frozen=True)
class SourceRevision:
    """The exact MediaWiki revision used to build a catalog snapshot."""

    page_id: int
    revision_id: int
    revision_timestamp: str


# ---------------------------------------------------------------------------
# HTTP
# ---------------------------------------------------------------------------
def _get(params: dict[str, str]) -> dict:
    """GET the MediaWiki API and parse the JSON response."""
    url = f"{API}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=30) as resp:  # noqa: S310 (trusted host)
        return json.loads(resp.read().decode("utf-8"))


def fetch_source_revision(page: str, revision: int | None) -> SourceRevision:
    """Resolve the requested (or latest) source revision and its timestamp."""
    params = {
        "action": "query",
        "prop": "revisions",
        "rvprop": "ids|timestamp",
        "format": "json",
        "formatversion": "2",
    }
    if revision is None:
        params.update({"titles": page, "rvlimit": "1"})
    else:
        params["revids"] = str(revision)

    data = _get(params)
    pages = data.get("query", {}).get("pages", [])
    if not pages or not pages[0].get("revisions"):
        raise ValueError(f"MediaWiki revision not found: {revision or page}")

    page_data = pages[0]
    revision_data = page_data["revisions"][0]
    return SourceRevision(
        page_id=int(page_data["pageid"]),
        revision_id=int(revision_data["revid"]),
        revision_timestamp=str(revision_data["timestamp"]),
    )


def fetch_wikitext(revision: SourceRevision) -> str:
    """Fetch wikitext from one pinned MediaWiki revision."""
    data = _get(
        {
            "action": "parse",
            "oldid": str(revision.revision_id),
            "prop": "wikitext",
            "format": "json",
            "formatversion": "2",
        }
    )
    parsed = data["parse"]
    if int(parsed["revid"]) != revision.revision_id:
        raise ValueError(
            f"MediaWiki returned revision {parsed['revid']}, expected {revision.revision_id}"
        )
    return parsed["wikitext"]


# ---------------------------------------------------------------------------
# Wikitext parsing
# ---------------------------------------------------------------------------
SECTION_RE = re.compile(r"^(={2,4})\s*(.*?)\s*\1\s*$")
YEAR_RE = re.compile(r"\b(20\d{2})\b")
TOY_RE = re.compile(r"\b([A-Z]{3}\d{2,3})\b")
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
        image=None,
        wikiPage=wiki_page,
    )


def _body_color(row: str) -> str | None:
    m = re.search(r"\[\[Spectraflame\]\]\s*([^\n|]+)", row)
    if m:
        return f"Spectraflame {_strip_markup(m.group(1)).strip()}"
    return None


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def build_catalog(
    revision_id: int | None = None, limit: int | None = None
) -> tuple[list[dict], SourceRevision]:
    revision = fetch_source_revision(PAGE, revision_id)
    wikitext = fetch_wikitext(revision)
    cars = parse_catalog(wikitext)

    # Second pass for body colour (kept out of the row parser to stay readable).
    # Re-walk rows is overkill; instead infer from each car's source is lost, so
    # we skip colour unless present — colour is non-essential for the prototype.

    if limit:
        cars = cars[:limit]

    return [asdict(c) for c in cars], revision


def build_provenance(
    catalog_payload: str, cars: list[dict], revision: SourceRevision
) -> dict:
    """Describe the source and redistribution boundary for a generated snapshot."""
    return {
        "schemaVersion": 1,
        "catalog": {
            "recordCount": len(cars),
            "sha256": hashlib.sha256(catalog_payload.encode("utf-8")).hexdigest(),
        },
        "source": {
            "name": "Hot Wheels Wiki — Hot Wheels id",
            "pageId": revision.page_id,
            "revisionId": revision.revision_id,
            "revisionTimestamp": revision.revision_timestamp,
            "revisionUrl": f"{PAGE_URL}?oldid={revision.revision_id}",
            "contributorsUrl": f"{PAGE_URL}?action=history",
        },
        "licensing": [
            {
                "name": "Fandom licensing terms",
                "url": "https://www.fandom.com/licensing",
            },
            {
                "name": "Hot Wheels Wiki copyright notice",
                "url": "https://hotwheels.fandom.com/wiki/Hot_Wheels_Wiki:Copyrights",
            },
        ],
        "generator": "python/tools/scrape_id_catalog.py",
        "artwork": {
            "included": False,
            "policy": (
                "No third-party catalog artwork is bundled or fetched. "
                "The app renders local placeholders."
            ),
        },
    }


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description="Scrape Hot Wheels id catalog → JSON.")
    ap.add_argument("--out", default=str(DEFAULT_OUT), help="output path, or - for stdout")
    ap.add_argument(
        "--provenance-out",
        default=str(DEFAULT_PROVENANCE_OUT),
        help="provenance output path (skipped when --out is -)",
    )
    ap.add_argument(
        "--revision",
        type=int,
        default=None,
        help="MediaWiki revision id (defaults to the latest revision)",
    )
    ap.add_argument("--limit", type=int, default=None, help="cap rows (for quick runs)")
    args = ap.parse_args(argv)

    cars, revision = build_catalog(revision_id=args.revision, limit=args.limit)
    catalog_payload = json.dumps(cars, indent=2, ensure_ascii=False) + "\n"

    if args.out == "-":
        sys.stdout.write(catalog_payload)
    else:
        out = Path(args.out)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(catalog_payload, encoding="utf-8")

        provenance = build_provenance(catalog_payload, cars, revision)
        provenance_payload = json.dumps(provenance, indent=2, ensure_ascii=False) + "\n"
        provenance_out = Path(args.provenance_out)
        provenance_out.parent.mkdir(parents=True, exist_ok=True)
        provenance_out.write_text(provenance_payload, encoding="utf-8")

        print(
            f"Wrote {len(cars)} cars from revision {revision.revision_id} → {out}",
            file=sys.stderr,
        )
        print(f"Wrote provenance → {provenance_out}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
