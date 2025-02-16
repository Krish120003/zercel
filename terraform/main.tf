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
    }
}

# Create Cloud Tasks queue
resource "google_cloud_tasks_queue" "build_queue" {
  name     = "build-queue"
  location = "us-east1"
  
  rate_limits {
    max_concurrent_dispatches = 10  # Default concurrent tasks limit
    max_dispatches_per_second = 10   # Default rate limit
  }
  
  retry_config {
    max_attempts = 1  # No retries, but will record failure
  }
}


