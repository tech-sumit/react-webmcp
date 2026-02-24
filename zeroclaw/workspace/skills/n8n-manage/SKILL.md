# n8n-manage Skill

Workflow management for the n8n automation engine. Use this skill to list, create, update, delete, enable/disable, trigger, and sync workflows.

## Make Commands

| Command | Description |
|---------|-------------|
| `make workflow-list` | List all workflows |
| `make workflow-add NAME="My Workflow"` | Create a new workflow |
| `make workflow-update NAME="My Workflow"` | Push local JSON changes to n8n |
| `make workflow-enable NAME="My Workflow"` | Enable a workflow |
| `make workflow-disable NAME="My Workflow"` | Disable a workflow |
| `make workflow-trigger NAME="My Workflow"` | Manually trigger a workflow |
| `make workflow-delete NAME="My Workflow"` | Delete a workflow |
| `make workflow-logs NAME="My Workflow"` | Fetch recent executions |
| `make workflow-debug NAME="My Workflow"` | Last execution with error details |
| `make workflow-generate IDEA="..."` | Generate and deploy workflow from idea |
| `make workflow-generate-preview IDEA="..."` | Preview only, no deploy |
| `make workflows-export` | Export n8n → disk (run before git commit) |
| `make workflows-import` | Import disk → n8n (run after git pull) |

## n8n REST API Reference

Base URL: `http://localhost:5678/api/v1` (or `http://HOST_IP:5678` from VM)

### Authentication

Use `X-N8N-API-KEY` header with the n8n API key (stored in Vault at `secret/n8n/n8n-api-key`).

### Workflows

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/workflows` | List all workflows |
| GET | `/workflows/:id` | Get workflow by ID |
| POST | `/workflows` | Create workflow |
| PUT | `/workflows/:id` | Update workflow |
| DELETE | `/workflows/:id` | Delete workflow |
| PATCH | `/workflows/:id/activate` | Activate workflow |
| PATCH | `/workflows/:id/deactivate` | Deactivate workflow |
| POST | `/workflows/:id/run` | Execute workflow manually |

### Example: List workflows

```bash
curl -s -H "X-N8N-API-KEY: $N8N_API_KEY" http://localhost:5678/api/v1/workflows
```

### Example: Create workflow

```bash
curl -s -X POST -H "X-N8N-API-KEY: $N8N_API_KEY" \
  -H "Content-Type: application/json" \
  -d @shared/workflows/my-workflow.json \
  http://localhost:5678/api/v1/workflows
```

## Workflow JSON Structure

```json
{
  "name": "My Workflow",
  "nodes": [
    {
      "id": "uuid",
      "name": "Node Name",
      "type": "n8n-nodes-base.httpRequest",
      "position": [0, 0],
      "parameters": {}
    }
  ],
  "connections": {},
  "active": false,
  "settings": {
    "executionOrder": "v1"
  }
}
```

Key fields:
- `name`: Display name
- `nodes`: Array of node definitions (id, name, type, position, parameters)
- `connections`: Maps output connections between nodes
- `active`: Whether workflow is enabled
- `settings.executionOrder`: `"v1"` (sequential) or `"v2"` (parallel where possible)

## Best Practices

1. **Version control**: Always run `make workflows-export` before committing; run `make workflows-import` after pulling.
2. **Naming**: Use descriptive workflow names; avoid special characters.
3. **Credentials**: Store credentials in Vault; reference via n8n credential system.
4. **Idempotency**: Design workflows to be safe when run multiple times.
5. **Error handling**: Add error workflows or error outputs for critical paths.
6. **Testing**: Use `make workflow-trigger` to test before enabling.
