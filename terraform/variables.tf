

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

variable "deletion_protection" {
  description = "Enable deletion protection for resources"
  type        = bool
  default     = true
}
