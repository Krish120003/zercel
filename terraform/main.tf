# ===================
# Provider Configuration
# ===================
# Sets up Google Cloud as the infrastructure provider
provider "google" {
  project = "vercel-clone-1"
}

# ===================
# Required Providers
# ===================
# Specifies the required provider versions for Google Cloud and Random
terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.21"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

# ===================
# Queue Configuration
# ===================
# Generates a random suffix for the queue name to ensure uniqueness
# resource "random_id" "queue_suffix" {
#   byte_length = 4
# }

# # Creates a Cloud Tasks queue for handling build jobs
# resource "google_cloud_tasks_queue" "build_queue" {
#   name = "build-queue-${random_id.queue_suffix.hex}"
#   location = "us-east1"

#   # Configure queue rate limits
#   rate_limits {
#     max_concurrent_dispatches = 10  # Limits concurrent tasks to 10
#     max_dispatches_per_second = 10  # Limits tasks per second to 10
#   }

#   # Configure retry behavior
#   retry_config {
#     max_attempts = 1  # No retries, only records failure
#   }
# }

# ===================
# Next.js Application
# ===================
# Deploys the Next.js application as a Cloud Run service
resource "google_cloud_run_v2_service" "nextjs_app" {
  name                = "nextjs-app"
  location            = "us-east1"
  deletion_protection = var.deletion_protection

  template {
    containers {
      # Container configuration using the web image
      image = "gcr.io/${var.project_id}/web:latest"

      # Resource limits for the container
      resources {
        limits = {
          cpu    = "1000m" # 1 CPU core
          memory = "512Mi" # 512MB RAM
        }
      }

      # Environment variable configuration
      env {
        name  = "NODE_ENV"
        value = "production"
      }
      env {
        name  = "DATABASE_URL"
        value = var.web_database_url
      }
      env {
        name  = "GOOGLE_CLOUD_PROJECT"
        value = "vercel-clone-1"
      }
      # Commented out Cloud Tasks env variables
      # env {
      #   name  = "GOOGLE_CLOUD_TASKS_LOCATION"
      #   value = google_cloud_tasks_queue.build_queue.location
      # }
      # env {
      #   name  = "GOOGLE_CLOUD_TASKS_QUEUE"
      #   value = google_cloud_tasks_queue.build_queue.name
      # }

      # Added Builder Job details for triggering from the backend
      env {
        name  = "BUILDER_JOB_LOCATION"
        value = google_cloud_run_v2_job.builder.location
      }
      env {
        name  = "BUILDER_JOB_NAME"
        value = google_cloud_run_v2_job.builder.name
      }
      # Commented out service account credentials configuration
      # env {
      #   name  = "GOOGLE_APPLICATION_CREDENTIALS"
      #   value = "/etc/service-account/key.json"
      # }
    }

    # Auto-scaling configuration
    scaling {
      max_instance_count = 1
      min_instance_count = 0
    }
  }
}

# ===================
# IAM Configuration
# ===================
# Allows public access to the Next.js application
resource "google_cloud_run_service_iam_member" "public_access" {
  location = google_cloud_run_v2_service.nextjs_app.location
  service  = google_cloud_run_v2_service.nextjs_app.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# ===================
# Buil`r Configuration
# ===================

# Generates a random suffix for the bucket name to ensure uniqueness
resource "random_id" "bucket_suffix" {
  byte_length = 4
}

# Creates a Google Cloud Storage bucket for the builder
resource "google_storage_bucket" "builder_bucket" {
  name                        = "builder-bucket-${random_id.bucket_suffix.hex}"
  location                    = "US"
  force_destroy               = true
  uniform_bucket_level_access = true

  cors {
    origin          = ["*"]
    method          = ["GET", "HEAD", "OPTIONS"]
    response_header = ["*"]
    max_age_seconds = 3600
  }
}

// Add IAM policy to make the bucket public
resource "google_storage_bucket_iam_member" "public_rule" {
  bucket = google_storage_bucket.builder_bucket.name
  role   = "roles/storage.objectViewer"
  member = "allUsers"
}

# Creates a Cloud Run Job for the builder service
resource "google_cloud_run_v2_job" "builder" {
  name                = "builder-job"
  location            = "us-east1"
  deletion_protection = var.deletion_protection

  template {
    template {
      volumes {
        name = "builder-storage"

        gcs {
          bucket    = google_storage_bucket.builder_bucket.name
          read_only = false # Allow write access
        }

      }
      containers {
        image = "gcr.io/${var.project_id}/builder:latest"

        # Resource configuration for builder
        resources {
          limits = {
            cpu    = "2000m"  # 2 CPU cores for build tasks
            memory = "2048Mi" # 2GB RAM for build tasks
          }
        }

        # Add volume mount for the builder bucket
        volume_mounts {
          name       = "builder-storage"
          mount_path = "/workspace" # Mount point inside container
        }
      }

      # Add volume configuration

      # Job execution configuration
      max_retries = 0      # No retries for failed builds
      timeout     = "600s" # 10 minute timeout for builds
    }
  }
}


# ===================
# Output Variables
# ===================
# Exports important configuration values
output "google_cloud_project" {
  value = "vercel-clone-1" # Project ID for reference
}

output "nextjs_app_url" {
  value = google_cloud_run_v2_service.nextjs_app.uri
}

output "builder_job_location" {
  value = google_cloud_run_v2_job.builder.location
}

output "builder_job_name" {
  value = google_cloud_run_v2_job.builder.name
}

output "builder_bucket_name" {
  value = google_storage_bucket.builder_bucket.name
}
