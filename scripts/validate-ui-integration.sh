#!/bin/bash

# Kafka Stream Simulator UI Integration Validation Script
# This script validates the complete integration from Kafka to UI

set -e

echo "🔍 Kafka Stream Simulator UI Integration Validation"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local status=$1
    local message=$2
    case $status in
        "SUCCESS") echo -e "${GREEN}✅ $message${NC}" ;;
        "ERROR") echo -e "${RED}❌ $message${NC}" ;;
        "WARNING") echo -e "${YELLOW}⚠️  $message${NC}" ;;
        "INFO") echo -e "${BLUE}ℹ️  $message${NC}" ;;
    esac
}

# Function to check if service is healthy
check_service_health() {
    local service_name=$1
    local max_attempts=30
    local attempt=1
    
    print_status "INFO" "Checking $service_name health..."
    
    while [ $attempt -le $max_attempts ]; do
        if docker-compose ps $service_name | grep -q "healthy"; then
            print_status "SUCCESS" "$service_name is healthy"
            return 0
        fi
        
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    print_status "ERROR" "$service_name failed to become healthy"
    return 1
}

# Function to check HTTP endpoint
check_http_endpoint() {
    local url=$1
    local description=$2
    local max_attempts=10
    local attempt=1
    
    print_status "INFO" "Checking $description at $url..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s -f "$url" > /dev/null 2>&1; then
            print_status "SUCCESS" "$description is responding"
            return 0
        fi
        
        echo -n "."
        sleep 3
        attempt=$((attempt + 1))
    done
    
    print_status "ERROR" "$description is not responding"
    return 1
}

# Function to check WebSocket connection
check_websocket() {
    local ws_url=$1
    print_status "INFO" "Checking WebSocket connection at $ws_url..."
    
    # Use a simple Node.js script to test WebSocket
    node -e "
        const WebSocket = require('ws');
        const ws = new WebSocket('$ws_url');
        
        ws.on('open', function open() {
            console.log('WebSocket connection successful');
            process.exit(0);
        });
        
        ws.on('error', function error(err) {
            console.error('WebSocket connection failed:', err.message);
            process.exit(1);
        });
        
        setTimeout(() => {
            console.error('WebSocket connection timeout');
            process.exit(1);
        }, 10000);
    " 2>/dev/null && print_status "SUCCESS" "WebSocket connection working" || print_status "ERROR" "WebSocket connection failed"
}

# Main validation steps
echo ""
print_status "INFO" "Starting validation process..."

# Step 1: Check if Docker Compose is running
print_status "INFO" "Step 1: Checking Docker Compose services..."
if ! docker-compose ps > /dev/null 2>&1; then
    print_status "ERROR" "Docker Compose is not running. Please run 'docker-compose up -d' first."
    exit 1
fi

# Step 2: Check individual service health
print_status "INFO" "Step 2: Checking service health..."
services=("zookeeper" "kafka" "producer" "consumer" "websocket-bridge" "ui")

for service in "${services[@]}"; do
    if ! check_service_health "$service"; then
        print_status "ERROR" "Service $service is not healthy. Check logs with: docker-compose logs $service"
        exit 1
    fi
done

# Step 3: Check HTTP endpoints
print_status "INFO" "Step 3: Checking HTTP endpoints..."

# WebSocket Bridge health
if ! check_http_endpoint "http://localhost:8080/health" "WebSocket Bridge health endpoint"; then
    exit 1
fi

# WebSocket Bridge metrics
if ! check_http_endpoint "http://localhost:8080/metrics" "WebSocket Bridge metrics endpoint"; then
    exit 1
fi

# UI health
if ! check_http_endpoint "http://localhost:3000/health" "UI health endpoint"; then
    exit 1
fi

# UI main page
if ! check_http_endpoint "http://localhost:3000" "UI main page"; then
    exit 1
fi

# Step 4: Check WebSocket connection (if Node.js is available)
print_status "INFO" "Step 4: Checking WebSocket connectivity..."
if command -v node > /dev/null 2>&1; then
    check_websocket "ws://localhost:8080"
else
    print_status "WARNING" "Node.js not available, skipping WebSocket test"
fi

# Step 5: Check Kafka topic and messages
print_status "INFO" "Step 5: Checking Kafka integration..."

# Check if topic exists
if docker exec kafka-sim-broker kafka-topics --bootstrap-server localhost:9092 --list | grep -q "stock_ticks"; then
    print_status "SUCCESS" "Kafka topic 'stock_ticks' exists"
else
    print_status "ERROR" "Kafka topic 'stock_ticks' not found"
    exit 1
fi

# Check if messages are being produced
print_status "INFO" "Checking message production..."
message_count=$(docker exec kafka-sim-broker kafka-run-class kafka.tools.GetOffsetShell --broker-list localhost:9092 --topic stock_ticks --time -1 | awk -F: '{sum += $3} END {print sum}')

if [ "$message_count" -gt 0 ]; then
    print_status "SUCCESS" "Messages are being produced ($message_count total messages)"
else
    print_status "WARNING" "No messages found in topic (may be normal if just started)"
fi

# Step 6: Check logs for errors
print_status "INFO" "Step 6: Checking for critical errors in logs..."

for service in "${services[@]}"; do
    error_count=$(docker-compose logs --tail=50 "$service" 2>/dev/null | grep -i "error\|exception\|failed" | wc -l)
    if [ "$error_count" -gt 0 ]; then
        print_status "WARNING" "$service has $error_count error messages in recent logs"
    else
        print_status "SUCCESS" "$service logs look clean"
    fi
done

# Final summary
echo ""
print_status "SUCCESS" "🎉 All validation checks completed successfully!"
echo ""
print_status "INFO" "Access your Kafka Stream Simulator at:"
echo "  📊 Dashboard: http://localhost:3000"
echo "  🔌 WebSocket Bridge: http://localhost:8080"
echo "  📈 Metrics: http://localhost:8080/metrics"
echo ""
print_status "INFO" "To monitor real-time logs:"
echo "  docker-compose logs -f"
echo ""
print_status "INFO" "To stop all services:"
echo "  docker-compose down"
