#!/bin/bash

# Docker Hub Deployment Script for Kafka Stream Simulator
# This script builds, tags, and pushes all container images to Docker Hub

set -e

# Configuration
DOCKER_HUB_USERNAME="${DOCKER_HUB_USERNAME:-your-username}"
PROJECT_NAME="kafka-stream-sim"
VERSION="${VERSION:-v1.0.0}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker Hub username is set
if [ "$DOCKER_HUB_USERNAME" = "your-username" ]; then
    print_error "Please set DOCKER_HUB_USERNAME environment variable"
    print_warning "Example: export DOCKER_HUB_USERNAME=myusername"
    exit 1
fi

# Check if logged into Docker Hub
print_status "Checking Docker Hub authentication..."
if ! docker info | grep -q "Username"; then
    print_warning "Not logged into Docker Hub. Please run: docker login"
    print_status "Attempting to login..."
    docker login
fi

# Build all images
print_status "Building all Docker images..."
docker-compose build

# List of services to tag and push
SERVICES=("ui" "producer" "consumer" "websocket-bridge")

# Tag and push each image
for service in "${SERVICES[@]}"; do
    local_image="${PROJECT_NAME}-${service}:latest"
    hub_image="${DOCKER_HUB_USERNAME}/${PROJECT_NAME}-${service}:${VERSION}"
    hub_image_latest="${DOCKER_HUB_USERNAME}/${PROJECT_NAME}-${service}:latest"
    
    print_status "Processing $service..."
    
    # Tag with version
    print_status "Tagging $local_image as $hub_image"
    docker tag "$local_image" "$hub_image"
    
    # Tag as latest
    print_status "Tagging $local_image as $hub_image_latest"
    docker tag "$local_image" "$hub_image_latest"
    
    # Push version tag
    print_status "Pushing $hub_image to Docker Hub..."
    docker push "$hub_image"
    
    # Push latest tag
    print_status "Pushing $hub_image_latest to Docker Hub..."
    docker push "$hub_image_latest"
    
    print_success "Successfully pushed $service to Docker Hub"
done

print_success "All images successfully pushed to Docker Hub!"
print_status "Images available at:"
for service in "${SERVICES[@]}"; do
    echo "  - ${DOCKER_HUB_USERNAME}/${PROJECT_NAME}-${service}:${VERSION}"
    echo "  - ${DOCKER_HUB_USERNAME}/${PROJECT_NAME}-${service}:latest"
done

print_status "To use these images, update your Kubernetes manifests or docker-compose.yml"
print_status "Example: image: ${DOCKER_HUB_USERNAME}/${PROJECT_NAME}-ui:${VERSION}"
