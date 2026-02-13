# Prompt: Decompose a Task into n8n Workflows

## Input

You are given a high-level goal. Break it down into a series of n8n workflows and supporting resources.

## User's Goal

{{GOAL}}

## Instructions

1. **Understand the scope**:
   - What is the end-to-end process?
   - Who/what triggers it?
   - What are the inputs and outputs?
   - What external services are involved?

2. **Identify workflow boundaries**:
   - Each workflow should do ONE thing well
   - Workflows can trigger other workflows (via webhook or n8n trigger)
   - Separate concerns: data collection, processing, notification, storage
   - Consider error handling as a separate workflow

3. **Design the workflow graph**:

```
Trigger -> Workflow A (collect) -> Workflow B (process) -> Workflow C (notify)
                                                       -> Workflow D (store)
```

4. **For each workflow, specify**:
   - Name and purpose
   - Trigger type and schedule
   - Input/output data shape
   - External services and credentials needed
   - Error handling strategy
   - Dependencies on other workflows

5. **Identify shared resources**:
   - Credentials (store in Vault once, share across workflows)
   - Infrastructure (S3 bucket, database tables)
   - Common data formats or schemas

6. **Execution plan**:
   - Order of creation (dependencies first)
   - Testing strategy (which workflows to test independently)
   - Activation order

## Output Format

```
## Workflows

### 1. workflow-name
- **Purpose**: [description]
- **Trigger**: [type + config]
- **Input**: [data shape]
- **Output**: [data shape]
- **Services**: [list]
- **Credentials**: [Vault paths]
- **Error handling**: [strategy]

### 2. workflow-name
...

## Shared Resources
- [Infrastructure, credentials, etc.]

## Execution Order
1. [Steps to implement everything]

## Testing Plan
1. [How to verify each workflow works]
```

## Example

**Goal**: "Monitor my GitHub repos for new issues and auto-triage them based on labels"

**Decomposition**:
1. `github-issue-watcher` -- Webhook trigger, receives GitHub issue events
2. `issue-classifier` -- Analyzes issue text, assigns priority label
3. `issue-router` -- Routes to appropriate team channel (Slack/Telegram)
4. `issue-summary-daily` -- Cron: daily summary of open issues

**Shared**: GitHub token (Vault), Slack webhook URL (Vault)
