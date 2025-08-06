#!/bin/bash
"""
Kafka Cluster Validation Script

Validates the health and functionality of the Kafka cluster.
Performs comprehensive checks including connectivity, topic operations, and message flow.
"""

set -euo pipefail

# Configuration
KAFKA_CONTAINER="kafka-sim-broker"
TOPIC_NAME="stock_ticks"
TEST_TOPIC="validation_test"
BOOTSTRAP_SERVERS="localhost:9092"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
TESTS_PASSED=0
TESTS_FAILED=0
TOTAL_TESTS=0

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
    ((TESTS_PASSED++))
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    ((TESTS_FAILED++))
}

log_test() {
    echo -e "${BLUE}[TEST $((++TOTAL_TESTS))]${NC} $1"
}

# Function to check Docker containers
check_containers() {
    log_test "Checking Docker containers status"
    
    local containers=("kafka-sim-zookeeper" "kafka-sim-broker" "kafka-sim-producer" "kafka-sim-consumer")
    local all_running=true
    
    for container in "${containers[@]}"; do
        if docker ps --format "table {{.Names}}" | grep -q "^$container$"; then
            log_info "✓ Container '$container' is running"
        else
            log_error "✗ Container '$container' is not running"
            all_running=false
        fi
    done
    
    if [ "$all_running" = true ]; then
        log_success "All required containers are running"
    else
        log_error "Some containers are not running"
        return 1
    fi
}

# Function to check Zookeeper connectivity
check_zookeeper() {
    log_test "Checking Zookeeper connectivity"
    
    if docker exec kafka-sim-zookeeper zkCli.sh -server localhost:2181 ls / >/dev/null 2>&1; then
        log_success "Zookeeper is accessible"
    else
        log_error "Zookeeper is not accessible"
        return 1
    fi
}

# Function to check Kafka broker connectivity
check_kafka_broker() {
    log_test "Checking Kafka broker connectivity"
    
    if docker exec "$KAFKA_CONTAINER" kafka-broker-api-versions --bootstrap-server localhost:9092 >/dev/null 2>&1; then
        log_success "Kafka broker is accessible"
    else
        log_error "Kafka broker is not accessible"
        return 1
    fi
}

# Function to check topic existence and configuration
check_topics() {
    log_test "Checking topic existence and configuration"
    
    # Check if stock_ticks topic exists
    if docker exec "$KAFKA_CONTAINER" kafka-topics --bootstrap-server localhost:9092 --list | grep -q "^$TOPIC_NAME$"; then
        log_success "Topic '$TOPIC_NAME' exists"
        
        # Show topic details
        log_info "Topic configuration:"
        docker exec "$KAFKA_CONTAINER" kafka-topics --bootstrap-server localhost:9092 --describe --topic "$TOPIC_NAME"
    else
        log_error "Topic '$TOPIC_NAME' does not exist"
        log_info "Creating topic..."
        if docker exec "$KAFKA_CONTAINER" kafka-topics --bootstrap-server localhost:9092 --create --topic "$TOPIC_NAME" --partitions 3 --replication-factor 1; then
            log_success "Topic '$TOPIC_NAME' created successfully"
        else
            log_error "Failed to create topic '$TOPIC_NAME'"
            return 1
        fi
    fi
}

# Function to test message production and consumption
test_message_flow() {
    log_test "Testing message production and consumption"
    
    # Create test topic
    log_info "Creating test topic '$TEST_TOPIC'..."
    docker exec "$KAFKA_CONTAINER" kafka-topics --bootstrap-server localhost:9092 --create --topic "$TEST_TOPIC" --partitions 1 --replication-factor 1 --if-not-exists >/dev/null 2>&1
    
    # Test message
    local test_message='{"test": "validation", "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'", "value": 123}'
    
    # Produce test message
    log_info "Producing test message..."
    if echo "$test_message" | docker exec -i "$KAFKA_CONTAINER" kafka-console-producer --bootstrap-server localhost:9092 --topic "$TEST_TOPIC" >/dev/null 2>&1; then
        log_info "✓ Test message produced successfully"
    else
        log_error "✗ Failed to produce test message"
        return 1
    fi
    
    # Consume test message
    log_info "Consuming test message..."
    local consumed_message
    consumed_message=$(docker exec "$KAFKA_CONTAINER" kafka-console-consumer --bootstrap-server localhost:9092 --topic "$TEST_TOPIC" --from-beginning --max-messages 1 --timeout-ms 5000 2>/dev/null || true)
    
    if [ -n "$consumed_message" ]; then
        log_success "Test message consumed successfully"
        log_info "Consumed message: $consumed_message"
    else
        log_error "Failed to consume test message"
        return 1
    fi
    
    # Clean up test topic
    log_info "Cleaning up test topic..."
    docker exec "$KAFKA_CONTAINER" kafka-topics --bootstrap-server localhost:9092 --delete --topic "$TEST_TOPIC" >/dev/null 2>&1 || true
}

# Function to check producer service
check_producer_service() {
    log_test "Checking producer service"
    
    # Check if producer container is running
    if docker ps --format "table {{.Names}}" | grep -q "^kafka-sim-producer$"; then
        log_info "✓ Producer container is running"
        
        # Check producer logs for recent activity
        local recent_logs
        recent_logs=$(docker logs --tail 10 kafka-sim-producer 2>&1 | grep -c "Tick sent successfully" || echo "0")
        
        if [ "$recent_logs" -gt 0 ]; then
            log_success "Producer is actively sending messages ($recent_logs recent messages)"
        else
            log_warning "Producer container is running but no recent message activity detected"
        fi
    else
        log_error "Producer container is not running"
        return 1
    fi
}

# Function to check consumer service
check_consumer_service() {
    log_test "Checking consumer service"
    
    # Check if consumer container is running
    if docker ps --format "table {{.Names}}" | grep -q "^kafka-sim-consumer$"; then
        log_info "✓ Consumer container is running"
        
        # Check consumer logs for recent activity
        local recent_logs
        recent_logs=$(docker logs --tail 10 kafka-sim-consumer 2>&1 | grep -c "Tick processed" || echo "0")
        
        if [ "$recent_logs" -gt 0 ]; then
            log_success "Consumer is actively processing messages ($recent_logs recent messages)"
        else
            log_warning "Consumer container is running but no recent message activity detected"
        fi
    else
        log_error "Consumer container is not running"
        return 1
    fi
}

# Function to check message flow between producer and consumer
check_end_to_end_flow() {
    log_test "Checking end-to-end message flow"
    
    # Get initial message counts
    local initial_producer_count
    local initial_consumer_count
    
    initial_producer_count=$(docker logs kafka-sim-producer 2>&1 | grep -c "Tick sent successfully" || echo "0")
    initial_consumer_count=$(docker logs kafka-sim-consumer 2>&1 | grep -c "Tick processed" || echo "0")
    
    log_info "Initial counts - Producer: $initial_producer_count, Consumer: $initial_consumer_count"
    
    # Wait for some time to allow message flow
    log_info "Waiting 10 seconds for message flow..."
    sleep 10
    
    # Get final message counts
    local final_producer_count
    local final_consumer_count
    
    final_producer_count=$(docker logs kafka-sim-producer 2>&1 | grep -c "Tick sent successfully" || echo "0")
    final_consumer_count=$(docker logs kafka-sim-consumer 2>&1 | grep -c "Tick processed" || echo "0")
    
    log_info "Final counts - Producer: $final_producer_count, Consumer: $final_consumer_count"
    
    # Check if messages were produced and consumed
    local produced_messages=$((final_producer_count - initial_producer_count))
    local consumed_messages=$((final_consumer_count - initial_consumer_count))
    
    if [ "$produced_messages" -gt 0 ] && [ "$consumed_messages" -gt 0 ]; then
        log_success "End-to-end message flow is working ($produced_messages produced, $consumed_messages consumed)"
    else
        log_error "End-to-end message flow is not working (produced: $produced_messages, consumed: $consumed_messages)"
        return 1
    fi
}

# Function to check resource usage
check_resource_usage() {
    log_test "Checking resource usage"
    
    log_info "Container resource usage:"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" kafka-sim-zookeeper kafka-sim-broker kafka-sim-producer kafka-sim-consumer 2>/dev/null || {
        log_warning "Could not retrieve resource usage statistics"
        return 0
    }
    
    log_success "Resource usage information displayed"
}

# Function to show cluster information
show_cluster_info() {
    log_info "=== CLUSTER INFORMATION ==="
    
    echo ""
    log_info "Kafka Cluster Metadata:"
    docker exec "$KAFKA_CONTAINER" kafka-metadata-shell --snapshot /var/lib/kafka/data/__cluster_metadata-0/00000000000000000000.log --print-brokers 2>/dev/null || {
        log_info "Cluster metadata not available (normal for single broker setup)"
    }
    
    echo ""
    log_info "Available Topics:"
    docker exec "$KAFKA_CONTAINER" kafka-topics --bootstrap-server localhost:9092 --list
    
    echo ""
    log_info "Consumer Groups:"
    docker exec "$KAFKA_CONTAINER" kafka-consumer-groups --bootstrap-server localhost:9092 --list 2>/dev/null || {
        log_info "No consumer groups found or command failed"
    }
}

# Main validation function
main() {
    echo "=================================================="
    echo "Kafka Cluster Validation"
    echo "=================================================="
    echo ""
    
    # Reset counters
    TESTS_PASSED=0
    TESTS_FAILED=0
    TOTAL_TESTS=0
    
    # Run all validation tests
    check_containers || true
    check_zookeeper || true
    check_kafka_broker || true
    check_topics || true
    test_message_flow || true
    check_producer_service || true
    check_consumer_service || true
    check_end_to_end_flow || true
    check_resource_usage || true
    
    echo ""
    echo "=================================================="
    echo "VALIDATION SUMMARY"
    echo "=================================================="
    echo "Total Tests: $TOTAL_TESTS"
    echo "Passed: $TESTS_PASSED"
    echo "Failed: $TESTS_FAILED"
    
    if [ $TESTS_FAILED -eq 0 ]; then
        log_success "All validation tests passed! ✓"
        echo ""
        show_cluster_info
        exit 0
    else
        log_error "Some validation tests failed! ✗"
        echo ""
        log_info "Check the logs above for details on failed tests"
        exit 1
    fi
}

# Handle command line arguments
case "${1:-validate}" in
    "validate"|"")
        main
        ;;
    "info")
        show_cluster_info
        ;;
    "help"|"-h"|"--help")
        echo "Usage: $0 [ACTION]"
        echo ""
        echo "Actions:"
        echo "  validate  - Run full cluster validation (default)"
        echo "  info      - Show cluster information only"
        echo "  help      - Show this help"
        ;;
    *)
        log_error "Unknown action: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac
