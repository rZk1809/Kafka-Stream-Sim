#!/bin/bash
"""
Production Kafka Topic Creation Script for Docker Swarm

Creates and configures Kafka topics for the production Docker Swarm environment.
Handles multi-broker setup with proper replication and partitioning.
"""

set -euo pipefail

# Configuration
STACK_NAME="kafka-sim"
TOPIC_NAME="stock_ticks"
BOOTSTRAP_SERVERS="localhost:9092,localhost:9093,localhost:9094"

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

# Function to get a running Kafka service container
get_kafka_container() {
    local kafka_container
    kafka_container=$(docker ps --filter "name=${STACK_NAME}_kafka" --format "{{.Names}}" | head -n 1)
    
    if [ -z "$kafka_container" ]; then
        log_error "No running Kafka containers found for stack '$STACK_NAME'"
        return 1
    fi
    
    echo "$kafka_container"
}

# Function to check if Docker Swarm stack is running
check_swarm_stack() {
    log_info "Checking if Docker Swarm stack '$STACK_NAME' is running..."
    
    if ! docker stack ls | grep -q "$STACK_NAME"; then
        log_error "Docker Swarm stack '$STACK_NAME' is not running"
        log_info "Please deploy the stack with: docker stack deploy -c docker-stack.yml $STACK_NAME"
        return 1
    fi
    
    log_success "Docker Swarm stack '$STACK_NAME' is running"
    return 0
}

# Function to wait for Kafka cluster to be ready
wait_for_kafka_cluster() {
    log_info "Waiting for Kafka cluster to be ready..."
    
    local max_attempts=60
    local attempt=1
    local kafka_container
    
    while [ $attempt -le $max_attempts ]; do
        kafka_container=$(get_kafka_container) || {
            log_info "Attempt $attempt/$max_attempts - No Kafka containers found, waiting..."
            sleep 5
            ((attempt++))
            continue
        }
        
        if docker exec "$kafka_container" kafka-broker-api-versions --bootstrap-server localhost:9092 >/dev/null 2>&1; then
            log_success "Kafka cluster is ready"
            return 0
        fi
        
        log_info "Attempt $attempt/$max_attempts - Kafka cluster not ready yet, waiting..."
        sleep 5
        ((attempt++))
    done
    
    log_error "Kafka cluster failed to become ready after $max_attempts attempts"
    return 1
}

# Function to check cluster health
check_cluster_health() {
    log_info "Checking Kafka cluster health..."
    
    local kafka_container
    kafka_container=$(get_kafka_container) || return 1
    
    # Check broker count
    local broker_count
    broker_count=$(docker exec "$kafka_container" kafka-broker-api-versions --bootstrap-server localhost:9092 2>/dev/null | grep -c "id:" || echo "0")
    
    log_info "Active brokers: $broker_count"
    
    if [ "$broker_count" -lt 3 ]; then
        log_warning "Expected 3 brokers, but only $broker_count are active"
        log_info "Cluster may still be starting up or some brokers are down"
    else
        log_success "All 3 brokers are active"
    fi
    
    # List all brokers
    log_info "Broker details:"
    docker exec "$kafka_container" kafka-broker-api-versions --bootstrap-server localhost:9092 2>/dev/null || {
        log_warning "Could not retrieve broker details"
    }
}

# Function to create production topic
create_production_topic() {
    local topic_name="$1"
    local partitions="$2"
    local replication_factor="$3"
    
    log_info "Creating production topic '$topic_name' with $partitions partitions and replication factor $replication_factor..."
    
    local kafka_container
    kafka_container=$(get_kafka_container) || return 1
    
    # Check if topic already exists
    if docker exec "$kafka_container" kafka-topics --bootstrap-server localhost:9092 --list | grep -q "^$topic_name$"; then
        log_warning "Topic '$topic_name' already exists"
        
        # Show current topic configuration
        log_info "Current topic configuration:"
        docker exec "$kafka_container" kafka-topics --bootstrap-server localhost:9092 --describe --topic "$topic_name"
        return 0
    fi
    
    # Create the topic with production settings
    if docker exec "$kafka_container" kafka-topics \
        --bootstrap-server localhost:9092 \
        --create \
        --topic "$topic_name" \
        --partitions "$partitions" \
        --replication-factor "$replication_factor" \
        --config retention.ms=604800000 \
        --config segment.ms=86400000 \
        --config cleanup.policy=delete \
        --config compression.type=snappy \
        --config min.insync.replicas=2 \
        --config unclean.leader.election.enable=false \
        --config max.message.bytes=1000000; then
        
        log_success "Topic '$topic_name' created successfully"
        
        # Verify topic creation
        log_info "Verifying topic creation..."
        docker exec "$kafka_container" kafka-topics --bootstrap-server localhost:9092 --describe --topic "$topic_name"
        
        return 0
    else
        log_error "Failed to create topic '$topic_name'"
        return 1
    fi
}

# Function to list all topics
list_topics() {
    log_info "Listing all Kafka topics..."
    
    local kafka_container
    kafka_container=$(get_kafka_container) || return 1
    
    docker exec "$kafka_container" kafka-topics --bootstrap-server localhost:9092 --list
}

# Function to describe topic with detailed information
describe_topic() {
    local topic_name="$1"
    
    log_info "Describing topic '$topic_name'..."
    
    local kafka_container
    kafka_container=$(get_kafka_container) || return 1
    
    docker exec "$kafka_container" kafka-topics --bootstrap-server localhost:9092 --describe --topic "$topic_name"
    
    # Show partition distribution
    log_info "Partition distribution:"
    docker exec "$kafka_container" kafka-log-dirs --bootstrap-server localhost:9092 --describe --topic-list "$topic_name" 2>/dev/null || {
        log_warning "Could not retrieve partition distribution"
    }
}

# Function to test topic with sample messages
test_topic() {
    local topic_name="$1"
    
    log_info "Testing topic '$topic_name' with sample messages..."
    
    local kafka_container
    kafka_container=$(get_kafka_container) || return 1
    
    # Produce test messages
    log_info "Producing test messages..."
    for i in {1..5}; do
        local test_message='{"symbol":"TEST","price":'$(echo "100 + $i * 0.5" | bc)',"timestamp":"'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'","volume":'$((1000 + i * 100))'}'
        echo "$test_message" | docker exec -i "$kafka_container" kafka-console-producer --bootstrap-server localhost:9092 --topic "$topic_name" >/dev/null 2>&1
    done
    log_success "Test messages produced"
    
    # Consume test messages
    log_info "Consuming test messages..."
    local consumed_count
    consumed_count=$(docker exec "$kafka_container" kafka-console-consumer --bootstrap-server localhost:9092 --topic "$topic_name" --from-beginning --max-messages 5 --timeout-ms 10000 2>/dev/null | wc -l || echo "0")
    
    if [ "$consumed_count" -ge 5 ]; then
        log_success "Successfully consumed $consumed_count test messages"
    else
        log_warning "Only consumed $consumed_count out of 5 test messages"
    fi
}

# Function to show consumer groups
show_consumer_groups() {
    log_info "Listing consumer groups..."
    
    local kafka_container
    kafka_container=$(get_kafka_container) || return 1
    
    docker exec "$kafka_container" kafka-consumer-groups --bootstrap-server localhost:9092 --list 2>/dev/null || {
        log_info "No consumer groups found"
    }
    
    # Show details for stock tick consumer group
    local group_id="stock_tick_consumers_prod"
    if docker exec "$kafka_container" kafka-consumer-groups --bootstrap-server localhost:9092 --list 2>/dev/null | grep -q "$group_id"; then
        log_info "Consumer group '$group_id' details:"
        docker exec "$kafka_container" kafka-consumer-groups --bootstrap-server localhost:9092 --describe --group "$group_id"
    fi
}

# Function to monitor topic performance
monitor_topic() {
    local topic_name="$1"
    local duration="${2:-30}"
    
    log_info "Monitoring topic '$topic_name' for $duration seconds..."
    
    local kafka_container
    kafka_container=$(get_kafka_container) || return 1
    
    # Get initial metrics
    local initial_messages
    initial_messages=$(docker exec "$kafka_container" kafka-run-class kafka.tools.GetOffsetShell --broker-list localhost:9092 --topic "$topic_name" --time -1 2>/dev/null | awk -F: '{sum += $3} END {print sum}' || echo "0")
    
    log_info "Initial message count: $initial_messages"
    log_info "Waiting $duration seconds..."
    sleep "$duration"
    
    # Get final metrics
    local final_messages
    final_messages=$(docker exec "$kafka_container" kafka-run-class kafka.tools.GetOffsetShell --broker-list localhost:9092 --topic "$topic_name" --time -1 2>/dev/null | awk -F: '{sum += $3} END {print sum}' || echo "0")
    
    local messages_per_second
    messages_per_second=$(echo "scale=2; ($final_messages - $initial_messages) / $duration" | bc -l 2>/dev/null || echo "0")
    
    log_info "Final message count: $final_messages"
    log_info "Messages produced: $((final_messages - initial_messages))"
    log_info "Messages per second: $messages_per_second"
}

# Main function
main() {
    echo "=================================================="
    echo "Production Kafka Topic Management Script"
    echo "=================================================="
    
    # Parse command line arguments
    local action="${1:-create}"
    
    case "$action" in
        "create")
            # Check if Swarm stack is running
            if ! check_swarm_stack; then
                exit 1
            fi
            
            # Wait for Kafka cluster to be ready
            if ! wait_for_kafka_cluster; then
                exit 1
            fi
            
            # Check cluster health
            check_cluster_health
            
            # Create production topic
            log_info "Creating production topics..."
            create_production_topic "$TOPIC_NAME" 6 3
            
            # List all topics
            echo ""
            list_topics
            
            # Test the topic
            echo ""
            test_topic "$TOPIC_NAME"
            ;;
            
        "list")
            check_swarm_stack && wait_for_kafka_cluster && list_topics
            ;;
            
        "describe")
            local topic_name="${2:-$TOPIC_NAME}"
            check_swarm_stack && wait_for_kafka_cluster && describe_topic "$topic_name"
            ;;
            
        "test")
            local topic_name="${2:-$TOPIC_NAME}"
            check_swarm_stack && wait_for_kafka_cluster && test_topic "$topic_name"
            ;;
            
        "monitor")
            local topic_name="${2:-$TOPIC_NAME}"
            local duration="${3:-30}"
            check_swarm_stack && wait_for_kafka_cluster && monitor_topic "$topic_name" "$duration"
            ;;
            
        "groups")
            check_swarm_stack && wait_for_kafka_cluster && show_consumer_groups
            ;;
            
        "health")
            check_swarm_stack && wait_for_kafka_cluster && check_cluster_health
            ;;
            
        "help"|"-h"|"--help")
            echo "Usage: $0 [ACTION] [PARAMETERS]"
            echo ""
            echo "Actions:"
            echo "  create              - Create production topics"
            echo "  list                - List all topics"
            echo "  describe [topic]    - Describe topic (default: $TOPIC_NAME)"
            echo "  test [topic]        - Test topic with sample messages"
            echo "  monitor [topic] [duration] - Monitor topic performance"
            echo "  groups              - Show consumer groups"
            echo "  health              - Check cluster health"
            echo "  help                - Show this help"
            echo ""
            echo "Examples:"
            echo "  $0 create           # Create production topics"
            echo "  $0 list             # List all topics"
            echo "  $0 describe         # Describe stock_ticks topic"
            echo "  $0 test             # Test stock_ticks topic"
            echo "  $0 monitor stock_ticks 60  # Monitor for 60 seconds"
            echo "  $0 groups           # Show consumer groups"
            echo "  $0 health           # Check cluster health"
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
