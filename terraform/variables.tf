variable "project_id" {
  description = "Google Cloud Project ID"
  type        = string
  default     = "vercel-clone-1"
}

variable "web_database_url" {
  description = "PostgreSQL database connection URL for the web app"
  type        = string
  sensitive   = true # This marks the variable as sensitive in logs and outputs
}

variable "redis_url" {
  description = "Redis connection URL for the web app"
  type        = string
  sensitive   = true
}

variable "deletion_protection" {
  description = "Enable deletion protection for resources"
  type        = bool
  default     = true
}

variable "github_id" {
  description = "GitHub OAuth App ID"
  type        = string
  sensitive   = true
}

variable "github_secret" {
  description = "GitHub OAuth App Secret"
  type        = string
  sensitive   = true
}

variable "github_private_key" {
  description = "GitHub App Private Key"
  type        = string
  sensitive   = true
}

variable "nextauth_url" {
  description = "NextAuth URL"
  type        = string
}

variable "nextauth_secret" {
  description = "NextAuth Secret"
  type        = string
  sensitive   = true
}

variable "github_app_url" {
  description = "GitHub App URL"
  type        = string
}
