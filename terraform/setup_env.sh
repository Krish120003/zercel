#!/bin/bash

# Get outputs from terraform
PROJECT=$(terraform output -raw google_cloud_project)
LOCATION=$(terraform output -raw google_cloud_tasks_location)
QUEUE=$(terraform output -raw google_cloud_tasks_queue)

if [ "$1" == "echo" ]; then
    echo "export GOOGLE_CLOUD_PROJECT=${PROJECT}"
    echo "export GOOGLE_CLOUD_TASKS_LOCATION=${LOCATION}"
    echo "export GOOGLE_CLOUD_TASKS_QUEUE=${QUEUE}"
else
    export GOOGLE_CLOUD_PROJECT="${PROJECT}"
    export GOOGLE_CLOUD_TASKS_LOCATION="${LOCATION}"
    export GOOGLE_CLOUD_TASKS_QUEUE="${QUEUE}"
fi