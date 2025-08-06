#!/usr/bin/env python3
"""
Kafka Stock Tick Consumer

Consumes stock tick data from Kafka topic and displays formatted output.
Supports consumer groups, error handling, and comprehensive logging.
"""

import json
import logging
import os
import signal
import sys
import time
from datetime import datetime
from typing import Dict, Optional

from kafka import KafkaConsumer
from kafka.errors import KafkaError, CommitFailedError
from pythonjsonlogger import jsonlogger
from tabulate import tabulate


class StockTickConsumer:
    """
    Consumes stock tick data from Kafka topic.
    
    Features:
    - Consumer group support for scalability
    - Automatic offset management
    - Comprehensive error handling and retry logic
    - Formatted output display
    - Graceful shutdown handling
    - Message statistics tracking
    """
    
    def __init__(self):
        self.setup_logging()
        self.load_config()
        self.consumer: Optional[KafkaConsumer] = None
        self.running = True
        self.message_count = 0
        self.error_count = 0
        self.last_stats_time = time.time()
        self.symbol_stats = {}
        
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
        self.group_id = os.getenv('KAFKA_GROUP_ID', 'stock_tick_consumers')
        self.stats_interval = int(os.getenv('STATS_INTERVAL', '30'))
        
        self.logger.info(
            "Configuration loaded",
            extra={
                'bootstrap_servers': self.bootstrap_servers,
                'topic': self.topic,
                'group_id': self.group_id,
                'stats_interval': self.stats_interval
            }
        )
    
    def create_consumer(self) -> KafkaConsumer:
        """Create and configure Kafka consumer with retry logic."""
        max_retries = 5
        retry_delay = 2
        
        for attempt in range(max_retries):
            try:
                consumer = KafkaConsumer(
                    self.topic,
                    bootstrap_servers=self.bootstrap_servers,
                    group_id=self.group_id,
                    value_deserializer=lambda m: json.loads(m.decode('utf-8')),
                    key_deserializer=lambda k: k.decode('utf-8') if k else None,
                    auto_offset_reset='latest',  # Start from latest messages
                    enable_auto_commit=True,
                    auto_commit_interval_ms=5000,
                    max_poll_records=500,
                    max_poll_interval_ms=300000,
                    session_timeout_ms=30000,
                    heartbeat_interval_ms=10000,
                    fetch_min_bytes=1,
                    fetch_max_wait_ms=500,
                    consumer_timeout_ms=1000  # Timeout for polling
                )
                
                self.logger.info(
                    "Kafka consumer created successfully",
                    extra={
                        'attempt': attempt + 1,
                        'bootstrap_servers': self.bootstrap_servers,
                        'group_id': self.group_id,
                        'topic': self.topic
                    }
                )
                return consumer
                
            except Exception as e:
                self.logger.error(
                    "Failed to create Kafka consumer",
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
    
    def process_message(self, message) -> bool:
        """
        Process a single Kafka message.
        
        Args:
            message: Kafka message object
            
        Returns:
            True if processed successfully, False otherwise
        """
        try:
            # Extract message data
            tick_data = message.value
            partition = message.partition
            offset = message.offset
            timestamp = message.timestamp
            
            # Validate required fields
            required_fields = ['symbol', 'price', 'timestamp', 'volume']
            if not all(field in tick_data for field in required_fields):
                self.logger.error(
                    "Invalid message format - missing required fields",
                    extra={
                        'required_fields': required_fields,
                        'received_fields': list(tick_data.keys()),
                        'partition': partition,
                        'offset': offset
                    }
                )
                return False
            
            # Update statistics
            symbol = tick_data['symbol']
            if symbol not in self.symbol_stats:
                self.symbol_stats[symbol] = {
                    'count': 0,
                    'total_volume': 0,
                    'last_price': 0,
                    'min_price': float('inf'),
                    'max_price': 0
                }
            
            stats = self.symbol_stats[symbol]
            stats['count'] += 1
            stats['total_volume'] += tick_data['volume']
            stats['last_price'] = tick_data['price']
            stats['min_price'] = min(stats['min_price'], tick_data['price'])
            stats['max_price'] = max(stats['max_price'], tick_data['price'])
            
            # Format and display message
            self.display_tick(tick_data, partition, offset, timestamp)
            
            self.message_count += 1
            return True
            
        except json.JSONDecodeError as e:
            self.logger.error(
                "JSON decode error",
                extra={
                    'error': str(e),
                    'partition': message.partition,
                    'offset': message.offset
                }
            )
            self.error_count += 1
            return False
            
        except Exception as e:
            self.logger.error(
                "Error processing message",
                extra={
                    'error': str(e),
                    'error_type': type(e).__name__,
                    'partition': message.partition,
                    'offset': message.offset
                }
            )
            self.error_count += 1
            return False
    
    def display_tick(self, tick_data: Dict, partition: int, offset: int, timestamp: int) -> None:
        """
        Display formatted tick data.
        
        Args:
            tick_data: Tick data dictionary
            partition: Kafka partition
            offset: Message offset
            timestamp: Message timestamp
        """
        # Convert timestamp to readable format
        if timestamp:
            msg_time = datetime.fromtimestamp(timestamp / 1000).strftime('%H:%M:%S.%f')[:-3]
        else:
            msg_time = "N/A"
        
        # Format price change indicator
        symbol = tick_data['symbol']
        price = tick_data['price']
        
        if symbol in self.symbol_stats and self.symbol_stats[symbol]['count'] > 1:
            last_price = self.symbol_stats[symbol]['last_price']
            if price > last_price:
                change_indicator = "↑"
            elif price < last_price:
                change_indicator = "↓"
            else:
                change_indicator = "→"
        else:
            change_indicator = "•"
        
        # Create formatted output
        output_data = [
            [
                msg_time,
                tick_data['symbol'],
                f"${price:.2f}",
                change_indicator,
                f"{tick_data['volume']:,}",
                f"P{partition}:O{offset}"
            ]
        ]
        
        headers = ["Time", "Symbol", "Price", "Trend", "Volume", "Partition:Offset"]
        
        print(tabulate(output_data, headers=headers, tablefmt="grid"))
        
        # Log structured data
        self.logger.info(
            "Tick processed",
            extra={
                'symbol': tick_data['symbol'],
                'price': price,
                'volume': tick_data['volume'],
                'partition': partition,
                'offset': offset,
                'message_count': self.message_count
            }
        )
    
    def print_statistics(self) -> None:
        """Print consumption statistics."""
        current_time = time.time()
        elapsed = current_time - self.last_stats_time
        
        if elapsed >= self.stats_interval:
            print("\n" + "="*80)
            print(f"CONSUMPTION STATISTICS (Last {elapsed:.1f}s)")
            print("="*80)
            
            # Overall stats
            print(f"Total Messages: {self.message_count}")
            print(f"Error Count: {self.error_count}")
            print(f"Success Rate: {((self.message_count - self.error_count) / max(1, self.message_count)) * 100:.1f}%")
            
            # Symbol-specific stats
            if self.symbol_stats:
                symbol_data = []
                for symbol, stats in self.symbol_stats.items():
                    avg_volume = stats['total_volume'] / stats['count'] if stats['count'] > 0 else 0
                    symbol_data.append([
                        symbol,
                        stats['count'],
                        f"${stats['last_price']:.2f}",
                        f"${stats['min_price']:.2f}",
                        f"${stats['max_price']:.2f}",
                        f"{avg_volume:,.0f}"
                    ])
                
                headers = ["Symbol", "Count", "Last Price", "Min Price", "Max Price", "Avg Volume"]
                print("\nSymbol Statistics:")
                print(tabulate(symbol_data, headers=headers, tablefmt="grid"))
            
            print("="*80 + "\n")
            self.last_stats_time = current_time
    
    def signal_handler(self, signum: int, frame) -> None:
        """Handle shutdown signals gracefully."""
        self.logger.info(
            "Shutdown signal received",
            extra={
                'signal': signum,
                'message_count': self.message_count,
                'error_count': self.error_count
            }
        )
        self.running = False
    
    def run(self) -> None:
        """Main consumer loop."""
        self.logger.info("Starting stock tick consumer")
        
        try:
            # Create consumer
            self.consumer = self.create_consumer()
            
            print("\n" + "="*80)
            print("KAFKA STOCK TICK CONSUMER")
            print("="*80)
            print(f"Topic: {self.topic}")
            print(f"Group ID: {self.group_id}")
            print(f"Bootstrap Servers: {self.bootstrap_servers}")
            print("="*80 + "\n")
            
            # Main consumption loop
            while self.running:
                try:
                    # Poll for messages
                    message_batch = self.consumer.poll(timeout_ms=1000)
                    
                    if message_batch:
                        for topic_partition, messages in message_batch.items():
                            for message in messages:
                                if not self.running:
                                    break
                                self.process_message(message)
                    
                    # Print statistics periodically
                    self.print_statistics()
                    
                except CommitFailedError as e:
                    self.logger.error(
                        "Commit failed",
                        extra={'error': str(e)}
                    )
                    continue
                    
                except KafkaError as e:
                    self.logger.error(
                        "Kafka error during consumption",
                        extra={'error': str(e), 'error_type': type(e).__name__}
                    )
                    time.sleep(1)
                    continue
                    
        except KeyboardInterrupt:
            self.logger.info("Received keyboard interrupt")
        except Exception as e:
            self.logger.error(
                "Fatal error in consumer",
                extra={'error': str(e), 'error_type': type(e).__name__}
            )
            sys.exit(1)
        finally:
            self.cleanup()
    
    def cleanup(self) -> None:
        """Clean up resources."""
        self.logger.info("Cleaning up consumer resources")
        
        if self.consumer:
            try:
                self.consumer.close()
                self.logger.info("Consumer closed successfully")
            except Exception as e:
                self.logger.error(
                    "Error closing consumer",
                    extra={'error': str(e)}
                )
        
        # Final statistics
        print("\n" + "="*80)
        print("FINAL CONSUMPTION STATISTICS")
        print("="*80)
        print(f"Total Messages Processed: {self.message_count}")
        print(f"Total Errors: {self.error_count}")
        if self.message_count > 0:
            print(f"Success Rate: {((self.message_count - self.error_count) / self.message_count) * 100:.1f}%")
        print("="*80)
        
        self.logger.info(
            "Consumer shutdown complete",
            extra={
                'total_messages_processed': self.message_count,
                'total_errors': self.error_count
            }
        )


if __name__ == '__main__':
    consumer = StockTickConsumer()
    consumer.run()
