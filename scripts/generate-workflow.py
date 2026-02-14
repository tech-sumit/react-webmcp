#!/usr/bin/env python3
"""
n8n Workflow Generator
Generates valid n8n workflow JSON from a natural language description,
using the template knowledge database as context.

Usage:
    python3 scripts/generate-workflow.py "Send a Slack message every morning with weather"
    python3 scripts/generate-workflow.py --deploy "Webhook that saves data to Google Sheets"
    python3 scripts/generate-workflow.py --list-nodes          # Show available node types
    python3 scripts/generate-workflow.py --output workflow.json "My workflow idea"

Requires: OPENCLAW_API_KEY (Anthropic) in .env
Optional: N8N_API_KEY + N8N_URL in .env for --deploy
"""

import argparse
import json
import os
import sys
import ssl
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import URLError

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_DIR = SCRIPT_DIR.parent
KNOWLEDGE_DIR = PROJECT_DIR / "n8n-templates" / "knowledge_db"
NODE_DB_PATH = KNOWLEDGE_DIR / "node_knowledge_db.json"
CONN_DB_PATH = KNOWLEDGE_DIR / "connection_patterns.json"
PATTERN_DB_PATH = KNOWLEDGE_DIR / "workflow_patterns.json"
ENV_PATH = PROJECT_DIR / ".env"

# ---------------------------------------------------------------------------
# Environment
# ---------------------------------------------------------------------------
def load_env():
    """Load .env file into os.environ."""
    if ENV_PATH.exists():
        with open(ENV_PATH) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, _, val = line.partition("=")
                    os.environ.setdefault(key.strip(), val.strip())


def get_ssl_context():
    """Get SSL context, with fallback for macOS certificate issues."""
    try:
        import certifi
        return ssl.create_default_context(cafile=certifi.where())
    except ImportError:
        pass
    ctx = ssl.create_default_context()
    try:
        urlopen(Request("https://api.anthropic.com", method="HEAD"), context=ctx, timeout=5)
        return ctx
    except Exception:
        return ssl._create_unverified_context()


# ---------------------------------------------------------------------------
# Knowledge DB
# ---------------------------------------------------------------------------
def load_knowledge_db(top_n=100):
    """Load and condense the knowledge DB for prompt context."""
    with open(NODE_DB_PATH) as f:
        node_db = json.load(f)

    with open(CONN_DB_PATH) as f:
        conn_db = json.load(f)

    with open(PATTERN_DB_PATH) as f:
        patterns = json.load(f)

    # Top N nodes by usage
    sorted_nodes = sorted(node_db.items(), key=lambda x: x[1]["total_uses"], reverse=True)[:top_n]

    condensed_nodes = {}
    for node_type, info in sorted_nodes:
        # Get top parameter names and sample values
        params = {}
        for pname, pinfo in sorted(
            info.get("parameters", {}).items(),
            key=lambda x: x[1]["usage_count"],
            reverse=True,
        )[:10]:
            params[pname] = {
                "usage_count": pinfo["usage_count"],
                "types": pinfo.get("value_types", {}),
                "samples": pinfo.get("sample_values", [])[:5],
            }

        condensed_nodes[node_type] = {
            "uses": info["total_uses"],
            "workflows": info["workflow_count"],
            "category": info["category"],
            "names": [n["name"] for n in info.get("common_names", [])[:3]],
            "versions": info.get("type_versions", {}),
            "credentials": list(info.get("credential_types", {}).keys())[:5],
            "params": params,
        }

    # Top 50 connection patterns
    edge_freq = conn_db.get("edge_frequency", {})
    top_connections = sorted(edge_freq.items(), key=lambda x: x[1], reverse=True)[:50]

    # Trigger types from patterns
    trigger_types = patterns.get("trigger_types", {})

    return {
        "nodes": condensed_nodes,
        "connections": dict(top_connections),
        "triggers": trigger_types,
        "avg_nodes": patterns.get("avg_nodes_per_workflow", 14),
        "top_combos": patterns.get("top_node_combinations", [])[:20],
    }


def format_knowledge_context(kb):
    """Format knowledge DB into a concise text block for the AI prompt."""
    lines = []
    lines.append("## Available n8n Node Types (top 100 by usage)")
    lines.append("")
    for ntype, info in kb["nodes"].items():
        creds = f" creds=[{', '.join(info['credentials'])}]" if info['credentials'] else ""
        versions = list(info["versions"].keys())
        ver = versions[0] if len(versions) == 1 else str(versions)
        lines.append(f"- `{ntype}` (v{ver}) — {info['uses']} uses, {info['workflows']} workflows{creds}")
        if info["params"]:
            param_strs = []
            for pname, pinfo in list(info["params"].items())[:6]:
                samples = pinfo.get("samples", [])
                sample_str = f" e.g. {samples[0]}" if samples else ""
                param_strs.append(f"{pname}{sample_str}")
            lines.append(f"  params: {', '.join(param_strs)}")

    lines.append("")
    lines.append("## Common Connection Patterns (source -> target: count)")
    lines.append("")
    for edge, count in list(kb["connections"].items())[:30]:
        lines.append(f"- {edge}: {count}")

    lines.append("")
    lines.append("## Trigger Types (by frequency)")
    lines.append("")
    for trigger, count in sorted(kb["triggers"].items(), key=lambda x: x[1], reverse=True)[:15]:
        lines.append(f"- `{trigger}`: {count}")

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# AI Generation
# ---------------------------------------------------------------------------
SYSTEM_PROMPT = """You are an expert n8n workflow designer. You generate valid n8n workflow JSON
from natural language descriptions. You have deep knowledge of n8n node types, their parameters,
connection patterns, and best practices.

RULES:
1. Output ONLY valid JSON — no markdown, no explanation, no code fences.
2. Every workflow MUST start with a trigger node (webhook, scheduleTrigger, manualTrigger, etc.).
3. Every node MUST have: name, type, typeVersion, position, parameters.
4. Positions: start at [250, 300], increment x by 250 for each subsequent node.
5. Node names MUST be unique within the workflow.
6. The connections object maps source node names to their output targets.
7. Use realistic parameter values, not placeholders (except for credentials/secrets).
8. For credential-requiring nodes, include a "credentials" field with the credential type.
9. Include error handling (continueOnFail) on nodes that may fail (HTTP requests, API calls).
10. Add a "settings" object with: {"executionOrder": "v1"}.
11. For IF nodes: output index 0 = true branch, index 1 = false branch.
12. Use the latest typeVersion for each node (check the knowledge base).
13. The workflow should be practical and production-ready."""

def build_user_prompt(description: str, knowledge_context: str) -> str:
    return f"""Generate an n8n workflow for the following idea:

"{description}"

Use the knowledge base below to pick the right node types, parameters, and connection patterns.

{knowledge_context}

Generate a complete, valid n8n workflow JSON with this exact structure:
{{
  "name": "descriptive-workflow-name",
  "nodes": [...],
  "connections": {{...}},
  "active": false,
  "settings": {{"executionOrder": "v1"}}
}}

Output ONLY the JSON object. No explanation."""


def call_anthropic(prompt: str, system: str, api_key: str) -> str:
    """Call the Anthropic Messages API."""
    ctx = get_ssl_context()
    payload = json.dumps({
        "model": "claude-sonnet-4-20250514",
        "max_tokens": 8192,
        "system": system,
        "messages": [{"role": "user", "content": prompt}],
    }).encode()

    req = Request(
        "https://api.anthropic.com/v1/messages",
        data=payload,
        headers={
            "Content-Type": "application/json",
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
        },
        method="POST",
    )

    try:
        with urlopen(req, context=ctx, timeout=120) as resp:
            data = json.loads(resp.read())
            # Extract text from the response
            for block in data.get("content", []):
                if block.get("type") == "text":
                    return block["text"]
            return ""
    except URLError as e:
        print(f"ERROR: Anthropic API call failed: {e}", file=sys.stderr)
        sys.exit(1)


def parse_workflow_json(text: str) -> dict:
    """Extract and parse JSON from AI response."""
    # Try direct parse first
    text = text.strip()
    if text.startswith("```"):
        # Strip code fences
        lines = text.split("\n")
        lines = [l for l in lines if not l.strip().startswith("```")]
        text = "\n".join(lines).strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Try to find JSON object in the text
        start = text.find("{")
        end = text.rfind("}") + 1
        if start >= 0 and end > start:
            try:
                return json.loads(text[start:end])
            except json.JSONDecodeError:
                pass
        print("ERROR: Could not parse workflow JSON from AI response.", file=sys.stderr)
        print("Raw response:", text[:500], file=sys.stderr)
        sys.exit(1)


def fix_workflow(wf: dict) -> dict:
    """Fix common AI output issues before validation."""
    for node in wf.get("nodes", []):
        # Coerce typeVersion to number (AI sometimes returns string "2.1")
        if "typeVersion" in node:
            try:
                tv = float(node["typeVersion"])
                node["typeVersion"] = int(tv) if tv == int(tv) else tv
            except (ValueError, TypeError):
                pass
        # Ensure parameters exists
        if "parameters" not in node:
            node["parameters"] = {}
    return wf


def validate_workflow(wf: dict) -> list:
    """Validate the generated workflow and return a list of issues."""
    issues = []
    if "nodes" not in wf or not isinstance(wf["nodes"], list):
        issues.append("Missing or invalid 'nodes' array")
    if "connections" not in wf:
        issues.append("Missing 'connections' object")

    node_names = set()
    has_trigger = False
    for i, node in enumerate(wf.get("nodes", [])):
        if "name" not in node:
            issues.append(f"Node {i}: missing 'name'")
        elif node["name"] in node_names:
            issues.append(f"Node {i}: duplicate name '{node['name']}'")
        else:
            node_names.add(node["name"])

        if "type" not in node:
            issues.append(f"Node {i}: missing 'type'")
        elif "trigger" in node.get("type", "").lower() or "webhook" in node.get("type", "").lower():
            has_trigger = True

        if "position" not in node:
            issues.append(f"Node {i}: missing 'position'")
        if "parameters" not in node:
            node["parameters"] = {}
        if "typeVersion" not in node:
            issues.append(f"Node {i}: missing 'typeVersion'")

    if not has_trigger:
        issues.append("No trigger node found (workflow needs a trigger to start)")

    # Validate connections reference existing nodes
    for src, conns in wf.get("connections", {}).items():
        if src not in node_names:
            issues.append(f"Connection source '{src}' not in nodes")
        for output_type, outputs in conns.items():
            for output_group in outputs:
                for conn in output_group:
                    target = conn.get("node", "")
                    if target not in node_names:
                        issues.append(f"Connection target '{target}' not in nodes")

    return issues


# ---------------------------------------------------------------------------
# n8n API
# ---------------------------------------------------------------------------
def deploy_to_n8n(workflow: dict, api_key: str, base_url: str) -> dict:
    """Deploy workflow to n8n via REST API."""
    ctx = get_ssl_context()
    # n8n API: 'active' is read-only on create; remove it
    deploy_wf = {k: v for k, v in workflow.items() if k != "active"}
    # Strip placeholder credential IDs that would cause errors
    for node in deploy_wf.get("nodes", []):
        if "credentials" in node:
            del node["credentials"]
    payload = json.dumps(deploy_wf).encode()

    req = Request(
        f"{base_url}/api/v1/workflows",
        data=payload,
        headers={
            "Content-Type": "application/json",
            "X-N8N-API-KEY": api_key,
        },
        method="POST",
    )

    try:
        with urlopen(req, context=ctx, timeout=30) as resp:
            return json.loads(resp.read())
    except URLError as e:
        body = ""
        if hasattr(e, "read"):
            body = e.read().decode()
        print(f"ERROR: n8n API call failed: {e}\n{body}", file=sys.stderr)
        sys.exit(1)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(
        description="Generate n8n workflows from natural language descriptions"
    )
    parser.add_argument("description", nargs="?", help="Workflow description")
    parser.add_argument("--deploy", action="store_true", help="Deploy to n8n after generation")
    parser.add_argument("--activate", action="store_true", help="Activate workflow after deploy")
    parser.add_argument("--output", "-o", help="Write workflow JSON to file")
    parser.add_argument("--list-nodes", action="store_true", help="List available node types")
    parser.add_argument("--top-n", type=int, default=100, help="Number of top nodes for context")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")
    args = parser.parse_args()

    load_env()

    # List nodes mode
    if args.list_nodes:
        kb = load_knowledge_db(args.top_n)
        for ntype, info in kb["nodes"].items():
            creds = f" [{', '.join(info['credentials'])}]" if info["credentials"] else ""
            print(f"{ntype:55s} {info['uses']:6d} uses  {info['category']:10s}{creds}")
        return

    if not args.description:
        parser.print_help()
        sys.exit(1)

    api_key = os.environ.get("OPENCLAW_API_KEY", "")
    if not api_key:
        print("ERROR: OPENCLAW_API_KEY not set in .env", file=sys.stderr)
        sys.exit(1)

    # Load knowledge DB
    print("Loading knowledge database...", file=sys.stderr)
    kb = load_knowledge_db(args.top_n)
    knowledge_context = format_knowledge_context(kb)

    if args.verbose:
        print(f"Knowledge context: {len(knowledge_context)} chars, {len(kb['nodes'])} nodes", file=sys.stderr)

    # Generate workflow
    print(f"Generating workflow: \"{args.description}\"...", file=sys.stderr)
    user_prompt = build_user_prompt(args.description, knowledge_context)
    response_text = call_anthropic(user_prompt, SYSTEM_PROMPT, api_key)

    # Parse, fix, and validate
    workflow = parse_workflow_json(response_text)
    workflow = fix_workflow(workflow)
    issues = validate_workflow(workflow)

    if issues:
        print(f"\nValidation warnings ({len(issues)}):", file=sys.stderr)
        for issue in issues:
            print(f"  - {issue}", file=sys.stderr)

    # Summary
    nodes = workflow.get("nodes", [])
    conns = workflow.get("connections", {})
    print(f"\nGenerated: \"{workflow.get('name', 'unnamed')}\"", file=sys.stderr)
    print(f"  Nodes: {len(nodes)}", file=sys.stderr)
    for n in nodes:
        print(f"    - {n['name']} ({n['type']})", file=sys.stderr)
    print(f"  Connections: {sum(len(v.get('main', [[]])[0]) for v in conns.values() if isinstance(v, dict))} edges", file=sys.stderr)

    # Output
    workflow_json = json.dumps(workflow, indent=2)

    if args.output:
        with open(args.output, "w") as f:
            f.write(workflow_json + "\n")
        print(f"  Saved to: {args.output}", file=sys.stderr)
    else:
        print(workflow_json)

    # Deploy
    if args.deploy:
        n8n_key = os.environ.get("N8N_API_KEY", "")
        n8n_url = os.environ.get("N8N_URL", "http://localhost:5678")
        if not n8n_key:
            print("ERROR: N8N_API_KEY not set in .env (required for --deploy)", file=sys.stderr)
            sys.exit(1)

        if args.activate:
            workflow["active"] = True

        print(f"\nDeploying to n8n at {n8n_url}...", file=sys.stderr)
        result = deploy_to_n8n(workflow, n8n_key, n8n_url)
        wf_id = result.get("id", "?")
        print(f"  Deployed: ID={wf_id}", file=sys.stderr)
        print(f"  URL: {n8n_url}/workflow/{wf_id}", file=sys.stderr)


if __name__ == "__main__":
    main()
