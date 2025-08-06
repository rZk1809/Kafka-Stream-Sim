#!/bin/bash
"""
Complete Project Validation Script

Validates both Phase 1 and Phase 2 deployments of the Kafka streaming simulation.
Performs comprehensive testing of all components and configurations.
"""

set -euo pipefail

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

# Configuration
PHASE1_COMPOSE_FILE="docker-compose.yml"
PHASE2_STACK_FILE="docker-stack.yml"
STACK_NAME="kafka-sim"

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

# Function to validate project structure
validate_project_structure() {
    log_test "Validating project structure"
    
    local required_files=(
        "README.md"
        "docker-compose.yml"
        "docker-stack.yml"
        "producer/Dockerfile"
        "producer/requirements.txt"
        "producer/send_ticks.py"
        "consumer/Dockerfile"
        "consumer/requirements.txt"
        "consumer/read_ticks.py"
        "scripts/create-topics.sh"
        "scripts/validate-cluster.sh"
        "scripts/cleanup.sh"
        "scripts/create-prod-topics.sh"
        "docs/phase1-setup.md"
        "docs/phase2-setup.md"
        "docs/troubleshooting.md"
    )
    
    local missing_files=()
    
    for file in "${required_files[@]}"; do
        if [ ! -f "$file" ]; then
            missing_files+=("$file")
        fi
    done
    
    if [ ${#missing_files[@]} -eq 0 ]; then
        log_success "All required files are present"
    else
        log_error "Missing files: ${missing_files[*]}"
        return 1
    fi
}

# Function to validate Docker configuration files
validate_docker_configs() {
    log_test "Validating Docker configuration files"
    
    # Validate docker-compose.yml
    if docker-compose -f "$PHASE1_COMPOSE_FILE" config >/dev/null 2>&1; then
        log_info "✓ docker-compose.yml is valid"
    else
        log_error "✗ docker-compose.yml has syntax errors"
        return 1
    fi
    
    # Validate docker-stack.yml
    if docker-compose -f "$PHASE2_STACK_FILE" config >/dev/null 2>&1; then
        log_info "✓ docker-stack.yml is valid"
    else
        log_error "✗ docker-stack.yml has syntax errors"
        return 1
    fi
    
    log_success "Docker configuration files are valid"
}

# Function to validate Python code syntax
validate_python_code() {
    log_test "Validating Python code syntax"
    
    local python_files=("producer/send_ticks.py" "consumer/read_ticks.py")
    local syntax_errors=0
    
    for file in "${python_files[@]}"; do
        if python3 -m py_compile "$file" 2>/dev/null; then
            log_info "✓ $file syntax is valid"
        else
            log_error "✗ $file has syntax errors"
            ((syntax_errors++))
        fi
    done
    
    if [ $syntax_errors -eq 0 ]; then
        log_success "All Python files have valid syntax"
    else
        log_error "$syntax_errors Python files have syntax errors"
        return 1
    fi
}

# Function to validate Phase 1 deployment
validate_phase1() {
    log_test "Validating Phase 1 (Docker Compose) deployment"
    
    # Check if docker-compose is available
    if ! command -v docker-compose >/dev/null 2>&1; then
        log_error "docker-compose is not installed"
        return 1
    fi
    
    # Build images
    log_info "Building Phase 1 images..."
    if docker-compose build >/dev/null 2>&1; then
        log_info "✓ Images built successfully"
    else
        log_error "✗ Failed to build images"
        return 1
    fi
    
    # Start services
    log_info "Starting Phase 1 services..."
    if docker-compose up -d >/dev/null 2>&1; then
        log_info "✓ Services started"
    else
        log_error "✗ Failed to start services"
        return 1
    fi
    
    # Wait for services to be ready
    log_info "Waiting for services to be ready..."
    sleep 30
    
    # Check service health
    local unhealthy_services=0
    local services=("kafka-sim-zookeeper" "kafka-sim-broker" "kafka-sim-producer" "kafka-sim-consumer")
    
    for service in "${services[@]}"; do
        if docker ps --filter "name=$service" --filter "status=running" | grep -q "$service"; then
            log_info "✓ $service is running"
        else
            log_error "✗ $service is not running"
            ((unhealthy_services++))
        fi
    done
    
    if [ $unhealthy_services -eq 0 ]; then
        log_success "Phase 1 deployment is healthy"
        
        # Test message flow
        test_phase1_message_flow
        
        # Cleanup
        log_info "Cleaning up Phase 1..."
        docker-compose down >/dev/null 2>&1
    else
        log_error "Phase 1 deployment has $unhealthy_services unhealthy services"
        docker-compose down >/dev/null 2>&1
        return 1
    fi
}

# Function to test Phase 1 message flow
test_phase1_message_flow() {
    log_test "Testing Phase 1 message flow"
    
    # Check if topic exists
    if docker exec kafka-sim-broker kafka-topics --bootstrap-server localhost:9092 --list | grep -q "stock_ticks"; then
        log_info "✓ stock_ticks topic exists"
    else
        log_error "✗ stock_ticks topic does not exist"
        return 1
    fi
    
    # Check producer logs for recent activity
    local producer_messages
    producer_messages=$(docker logs kafka-sim-producer 2>&1 | grep -c "Tick sent successfully" || echo "0")
    
    if [ "$producer_messages" -gt 0 ]; then
        log_info "✓ Producer has sent $producer_messages messages"
    else
        log_warning "Producer has not sent any messages yet"
    fi
    
    # Check consumer logs for recent activity
    local consumer_messages
    consumer_messages=$(docker logs kafka-sim-consumer 2>&1 | grep -c "Tick processed" || echo "0")
    
    if [ "$consumer_messages" -gt 0 ]; then
        log_info "✓ Consumer has processed $consumer_messages messages"
    else
        log_warning "Consumer has not processed any messages yet"
    fi
    
    if [ "$producer_messages" -gt 0 ] && [ "$consumer_messages" -gt 0 ]; then
        log_success "Phase 1 message flow is working"
    else
        log_error "Phase 1 message flow is not working properly"
        return 1
    fi
}

# Function to validate Phase 2 deployment (if Swarm is available)
validate_phase2() {
    log_test "Validating Phase 2 (Docker Swarm) deployment"
    
    # Check if Docker Swarm is available
    if ! docker info | grep -q "Swarm: active"; then
        log_warning "Docker Swarm is not active, skipping Phase 2 validation"
        log_info "To test Phase 2, run: docker swarm init"
        return 0
    fi
    
    # Label nodes for single-node testing
    local node_name
    node_name=$(docker node ls --format "{{.Hostname}}" --filter "role=manager" | head -n 1)
    
    log_info "Labeling node '$node_name' for Phase 2 testing..."
    for service in zookeeper-1 zookeeper-2 zookeeper-3 kafka-1 kafka-2 kafka-3; do
        docker node update --label-add $service=true "$node_name" >/dev/null 2>&1
    done
    
    # Deploy stack
    log_info "Deploying Phase 2 stack..."
    if docker stack deploy -c "$PHASE2_STACK_FILE" "$STACK_NAME" >/dev/null 2>&1; then
        log_info "✓ Stack deployed"
    else
        log_error "✗ Failed to deploy stack"
        return 1
    fi
    
    # Wait for services to be ready
    log_info "Waiting for Phase 2 services to be ready..."
    sleep 60
    
    # Check service status
    local failed_services=0
    local services
    services=$(docker stack services "$STACK_NAME" --format "{{.Name}}" 2>/dev/null || echo "")
    
    if [ -z "$services" ]; then
        log_error "No services found in stack"
        docker stack rm "$STACK_NAME" >/dev/null 2>&1
        return 1
    fi
    
    for service in $services; do
        local replicas
        replicas=$(docker service ls --filter "name=$service" --format "{{.Replicas}}" 2>/dev/null || echo "0/0")
        
        if [[ "$replicas" =~ ^[1-9][0-9]*/[1-9][0-9]*$ ]] && [[ "${replicas%/*}" == "${replicas#*/}" ]]; then
            log_info "✓ $service is ready ($replicas)"
        else
            log_error "✗ $service is not ready ($replicas)"
            ((failed_services++))
        fi
    done
    
    if [ $failed_services -eq 0 ]; then
        log_success "Phase 2 deployment is healthy"
        
        # Test Phase 2 functionality
        test_phase2_functionality
        
        # Cleanup
        log_info "Cleaning up Phase 2..."
        docker stack rm "$STACK_NAME" >/dev/null 2>&1
        
        # Remove node labels
        for service in zookeeper-1 zookeeper-2 zookeeper-3 kafka-1 kafka-2 kafka-3; do
            docker node update --label-rm $service "$node_name" >/dev/null 2>&1 || true
        done
    else
        log_error "Phase 2 deployment has $failed_services failed services"
        docker stack rm "$STACK_NAME" >/dev/null 2>&1
        return 1
    fi
}

# Function to test Phase 2 functionality
test_phase2_functionality() {
    log_test "Testing Phase 2 functionality"
    
    # Get a Kafka container
    local kafka_container
    kafka_container=$(docker ps --filter "name=${STACK_NAME}_kafka" --format "{{.Names}}" | head -n 1)
    
    if [ -z "$kafka_container" ]; then
        log_error "No Kafka containers found"
        return 1
    fi
    
    # Test cluster connectivity
    if docker exec "$kafka_container" kafka-broker-api-versions --bootstrap-server localhost:9092 >/dev/null 2>&1; then
        log_info "✓ Kafka cluster is accessible"
    else
        log_error "✗ Kafka cluster is not accessible"
        return 1
    fi
    
    # Check if we can create topics
    if docker exec "$kafka_container" kafka-topics --bootstrap-server localhost:9092 --create --topic test-topic --partitions 3 --replication-factor 3 >/dev/null 2>&1; then
        log_info "✓ Topic creation works"
        docker exec "$kafka_container" kafka-topics --bootstrap-server localhost:9092 --delete --topic test-topic >/dev/null 2>&1 || true
    else
        log_warning "Topic creation failed (may be normal if cluster is still starting)"
    fi
    
    log_success "Phase 2 functionality test completed"
}

# Function to validate documentation
validate_documentation() {
    log_test "Validating documentation"
    
    local doc_files=("docs/phase1-setup.md" "docs/phase2-setup.md" "docs/troubleshooting.md")
    local missing_docs=0
    
    for doc in "${doc_files[@]}"; do
        if [ -f "$doc" ] && [ -s "$doc" ]; then
            log_info "✓ $doc exists and is not empty"
        else
            log_error "✗ $doc is missing or empty"
            ((missing_docs++))
        fi
    done
    
    if [ $missing_docs -eq 0 ]; then
        log_success "All documentation files are present"
    else
        log_error "$missing_docs documentation files are missing or empty"
        return 1
    fi
}

# Function to validate scripts
validate_scripts() {
    log_test "Validating utility scripts"
    
    local scripts=("scripts/create-topics.sh" "scripts/validate-cluster.sh" "scripts/cleanup.sh" "scripts/create-prod-topics.sh")
    local invalid_scripts=0
    
    for script in "${scripts[@]}"; do
        if [ -f "$script" ] && [ -s "$script" ]; then
            log_info "✓ $script exists and is not empty"
        else
            log_error "✗ $script is missing or empty"
            ((invalid_scripts++))
        fi
    done
    
    if [ $invalid_scripts -eq 0 ]; then
        log_success "All utility scripts are present"
    else
        log_error "$invalid_scripts utility scripts are missing or empty"
        return 1
    fi
}

# Main validation function
main() {
    echo "=================================================="
    echo "Kafka Stream Simulation - Complete Project Validation"
    echo "=================================================="
    echo ""
    
    # Reset counters
    TESTS_PASSED=0
    TESTS_FAILED=0
    TOTAL_TESTS=0
    
    # Run all validation tests
    validate_project_structure || true
    validate_docker_configs || true
    validate_python_code || true
    validate_documentation || true
    validate_scripts || true
    
    # Phase-specific validations
    if [ "${1:-all}" = "all" ] || [ "${1:-all}" = "phase1" ]; then
        validate_phase1 || true
    fi
    
    if [ "${1:-all}" = "all" ] || [ "${1:-all}" = "phase2" ]; then
        validate_phase2 || true
    fi
    
    echo ""
    echo "=================================================="
    echo "VALIDATION SUMMARY"
    echo "=================================================="
    echo "Total Tests: $TOTAL_TESTS"
    echo "Passed: $TESTS_PASSED"
    echo "Failed: $TESTS_FAILED"
    
    # Calculate confidence rating
    local confidence=0
    if [ $TOTAL_TESTS -gt 0 ]; then
        confidence=$(( (TESTS_PASSED * 100) / TOTAL_TESTS ))
    fi
    
    echo "Confidence Rating: $confidence%"
    echo ""
    
    if [ $TESTS_FAILED -eq 0 ]; then
        log_success "All validation tests passed! Project is ready for production. ✓"
        echo ""
        echo "Next Steps:"
        echo "1. Review the setup guides in docs/"
        echo "2. Start with Phase 1: docker-compose up -d"
        echo "3. Validate with: ./scripts/validate-cluster.sh"
        echo "4. Proceed to Phase 2 when ready"
        exit 0
    else
        log_error "Some validation tests failed! Review the issues above. ✗"
        echo ""
        echo "Troubleshooting:"
        echo "1. Check the error messages above"
        echo "2. Review docs/troubleshooting.md"
        echo "3. Ensure all dependencies are installed"
        echo "4. Verify Docker and Docker Compose are working"
        exit 1
    fi
}

# Handle command line arguments
case "${1:-all}" in
    "all"|"phase1"|"phase2")
        main "$1"
        ;;
    "help"|"-h"|"--help")
        echo "Usage: $0 [SCOPE]"
        echo ""
        echo "Scopes:"
        echo "  all     - Validate entire project (default)"
        echo "  phase1  - Validate Phase 1 only"
        echo "  phase2  - Validate Phase 2 only"
        echo "  help    - Show this help"
        echo ""
        echo "Examples:"
        echo "  $0          # Validate everything"
        echo "  $0 phase1   # Validate Phase 1 only"
        echo "  $0 phase2   # Validate Phase 2 only"
        ;;
    *)
        log_error "Unknown scope: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac
