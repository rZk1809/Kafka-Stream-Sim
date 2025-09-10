#!/bin/bash

# Script to update Kubernetes manifests to use Docker Hub images
# This script replaces local image references with Docker Hub references

set -e

# Configuration
DOCKER_HUB_USERNAME="${DOCKER_HUB_USERNAME:-your-username}"
PROJECT_NAME="kafka-stream-sim"
VERSION="${VERSION:-v1.0.0}"
K8S_DIR="k8s"

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

# Check if k8s directory exists
if [ ! -d "$K8S_DIR" ]; then
    print_error "Kubernetes directory '$K8S_DIR' not found"
    exit 1
fi

print_status "Updating Kubernetes manifests to use Docker Hub images..."
print_status "Docker Hub Username: $DOCKER_HUB_USERNAME"
print_status "Version: $VERSION"

# Create backup directory
BACKUP_DIR="${K8S_DIR}/backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
print_status "Creating backup in $BACKUP_DIR"

# List of services and their corresponding manifest files
declare -A SERVICE_FILES=(
    ["ui"]="ui.yaml"
    ["producer"]="producer.yaml"
    ["consumer"]="consumer.yaml"
    ["websocket-bridge"]="websocket-bridge.yaml"
)

# Update each manifest file
for service in "${!SERVICE_FILES[@]}"; do
    manifest_file="${K8S_DIR}/${SERVICE_FILES[$service]}"
    
    if [ ! -f "$manifest_file" ]; then
        print_warning "Manifest file $manifest_file not found, skipping..."
        continue
    fi
    
    # Create backup
    cp "$manifest_file" "$BACKUP_DIR/"
    print_status "Backed up $manifest_file"
    
    # Current local image reference
    local_image="${PROJECT_NAME}-${service}:latest"
    
    # New Docker Hub image reference
    hub_image="${DOCKER_HUB_USERNAME}/${PROJECT_NAME}-${service}:${VERSION}"
    
    # Update the image reference and imagePullPolicy
    print_status "Updating $manifest_file..."
    sed -i.tmp "s|image: ${local_image}|image: ${hub_image}|g" "$manifest_file"
    sed -i.tmp "s|imagePullPolicy: Never|imagePullPolicy: IfNotPresent|g" "$manifest_file"
    
    # Remove temporary file
    rm -f "${manifest_file}.tmp"
    
    print_success "Updated $service image to $hub_image"
done

# Update docker-compose.yml for Docker Hub images (optional)
if [ -f "docker-compose.hub.yml" ] || [ "$1" = "--update-compose" ]; then
    print_status "Creating docker-compose.hub.yml with Docker Hub images..."
    
    # Create a new docker-compose file for Docker Hub images
    cp docker-compose.yml docker-compose.hub.yml
    
    for service in "${!SERVICE_FILES[@]}"; do
        local_image="${PROJECT_NAME}-${service}:latest"
        hub_image="${DOCKER_HUB_USERNAME}/${PROJECT_NAME}-${service}:${VERSION}"
        
        sed -i.tmp "s|image: ${local_image}|image: ${hub_image}|g" docker-compose.hub.yml
    done
    
    rm -f docker-compose.hub.yml.tmp
    print_success "Created docker-compose.hub.yml"
fi

print_success "All Kubernetes manifests updated successfully!"
print_status "Backup created in: $BACKUP_DIR"
print_status "Updated images:"
for service in "${!SERVICE_FILES[@]}"; do
    echo "  - $service: ${DOCKER_HUB_USERNAME}/${PROJECT_NAME}-${service}:${VERSION}"
done

print_status "To deploy to Kubernetes, run:"
echo "  cd $K8S_DIR && ./deploy.sh"

print_status "To restore from backup if needed:"
echo "  cp $BACKUP_DIR/* $K8S_DIR/"
