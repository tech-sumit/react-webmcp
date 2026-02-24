# n8n-debug Skill

Workflow debugging for n8n. Use this skill to inspect failed executions, identify failing nodes, correlate with logs and metrics, and resolve common error patterns.

## Debug Methodology

1. **Get error**: Use `make workflow-debug NAME="Workflow"` or n8n execution API to fetch the last failed execution.
2. **Identify failing node**: Inspect execution data; the `stoppedAt` node and `error` object indicate where execution failed.
3. **Check logs**: Query Loki for n8n container logs around the failure timestamp.
4. **Check metrics**: Query Prometheus for execution counts, duration, queue depth.
5. **Correlate**: Cross-reference timestamps across n8n, Loki, Prometheus, and external services.

## Common Error Patterns

### Connection errors

- **Symptom**: `ECONNREFUSED`, `ETIMEDOUT`, `ENOTFOUND`
- **Causes**: Target service down, wrong host/port, firewall blocking
- **Fix**: Verify target is reachable; check HOST_IP from VM (10.211.55.2); ensure ports are forwarded

### Authentication errors

- **Symptom**: `401 Unauthorized`, `403 Forbidden`, `Invalid credentials`
- **Causes**: Expired/invalid API keys, wrong credential reference
- **Fix**: Rotate credentials in Vault; update n8n credential; verify credential is selected in node

### Rate limiting

- **Symptom**: `429 Too Many Requests`, `rate limit exceeded`
- **Causes**: Too many requests to external API
- **Fix**: Add delays between nodes; use batch processing; request higher limits from provider

### Memory / timeout

- **Symptom**: `JavaScript heap out of memory`, `ETIMEDOUT`, execution hangs
- **Causes**: Large payloads, infinite loops, slow external APIs
- **Fix**: Process in smaller batches; add timeout to HTTP nodes; increase NODE_OPTIONS if needed

## n8n Execution API Reference

Base URL: `http://localhost:5678/api/v1`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/executions` | List executions (query: workflowId, status, limit) |
| GET | `/executions/:id` | Get execution details |
| GET | `/executions/:id?includeData=true` | Include full execution data |
| DELETE | `/executions/:id` | Delete execution |

### Example: Get last failed execution

```bash
curl -s -H "X-N8N-API-KEY: $N8N_API_KEY" \
  "http://localhost:5678/api/v1/executions?workflowId=ID&status=error&limit=1"
```

### Example: Get execution with full data

```bash
curl -s -H "X-N8N-API-KEY: $N8N_API_KEY" \
  "http://localhost:5678/api/v1/executions/EXEC_ID?includeData=true"
```

### Execution response structure

- `id`, `workflowId`, `finished`, `mode`, `retryOf`, `retrySuccessId`
- `status`: `success`, `error`, `running`, `waiting`
- `startedAt`, `stoppedAt`
- `data`: Execution data per node (when `includeData=true`)
- `error`: `message`, `node`, `description` (when failed)
