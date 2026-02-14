#!/usr/bin/env python3
"""
Analyze all downloaded n8n workflow templates and build a comprehensive
knowledge database about node types, parameters, connection patterns,
and workflow composition.

Outputs:
  - node_knowledge_db.json     : Complete node/block knowledge database
  - connection_patterns.json   : How nodes are commonly connected
  - workflow_patterns.json     : Common workflow archetypes & compositions
  - analysis_summary.md        : Human-readable summary report

Run: python3 -u analyze_templates.py
"""

import json
import sys
import time
import re
from pathlib import Path
from collections import Counter, defaultdict

sys.stdout.reconfigure(line_buffering=True)

WORKFLOWS_DIR = Path(__file__).parent / "workflows"
CATEGORIES_FILE = Path(__file__).parent / "categories.json"
INDEX_FILE = Path(__file__).parent / "template_index.json"
OUTPUT_DIR = Path(__file__).parent / "knowledge_db"


def load_all_workflows() -> list:
    """Load all workflow JSON files."""
    files = sorted(WORKFLOWS_DIR.glob("*.json"))
    workflows = []
    errors = 0
    for f in files:
        try:
            with open(f) as fh:
                data = json.load(fh)
                if data and isinstance(data, dict):
                    data["_source_file"] = f.name
                    workflows.append(data)
        except Exception:
            errors += 1
    print(f"Loaded {len(workflows)} workflows ({errors} errors)")
    return workflows


def extract_nodes(wf: dict) -> list:
    """Extract nodes from a workflow, handling nested structures."""
    inner = wf.get("workflow", {})
    if isinstance(inner, dict) and "nodes" in inner:
        return inner.get("nodes", [])
    return wf.get("nodes", [])


def extract_connections(wf: dict) -> dict:
    """Extract connections from a workflow."""
    inner = wf.get("workflow", {})
    if isinstance(inner, dict) and "connections" in inner:
        return inner.get("connections", {})
    return wf.get("connections", {})


def analyze_node_types(workflows: list) -> dict:
    """
    Build comprehensive knowledge about each node type:
    - How often it's used
    - What parameters are commonly set
    - Parameter value distributions
    - What other nodes it connects to/from
    - Common use cases / descriptions
    """
    print("Analyzing node types...")

    # node_type -> accumulated data
    node_data = defaultdict(lambda: {
        "count": 0,
        "workflow_count": 0,
        "display_names": Counter(),
        "type_versions": Counter(),
        "parameters": defaultdict(lambda: {
            "count": 0,
            "value_samples": [],
            "value_types": Counter(),
        }),
        "connects_to": Counter(),       # outgoing
        "connects_from": Counter(),     # incoming
        "credential_types": Counter(),
        "example_workflow_ids": [],
        "positions": [],
    })

    for wf in workflows:
        wf_id = wf.get("id", wf.get("_source_file", "?"))
        nodes = extract_nodes(wf)
        connections = extract_connections(wf)

        # Build name->type map for connection resolution
        name_to_type = {}
        for node in nodes:
            ntype = node.get("type", "unknown")
            nname = node.get("name", "")
            name_to_type[nname] = ntype

        # Track which types appear in this workflow
        wf_types = set()

        for node in nodes:
            ntype = node.get("type", "unknown")
            nd = node_data[ntype]
            nd["count"] += 1
            wf_types.add(ntype)

            # Display name
            dname = node.get("name", "")
            if dname:
                nd["display_names"][dname] += 1

            # Type version
            tv = node.get("typeVersion")
            if tv is not None:
                nd["type_versions"][str(tv)] += 1

            # Parameters
            params = node.get("parameters", {})
            analyze_params(nd["parameters"], params)

            # Credentials
            creds = node.get("credentials", {})
            for cred_type in creds:
                nd["credential_types"][cred_type] += 1

            # Sample workflow IDs (keep up to 5)
            if len(nd["example_workflow_ids"]) < 5:
                nd["example_workflow_ids"].append(wf_id)

        # Workflow count per type
        for t in wf_types:
            node_data[t]["workflow_count"] += 1

        # Connections: build outgoing/incoming
        for src_name, conn_types in connections.items():
            src_type = name_to_type.get(src_name, "unknown")
            if isinstance(conn_types, dict):
                for conn_key, targets_list in conn_types.items():
                    if isinstance(targets_list, list):
                        for targets in targets_list:
                            if isinstance(targets, list):
                                for tgt in targets:
                                    if isinstance(tgt, dict):
                                        tgt_name = tgt.get("node", "")
                                    elif isinstance(tgt, str):
                                        tgt_name = tgt
                                    else:
                                        continue
                                    tgt_type = name_to_type.get(tgt_name, "unknown")
                                    node_data[src_type]["connects_to"][tgt_type] += 1
                                    node_data[tgt_type]["connects_from"][src_type] += 1

    return node_data


def analyze_params(param_store: dict, params: dict, prefix: str = ""):
    """Recursively analyze parameters and their values."""
    for key, value in params.items():
        full_key = f"{prefix}.{key}" if prefix else key
        ps = param_store[full_key]
        ps["count"] += 1

        # Track value type
        vtype = type(value).__name__
        ps["value_types"][vtype] += 1

        # Sample values (keep up to 10 unique non-dict/list samples)
        if isinstance(value, (str, int, float, bool)):
            sample = str(value)
            if len(sample) > 200:
                sample = sample[:200] + "..."
            if len(ps["value_samples"]) < 10 and sample not in ps["value_samples"]:
                ps["value_samples"].append(sample)
        elif isinstance(value, dict):
            # Recurse into nested dicts
            analyze_params(param_store, value, full_key)
        elif isinstance(value, list) and len(value) > 0:
            # For lists, analyze the first element if it's a dict
            if isinstance(value[0], dict):
                for item in value[:3]:  # sample first 3
                    analyze_params(param_store, item, f"{full_key}[]")


def analyze_connection_patterns(workflows: list) -> dict:
    """
    Analyze how nodes are commonly connected:
    - Trigger -> Processing chains
    - Common pipeline patterns
    - Fan-out / fan-in patterns
    """
    print("Analyzing connection patterns...")

    # Edge pairs: (src_type, dst_type) -> count
    edge_counts = Counter()
    # Chain patterns: [type1 -> type2 -> type3] -> count
    chain_patterns = Counter()
    # Trigger patterns: trigger_type -> [next node types]
    trigger_chains = defaultdict(lambda: Counter())
    # Terminal nodes: last node in a chain
    terminal_nodes = Counter()
    # Fan-out: nodes that connect to multiple targets
    fan_out = Counter()

    for wf in workflows:
        nodes = extract_nodes(wf)
        connections = extract_connections(wf)

        name_to_type = {n.get("name", ""): n.get("type", "unknown") for n in nodes}

        # Build adjacency list
        adj = defaultdict(list)
        incoming = defaultdict(int)
        for src_name, conn_types in connections.items():
            if isinstance(conn_types, dict):
                for conn_key, targets_list in conn_types.items():
                    if isinstance(targets_list, list):
                        for targets in targets_list:
                            if isinstance(targets, list):
                                for tgt in targets:
                                    if isinstance(tgt, dict):
                                        tgt_name = tgt.get("node", "")
                                    elif isinstance(tgt, str):
                                        tgt_name = tgt
                                    else:
                                        continue
                                    src_t = name_to_type.get(src_name, "unknown")
                                    tgt_t = name_to_type.get(tgt_name, "unknown")
                                    edge_counts[(src_t, tgt_t)] += 1
                                    adj[src_name].append(tgt_name)
                                    incoming[tgt_name] += 1

        # Find triggers (nodes with no incoming) and trace chains
        all_names = set(name_to_type.keys())
        connected_names = set(adj.keys()) | set(incoming.keys())
        trigger_names = [n for n in all_names if n not in incoming and n in adj]

        for trig_name in trigger_names:
            trig_type = name_to_type.get(trig_name, "unknown")
            # BFS to find chains
            visited = set()
            queue = [(trig_name, [trig_type])]
            while queue:
                current, chain = queue.pop(0)
                if current in visited:
                    continue
                visited.add(current)
                nexts = adj.get(current, [])
                if not nexts:
                    # Terminal node
                    terminal_nodes[name_to_type.get(current, "unknown")] += 1
                    if len(chain) >= 2:
                        chain_key = " -> ".join(chain)
                        chain_patterns[chain_key] += 1
                else:
                    if len(nexts) > 1:
                        fan_out[name_to_type.get(current, "unknown")] += 1
                    for next_name in nexts:
                        next_type = name_to_type.get(next_name, "unknown")
                        if len(chain) == 1:
                            trigger_chains[trig_type][next_type] += 1
                        queue.append((next_name, chain + [next_type]))

    return {
        "edge_frequency": {f"{s} -> {t}": c for (s, t), c in edge_counts.most_common(500)},
        "chain_patterns": dict(chain_patterns.most_common(200)),
        "trigger_next_nodes": {
            trig: dict(nexts.most_common(20))
            for trig, nexts in sorted(trigger_chains.items(), key=lambda x: sum(x[1].values()), reverse=True)[:50]
        },
        "terminal_nodes": dict(terminal_nodes.most_common(50)),
        "fan_out_nodes": dict(fan_out.most_common(50)),
    }


def analyze_workflow_patterns(workflows: list) -> dict:
    """
    Identify common workflow archetypes:
    - Trigger types used
    - Workflow complexity (node count distribution)
    - Common node combinations
    - Category-based patterns
    """
    print("Analyzing workflow patterns...")

    complexity_dist = Counter()  # node count bucket -> count
    trigger_types = Counter()
    node_combos = Counter()  # frozenset of node types -> count
    wf_sizes = []

    archetypes = defaultdict(list)  # pattern label -> workflow examples

    for wf in workflows:
        wf_id = wf.get("id", "?")
        wf_name = wf.get("name", "?")
        nodes = extract_nodes(wf)

        # Skip sticky notes for analysis
        real_nodes = [n for n in nodes if n.get("type") != "n8n-nodes-base.stickyNote"]
        n_count = len(real_nodes)
        wf_sizes.append(n_count)

        # Complexity bucket
        if n_count <= 3:
            bucket = "tiny (1-3)"
        elif n_count <= 7:
            bucket = "small (4-7)"
        elif n_count <= 15:
            bucket = "medium (8-15)"
        elif n_count <= 30:
            bucket = "large (16-30)"
        else:
            bucket = "complex (30+)"
        complexity_dist[bucket] += 1

        # Trigger types
        for node in real_nodes:
            ntype = node.get("type", "")
            if any(t in ntype.lower() for t in ["trigger", "webhook", "schedule", "cron"]):
                trigger_types[ntype] += 1

        # Node type combination (unique set per workflow)
        type_set = frozenset(n.get("type", "?") for n in real_nodes)
        if 2 <= len(type_set) <= 8:
            node_combos[type_set] += 1

        # Classify archetype
        types_flat = set(n.get("type", "") for n in real_nodes)
        if any("langchain" in t or "agent" in t.lower() for t in types_flat):
            archetypes["AI/LangChain Agent"].append({"id": wf_id, "name": wf_name})
        elif any("openai" in t.lower() or "anthropic" in t.lower() or "gemini" in t.lower() for t in types_flat):
            archetypes["AI/LLM Integration"].append({"id": wf_id, "name": wf_name})
        elif any("webhook" in t.lower() for t in types_flat):
            archetypes["Webhook-Driven"].append({"id": wf_id, "name": wf_name})
        elif any("schedule" in t.lower() or "cron" in t.lower() for t in types_flat):
            archetypes["Scheduled/Cron"].append({"id": wf_id, "name": wf_name})

    # Top node combos
    top_combos = []
    for combo, count in node_combos.most_common(100):
        top_combos.append({
            "nodes": sorted(combo),
            "count": count,
        })

    return {
        "total_workflows": len(workflows),
        "complexity_distribution": dict(complexity_dist),
        "avg_nodes_per_workflow": sum(wf_sizes) / len(wf_sizes) if wf_sizes else 0,
        "median_nodes": sorted(wf_sizes)[len(wf_sizes)//2] if wf_sizes else 0,
        "trigger_types": dict(trigger_types.most_common(50)),
        "top_node_combinations": top_combos[:100],
        "archetype_counts": {k: len(v) for k, v in archetypes.items()},
        "archetype_examples": {k: v[:10] for k, v in archetypes.items()},
    }


def build_node_knowledge_db(node_data: dict) -> dict:
    """Convert raw analysis into a structured knowledge database."""
    print("Building node knowledge database...")

    db = {}
    for ntype, data in sorted(node_data.items(), key=lambda x: x[1]["count"], reverse=True):
        # Skip sticky notes
        if "stickyNote" in ntype:
            continue

        # Determine category from type name
        category = "core"
        if "langchain" in ntype:
            category = "ai"
        elif "n8n-nodes-base" in ntype:
            category = "built-in"
        elif "@n8n/" in ntype:
            category = "official"
        else:
            category = "community"

        # Most common display names
        top_names = data["display_names"].most_common(5)

        # Most important parameters (by frequency)
        param_info = {}
        for pkey, pdata in sorted(data["parameters"].items(),
                                   key=lambda x: x[1]["count"], reverse=True)[:30]:
            param_info[pkey] = {
                "usage_count": pdata["count"],
                "value_types": dict(pdata["value_types"]),
                "sample_values": pdata["value_samples"][:5],
            }

        # Top connections
        top_outgoing = data["connects_to"].most_common(10)
        top_incoming = data["connects_from"].most_common(10)

        db[ntype] = {
            "total_uses": data["count"],
            "workflow_count": data["workflow_count"],
            "category": category,
            "common_names": [{"name": n, "count": c} for n, c in top_names],
            "type_versions": dict(data["type_versions"]),
            "credential_types": dict(data["credential_types"]),
            "parameters": param_info,
            "commonly_connects_to": [{"type": t, "count": c} for t, c in top_outgoing],
            "commonly_connects_from": [{"type": t, "count": c} for t, c in top_incoming],
            "example_workflow_ids": data["example_workflow_ids"],
        }

    return db


def generate_summary_report(
    node_db: dict,
    conn_patterns: dict,
    wf_patterns: dict,
    total_workflows: int
) -> str:
    """Generate a human-readable markdown summary."""
    print("Generating summary report...")

    lines = [
        "# n8n Workflow Template Knowledge Database",
        "",
        f"**Generated from {total_workflows:,} workflow templates**",
        f"**{len(node_db):,} unique node types discovered**",
        "",
        "---",
        "",
        "## Table of Contents",
        "1. [Workflow Statistics](#workflow-statistics)",
        "2. [Top Node Types](#top-node-types)",
        "3. [Trigger Nodes](#trigger-nodes)",
        "4. [AI/LLM Nodes](#aillm-nodes)",
        "5. [Most Common Connection Patterns](#most-common-connection-patterns)",
        "6. [Workflow Archetypes](#workflow-archetypes)",
        "7. [Node Type Reference](#node-type-reference)",
        "",
        "---",
        "",
        "## Workflow Statistics",
        "",
        f"- **Total templates analyzed**: {total_workflows:,}",
        f"- **Unique node types**: {len(node_db):,}",
        f"- **Average nodes per workflow**: {wf_patterns.get('avg_nodes_per_workflow', 0):.1f}",
        f"- **Median nodes per workflow**: {wf_patterns.get('median_nodes', 0)}",
        "",
        "### Complexity Distribution",
        "",
        "| Size | Count | % |",
        "|------|-------|---|",
    ]

    for bucket, count in sorted(wf_patterns.get("complexity_distribution", {}).items()):
        pct = count / total_workflows * 100 if total_workflows else 0
        lines.append(f"| {bucket} | {count:,} | {pct:.1f}% |")

    lines.extend([
        "",
        "---",
        "",
        "## Top Node Types",
        "",
        "### By Usage Count (top 50)",
        "",
        "| # | Node Type | Uses | In Workflows | Category |",
        "|---|-----------|------|--------------|----------|",
    ])

    for i, (ntype, info) in enumerate(
        sorted(node_db.items(), key=lambda x: x[1]["total_uses"], reverse=True)[:50], 1
    ):
        short = ntype.split(".")[-1] if "." in ntype else ntype
        lines.append(
            f"| {i} | `{short}` | {info['total_uses']:,} | "
            f"{info['workflow_count']:,} | {info['category']} |"
        )

    # Trigger nodes section
    lines.extend([
        "",
        "---",
        "",
        "## Trigger Nodes",
        "",
        "| Trigger | Count | Common Next Nodes |",
        "|---------|-------|-------------------|",
    ])

    trigger_data = conn_patterns.get("trigger_next_nodes", {})
    for trig, nexts in list(trigger_data.items())[:20]:
        short = trig.split(".")[-1] if "." in trig else trig
        top_nexts = list(nexts.items())[:3]
        next_str = ", ".join(f"`{t.split('.')[-1]}` ({c})" for t, c in top_nexts)
        total_count = sum(nexts.values())
        lines.append(f"| `{short}` | {total_count} | {next_str} |")

    # AI nodes section
    lines.extend([
        "",
        "---",
        "",
        "## AI/LLM Nodes",
        "",
        "| Node | Uses | Workflows | Common Connections |",
        "|------|------|-----------|-------------------|",
    ])

    ai_nodes = {k: v for k, v in node_db.items()
                if v["category"] == "ai" or "openai" in k.lower() or "anthropic" in k.lower()}
    for ntype, info in sorted(ai_nodes.items(), key=lambda x: x[1]["total_uses"], reverse=True)[:30]:
        short = ntype.split(".")[-1] if "." in ntype else ntype
        conns = ", ".join(
            f"`{c['type'].split('.')[-1]}`" for c in info["commonly_connects_to"][:3]
        )
        lines.append(
            f"| `{short}` | {info['total_uses']:,} | "
            f"{info['workflow_count']:,} | {conns} |"
        )

    # Connection patterns
    lines.extend([
        "",
        "---",
        "",
        "## Most Common Connection Patterns",
        "",
        "### Edge Frequency (top 50)",
        "",
        "| Source -> Target | Count |",
        "|-----------------|-------|",
    ])

    edges = conn_patterns.get("edge_frequency", {})
    for edge, count in list(edges.items())[:50]:
        parts = edge.split(" -> ")
        if len(parts) == 2:
            s = parts[0].split(".")[-1] if "." in parts[0] else parts[0]
            t = parts[1].split(".")[-1] if "." in parts[1] else parts[1]
            lines.append(f"| `{s}` -> `{t}` | {count:,} |")

    # Chain patterns
    lines.extend([
        "",
        "### Common Workflow Chains (top 30)",
        "",
        "| Chain Pattern | Count |",
        "|---------------|-------|",
    ])
    chains = conn_patterns.get("chain_patterns", {})
    for chain, count in list(chains.items())[:30]:
        short_chain = " -> ".join(
            f"`{p.split('.')[-1]}`" if "." in p else f"`{p}`"
            for p in chain.split(" -> ")
        )
        lines.append(f"| {short_chain} | {count} |")

    # Workflow archetypes
    lines.extend([
        "",
        "---",
        "",
        "## Workflow Archetypes",
        "",
        "| Archetype | Count |",
        "|-----------|-------|",
    ])
    for arch, count in sorted(
        wf_patterns.get("archetype_counts", {}).items(),
        key=lambda x: x[1], reverse=True
    ):
        lines.append(f"| {arch} | {count:,} |")

    # Node type quick reference
    lines.extend([
        "",
        "---",
        "",
        "## Node Type Reference",
        "",
        "### Complete list by category",
        "",
    ])

    by_cat = defaultdict(list)
    for ntype, info in node_db.items():
        by_cat[info["category"]].append((ntype, info))

    for cat in ["built-in", "ai", "official", "community", "core"]:
        if cat not in by_cat:
            continue
        items = sorted(by_cat[cat], key=lambda x: x[1]["total_uses"], reverse=True)
        lines.append(f"### {cat.title()} ({len(items)} types)")
        lines.append("")
        for ntype, info in items[:100]:  # cap at 100 per category
            short = ntype.split(".")[-1] if "." in ntype else ntype
            creds = ", ".join(info["credential_types"].keys()) if info["credential_types"] else "none"
            lines.append(f"- **`{short}`** — {info['total_uses']:,} uses in {info['workflow_count']:,} workflows. Credentials: {creds}")
        lines.append("")

    # Parameter reference for top nodes
    lines.extend([
        "",
        "---",
        "",
        "## Parameter Reference (Top 30 Nodes)",
        "",
    ])

    top_nodes = sorted(node_db.items(), key=lambda x: x[1]["total_uses"], reverse=True)[:30]
    for ntype, info in top_nodes:
        short = ntype.split(".")[-1] if "." in ntype else ntype
        lines.append(f"### `{short}` ({info['total_uses']:,} uses)")
        lines.append("")
        lines.append("| Parameter | Used | Value Types | Sample Values |")
        lines.append("|-----------|------|-------------|---------------|")
        for pkey, pinfo in sorted(info["parameters"].items(),
                                   key=lambda x: x[1]["usage_count"], reverse=True)[:15]:
            vtypes = ", ".join(pinfo["value_types"].keys())
            samples = "; ".join(pinfo["sample_values"][:3])
            if len(samples) > 80:
                samples = samples[:80] + "..."
            lines.append(f"| `{pkey}` | {pinfo['usage_count']:,} | {vtypes} | {samples} |")
        lines.append("")

    return "\n".join(lines)


def main():
    t0 = time.time()
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Load all workflows
    workflows = load_all_workflows()

    # 1. Analyze node types
    raw_node_data = analyze_node_types(workflows)

    # 2. Build node knowledge DB
    node_db = build_node_knowledge_db(raw_node_data)
    with open(OUTPUT_DIR / "node_knowledge_db.json", "w") as f:
        json.dump(node_db, f, indent=2, ensure_ascii=False)
    print(f"  Saved node_knowledge_db.json ({len(node_db)} node types)")

    # 3. Analyze connection patterns
    conn_patterns = analyze_connection_patterns(workflows)
    with open(OUTPUT_DIR / "connection_patterns.json", "w") as f:
        json.dump(conn_patterns, f, indent=2, ensure_ascii=False)
    print(f"  Saved connection_patterns.json")

    # 4. Analyze workflow patterns
    wf_patterns = analyze_workflow_patterns(workflows)
    with open(OUTPUT_DIR / "workflow_patterns.json", "w") as f:
        json.dump(wf_patterns, f, indent=2, ensure_ascii=False)
    print(f"  Saved workflow_patterns.json")

    # 5. Generate summary report
    report = generate_summary_report(node_db, conn_patterns, wf_patterns, len(workflows))
    with open(OUTPUT_DIR / "analysis_summary.md", "w") as f:
        f.write(report)
    print(f"  Saved analysis_summary.md")

    elapsed = time.time() - t0
    print(f"\nAnalysis complete in {elapsed:.0f}s!")
    print(f"  Output directory: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
