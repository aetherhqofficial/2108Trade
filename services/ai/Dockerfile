# Multi-stage build for 2108Trade AI Service
# Stage 1: dependencies
FROM python:3.11-slim-bookworm AS builder

WORKDIR /app

# Install build dependencies
RUN pip install --no-cache-dir --upgrade pip hatchling

# Copy only dependency manifests for caching
COPY pyproject.toml .

# Install dependencies into a virtualenv
RUN python -m venv /opt/venv && \
    /opt/venv/bin/pip install --no-cache-dir .

# Stage 2: runtime
FROM python:3.11-slim-bookworm AS runtime

WORKDIR /app

# Copy virtualenv from builder
COPY --from=builder /opt/venv /opt/venv

# Copy application code
COPY src/ ./src/

# Use virtualenv
ENV PATH="/opt/venv/bin:$PATH"
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

EXPOSE 8001

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import httpx; httpx.get('http://localhost:8001/api/v1/health', timeout=5).raise_for_status()"

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8001", "--log-level", "info"]
