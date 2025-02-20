FROM --platform=linux/amd64 ubuntu:20.04

# Avoid interactive prompts during build
ENV DEBIAN_FRONTEND=noninteractive

# Install required packages
RUN apt-get update && apt-get install -y \
    curl \
    git \
    bash \
    unzip \
 && rm -rf /var/lib/apt/lists/*

# --------------------------------------------------
# Install fnm (Fast Node Manager)
# --------------------------------------------------
RUN curl -fsSL https://fnm.vercel.app/install | bash

# Add fnm to PATH (default install location is $HOME/.fnm)
ENV PATH=/root/.fnm:$PATH

# --------------------------------------------------
# Setup Git
# --------------------------------------------------
RUN git config --global user.email "builder@example.com"
RUN git config --global user.name "Docker Builder"


WORKDIR /builder
# --------------------------------------------------
# Copy and set up the bash script to run
# --------------------------------------------------
COPY build.sh .
RUN chmod +x build.sh

# Use ENTRYPOINT instead of CMD
ENTRYPOINT ["./build.sh"]

