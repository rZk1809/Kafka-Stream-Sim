const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { Kafka } = require('kafkajs');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const winston = require('winston');

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Configuration
const config = {
  port: process.env.PORT || 8080,
  kafka: {
    brokers: [process.env.KAFKA_BROKER || 'kafka:9092'],
    clientId: 'websocket-bridge',
    groupId: 'websocket-consumers'
  },
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST']
  }
};

// Initialize Express app
const app = express();
const server = createServer(app);

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors(config.cors));
app.use(express.json());

// Initialize Socket.IO
const io = new Server(server, {
  cors: config.cors,
  transports: ['websocket', 'polling']
});

// Initialize Kafka
const kafka = new Kafka({
  clientId: config.kafka.clientId,
  brokers: config.kafka.brokers,
  retry: {
    initialRetryTime: 100,
    retries: 8
  }
});

const consumer = kafka.consumer({ 
  groupId: config.kafka.groupId,
  sessionTimeout: 30000,
  heartbeatInterval: 3000
});

// Metrics tracking
const metrics = {
  messagesProcessed: 0,
  messagesPerSecond: 0,
  connectedClients: 0,
  partitionOffsets: {},
  lastMessageTime: null,
  startTime: Date.now()
};

// Calculate messages per second
setInterval(() => {
  const now = Date.now();
  const timeDiff = (now - (metrics.lastResetTime || metrics.startTime)) / 1000;
  metrics.messagesPerSecond = Math.round(metrics.messagesProcessed / timeDiff);
  metrics.messagesProcessed = 0;
  metrics.lastResetTime = now;
}, 5000);

// Socket.IO connection handling
io.on('connection', (socket) => {
  metrics.connectedClients++;
  logger.info(`Client connected: ${socket.id}, Total clients: ${metrics.connectedClients}`);
  
  // Send current metrics to new client
  socket.emit('metrics', metrics);
  
  socket.on('disconnect', () => {
    metrics.connectedClients--;
    logger.info(`Client disconnected: ${socket.id}, Total clients: ${metrics.connectedClients}`);
  });
  
  socket.on('subscribe', (symbols) => {
    socket.join('stock-updates');
    logger.info(`Client ${socket.id} subscribed to symbols: ${symbols}`);
  });
});

// Kafka consumer setup
async function startKafkaConsumer() {
  try {
    await consumer.connect();
    logger.info('Connected to Kafka');
    
    await consumer.subscribe({ topic: 'stock_ticks', fromBeginning: true });
    logger.info('Subscribed to stock_ticks topic');
    
    await consumer.run({
      eachMessage: async ({ topic, partition, message, heartbeat }) => {
        try {
          logger.info(`Processing message from partition ${partition}, offset ${message.offset}`);
          const stockTick = JSON.parse(message.value.toString());
          logger.info(`Parsed stock tick: ${JSON.stringify(stockTick)}`);

          // Update metrics
          metrics.messagesProcessed++;
          metrics.lastMessageTime = Date.now();
          metrics.partitionOffsets[partition] = message.offset;

          // Enhance message with metadata
          const enhancedTick = {
            ...stockTick,
            partition,
            offset: message.offset,
            timestamp: new Date(stockTick.timestamp).toISOString(),
            receivedAt: new Date().toISOString()
          };

          logger.info(`Broadcasting to ${metrics.connectedClients} clients`);

          // Broadcast to all connected clients
          io.to('stock-updates').emit('stock-tick', enhancedTick);

          // Also broadcast to all clients (fallback)
          io.emit('stock-tick', enhancedTick);

          // Broadcast metrics every 10 messages
          if (metrics.messagesProcessed % 10 === 0) {
            io.emit('metrics', {
              ...metrics,
              uptime: Date.now() - metrics.startTime
            });
          }

          await heartbeat();
        } catch (error) {
          logger.error('Error processing message:', error);
        }
      }
    });
  } catch (error) {
    logger.error('Kafka consumer error:', error);
    setTimeout(startKafkaConsumer, 5000); // Retry after 5 seconds
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    metrics: {
      connectedClients: metrics.connectedClients,
      messagesPerSecond: metrics.messagesPerSecond,
      uptime: Date.now() - metrics.startTime
    }
  });
});

// Metrics endpoint
app.get('/metrics', (req, res) => {
  res.json({
    ...metrics,
    uptime: Date.now() - metrics.startTime
  });
});

// Error handling
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await consumer.disconnect();
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

// Start server
server.listen(config.port, () => {
  logger.info(`WebSocket bridge server running on port ${config.port}`);
  startKafkaConsumer();
});
