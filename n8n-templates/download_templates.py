#!/usr/bin/env python3
"""
Download all n8n workflow templates from the public API.
Run with: python3 -u download_templates.py
"""

import json
import os
import ssl
import sys
import time
import re
import math
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.request import urlopen, Request
from urllib.error import URLError, HTTPError

# Force unbuffered output
sys.stdout.reconfigure(line_buffering=True)

API_BASE = "https://api.n8n.io/api/templates"
SEARCH_PAGE_SIZE = 250  # max
DETAIL_CONCURRENCY = 30
OUTPUT_DIR = Path(__file__).parent / "workflows"
INDEX_FILE = Path(__file__).parent / "template_index.json"
CATEGORIES_FILE = Path(__file__).parent / "categories.json"
PROGRESS_FILE = Path(__file__).parent / ".download_progress.json"

# SSL context - macOS Python often lacks root certs
SSL_CTX = ssl._create_unverified_context()


def api_get(url: str, retries: int = 3, timeout: int = 30) -> dict:
    for attempt in range(retries):
        try:
            req = Request(url, headers={
                "Accept": "application/json",
                "User-Agent": "n8n-template-downloader/1.0"
            })
            with urlopen(req, timeout=timeout, context=SSL_CTX) as resp:
                return json.loads(resp.read().decode())
        except (URLError, HTTPError, TimeoutError, ConnectionResetError) as e:
            if attempt < retries - 1:
                wait = 2 ** (attempt + 1)
                print(f"  Retry {attempt+1}/{retries}: {e} (wait {wait}s)")
                time.sleep(wait)
            else:
                raise


def sanitize_filename(name: str) -> str:
    name = re.sub(r'[<>:"/\\|?*\x00-\x1f]', '_', name)
    name = re.sub(r'\s+', '_', name)
    name = re.sub(r'_+', '_', name)
    name = name.strip('_.')
    return name[:120].rstrip('_') if len(name) > 120 else name


def fetch_categories() -> list:
    print("Fetching categories...")
    data = api_get(f"{API_BASE}/categories")
    cats = data.get("categories", [])
    print(f"  Found {len(cats)} categories")
    return cats


def fetch_all_template_ids() -> list:
    """Fetch all template IDs via paginated search."""
    print("Fetching template index...")
    data = api_get(f"{API_BASE}/search?page=1&rows={SEARCH_PAGE_SIZE}")
    total = data.get("totalWorkflows", 0)
    all_t = data.get("workflows", [])
    total_pages = math.ceil(total / SEARCH_PAGE_SIZE)
    print(f"  Total: {total} templates across {total_pages} pages")
    print(f"  Page 1/{total_pages}: {len(all_t)} collected")

    for page in range(2, total_pages + 1):
        try:
            d = api_get(f"{API_BASE}/search?page={page}&rows={SEARCH_PAGE_SIZE}")
            wfs = d.get("workflows", [])
            all_t.extend(wfs)
            print(f"  Page {page}/{total_pages}: {len(all_t)} collected")
        except Exception as e:
            print(f"  ERROR page {page}: {e}")
    
    print(f"  Total collected: {len(all_t)}")
    return all_t


def download_one(tid: int, filename: str) -> bool:
    """Download one template. Returns True on success."""
    fp = OUTPUT_DIR / f"{filename}.json"
    if fp.exists() and fp.stat().st_size > 100:
        return True  # already cached

    try:
        data = api_get(f"{API_BASE}/workflows/{tid}", timeout=20)
        wf = data.get("workflow", {})
        with open(fp, "w") as f:
            json.dump(wf, f, indent=2, ensure_ascii=False)
        return True
    except Exception:
        return False


def load_progress() -> set:
    if PROGRESS_FILE.exists():
        with open(PROGRESS_FILE) as f:
            return set(json.load(f))
    return set()


def save_progress(ids: set):
    with open(PROGRESS_FILE, "w") as f:
        json.dump(sorted(ids), f)


def main():
    t0 = time.time()
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # 1. Categories
    cats = fetch_categories()
    with open(CATEGORIES_FILE, "w") as f:
        json.dump(cats, f, indent=2, ensure_ascii=False)

    # 2. Build index
    templates = fetch_all_template_ids()
    index = []
    for t in templates:
        tid = t.get("id")
        name = t.get("name", f"template_{tid}")
        fname = f"{tid}_{sanitize_filename(name)}"
        nodes = [n.get("name", "?") for n in t.get("nodes", [])]
        index.append({
            "id": tid, "name": name, "filename": fname,
            "totalViews": t.get("totalViews", 0),
            "createdAt": t.get("createdAt", ""),
            "node_types": nodes,
            "user": t.get("user", {}).get("username", ""),
        })

    with open(INDEX_FILE, "w") as f:
        json.dump({"total": len(index), "templates": index}, f, indent=2)
    print(f"Index saved: {len(index)} templates")

    # 3. Download details in parallel
    done = load_progress()
    todo = [(t["id"], t["filename"]) for t in index if t["id"] not in done]
    print(f"\nDownloading {len(todo)} templates ({len(done)} cached)...")

    ok = 0
    fail = 0
    with ThreadPoolExecutor(max_workers=DETAIL_CONCURRENCY) as pool:
        futs = {pool.submit(download_one, tid, fn): tid for tid, fn in todo}
        for i, fut in enumerate(as_completed(futs), 1):
            tid = futs[fut]
            try:
                if fut.result():
                    done.add(tid)
                    ok += 1
                else:
                    fail += 1
            except Exception:
                fail += 1

            if i % 200 == 0 or i == len(todo):
                elapsed = time.time() - t0
                rate = i / elapsed if elapsed > 0 else 0
                eta = (len(todo) - i) / rate if rate > 0 else 0
                print(f"  [{i}/{len(todo)}] ok={ok} fail={fail} "
                      f"({rate:.0f}/s, ETA {eta:.0f}s)")
                save_progress(done)

    save_progress(done)
    total_files = len(list(OUTPUT_DIR.glob("*.json")))
    elapsed = time.time() - t0
    print(f"\nDone in {elapsed:.0f}s!")
    print(f"  Downloaded: {ok}, Failed: {fail}, Total on disk: {total_files}")


if __name__ == "__main__":
    main()
