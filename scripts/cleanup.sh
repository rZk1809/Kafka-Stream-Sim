#!/bin/bash
"""
Kafka Cluster Cleanup Script

Provides comprehensive cleanup options for the Kafka streaming simulation environment.
Supports selective cleanup of containers, volumes, networks, and images.
"""

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to confirm action
confirm_action() {
    local message="$1"
    local default="${2:-n}"
    
    if [ "$default" = "y" ]; then
        local prompt="$message [Y/n]: "
    else
        local prompt="$message [y/N]: "
    fi
    
    read -p "$prompt" -r response
    response=${response:-$default}
    
    case "$response" in
        [yY][eE][sS]|[yY])
            return 0
            ;;
        *)
            return 1
            ;;
    esac
}

# Function to stop and remove containers
cleanup_containers() {
    log_info "Cleaning up containers..."
    
    local containers=("kafka-sim-producer" "kafka-sim-consumer" "kafka-sim-broker" "kafka-sim-zookeeper")
    
    for container in "${containers[@]}"; do
        if docker ps -a --format "{{.Names}}" | grep -q "^$container$"; then
            log_info "Stopping and removing container: $container"
            docker stop "$container" >/dev/null 2>&1 || true
            docker rm "$container" >/dev/null 2>&1 || true
            log_success "Container '$container' removed"
        else
            log_info "Container '$container' not found"
        fi
    done
}

# Function to remove volumes
cleanup_volumes() {
    log_info "Cleaning up volumes..."
    
    local volumes=("kafka-stream-sim_zookeeper-data" "kafka-stream-sim_zookeeper-logs" "kafka-stream-sim_kafka-data")
    
    for volume in "${volumes[@]}"; do
        if docker volume ls --format "{{.Name}}" | grep -q "^$volume$"; then
            log_info "Removing volume: $volume"
            docker volume rm "$volume" >/dev/null 2>&1 || true
            log_success "Volume '$volume' removed"
        else
            log_info "Volume '$volume' not found"
        fi
    done
    
    # Remove any orphaned volumes
    log_info "Removing orphaned volumes..."
    local orphaned_volumes
    orphaned_volumes=$(docker volume ls -q --filter "dangling=true" | grep -E "(kafka|zookeeper)" || true)
    
    if [ -n "$orphaned_volumes" ]; then
        echo "$orphaned_volumes" | xargs docker volume rm >/dev/null 2>&1 || true
        log_success "Orphaned volumes removed"
    else
        log_info "No orphaned volumes found"
    fi
}

# Function to remove networks
cleanup_networks() {
    log_info "Cleaning up networks..."
    
    local networks=("kafka-stream-sim_kafka-network")
    
    for network in "${networks[@]}"; do
        if docker network ls --format "{{.Name}}" | grep -q "^$network$"; then
            log_info "Removing network: $network"
            docker network rm "$network" >/dev/null 2>&1 || true
            log_success "Network '$network' removed"
        else
            log_info "Network '$network' not found"
        fi
    done
}

# Function to remove images
cleanup_images() {
    log_info "Cleaning up images..."
    
    # Remove custom built images
    local custom_images=("kafka-stream-sim_producer" "kafka-stream-sim_consumer")
    
    for image in "${custom_images[@]}"; do
        if docker images --format "{{.Repository}}" | grep -q "^$image$"; then
            log_info "Removing image: $image"
            docker rmi "$image" >/dev/null 2>&1 || true
            log_success "Image '$image' removed"
        else
            log_info "Image '$image' not found"
        fi
    done
    
    # Optionally remove Confluent images
    if confirm_action "Remove Confluent Kafka images? (This will require re-downloading them later)"; then
        local confluent_images=("confluentinc/cp-kafka" "confluentinc/cp-zookeeper" "confluentinc/cp-schema-registry")
        
        for image in "${confluent_images[@]}"; do
            local image_ids
            image_ids=$(docker images --format "{{.ID}}" --filter "reference=$image" || true)
            
            if [ -n "$image_ids" ]; then
                log_info "Removing Confluent image: $image"
                echo "$image_ids" | xargs docker rmi >/dev/null 2>&1 || true
                log_success "Confluent image '$image' removed"
            else
                log_info "Confluent image '$image' not found"
            fi
        done
    fi
}

# Function to clean up Docker system
cleanup_docker_system() {
    log_info "Cleaning up Docker system..."
    
    if confirm_action "Run Docker system prune to remove unused containers, networks, and images?"; then
        docker system prune -f >/dev/null 2>&1
        log_success "Docker system cleaned up"
    fi
    
    if confirm_action "Remove unused volumes?"; then
        docker volume prune -f >/dev/null 2>&1
        log_success "Unused volumes removed"
    fi
}

# Function to show current Docker resources
show_resources() {
    echo ""
    log_info "=== CURRENT DOCKER RESOURCES ==="
    
    echo ""
    log_info "Containers:"
    docker ps -a --format "table {{.Names}}\t{{.Image}}\t{{.Status}}" --filter "name=kafka-sim" || echo "No kafka-sim containers found"
    
    echo ""
    log_info "Volumes:"
    docker volume ls --format "table {{.Name}}\t{{.Driver}}" --filter "name=kafka-stream-sim" || echo "No kafka-stream-sim volumes found"
    
    echo ""
    log_info "Networks:"
    docker network ls --format "table {{.Name}}\t{{.Driver}}" --filter "name=kafka-stream-sim" || echo "No kafka-stream-sim networks found"
    
    echo ""
    log_info "Images:"
    docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}" --filter "reference=kafka-stream-sim*" || echo "No kafka-stream-sim images found"
    docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}" --filter "reference=confluentinc/*" || echo "No Confluent images found"
}

# Function to perform full cleanup
full_cleanup() {
    log_warning "This will remove ALL Kafka simulation resources including data!"
    
    if ! confirm_action "Are you sure you want to proceed with full cleanup?"; then
        log_info "Cleanup cancelled"
        exit 0
    fi
    
    echo ""
    log_info "Starting full cleanup..."
    
    # Stop Docker Compose services first
    if [ -f "docker-compose.yml" ]; then
        log_info "Stopping Docker Compose services..."
        docker-compose down >/dev/null 2>&1 || true
    fi
    
    # Clean up in order
    cleanup_containers
    cleanup_volumes
    cleanup_networks
    cleanup_images
    cleanup_docker_system
    
    log_success "Full cleanup completed!"
}

# Function to perform selective cleanup
selective_cleanup() {
    echo ""
    log_info "Selective cleanup options:"
    
    if confirm_action "Stop and remove containers?"; then
        cleanup_containers
    fi
    
    if confirm_action "Remove volumes? (This will delete all Kafka data!)"; then
        cleanup_volumes
    fi
    
    if confirm_action "Remove networks?"; then
        cleanup_networks
    fi
    
    if confirm_action "Remove custom images?"; then
        cleanup_images
    fi
    
    if confirm_action "Clean up Docker system?"; then
        cleanup_docker_system
    fi
    
    log_success "Selective cleanup completed!"
}

# Function to stop services only
stop_services() {
    log_info "Stopping Kafka simulation services..."
    
    if [ -f "docker-compose.yml" ]; then
        docker-compose stop
        log_success "Services stopped successfully"
    else
        log_warning "docker-compose.yml not found, stopping containers manually..."
        cleanup_containers
    fi
}

# Function to restart services
restart_services() {
    log_info "Restarting Kafka simulation services..."
    
    if [ -f "docker-compose.yml" ]; then
        docker-compose restart
        log_success "Services restarted successfully"
    else
        log_error "docker-compose.yml not found"
        exit 1
    fi
}

# Main function
main() {
    echo "=================================================="
    echo "Kafka Simulation Cleanup Script"
    echo "=================================================="
    
    local action="${1:-interactive}"
    
    case "$action" in
        "full")
            full_cleanup
            ;;
        "selective")
            selective_cleanup
            ;;
        "stop")
            stop_services
            ;;
        "restart")
            restart_services
            ;;
        "show")
            show_resources
            ;;
        "interactive"|"")
            echo ""
            echo "Cleanup Options:"
            echo "1. Show current resources"
            echo "2. Stop services only"
            echo "3. Restart services"
            echo "4. Selective cleanup"
            echo "5. Full cleanup (removes everything)"
            echo "6. Exit"
            echo ""
            
            read -p "Select an option [1-6]: " -r choice
            
            case "$choice" in
                1) show_resources ;;
                2) stop_services ;;
                3) restart_services ;;
                4) selective_cleanup ;;
                5) full_cleanup ;;
                6) log_info "Exiting..."; exit 0 ;;
                *) log_error "Invalid option"; exit 1 ;;
            esac
            ;;
        "help"|"-h"|"--help")
            echo "Usage: $0 [ACTION]"
            echo ""
            echo "Actions:"
            echo "  interactive  - Interactive cleanup menu (default)"
            echo "  full         - Full cleanup (removes everything)"
            echo "  selective    - Selective cleanup with prompts"
            echo "  stop         - Stop services only"
            echo "  restart      - Restart services"
            echo "  show         - Show current Docker resources"
            echo "  help         - Show this help"
            echo ""
            echo "Examples:"
            echo "  $0              # Interactive menu"
            echo "  $0 stop         # Stop all services"
            echo "  $0 full         # Complete cleanup"
            echo "  $0 show         # Show current resources"
            ;;
        *)
            log_error "Unknown action: $action"
            echo "Use '$0 help' for usage information"
            exit 1
            ;;
    esac
    
    echo ""
    show_resources
}

# Run main function with all arguments
main "$@"
