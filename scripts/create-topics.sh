#!/bin/bash
"""
Kafka Topic Creation Script

Creates and configures Kafka topics for the stock tick simulation.
Supports both development (single broker) and production (multi-broker) environments.
"""

set -euo pipefail

# Configuration
KAFKA_CONTAINER="kafka-sim-broker"
TOPIC_NAME="stock_ticks"
BOOTSTRAP_SERVERS="localhost:9092"

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

# Function to check if Kafka is running
check_kafka_running() {
    log_info "Checking if Kafka is running..."
    
    if docker ps | grep -q "$KAFKA_CONTAINER"; then
        log_success "Kafka container is running"
        return 0
    else
        log_error "Kafka container '$KAFKA_CONTAINER' is not running"
        log_info "Please start Kafka with: docker-compose up -d"
        return 1
    fi
}

# Function to wait for Kafka to be ready
wait_for_kafka() {
    log_info "Waiting for Kafka to be ready..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if docker exec "$KAFKA_CONTAINER" kafka-broker-api-versions --bootstrap-server localhost:9092 >/dev/null 2>&1; then
            log_success "Kafka is ready"
            return 0
        fi
        
        log_info "Attempt $attempt/$max_attempts - Kafka not ready yet, waiting..."
        sleep 2
        ((attempt++))
    done
    
    log_error "Kafka failed to become ready after $max_attempts attempts"
    return 1
}

# Function to create topic
create_topic() {
    local topic_name="$1"
    local partitions="$2"
    local replication_factor="$3"
    
    log_info "Creating topic '$topic_name' with $partitions partitions and replication factor $replication_factor..."
    
    # Check if topic already exists
    if docker exec "$KAFKA_CONTAINER" kafka-topics --bootstrap-server localhost:9092 --list | grep -q "^$topic_name$"; then
        log_warning "Topic '$topic_name' already exists"
        
        # Show current topic configuration
        log_info "Current topic configuration:"
        docker exec "$KAFKA_CONTAINER" kafka-topics --bootstrap-server localhost:9092 --describe --topic "$topic_name"
        return 0
    fi
    
    # Create the topic
    if docker exec "$KAFKA_CONTAINER" kafka-topics \
        --bootstrap-server localhost:9092 \
        --create \
        --topic "$topic_name" \
        --partitions "$partitions" \
        --replication-factor "$replication_factor" \
        --config retention.ms=604800000 \
        --config segment.ms=86400000 \
        --config cleanup.policy=delete \
        --config compression.type=snappy; then
        
        log_success "Topic '$topic_name' created successfully"
        
        # Verify topic creation
        log_info "Verifying topic creation..."
        docker exec "$KAFKA_CONTAINER" kafka-topics --bootstrap-server localhost:9092 --describe --topic "$topic_name"
        
        return 0
    else
        log_error "Failed to create topic '$topic_name'"
        return 1
    fi
}

# Function to list all topics
list_topics() {
    log_info "Listing all Kafka topics..."
    docker exec "$KAFKA_CONTAINER" kafka-topics --bootstrap-server localhost:9092 --list
}

# Function to delete topic (for cleanup)
delete_topic() {
    local topic_name="$1"
    
    log_warning "Deleting topic '$topic_name'..."
    
    if docker exec "$KAFKA_CONTAINER" kafka-topics --bootstrap-server localhost:9092 --delete --topic "$topic_name"; then
        log_success "Topic '$topic_name' deleted successfully"
    else
        log_error "Failed to delete topic '$topic_name'"
        return 1
    fi
}

# Function to show topic details
describe_topic() {
    local topic_name="$1"
    
    log_info "Describing topic '$topic_name'..."
    docker exec "$KAFKA_CONTAINER" kafka-topics --bootstrap-server localhost:9092 --describe --topic "$topic_name"
}

# Main function
main() {
    echo "=================================================="
    echo "Kafka Topic Management Script"
    echo "=================================================="
    
    # Parse command line arguments
    local action="${1:-create}"
    local environment="${2:-dev}"
    
    case "$action" in
        "create")
            # Check if Kafka is running
            if ! check_kafka_running; then
                exit 1
            fi
            
            # Wait for Kafka to be ready
            if ! wait_for_kafka; then
                exit 1
            fi
            
            # Set parameters based on environment
            if [ "$environment" = "prod" ]; then
                log_info "Creating topics for PRODUCTION environment"
                create_topic "$TOPIC_NAME" 6 3
            else
                log_info "Creating topics for DEVELOPMENT environment"
                create_topic "$TOPIC_NAME" 3 1
            fi
            
            # List all topics
            echo ""
            list_topics
            ;;
            
        "list")
            check_kafka_running && list_topics
            ;;
            
        "describe")
            local topic_name="${3:-$TOPIC_NAME}"
            check_kafka_running && describe_topic "$topic_name"
            ;;
            
        "delete")
            local topic_name="${3:-$TOPIC_NAME}"
            check_kafka_running && delete_topic "$topic_name"
            ;;
            
        "help"|"-h"|"--help")
            echo "Usage: $0 [ACTION] [ENVIRONMENT] [TOPIC_NAME]"
            echo ""
            echo "Actions:"
            echo "  create [dev|prod]  - Create topics (default: dev)"
            echo "  list              - List all topics"
            echo "  describe [topic]  - Describe topic (default: $TOPIC_NAME)"
            echo "  delete [topic]    - Delete topic (default: $TOPIC_NAME)"
            echo "  help              - Show this help"
            echo ""
            echo "Examples:"
            echo "  $0 create dev      # Create development topics"
            echo "  $0 create prod     # Create production topics"
            echo "  $0 list           # List all topics"
            echo "  $0 describe       # Describe stock_ticks topic"
            echo "  $0 delete         # Delete stock_ticks topic"
            ;;
            
        *)
            log_error "Unknown action: $action"
            echo "Use '$0 help' for usage information"
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"
