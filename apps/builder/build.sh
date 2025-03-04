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
    
    if [ ! -z "$ZERCEL_CALLBACK_URL" ]; then
        # Add timeout and silent flag
        curl -s --max-time 3 -X POST "$ZERCEL_CALLBACK_URL" \
            -H "Content-Type: application/json" \
            -d "{\"status\":\"$status\",\"exit_code\":$exit_code}" || {
            echo "Warning: Callback failed to send, but continuing..."
        }
    fi
    
    # Force exit to prevent hanging
    kill -9 $$ 
}

# Function to send initial callback
send_initial_callback() {
    if [ ! -z "$ZERCEL_CALLBACK_URL" ]; then
        response=$(curl -s -X POST "$ZERCEL_CALLBACK_URL" \
            -H "Content-Type: application/json" \
            -d "{\"status\":\"started\",\"exit_code\":0}")
        
        if [ $? -eq 0 ]; then
            echo "Initial callback response: $response"
        else
            echo "Warning: Initial callback failed to send"
        fi
    fi
}

# Set up trap to catch script exit
trap send_callback EXIT

# Check if the 'ZERCEL_REPO_URL' environment variable is set.
if [ -z "$ZERCEL_REPO_URL" ]; then
    echo "Error: The environment variable 'ZERCEL_REPO_URL' is not set."
    exit 1
fi

# Default build type to static if not specified
if [ -z "$ZERCEL_BUILD_TYPE" ]; then
    echo "ZERCEL_BUILD_TYPE not set, defaulting to 'static'"
    ZERCEL_BUILD_TYPE="static"
fi

# Send initial callback
send_initial_callback

# Clone the repository using the URL provided in the 'ZERCEL_REPO_URL' environment variable into a folder named clone
git clone --depth 1 "$ZERCEL_REPO_URL" clone
# Change the working directory to the 'clone' folder
cd clone

# Checkout the commit SHA provided in the 'ZERCEL_REPO_SHA' environment variable
if [ ! -z "$ZERCEL_REPO_SHA" ]; then
  git checkout $ZERCEL_REPO_SHA
fi

# If SHA not provided, get the current SHA
if [ -z "$ZERCEL_REPO_SHA" ]; then
  ZERCEL_REPO_SHA=$(git rev-parse HEAD)
fi

# Set up FNM path and environment
FNM_PATH="/root/.local/share/fnm"
if [ -d "$FNM_PATH" ]; then
  export PATH="$FNM_PATH:$PATH"
  eval "`fnm env --shell bash`"
fi

# Install Node.js directly - try default install first, fall back to Node.js 20
fnm install &> /dev/null || fnm install 20
fnm use default &> /dev/null || fnm use 20

# Now that Node.js is installed, get the actual version for later use
DETECTED_NODE_VERSION=$(node -v | cut -d 'v' -f2 | cut -d '.' -f1)
echo "Using Node.js version: $DETECTED_NODE_VERSION"

# If version is outside supported range, set to 20
if [ -z "$DETECTED_NODE_VERSION" ] || [ "$DETECTED_NODE_VERSION" -lt 14 ] || [ "$DETECTED_NODE_VERSION" -gt 20 ]; then
    DETECTED_NODE_VERSION="20"
    echo "Setting default Node.js version: $DETECTED_NODE_VERSION"
    fnm install 20
    fnm use 20
fi

# Check if this is a Node.js project
if [ ! -f "package.json" ]; then
    echo "No package.json found - treating as static repository"
    
    # Create workspace directory
    echo "Cleaning workspace at /workspace/$ZERCEL_REPO_SHA"
    rm -rf "/workspace/$ZERCEL_REPO_SHA"
    
    echo "Copying all files to /workspace/$ZERCEL_REPO_SHA"
    mkdir -p "/workspace/$ZERCEL_REPO_SHA"
    cp -r . "/workspace/$ZERCEL_REPO_SHA"
    
    echo "Static files copied successfully."
    exit 0
fi

# Download the dependencies
if [ -f yarn.lock ]; then yarn install; \
elif [ -f package-lock.json ]; then npm install; \
elif [ -f pnpm-lock.yaml ]; then npm install -g pnpm && pnpm install; \
else echo "Lockfile not found." && exit 1; \
fi

NO_BUILD=false

# Build the project
if [ -f yarn.lock ]; then
  # Check if build script exists for yarn
  if grep -q "\"build\":" package.json; then
    echo "Running yarn build"
    yarn build
  else
    NO_BUILD=true
    echo "No build script found in package.json, skipping build step"
  fi
elif [ -f package-lock.json ]; then
  # Check if build script exists for npm
  if grep -q "\"build\":" package.json; then
    echo "Running npm run build"
    npm run build
  else
    NO_BUILD=true   
    echo "No build script found in package.json, skipping build step"
  fi
elif [ -f pnpm-lock.yaml ]; then
  # Check if build script exists for pnpm
  if grep -q "\"build\":" package.json; then
    echo "Running pnpm run build"
    pnpm run build
  else
    NO_BUILD=true
    echo "No build script found in package.json, skipping build step"
  fi
else
  NO_BUILD=true
  echo "Lockfile not found."
fi

echo "Cleaning workspace at /workspace/$ZERCEL_REPO_SHA"
# clean the workspace
rm -rf "/workspace/$ZERCEL_REPO_SHA"

# Remove node_modules before copying files
echo "Removing node_modules directory to reduce size"
rm -rf node_modules
rm -rf .git

# Determine build output handling based on ZERCEL_BUILD_TYPE
if [ "$ZERCEL_BUILD_TYPE" = "server" ]; then
    echo "Error: Server builds are not supported in this builder."
    echo "Please use static builds instead."
    exit 1
else
    # Handle static build
    mkdir -p "/workspace/$ZERCEL_REPO_SHA"
    
    if [ "$NO_BUILD" = true ]; then
        echo "Build was skipped. Copying all files as static content."
        cp -r . "/workspace/$ZERCEL_REPO_SHA"
    elif [ -d "dist" ]; then
        echo "Copying static files from dist/ to /workspace/$ZERCEL_REPO_SHA"
        cp -r dist/* "/workspace/$ZERCEL_REPO_SHA/" 2>/dev/null || cp -r dist/. "/workspace/$ZERCEL_REPO_SHA/"
    elif [ -d "build" ]; then
        echo "Copying static files from build/ to /workspace/$ZERCEL_REPO_SHA"
        cp -r build/* "/workspace/$ZERCEL_REPO_SHA/" 2>/dev/null || cp -r build/. "/workspace/$ZERCEL_REPO_SHA/"
    elif [ -d "out" ]; then
        echo "Copying static files from out/ to /workspace/$ZERCEL_REPO_SHA"
        cp -r out/* "/workspace/$ZERCEL_REPO_SHA/" 2>/dev/null || cp -r out/. "/workspace/$ZERCEL_REPO_SHA/"
    elif [ -d "public" ]; then
        echo "Copying public files to /workspace/$ZERCEL_REPO_SHA"
        cp -r public/* "/workspace/$ZERCEL_REPO_SHA/" 2>/dev/null || cp -r public/. "/workspace/$ZERCEL_REPO_SHA/"
    else
        echo "Warning: No recognized build output directory found (dist, build, out, or public)."
        echo "Copying all files as static content."
        cp -r . "/workspace/$ZERCEL_REPO_SHA"
    fi
    
    # Create metadata file for static builds
    echo "{\"type\":\"static\",\"sha\":\"$ZERCEL_REPO_SHA\",\"buildType\":\"static\"}" > "/workspace/$ZERCEL_REPO_SHA/zercel.json"
    echo "Static files copied successfully."
fi

echo "Build completed successfully."