#!/usr/bin/env python3
"""Bulk import n8n workflow templates via the REST API."""

import json
import os
import sys
import urllib.request
import urllib.error
from pathlib import Path

TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "n8n-templates" / "workflows"
FAILED_LOG = Path(__file__).resolve().parent.parent / "n8n-templates" / "import-failed.txt"
N8N_URL = os.environ.get("N8N_URL", "http://localhost:5678")
API_KEY = os.environ.get("N8N_API_KEY", "")
ALLOWED_FIELDS = {"name", "nodes", "connections", "settings", "staticData"}
BATCH_SIZE = 50


def import_workflow(filepath: Path) -> dict:
    with open(filepath) as f:
        data = json.load(f)

    wf = data.get("workflow", data)
    payload = {k: v for k, v in wf.items() if k in ALLOWED_FIELDS}

    if "name" not in payload and "name" in data:
        payload["name"] = data["name"]

    if "name" not in payload:
        return {"ok": False, "name": filepath.name, "error": "no name field"}

    # Ensure required fields have defaults
    payload.setdefault("settings", {})
    payload.setdefault("nodes", [])
    payload.setdefault("connections", {})

    body = json.dumps(payload).encode()
    req = urllib.request.Request(
        f"{N8N_URL}/api/v1/workflows",
        data=body,
        headers={
            "X-N8N-API-KEY": API_KEY,
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            result = json.loads(resp.read())
            return {"ok": True, "name": result.get("name", ""), "id": result.get("id", "")}
    except urllib.error.HTTPError as e:
        err_body = e.read().decode()[:200]
        return {"ok": False, "name": payload.get("name", filepath.name), "error": f"HTTP {e.code}: {err_body}"}
    except Exception as e:
        return {"ok": False, "name": payload.get("name", filepath.name), "error": str(e)[:200]}


def main():
    if not API_KEY:
        print("ERROR: N8N_API_KEY env var not set")
        sys.exit(1)

    retry_mode = "--retry" in sys.argv

    if retry_mode and FAILED_LOG.exists():
        failed_files = [TEMPLATES_DIR / line.strip() for line in FAILED_LOG.read_text().splitlines() if line.strip()]
        files = [f for f in failed_files if f.exists()]
        print(f"Retry mode: {len(files)} previously failed files")
    else:
        files = sorted(TEMPLATES_DIR.glob("*.json"))

    total = len(files)
    print(f"Processing {total} workflow templates")

    success = 0
    failed = 0
    errors = []
    failed_filenames = []

    for i, f in enumerate(files, 1):
        result = import_workflow(f)
        if result["ok"]:
            success += 1
        else:
            failed += 1
            errors.append(result)
            failed_filenames.append(f.name)

        if i % BATCH_SIZE == 0 or i == total:
            print(f"  [{i}/{total}] imported={success} failed={failed}", flush=True)

    # Write failed files log for retry
    FAILED_LOG.write_text("\n".join(failed_filenames) + "\n" if failed_filenames else "")

    print(f"\nDone: {success} imported, {failed} failed out of {total}")
    if errors:
        print(f"\nFirst 20 errors:")
        for e in errors[:20]:
            print(f"  - {e['name']}: {e['error']}")
    if failed_filenames:
        print(f"\nFailed files logged to: {FAILED_LOG}")
        print("Re-run with --retry to retry only failed files")


if __name__ == "__main__":
    main()
