###############################################################################
# S3 Module -- Buckets for workflow assets/artifacts
###############################################################################

resource "random_id" "bucket_suffix" {
  byte_length = 4
}

# S3 bucket for workflow assets
resource "aws_s3_bucket" "n8n_assets" {
  bucket = "${var.s3_bucket_prefix}-${random_id.bucket_suffix.hex}"

  tags = {
    Name        = "${var.project_name}-assets"
    Project     = var.project_name
    ManagedBy   = "terraform"
  }
}

# Bucket versioning
resource "aws_s3_bucket_versioning" "n8n_assets" {
  bucket = aws_s3_bucket.n8n_assets.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Lifecycle rules
resource "aws_s3_bucket_lifecycle_configuration" "n8n_assets" {
  bucket = aws_s3_bucket.n8n_assets.id

  rule {
    id     = "cleanup-old-versions"
    status = "Enabled"

    noncurrent_version_expiration {
      noncurrent_days = 90
    }

    noncurrent_version_transition {
      noncurrent_days = 30
      storage_class   = "STANDARD_IA"
    }
  }

  rule {
    id     = "abort-incomplete-uploads"
    status = "Enabled"

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

# Block public access
resource "aws_s3_bucket_public_access_block" "n8n_assets" {
  bucket = aws_s3_bucket.n8n_assets.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Server-side encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "n8n_assets" {
  bucket = aws_s3_bucket.n8n_assets.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# IAM user for n8n S3 access
resource "aws_iam_user" "n8n_s3" {
  name = "${var.project_name}-s3-user"

  tags = {
    Project   = var.project_name
    ManagedBy = "terraform"
  }
}

resource "aws_iam_user_policy" "n8n_s3" {
  name = "${var.project_name}-s3-policy"
  user = aws_iam_user.n8n_s3.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket",
        ]
        Resource = [
          aws_s3_bucket.n8n_assets.arn,
          "${aws_s3_bucket.n8n_assets.arn}/*",
        ]
      }
    ]
  })
}

resource "aws_iam_access_key" "n8n_s3" {
  user = aws_iam_user.n8n_s3.name
}

# Outputs
output "bucket_name" {
  description = "S3 bucket name"
  value       = aws_s3_bucket.n8n_assets.id
}

output "bucket_arn" {
  description = "S3 bucket ARN"
  value       = aws_s3_bucket.n8n_assets.arn
}

output "s3_access_key_id" {
  description = "IAM access key for n8n S3 access"
  value       = aws_iam_access_key.n8n_s3.id
  sensitive   = true
}

output "s3_secret_access_key" {
  description = "IAM secret key for n8n S3 access"
  value       = aws_iam_access_key.n8n_s3.secret
  sensitive   = true
}
