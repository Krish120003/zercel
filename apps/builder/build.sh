#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e
set -x


# Check if the 'REPO_URL' environment variable is set.
if [ -z "$REPO_URL" ]; then
    echo "Error: The environment variable 'REPO_URL' is not set."
    exit 1
fi

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

# Download the dependencies

if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
elif [ -f package-lock.json ]; then npm ci; \
elif [ -f pnpm-lock.yaml ]; then npm install -g pnpm && pnpm i; \
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