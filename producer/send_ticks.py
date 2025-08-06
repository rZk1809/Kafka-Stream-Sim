#!/usr/bin/env python3
"""
Kafka Stock Tick Producer

Generates realistic stock tick data and publishes to Kafka topic.
Supports configurable intervals, multiple stock symbols, and comprehensive error handling.
"""

import json
import logging
import os
import random
import signal
import sys
import time
from datetime import datetime, timezone
from typing import Dict, List, Optional

from kafka import KafkaProducer
from kafka.errors import KafkaError, KafkaTimeoutError
from pythonjsonlogger import jsonlogger


class StockTickProducer:
    """
    Produces realistic stock tick data to Kafka topic.
    
    Features:
    - Realistic price movements with volatility
    - Multiple stock symbols with different characteristics
    - Comprehensive error handling and retry logic
    - Structured logging with JSON format
    - Graceful shutdown handling
    """
    
    def __init__(self):
        self.setup_logging()
        self.load_config()
        self.setup_stock_data()
        self.producer: Optional[KafkaProducer] = None
        self.running = True
        self.message_count = 0
        
        # Setup signal handlers for graceful shutdown
        signal.signal(signal.SIGINT, self.signal_handler)
        signal.signal(signal.SIGTERM, self.signal_handler)
    
    def setup_logging(self) -> None:
        """Configure structured logging with JSON format."""
        log_level = os.getenv('LOG_LEVEL', 'INFO').upper()
        
        # Create JSON formatter
        json_formatter = jsonlogger.JsonFormatter(
            '%(asctime)s %(name)s %(levelname)s %(message)s'
        )
        
        # Configure root logger
        logger = logging.getLogger()
        logger.setLevel(getattr(logging, log_level))
        
        # Console handler
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setFormatter(json_formatter)
        logger.addHandler(console_handler)
        
        self.logger = logging.getLogger(__name__)
    
    def load_config(self) -> None:
        """Load configuration from environment variables."""
        self.bootstrap_servers = os.getenv('KAFKA_BOOTSTRAP_SERVERS', 'localhost:9092')
        self.topic = os.getenv('KAFKA_TOPIC', 'stock_ticks')
        self.interval = float(os.getenv('PRODUCER_INTERVAL', '1.5'))
        
        self.logger.info(
            "Configuration loaded",
            extra={
                'bootstrap_servers': self.bootstrap_servers,
                'topic': self.topic,
                'interval': self.interval
            }
        )
    
    def setup_stock_data(self) -> None:
        """Initialize stock symbols with realistic base prices and volatility."""
        self.stocks: Dict[str, Dict] = {
            'AAPL': {'price': 150.00, 'volatility': 0.02, 'trend': 0.0001},
            'GOOGL': {'price': 2800.00, 'volatility': 0.025, 'trend': 0.0002},
            'MSFT': {'price': 380.00, 'volatility': 0.018, 'trend': 0.0001},
            'TSLA': {'price': 250.00, 'volatility': 0.04, 'trend': -0.0001},
            'AMZN': {'price': 3200.00, 'volatility': 0.022, 'trend': 0.0001}
        }
        
        self.logger.info(
            "Stock data initialized",
            extra={'symbols': list(self.stocks.keys())}
        )
    
    def create_producer(self) -> KafkaProducer:
        """Create and configure Kafka producer with retry logic."""
        max_retries = 5
        retry_delay = 2
        
        for attempt in range(max_retries):
            try:
                producer = KafkaProducer(
                    bootstrap_servers=self.bootstrap_servers,
                    value_serializer=lambda v: json.dumps(v).encode('utf-8'),
                    key_serializer=lambda k: k.encode('utf-8') if k else None,
                    acks='all',  # Wait for all replicas to acknowledge
                    retries=3,
                    batch_size=16384,
                    linger_ms=10,
                    buffer_memory=33554432,
                    max_request_size=1048576,
                    request_timeout_ms=30000,
                    retry_backoff_ms=100
                )
                
                self.logger.info(
                    "Kafka producer created successfully",
                    extra={'attempt': attempt + 1, 'bootstrap_servers': self.bootstrap_servers}
                )
                return producer
                
            except Exception as e:
                self.logger.error(
                    "Failed to create Kafka producer",
                    extra={
                        'attempt': attempt + 1,
                        'max_retries': max_retries,
                        'error': str(e),
                        'error_type': type(e).__name__
                    }
                )
                
                if attempt < max_retries - 1:
                    time.sleep(retry_delay * (2 ** attempt))  # Exponential backoff
                else:
                    raise
    
    def generate_tick(self, symbol: str) -> Dict:
        """
        Generate realistic stock tick data with price movement simulation.
        
        Args:
            symbol: Stock symbol to generate tick for
            
        Returns:
            Dictionary containing tick data
        """
        stock_data = self.stocks[symbol]
        
        # Calculate price movement with trend and volatility
        random_factor = random.gauss(0, 1)  # Normal distribution
        price_change = (
            stock_data['trend'] * stock_data['price'] +  # Trend component
            stock_data['volatility'] * stock_data['price'] * random_factor  # Volatility
        )
        
        # Update price with bounds checking
        new_price = max(0.01, stock_data['price'] + price_change)
        stock_data['price'] = new_price
        
        # Generate volume (higher volume for larger price movements)
        base_volume = random.randint(100, 2000)
        volume_multiplier = 1 + abs(price_change / stock_data['price']) * 10
        volume = int(base_volume * volume_multiplier)
        
        return {
            'symbol': symbol,
            'price': round(new_price, 2),
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'volume': volume
        }
    
    def send_tick(self, tick_data: Dict) -> bool:
        """
        Send tick data to Kafka topic with error handling.
        
        Args:
            tick_data: Tick data to send
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Use symbol as partition key for consistent partitioning
            future = self.producer.send(
                self.topic,
                value=tick_data,
                key=tick_data['symbol']
            )
            
            # Wait for send to complete with timeout
            record_metadata = future.get(timeout=10)
            
            self.message_count += 1
            self.logger.info(
                "Tick sent successfully",
                extra={
                    'symbol': tick_data['symbol'],
                    'price': tick_data['price'],
                    'volume': tick_data['volume'],
                    'partition': record_metadata.partition,
                    'offset': record_metadata.offset,
                    'message_count': self.message_count
                }
            )
            return True
            
        except KafkaTimeoutError:
            self.logger.error(
                "Timeout sending tick to Kafka",
                extra={'symbol': tick_data['symbol'], 'timeout': 10}
            )
            return False
            
        except KafkaError as e:
            self.logger.error(
                "Kafka error sending tick",
                extra={
                    'symbol': tick_data['symbol'],
                    'error': str(e),
                    'error_type': type(e).__name__
                }
            )
            return False
            
        except Exception as e:
            self.logger.error(
                "Unexpected error sending tick",
                extra={
                    'symbol': tick_data['symbol'],
                    'error': str(e),
                    'error_type': type(e).__name__
                }
            )
            return False
    
    def signal_handler(self, signum: int, frame) -> None:
        """Handle shutdown signals gracefully."""
        self.logger.info(
            "Shutdown signal received",
            extra={'signal': signum, 'message_count': self.message_count}
        )
        self.running = False
    
    def run(self) -> None:
        """Main producer loop."""
        self.logger.info("Starting stock tick producer")
        
        try:
            # Create producer
            self.producer = self.create_producer()
            
            # Main production loop
            while self.running:
                # Generate tick for random stock
                symbol = random.choice(list(self.stocks.keys()))
                tick_data = self.generate_tick(symbol)
                
                # Send tick
                self.send_tick(tick_data)
                
                # Wait for next interval
                time.sleep(self.interval)
                
        except KeyboardInterrupt:
            self.logger.info("Received keyboard interrupt")
        except Exception as e:
            self.logger.error(
                "Fatal error in producer",
                extra={'error': str(e), 'error_type': type(e).__name__}
            )
            sys.exit(1)
        finally:
            self.cleanup()
    
    def cleanup(self) -> None:
        """Clean up resources."""
        self.logger.info("Cleaning up producer resources")
        
        if self.producer:
            try:
                # Flush any pending messages
                self.producer.flush(timeout=10)
                self.producer.close(timeout=10)
                self.logger.info("Producer closed successfully")
            except Exception as e:
                self.logger.error(
                    "Error closing producer",
                    extra={'error': str(e)}
                )
        
        self.logger.info(
            "Producer shutdown complete",
            extra={'total_messages_sent': self.message_count}
        )


if __name__ == '__main__':
    producer = StockTickProducer()
    producer.run()
