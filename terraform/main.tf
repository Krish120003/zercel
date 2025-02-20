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
# Builder Configuration
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
# resource "google_storage_bucket_iam_member" "public_rule" {
#   bucket = google_storage_bucket.builder_bucket.name
#   role   = "roles/storage.objectViewer"
#   member = "allUsers"
# }

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
            cpu    = "1000m"  # 1 CPU core for build tasks
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
      timeout     = "300s" # 5 minute timeout for builds
    }
  }
}

# ===================
# Router Configuration
# ===================

# The router is a Hono.js app that routes to the right files
resource "google_cloud_run_v2_service" "router" {
  name                = "router"
  location            = "us-east1"
  deletion_protection = false

  template {
    volumes {
      name = "builder-storage"

      gcs {
        bucket    = google_storage_bucket.builder_bucket.name
        read_only = true # Read-only access
      }
    }
    containers {
      image = "gcr.io/${var.project_id}/router:latest"

      # Resource limits for the container
      resources {
        limits = {
          cpu    = "1000m" # 1 CPU core
          memory = "512Mi" # 512MB RAM
        }
      }

      volume_mounts {
        name       = "builder-storage"
        mount_path = "/data" # Mount point inside container
      }

      # Environment variable configuration
      env {
        name  = "NODE_ENV"
        value = "production"
      }
      env {
        name  = "GOOGLE_CLOUD_PROJECT"
        value = "vercel-clone-1"
      }
    }

    # Auto-scaling configuration
    scaling {
      max_instance_count = 1
      min_instance_count = 0
    }
  }
}

# Make the router publicly accessible
resource "google_cloud_run_service_iam_member" "router_public_access" {
  location = google_cloud_run_v2_service.router.location
  service  = google_cloud_run_v2_service.router.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# ===================
# LB Configuration
# ===================

# Create a serverless NEG for the router service
resource "google_compute_region_network_endpoint_group" "router_neg" {
  name                  = "z-router-neg"
  network_endpoint_type = "SERVERLESS"
  region                = "us-east1"
  cloud_run {
    service = google_cloud_run_v2_service.router.name
  }
}

# Create a backend service with external managed load balancing
resource "google_compute_backend_service" "router_backend" {
  name                  = "z-router-backend"
  protocol              = "HTTPS"
  port_name             = "http"
  timeout_sec           = 30
  load_balancing_scheme = "EXTERNAL_MANAGED" # Add this line

  backend {
    group = google_compute_region_network_endpoint_group.router_neg.id
  }
}

# Create a URL Map
resource "google_compute_url_map" "router_urlmap" {
  name            = "z-router-urlmap"
  default_service = google_compute_backend_service.router_backend.id

  host_rule {
    hosts        = ["*.zercel.dev"]
    path_matcher = "path-matcher-1"
  }

  path_matcher {
    name            = "path-matcher-1"
    default_service = google_compute_backend_service.router_backend.id

    path_rule {
      paths   = ["/"]
      service = google_compute_backend_service.router_backend.id
    }
  }
}

# Create a target HTTPS proxy
resource "google_compute_target_https_proxy" "router_proxy" {
  name             = "z-router-proxy"
  url_map          = google_compute_url_map.router_urlmap.id
  ssl_certificates = [google_compute_managed_ssl_certificate.lb_cert.id]
}

# Create a global IP address for the load balancer
resource "google_compute_global_address" "router_ip" {
  name = "z-ip-2"
}

# Create a forwarding rule
resource "google_compute_global_forwarding_rule" "router_rule" {
  name                  = "z-router-rule"
  target                = google_compute_target_https_proxy.router_proxy.id
  port_range            = "443"
  ip_address            = google_compute_global_address.router_ip.address
  load_balancing_scheme = "EXTERNAL_MANAGED"
}

# ===================
# SSL Cert
# ===================

resource "google_compute_managed_ssl_certificate" "lb_cert" {
  provider = google
  name     = "z-ssl-cert-1"

  managed {
    domains = ["zercel.dev"]
  }
}

# Add output for the load balancer IP
output "load_balancer_ip" {
  value       = google_compute_global_address.router_ip.address
  description = "IP address for zercel.dev DNS A record"
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
