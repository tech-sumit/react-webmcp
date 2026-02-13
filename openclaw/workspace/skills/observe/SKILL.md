# Skill: Observability

## Description

Query logs (Loki/LogQL), metrics (Prometheus/PromQL), inspect n8n executions, monitor OpenClaw telemetry, and correlate across all services for health assessment and debugging.

## When to Use

- Investigating errors or performance issues
- Checking system health
- Monitoring workflow execution metrics
- Tracking LLM usage and cost
- Correlating issues across multiple services
- Answering "why is X slow/broken/failing?"

## Log Queries (Grafana Cloud Loki)

### Via Make
```bash
make logs-query QUERY='{container_name="n8n"} |= "error"' START=1h
```

### Via API
```bash
curl -s -G \
  -H "Authorization: Bearer $GRAFANA_CLOUD_API_KEY" \
  --data-urlencode 'query={container_name="n8n"} |= "error" | json | level="error"' \
  --data-urlencode "start=$(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ)" \
  "$GRAFANA_CLOUD_LOKI_URL/loki/api/v1/query_range" | jq '.data.result'
```

### Common LogQL Queries

| Question | LogQL |
|----------|-------|
| n8n errors last hour | `{container_name="n8n"} \|= "error" \| json \| level="error"` |
| Vault audit logs | `{container_name="n8n-vault"}` |
| Redis issues | `{container_name="n8n-redis"} \|= "error"` |
| Cloudflare tunnel | `{container_name="n8n-cloudflared"}` |
| OpenClaw errors | `{service="openclaw"} \| json \| level="error"` |
| OpenClaw tool failures | `{service="openclaw_telemetry", event_type="tool.end"} \| json \| success="false"` |
| LLM usage events | `{service="openclaw_telemetry", event_type="llm.usage"}` |
| All errors | `{service=~".+"} \| json \| level="error"` |

## Metric Queries (Grafana Cloud Prometheus)

### Via Make
```bash
make metrics-query QUERY='sum(rate(n8n_workflow_execution_total{status="error"}[5m]))'
```

### Via API
```bash
curl -s -G \
  -u "$GRAFANA_CLOUD_USER:$GRAFANA_CLOUD_API_KEY" \
  --data-urlencode 'query=sum(rate(n8n_workflow_execution_total{status="error"}[5m]))' \
  "$GRAFANA_CLOUD_PROMETHEUS_URL/api/v1/query" | jq '.data.result'
```

### Common PromQL Queries

| Question | PromQL |
|----------|--------|
| Failed workflows today | `sum(increase(n8n_workflow_execution_total{status="error"}[24h]))` |
| Avg execution time | `avg(rate(n8n_workflow_execution_duration_seconds_sum[1h]) / rate(n8n_workflow_execution_duration_seconds_count[1h]))` |
| Queue depth | `n8n_scaling_mode_queue_jobs_waiting` |
| Container CPU usage | `sort_desc(rate(container_cpu_usage_seconds_total[5m]))` |
| VM memory available | `node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes * 100` |
| VM disk usage | `(1 - node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}) * 100` |
| VM state | `parallels_vm_state` |
| VM CPU load | `parallels_vm_cpu_load` |
| VM memory load | `parallels_vm_memory_load` |
| VM disk read I/O | `parallels_vm_disk_read_bytes` |
| VM disk write I/O | `parallels_vm_disk_write_bytes` |
| Host CPU | `parallels_host_cpu_percent` |
| Host memory | `parallels_host_memory_percent` |

## n8n Execution Inspection

```bash
# Last 5 executions
bash scripts/n8n-ctl.sh executions "workflow-name" --limit 5

# Failed execution details
bash scripts/n8n-ctl.sh debug "workflow-name"

# Specific execution
bash scripts/n8n-ctl.sh execution-detail <exec-id>
```

## OpenClaw Agent Introspection

### Via Loki
```bash
# LLM cost today
make logs-query QUERY='{service="openclaw_telemetry", event_type="llm.usage"} | json | line_format "{{.costUsd}}"' START=24h

# Failed tool calls
make logs-query QUERY='{service="openclaw_telemetry", event_type="tool.end"} | json | success="false"' START=1h

# Session activity
make logs-query QUERY='{service="openclaw_telemetry", event_type=~"agent.start|agent.end"}' START=24h
```

### Via CLI
```bash
openclaw status           # Gateway health
openclaw status --deep    # Per-channel diagnostics
openclaw health --json    # Full health snapshot
openclaw status --usage   # Token/cost breakdown
```

## Natural Language to Queries

When the user asks a question in natural language (e.g., "why is n8n slow?"), translate it into **multi-source queries** across logs, metrics, and execution data. Follow this methodology:

1. **Identify relevant data sources**: Determine which combination of Loki (logs), Prometheus (metrics), and n8n API (executions) to query.
2. **Run queries in parallel** where possible: e.g., check error logs AND resource metrics AND queue depth simultaneously.
3. **Correlate results across sources**: Look for temporal patterns -- do metric spikes align with log errors? Does high queue depth coincide with container restarts?
4. **Provide root cause suggestions**: After analyzing all evidence, present a human-readable summary with:
   - What is happening (the symptom)
   - What is likely causing it (the root cause, backed by data)
   - What to do about it (actionable fix or next diagnostic step)

### Example: "Why is n8n slow?"

Run simultaneously:
- PromQL: `n8n_scaling_mode_queue_jobs_waiting` (queue backup?)
- PromQL: `rate(container_cpu_usage_seconds_total{name="n8n"}[5m])` (CPU saturated?)
- PromQL: `node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes * 100` (VM memory pressure?)
- LogQL: `{container_name="n8n"} |= "error" | json` (application errors?)
- n8n API: recent executions with long durations

Then correlate and summarize findings with root cause and recommended action.

## Health Correlation

When asked "why is everything slow?" or "is the system healthy?", check:

1. **VM resources**: `parallels_vm_cpu_load`, `parallels_vm_memory_load`
2. **Host resources**: `parallels_host_cpu_percent`, `parallels_host_memory_percent`
3. **Container health**: `make health`
4. **Error spikes**: Log error rate across all services
5. **Queue depth**: `n8n_scaling_mode_queue_jobs_waiting`
6. **OpenClaw health**: `openclaw health --json`
7. **VM disk I/O**: `parallels_vm_disk_read_bytes`, `parallels_vm_disk_write_bytes`

## Grafana Cloud Dashboards

- **n8n Overview**: Workflow metrics, queue depth, execution duration
- **Infrastructure**: Container CPU/memory, VM system metrics
- **OpenClaw Agent**: Tool calls, LLM cost, sessions
- **Parallels Host**: VM state, CPU, memory, disk I/O
- **Logs Explorer**: Filterable log stream

Access: `make grafana` or `$GRAFANA_CLOUD_STACK_URL`
