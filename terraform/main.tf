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


