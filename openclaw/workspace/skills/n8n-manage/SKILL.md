# Skill: n8n Workflow Management

## Description

Manage n8n workflows: list, create, update, delete, enable, disable, trigger, and sync.

## When to Use

- User wants to create a new automation/workflow
- User wants to modify, enable, disable, or delete a workflow
- User wants to see what workflows exist
- User wants to manually run a workflow
- User wants to sync workflows between n8n and disk

## How to Use

### List workflows
```bash
make workflow-list
# or
bash scripts/n8n-ctl.sh list
```

### Create a new workflow
```bash
make workflow-add NAME="my-workflow"
# or
bash scripts/n8n-ctl.sh create "my-workflow"
```

### Update a workflow from JSON
```bash
make workflow-update NAME="my-workflow"
# or
bash scripts/n8n-ctl.sh update <id> shared/workflows/my-workflow.json
```

### Delete a workflow
```bash
make workflow-delete NAME="my-workflow"
# or
bash scripts/n8n-ctl.sh delete "my-workflow" --force
```

### Enable/disable a workflow
```bash
make workflow-enable NAME="my-workflow"
make workflow-disable NAME="my-workflow"
```

### Trigger a workflow manually
```bash
make workflow-trigger NAME="my-workflow"
```

### Sync workflows
```bash
make workflows-export   # n8n -> disk
make workflows-import   # disk -> n8n
```

## n8n REST API Reference

- `GET /api/v1/workflows` -- List all workflows
- `GET /api/v1/workflows/{id}` -- Get workflow details
- `POST /api/v1/workflows` -- Create workflow
- `PUT /api/v1/workflows/{id}` -- Update workflow
- `DELETE /api/v1/workflows/{id}` -- Delete workflow
- `PATCH /api/v1/workflows/{id}` -- Partial update (enable/disable)
- `POST /api/v1/workflows/{id}/run` -- Execute workflow

All requests require `X-N8N-API-KEY` header.

## Workflow JSON Structure

Workflows are stored as JSON in `shared/workflows/`. Key fields:
- `name`: Display name
- `nodes`: Array of node configurations
- `connections`: Node connection map
- `active`: Boolean (enabled/disabled)
- `settings`: Workflow settings (timezone, error workflow, etc.)

## Best Practices

1. Always export workflows to disk after creating/modifying
2. Use descriptive workflow names (lowercase, hyphenated)
3. Set up error workflows for production automations
4. Test workflows with `workflow-trigger` before enabling cron triggers
5. Store any required credentials in Vault first
