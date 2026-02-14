# Prompt: Debug a Failing Workflow

## Input

You are given execution error data from a failing n8n workflow. Diagnose the root cause and suggest a fix.

## Error Data

{{ERROR_DATA}}

## Instructions

1. **Parse the error**:
   - Which node failed?
   - What is the error message and type?
   - When did it fail (timestamp)?
   - Was it a transient or persistent failure?

2. **Categorize the error**:
   - **Connection error**: Network, DNS, timeout
   - **Authentication error**: Invalid credentials, expired token
   - **Rate limiting**: API limits exceeded
   - **Data error**: Invalid input, missing field, type mismatch
   - **Logic error**: Incorrect workflow configuration
   - **Resource error**: Memory, disk, CPU
   - **External service error**: Third-party API issue

3. **Investigate**:
   - Check logs around the failure timestamp
   - Check metrics for resource anomalies
   - Check if other workflows are also failing (systemic issue)
   - Check credential validity in Vault

4. **Root cause analysis**:
   - What specifically caused the failure?
   - Is this a one-time issue or a recurring pattern?
   - What conditions led to this state?

5. **Suggest fix**:
   - Specific changes to the workflow (node config, retry settings)
   - Credential rotation if auth issue
   - Infrastructure changes if resource issue
   - Workarounds for external service issues

6. **Preventive measures**:
   - Error handling to add (try/catch, error workflow)
   - Monitoring alerts to create
   - Testing to perform

## Output Format

```
## Root Cause
[Clear, concise explanation]

## Evidence
- [Log/metric/execution data that supports the diagnosis]

## Fix
[Step-by-step instructions to resolve]

## Prevention
[Changes to prevent recurrence]
```
