import html as html_module
import json
import re
import requests
import time
from bs4 import BeautifulSoup

BASE_URL = "https://www.akc.org"
BREEDS_URL = "https://www.akc.org/dog-breeds/"
SITEMAP_URL = "https://www.akc.org/breed-sitemap.xml"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}


def get_breed_links():
    resp = requests.get(SITEMAP_URL, headers=HEADERS, timeout=10)
    resp.raise_for_status()
    all_locs = re.findall(r"<loc>(.*?)</loc>", resp.text)
    # keep only individual breed pages (path has a slug after /dog-breeds/)
    links = [
        u for u in all_locs
        if re.match(r"https://www\.akc\.org/dog-breeds/[^/]+/$", u)
        and u != BREEDS_URL
    ]
    return links


def _strip_html(s):
    s = s.replace('\\"', '"').replace("\\/", "/")
    s = html_module.unescape(s)
    s = re.sub(r"<[^>]+>", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def parse_breed(url):
    resp = requests.get(url, headers=HEADERS, timeout=10)
    resp.raise_for_status()
    text = resp.text
    decoded = html_module.unescape(text)

    breed = {"url": url}
    slug = url.rstrip("/").split("/")[-1]

    # --- name ---
    m = re.search(r'<meta name="og:breed" content="([^"]+)"', text)
    if m:
        breed["name"] = m.group(1)

    # --- about: try JSON-LD Dataset first, then akc_org_about blob ---
    ld_blocks = re.findall(r'<script type="application/ld\+json">(.*?)</script>', text, re.DOTALL)
    for block in ld_blocks:
        try:
            data = json.loads(block)
        except json.JSONDecodeError:
            continue
        if data.get("@type") != "Dataset":
            continue
        if not breed.get("name"):
            breed["name"] = data.get("name")
        breed["about"] = data.get("description")
        cols = data.get("mainEntity", {}).get("csvw:tableSchema", {}).get("csvw:columns", [])
        for col in cols:
            label = col.get("csvw:name", "")
            raw = col.get("csvw:cells", [{}])[0].get("csvw:value", "")
            value = raw[len(label) + 2:].strip() if raw.startswith(label) else raw.strip()
            if not value:
                continue
            key = label.lower().replace(" ", "_")
            breed[key] = value
        break

    if not breed.get("about"):
        # fall back to akc_org_about JSON field in embedded page state
        ao = re.search(r'"akc_org_about":"((?:[^"\\]|\\.)*)"', decoded)
        if ao:
            breed["about"] = _strip_html(ao.group(1).replace("\\/", "/"))

    # --- height / weight / life_expectancy fallback from plain text ---
    # Use word-boundary prefix to avoid matching font-weight: etc.
    for field, pattern in [
        ("height",          r"(?<!\w)Height:\s*([^<\n]{1,60}(?:inches?|cm)[^<\n]{0,20})"),
        ("weight",          r"(?<!\w)Weight:\s*([^<\n]{1,60}(?:pounds?|lbs?|kg)[^<\n]{0,20})"),
        ("life_expectancy", r"(?<!\w)Life Expectancy:\s*([^<\n]{1,30}years?[^<\n]{0,10})"),
    ]:
        if not breed.get(field):
            fm = re.search(pattern, decoded)
            if fm:
                breed[field] = fm.group(1).strip().rstrip(".,")

    # --- group from googletag targeting ---
    g = re.search(r"googletag\.pubads\(\)\.setTargeting\('group',\s*\"([^\"]+)\"\)", decoded)
    if g:
        breed["group"] = g.group(1).replace("-", " ").title()

    # --- temperament from embedded traits blob ---
    t = re.search(
        r'"traits":\{"' + re.escape(slug) + r'"\:\{[^{]*?"temperament":"((?:[^"\\]|\\.)*)"',
        decoded,
    )
    if t:
        raw_temp = t.group(1).replace("\\/", "/")
        parts = [p.strip() for p in re.split(r"\s*/\s*", raw_temp)]
        breed["temperament"] = ", ".join(p.capitalize() for p in parts if p)

    return breed


def main():
    print("Fetching breed list...")
    links = get_breed_links()
    print(f"Found {len(links)} breeds")

    dogs = []
    for i, url in enumerate(links, 1):
        try:
            print(f"[{i}/{len(links)}] {url}")
            dog = parse_breed(url)
            dogs.append(dog)
            time.sleep(0.5)  # be polite
        except Exception as e:
            print(f"  Error: {e}")

    with open("dogs.json", "w") as f:
        json.dump(dogs, f, indent=2)

    print(f"\nSaved {len(dogs)} breeds to dogs.json")


if __name__ == "__main__":
    main()
