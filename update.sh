#!/bin/bash
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
LOG="$DIR/update.log"
PYTHON=/usr/bin/python3

{
  echo "=== $(date) ==="
  cd "$DIR"
  $PYTHON scraper.py
  $PYTHON - << 'EOF'
import json, sqlite3, os

with open("dogs.json") as f:
    dogs = json.load(f)

con = sqlite3.connect("dogs.db")
cur = con.cursor()
cur.execute("DELETE FROM breeds")
cur.executemany(
    """INSERT INTO breeds (name, group_name, height, weight, life_expectancy, temperament, about, url)
       VALUES (:name, :group, :height, :weight, :life_expectancy, :temperament, :about, :url)""",
    [{
        "name":            d.get("name"),
        "group":           d.get("group"),
        "height":          d.get("height"),
        "weight":          d.get("weight"),
        "life_expectancy": d.get("life_expectancy"),
        "temperament":     d.get("temperament"),
        "about":           d.get("about"),
        "url":             d.get("url"),
    } for d in dogs],
)
con.commit()
count = con.execute("SELECT COUNT(*) FROM breeds").fetchone()[0]
con.close()
print(f"dogs.db refreshed: {count} breeds")
EOF
  echo "Done."
} >> "$LOG" 2>&1
