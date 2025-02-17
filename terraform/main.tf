# Configure the Google Cloud provider
provider "google" {
    project = "vercel-clone-1"
}

# Configure required providers
terraform {
    required_providers {
        google = {
            source  = "hashicorp/google"
            version = "~> 4.0"
        }
        random = {
            source  = "hashicorp/random"
            version = "~> 3.0"
        }
    }
}

# Create random suffix for queue name
resource "random_id" "queue_suffix" {
  byte_length = 4
}

# Create Cloud Tasks queue
resource "google_cloud_tasks_queue" "build_queue" {
  name = "build-queue-${random_id.queue_suffix.hex}"
  location = "us-east1"
  
  rate_limits {
    max_concurrent_dispatches = 10  # Default concurrent tasks limit
    max_dispatches_per_second = 10   # Default rate limit
  }
  
  retry_config {
    max_attempts = 1  # No retries, but will record failure
  }
}

# Create Cloud Run service for Next.js app
resource "google_cloud_run_v2_service" "nextjs_app" {
  name     = "nextjs-app"
  location = "us-east1"
  
  template {
    containers {
      image = "gcr.io/${var.project_id}/nextjs-app:latest"
      
      resources {
        limits = {
          cpu    = "1000m"
          memory = "512Mi"
        }
      }

      # Environment variables from env.js
      env {
        name  = "NODE_ENV"
        value = "production"
      }
      env {
        name = "DATABASE_URL"
        value = var.web_database_url
      }
      env {
        name  = "GOOGLE_CLOUD_PROJECT"
        value = "vercel-clone-1"
      }
      env {
        name  = "GOOGLE_CLOUD_TASKS_LOCATION"
        value = google_cloud_tasks_queue.build_queue.location
      }
      env {
        name  = "GOOGLE_CLOUD_TASKS_QUEUE"
        value = google_cloud_tasks_queue.build_queue.name
      }
      # env {
      #   name  = "GOOGLE_APPLICATION_CREDENTIALS"
      #   value = "/etc/service-account/key.json"  # This assumes you'll mount service account credentials
      # }
    }

    scaling {
      max_instance_count = 1
      min_instance_count = 0
    }
  }
}

# Allow unauthenticated access to the Cloud Run service
resource "google_cloud_run_service_iam_member" "public_access" {
  location = google_cloud_run_v2_service.nextjs_app.location
  service  = google_cloud_run_v2_service.nextjs_app.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# Add outputs for environment variables
output "google_cloud_project" {
  value = "vercel-clone-1"  # Your project ID from provider config
}

output "google_cloud_tasks_location" {
  value = google_cloud_tasks_queue.build_queue.location
}

output "google_cloud_tasks_queue" {
  value = google_cloud_tasks_queue.build_queue.name
}

# Add Cloud Run URL to outputs
output "nextjs_app_url" {
  value = google_cloud_run_v2_service.nextjs_app.uri
}


