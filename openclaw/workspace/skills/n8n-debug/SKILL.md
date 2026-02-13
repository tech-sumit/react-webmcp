# Skill: n8n Workflow Debugging

## Description

Debug and inspect n8n workflow executions. Fetch execution logs, identify errors, parse error details, and suggest fixes.

## When to Use

- A workflow is failing or producing unexpected results
- User reports an error with a specific workflow
- Need to inspect execution history
- Need to understand why a workflow stopped working

## How to Use

### Show last failed execution with error details
```bash
make workflow-debug NAME="my-workflow"
# or
bash scripts/n8n-ctl.sh debug "my-workflow"
```

### List recent executions
```bash
make workflow-logs NAME="my-workflow"
# or
bash scripts/n8n-ctl.sh executions "my-workflow" --limit 10
```

### Get full execution details
```bash
bash scripts/n8n-ctl.sh execution-detail <execution-id>
```

### Check container logs around failure time
```bash
make logs SERVICE=n8n
# or query Loki for specific timeframe:
make logs-query QUERY='{container_name="n8n"} |= "error"' START=1h
```

## Debugging Methodology

1. **Get the error**: `make workflow-debug NAME="..."` to see the last failed execution
2. **Identify the failing node**: The debug output shows which node failed and the error message
3. **Check logs**: Look at n8n container logs around the failure timestamp
4. **Check metrics**: Query Prometheus for resource issues that might correlate
5. **Correlate**: Cross-reference with other service logs (Vault, Redis, PostgreSQL)

## Common Error Patterns

### Connection Errors
- **Symptom**: "ECONNREFUSED", "ENOTFOUND", "ETIMEDOUT"
- **Cause**: External service unreachable
- **Fix**: Check DNS, firewall rules, service availability. Add retry logic to workflow.

### Authentication Errors
- **Symptom**: "401 Unauthorized", "403 Forbidden"
- **Cause**: Invalid or expired credentials
- **Fix**: Check/rotate credentials in Vault. Verify n8n credential configuration.

### Rate Limiting
- **Symptom**: "429 Too Many Requests"
- **Cause**: API rate limits exceeded
- **Fix**: Add delays between requests, implement exponential backoff in workflow.

### Memory/Timeout
- **Symptom**: "ENOMEM", execution timeout
- **Cause**: Workflow processing too much data
- **Fix**: Add pagination, process data in batches, increase VM memory.

## n8n Execution API

- `GET /api/v1/executions?workflowId={id}&status=error&limit=5` -- Recent failures
- `GET /api/v1/executions/{id}` -- Full execution data with node results
- Key fields in execution data:
  - `.status` -- "success", "error", "running"
  - `.data.resultData.error` -- Top-level error
  - `.data.resultData.runData` -- Per-node execution results
