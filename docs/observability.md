# Observability Guide

## Architecture

All observability data flows through a single pipeline:

```
Data Sources -> Grafana Alloy (collector) -> Grafana Cloud (storage + dashboards + alerts)
```

### Data Sources

| Source | Type | Collector |
|--------|------|-----------|
| n8n `/metrics` | Prometheus metrics | Alloy scrape |
| n8n JSON logs | Structured logs | Alloy Docker log discovery |
| cAdvisor | Container metrics | Alloy scrape |
| node-exporter | VM system metrics | Alloy scrape |
| prldevops API | Parallels VM metrics | Alloy scrape |
| Docker containers | Stdout/stderr logs | Alloy Docker log discovery |
| NemoClaw gateway | JSONL logs | Alloy file tail |
| NemoClaw telemetry | JSONL events | Alloy file tail |
| Nord Meshnet control plane | Prometheus metrics | Alloy scrape via `HOST_IP:8789` |
| Nord Meshnet control plane | JSONL logs | Alloy file tail from `data/nord-meshnet-logs/` |

### Grafana Cloud (Free Tier)

- **Mimir/Prometheus**: 10,000 active metric series, 14 days retention
- **Loki**: 50 GB logs/month, 14 days retention
- **Grafana**: Unlimited dashboards
- **Alerting**: Unlimited alert rules

## Dashboards

Six pre-built dashboards auto-provisioned from version-controlled JSON:

### 1. n8n Overview (`n8n-overview`)
- Workflow executions (success vs error rate)
- Total executions today
- Error rate gauge
- Queue depth (waiting/active/failed)
- Execution duration percentiles (p50/p95/p99)
- API endpoint latency
- Executions by workflow

### 2. Infrastructure (`infrastructure`)
- Container CPU usage per service
- Container memory usage
- Container network I/O
- Container restart count
- VM CPU usage
- VM memory usage gauge
- VM disk usage gauge

### 3. NemoClaw Agent Activity (`nemoclaw-agent`)
- Tool call frequency
- Tool call duration (average by tool)
- LLM token usage over time
- LLM cost over time (USD)
- Agent session count
- Failed tool calls table
- Message throughput (in/out)

### 4. Parallels Desktop / VM Host (`parallels-host`)
- VM state (running/stopped)
- VM CPU load gauge
- VM memory load gauge
- VM disk I/O rates
- Host CPU usage
- Host memory usage

### 5. Logs Explorer (`logs-explorer`)
- Log volume by service (bar chart)
- Error log volume
- Filterable log stream (by service, level, keyword)

### 6. Nord Meshnet Remote Desktop (`nord-meshnet-remote-desktop`)
- Online Meshnet devices
- Active remote desktop sessions
- Session requests by state
- Pairing-code creation rate
- Warning/error volume from the control plane

### Provisioning Dashboards
```bash
make dashboards-push    # Push all dashboards to Grafana Cloud
make alerts-push        # Push all alert rules
```

## Alert Rules (17 total)

### n8n + Infrastructure (8 rules)
| Alert | Condition | Severity |
|-------|-----------|----------|
| N8nWorkflowFailureRate | Error rate > 20% for 5min | warning |
| N8nQueueBacklog | Waiting > 50 for 5min | warning |
| N8nDown | Unreachable for 1min | critical |
| VaultSealed | Sealed for 1min | critical |
| HighMemoryUsage | VM memory > 85% for 5min | warning |
| HighDiskUsage | VM disk > 80% | warning |
| ContainerRestarting | Restarts > 3 in 15min | warning |
| PostgresDown | Unreachable for 1min | critical |

### NemoClaw (4 rules)
| Alert | Condition | Severity |
|-------|-----------|----------|
| NemoClawGatewayDown | Unreachable for 2min | critical |
| NemoClawHighLLMCost | Cost > $10/hour | warning |
| NemoClawToolFailureSpike | Failure rate > 30% for 5min | warning |
| NemoClawHighTokenBurn | Tokens > 500k/hour | warning |

### Parallels Desktop (5 rules)
| Alert | Condition | Severity |
|-------|-----------|----------|
| VMStopped | Not running for 1min | critical |
| VMHighCPU | CPU > 90% for 5min | warning |
| VMHighMemory | Memory > 90% for 5min | warning |
| HostHighCPU | Host CPU > 85% for 5min | warning |
| HostLowMemory | Host memory > 85% for 5min | warning |

### Alert Flow
Grafana Cloud Alerting -> webhook -> n8n workflow -> notification (Telegram/Slack/email)

## Querying Metrics and Logs

### Prometheus (PromQL)

```bash
# Via Makefile
make metrics-query QUERY='sum(rate(n8n_workflow_execution_total{status="error"}[5m]))'

# Via API
curl -s -G \
  -u "$GRAFANA_CLOUD_USER:$GRAFANA_CLOUD_API_KEY" \
  --data-urlencode 'query=n8n_workflow_execution_total' \
  "$GRAFANA_CLOUD_PROMETHEUS_URL/api/v1/query"
```

### Loki (LogQL)

```bash
# Via Makefile
make logs-query QUERY='{container_name="n8n"} |= "error"' START=1h

# Via API
curl -s -G \
  -H "Authorization: Bearer $GRAFANA_CLOUD_API_KEY" \
  --data-urlencode 'query={container_name="n8n"} |= "error"' \
  "$GRAFANA_CLOUD_LOKI_URL/loki/api/v1/query_range"
```

### Key n8n Metrics

| Metric | Description |
|--------|-------------|
| `n8n_workflow_execution_total` | Execution count by status |
| `n8n_workflow_execution_duration_seconds` | Duration histogram |
| `n8n_scaling_mode_queue_jobs_waiting` | Pending queue jobs |
| `n8n_scaling_mode_queue_jobs_active` | Active queue jobs |
| `n8n_scaling_mode_queue_jobs_failed` | Failed queue jobs |
| `n8n_http_request_duration_seconds` | API latency |

### Useful Log Queries

| Goal | LogQL |
|------|-------|
| All errors | `{service=~".+"} \| json \| level="error"` |
| n8n errors | `{container_name="n8n"} \| json \| level="error"` |
| Specific time | Add `\| ts > "2026-01-01T00:00:00Z"` |
| Keyword search | `{container_name="n8n"} \|= "timeout"` |
| JSON field | `{container_name="n8n"} \| json \| workflowId="123"` |

### Nord Meshnet Queries

| Goal | Query |
|------|-------|
| Online devices | `nord_meshnet_online_devices` |
| Active sessions | `nord_meshnet_active_sessions` |
| Session requests by state | `sum by (state) (rate(nord_meshnet_session_requests_total[5m]))` |
| Pairing rate | `rate(nord_meshnet_pairing_codes_total[5m])` |
| Control-plane warnings/errors | `{service="nord-meshnet-control-plane"} \| json \| level=~"warn\|error"` |

## AI Agent Observability

The NemoClaw agent can query all observability data via the `observe` skill:

```
"How many workflows failed today?"
"What's the average execution time?"
"Is the VM running low on memory?"
"Why is everything slow?"
"How much have I spent on LLM calls today?"
"Which tool calls are failing?"
```

See `nemoclaw/workspace/skills/observe/SKILL.md` for the complete query reference.

## Configuration

Alloy configuration: `config/alloy/config.alloy`
Dashboard JSON: `config/grafana-cloud/dashboards/`
Alert rules: `config/grafana-cloud/alert-rules.yaml`

All are version-controlled and auto-provisioned via `make up`.
