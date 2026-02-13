variable "s3_bucket_prefix" {
  description = "S3 bucket name prefix"
  type        = string
  default     = "n8n-assets"
}

variable "aws_region" {
  description = "AWS region for the S3 bucket"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name for tagging"
  type        = string
  default     = "n8n-ai"
}
