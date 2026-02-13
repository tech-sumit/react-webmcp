# Prompt: Design a New Workflow

## Input

You are given a user's idea for an automation. Design an n8n workflow that implements it.

## User's Idea

{{IDEA}}

## Instructions

1. **Understand the goal**: What is the user trying to automate? What triggers it? What's the output?

2. **Identify components**:
   - **Trigger**: How does the workflow start? (Cron, Webhook, Manual, Event)
   - **Data sources**: What APIs or services are involved?
   - **Processing**: What transformations, filters, or logic are needed?
   - **Output**: Where does the result go? (API call, database, notification, file)
   - **Error handling**: What happens when something fails?

3. **Design the workflow**:
   - List each node in order with its type and configuration
   - Describe the data flow between nodes
   - Identify what credentials are needed (store in Vault)
   - Specify any n8n settings (retry on fail, timeout, error workflow)

4. **Output the workflow specification**:

```json
{
  "name": "descriptive-workflow-name",
  "trigger": {
    "type": "cron|webhook|manual",
    "config": {}
  },
  "nodes": [
    {
      "name": "Node Name",
      "type": "n8n-nodes-base.httpRequest|...",
      "config": {},
      "notes": "What this node does"
    }
  ],
  "connections": "description of data flow",
  "credentials_needed": ["credential_name: description"],
  "error_handling": "description",
  "estimated_execution_time": "Xs",
  "schedule": "if cron, the schedule"
}
```

5. **Implementation steps**:
   - What secrets to store in Vault
   - What Terraform resources might be needed (S3 bucket, etc.)
   - What to test before activating

## Example

**Idea**: "Send me a Telegram message every morning with the weather forecast"

**Design**:
- Trigger: Cron (8:00 AM daily)
- Node 1: HTTP Request to weather API
- Node 2: Function to format the message
- Node 3: Telegram node to send message
- Credentials: Weather API key (Vault), Telegram bot token (Vault)
