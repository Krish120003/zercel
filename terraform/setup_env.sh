#!/bin/bash

# Get outputs from terraform
PROJECT=$(terraform output -raw google_cloud_project)
NEXTJS_URL=$(terraform output -raw nextjs_app_url)
BUILDER_JOB_LOCATION=$(terraform output -raw builder_job_location)
BUILDER_JOB_NAME=$(terraform output -raw builder_job_name)
BUILD_BUCKET=$(terraform output -raw builder_bucket_name)

if [ "$1" == "echo" ]; then
    echo "GOOGLE_CLOUD_PROJECT=${PROJECT}"
    echo "NEXTJS_APP_URL=${NEXTJS_URL}"
    echo "BUILDER_JOB_LOCATION=${BUILDER_JOB_LOCATION}"
    echo "BUILDER_JOB_NAME=${BUILDER_JOB_NAME}"
    echo "BUILD_BUCKET=${BUILD_BUCKET}"
else
    export GOOGLE_CLOUD_PROJECT="${PROJECT}"
    export NEXTJS_APP_URL="${NEXTJS_URL}"
    export BUILDER_JOB_LOCATION="${BUILDER_JOB_LOCATION}"
    export BUILDER_JOB_NAME="${BUILDER_JOB_NAME}"
    export BUILD_BUCKET="${BUILD_BUCKET}"
fi