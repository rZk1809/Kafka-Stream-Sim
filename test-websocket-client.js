#!/usr/bin/env node

const { io } = require('socket.io-client');

console.log('🚀 Starting WebSocket connectivity test...\n');

const socket = io('http://localhost:8080', {
    transports: ['websocket', 'polling']
});

let messageCount = 0;
let startTime = Date.now();
let testDuration = 15000; // 15 seconds

socket.on('connect', () => {
    console.log('✅ WebSocket Connected successfully!');
    console.log('📡 Socket ID:', socket.id);
    console.log('🔗 Transport:', socket.io.engine.transport.name);
    console.log('⏱️  Test duration: 15 seconds\n');
});

socket.on('connect_error', (error) => {
    console.error('❌ Connection failed:', error.message);
    process.exit(1);
});

socket.on('disconnect', (reason) => {
    console.log('\n🔌 Disconnected:', reason);
});

socket.on('stock-tick', (data) => {
    messageCount++;
    if (messageCount <= 5 || messageCount % 5 === 0) {
        console.log(`📊 Message ${messageCount}:`, {
            symbol: data.symbol,
            price: `$${data.price}`,
            volume: data.volume,
            timestamp: new Date(data.timestamp).toLocaleTimeString()
        });
    }
});

socket.on('metrics', (metrics) => {
    console.log('📈 System Metrics:', {
        connectedClients: metrics.connectedClients,
        messagesPerSecond: metrics.messagesPerSecond,
        uptime: `${Math.round(metrics.uptime / 1000)}s`
    });
});

// Auto-disconnect after test duration
setTimeout(() => {
    const duration = (Date.now() - startTime) / 1000;
    const avgRate = (messageCount / duration).toFixed(2);
    
    console.log('\n📊 Test Results Summary:');
    console.log('========================');
    console.log(`✅ Total messages received: ${messageCount}`);
    console.log(`⏱️  Test duration: ${duration.toFixed(1)}s`);
    console.log(`📈 Average message rate: ${avgRate} msg/sec`);
    console.log(`🔗 Connection stable: ${socket.connected ? 'YES' : 'NO'}`);
    
    if (messageCount > 0) {
        console.log('\n🎉 WebSocket connectivity test PASSED!');
    } else {
        console.log('\n❌ WebSocket connectivity test FAILED - No messages received');
    }
    
    socket.disconnect();
    process.exit(messageCount > 0 ? 0 : 1);
}, testDuration);

// Handle process termination
process.on('SIGINT', () => {
    console.log('\n⏹️  Test interrupted by user');
    socket.disconnect();
    process.exit(0);
});
