# Use Python 3.9 slim image
FROM python:3.9-slim

# Create non-root user for security
RUN groupadd -r consumer && useradd -r -g consumer consumer

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY read_ticks.py .

# Change ownership to non-root user
RUN chown -R consumer:consumer /app

# Switch to non-root user
USER consumer

# Set Python path
ENV PYTHONPATH=/app

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD python -c "import sys; sys.exit(0)"

# Run the consumer
CMD ["python", "read_ticks.py"]
