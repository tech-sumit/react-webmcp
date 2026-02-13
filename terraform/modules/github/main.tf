###############################################################################
# GitHub Module -- Repository for workflow assets
###############################################################################

resource "github_repository" "workflows" {
  name        = var.repo_name
  description = "n8n workflow assets and configurations - managed by ${var.project_name}"
  visibility  = var.repo_visibility

  has_issues   = true
  has_projects = false
  has_wiki     = false

  auto_init         = true
  gitignore_template = "Node"

  delete_branch_on_merge = true
  allow_squash_merge     = true
  allow_merge_commit     = false
  allow_rebase_merge     = true
}

# Branch protection for main
resource "github_branch_protection" "main" {
  repository_id = github_repository.workflows.node_id
  pattern       = "main"

  required_pull_request_reviews {
    dismiss_stale_reviews      = true
    require_code_owner_reviews = false
  }

  enforce_admins = false
}

# Webhook for CI integration (optional)
resource "github_repository_webhook" "n8n" {
  repository = github_repository.workflows.name

  configuration {
    url          = "https://n8n.example.com/webhook/github"
    content_type = "json"
    insecure_ssl = false
  }

  active = false  # Enable when n8n webhook URL is configured

  events = ["push", "pull_request"]
}

# Outputs
output "repo_url" {
  description = "GitHub repository URL"
  value       = github_repository.workflows.html_url
}

output "repo_clone_url" {
  description = "GitHub repository clone URL"
  value       = github_repository.workflows.ssh_clone_url
}
