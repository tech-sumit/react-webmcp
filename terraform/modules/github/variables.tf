variable "github_owner" {
  description = "GitHub org or user"
  type        = string
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "n8n-ai"
}

variable "repo_name" {
  description = "Repository name for workflow assets"
  type        = string
  default     = "n8n-workflows"
}

variable "repo_visibility" {
  description = "Repository visibility (public or private)"
  type        = string
  default     = "private"
}
