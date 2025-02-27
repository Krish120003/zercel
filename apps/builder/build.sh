#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e
# set -x

# Function to send callback
send_callback() {
    local exit_code=$?
    local status="success"
    if [ $exit_code -ne 0 ]; then
        status="error"
    fi
    
    if [ ! -z "$CALLBACK_URL" ]; then
        # Add timeout and more verbose output
        curl --max-time 10 -v -X POST "$CALLBACK_URL" \
            -H "Content-Type: application/json" \
            -d "{\"status\":\"$status\",\"exit_code\":$exit_code}" || {
            echo "Warning: Callback failed to send, but continuing..."
        }
    fi
    
    # Force exit to prevent hanging
    kill -9 $$ 
}

# Function to send initial callbackbut 
send_initial_callback() {
    if [ ! -z "$CALLBACK_URL" ]; then
        curl -X POST "$CALLBACK_URL" \
            -H "Content-Type: application/json" \
            -d "{\"status\":\"started\",\"exit_code\":0}"
    fi
}

# Set up trap to catch script exit
trap send_callback EXIT

# Check if the 'REPO_URL' environment variable is set.
if [ -z "$REPO_URL" ]; then
    echo "Error: The environment variable 'REPO_URL' is not set."
    exit 1
fi

# Send initial callback
send_initial_callback

# Check if the 'REPO_SHA' environment variable is set.

# Clone the repository using the URL provided in the 'REPO_URL' environment variable into a folder named clone
git clone --depth 1 "$REPO_URL" clone
# Change the working directory to the 'clone' folder
cd clone

# Checkout the commit SHA provided in the 'REPO_SHA' environment variable
if [ -z "$REPO_SHA" ]; then
  git checkout $REPO_SHA
fi

# TODO: Inject environment variables before the build



# Set up FNM path and environment
FNM_PATH="/root/.local/share/fnm"
if [ -d "$FNM_PATH" ]; then
  export PATH="$FNM_PATH:$PATH"
  eval "`fnm env --shell bash`"
fi

# Install node
fnm install || fnm install 20
fnm use || fnm use 20 

# Check if this is a Node.js project
if [ ! -f "package.json" ]; then
    echo "No package.json found - treating as static repository"
    
    # Create workspace directory
    if [ -z "$REPO_SHA" ]; then
        REPO_SHA=$(git rev-parse HEAD)
    fi
    
    echo "Cleaning workspace at /workspace/$REPO_SHA"
    rm -rf "/workspace/$REPO_SHA"
    
    echo "Copying all files to /workspace/$REPO_SHA"
    mkdir -p "/workspace/$REPO_SHA"
    cp -r . "/workspace/$REPO_SHA"
    
    echo "Static files copied successfully."
    # trigger callback
    
    exit 0
fi

# Download the dependencies
if [ -f yarn.lock ]; then yarn install; \
elif [ -f package-lock.json ]; then npm install; \
elif [ -f pnpm-lock.yaml ]; then npm install -g pnpm && pnpm install; \
else echo "Lockfile not found." && exit 1; \
fi

# Build the project
if [ -f yarn.lock ]; then yarn build; \
elif [ -f package-lock.json ]; then npm run build; \
elif [ -f pnpm-lock.yaml ]; then npm install -g pnpm && pnpm run build; \
else echo "Lockfile not found." && exit 1; \
fi

# TODO: Export somehow? for now its gonna be a mounted volume so should be all good

# lets copy the files to "/workspace/(sha256 of repo url)"
# this is so we can have a unique folder for each build

# Get the sha256 of the repo url
if [ -z "$REPO_SHA" ]; then
  REPO_SHA=$(git rev-parse HEAD)
fi


echo "Cleaning workspace at /workspace/$REPO_SHA"
# clean the workspace
rm -rf "/workspace/$REPO_SHA"

echo "Copying files to /workspace/$REPO_SHA"
# Copy the files to the workspace
cp -r dist "/workspace/$REPO_SHA"

echo "Build completed successfully."