# observe Skill

Observability for the n8n automation system. Query logs (LogQL), metrics (PromQL), inspect n8n executions, and introspect ZeroClaw agent state.

## LogQL Queries (Loki)

### Via Make

```bash
make logs [SERVICE=n8n]                              # Tail Docker container logs
make logs-query QUERY='{container_name="n8n"}' [START=1h]   # Query Grafana Loki
```

### Via API / Direct Queries

LogQL examples for common use cases:

**n8n errors:**
```logql
{container_name="n8n"} |= "error" |= "Error"
{container_name="n8n"} | json | level="error"
```

**Vault audit:**
```logql
{container_name="vault"} |= "audit"
{container_name="vault"} | json | request_path=~".*secret.*"
```

**Redis:**
```logql
{container_name="redis"} |= "error"
{container_name="redis"} |= "OOM"
```

**Cloudflare Tunnel:**
```logql
{container_name=~"cloudflared.*"} |= "error"
{container_name=~"cloudflared.*"} |= "connection"
```

**ZeroClaw errors / tool failures / LLM usage:**
```logql
{container_name=~"zeroclaw.*"} |= "error"
{container_name=~"zeroclaw.*"} |= "tool"
{container_name=~"zeroclaw.*"} |= "LLM"
{container_name=~"zeroclaw.*"} | json | level=~"error|warn"
```

## PromQL Queries (Prometheus)

### Via Make

```bash
make metrics-query QUERY='n8n_workflow_execution_total'
make grafana                                    # Open Grafana Cloud in browser
make alerts                                    # Show currently firing alerts
```

### Common PromQL Queries

**Failed workflows:**
```promql
rate(n8n_workflow_execution_total{status="error"}[5m])
increase(n8n_workflow_execution_total{status="error"}[1h])
```

**Execution time:**
```promql
histogram_quantile(0.95, rate(n8n_workflow_execution_duration_seconds_bucket[5m]))
n8n_workflow_execution_duration_seconds_sum / n8n_workflow_execution_duration_seconds_count
```

**Queue depth:**
```promql
n8n_queue_size
n8n_queue_waiting
```

**Container CPU:**
```promql
rate(container_cpu_usage_seconds_total{name=~"n8n.*"}[5m]) * 100
```

**VM memory / disk / state:**
```promql
node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes * 100
node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"} * 100
```

## n8n Execution Inspection

- Use `make workflow-logs NAME="Workflow"` for recent executions
- Use `make workflow-debug NAME="Workflow"` for last execution with error details
- Use n8n API: `GET /api/v1/executions?workflowId=ID&includeData=true`

## ZeroClaw Agent Introspection

**Via Loki:** Query ZeroClaw logs (see LogQL examples above).

**Via CLI:**
- `zeroclaw status` — System status
- `zeroclaw doctor` — Diagnostics

Config: `~/.zeroclaw/config.toml`

## Natural Language to Query Methodology

1. **Identify intent**: Is the user asking about errors, performance, or state?
2. **Map to data source**: Logs → LogQL; metrics → PromQL; executions → n8n API
3. **Choose time range**: Default 1h; extend for trends
4. **Correlate**: When debugging, combine logs + metrics + execution data

## Health Correlation Checklist

When investigating an issue:

1. [ ] Check `make status` and `make health`
2. [ ] Query n8n execution API for recent failures
3. [ ] Search Loki for errors in n8n, Vault, Redis, ZeroClaw
4. [ ] Check PromQL for failed workflow rate, queue depth
5. [ ] Verify VM metrics (memory, disk) if ZeroClaw is involved
6. [ ] Run `zeroclaw status` and `zeroclaw doctor` for agent health

## Grafana Dashboards

- **n8n Overview**: Workflow executions, success/error rates, duration
- **Docker / Containers**: CPU, memory per container
- **Node Exporter**: Host/VM system metrics
- **Loki**: Log exploration

Push dashboards: `make dashboards-push`
Push alerts: `make alerts-push`
