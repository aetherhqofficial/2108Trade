# Multi-stage build for 2108Trade Quant Service
# Stage 1: build dependencies including TA-Lib C library
FROM python:3.11-slim-bookworm AS builder

WORKDIR /app

# Install TA-Lib C library build deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Build TA-Lib from source
RUN wget -q http://prdownloads.sourceforge.net/ta-lib/ta-lib-0.4.0-src.tar.gz -O ta-lib.tar.gz \
    && tar -xzf ta-lib.tar.gz \
    && cd ta-lib \
    && ./configure --prefix=/usr/local \
    && make -j$(nproc) \
    && make install \
    && cd / && rm -rf ta-lib ta-lib.tar.gz

RUN pip install --no-cache-dir --upgrade pip hatchling

COPY pyproject.toml .

# Install Python deps into a virtualenv
RUN python -m venv /opt/venv && \
    /opt/venv/bin/pip install --no-cache-dir .

# Stage 2: runtime
FROM python:3.11-slim-bookworm AS runtime

WORKDIR /app

# Install TA-Lib runtime library
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    && rm -rf /var/lib/apt/lists/* \
    && wget -q http://prdownloads.sourceforge.net/ta-lib/ta-lib-0.4.0-src.tar.gz -O ta-lib.tar.gz \
    && tar -xzf ta-lib.tar.gz \
    && cd ta-lib \
    && ./configure --prefix=/usr/local \
    && make -j$(nproc) \
    && make install \
    && cd / && rm -rf ta-lib ta-lib.tar.gz \
    && apt-get remove -y wget \
    && apt-get autoremove -y \
    && ldconfig

# Copy virtualenv from builder
COPY --from=builder /opt/venv /opt/venv

# Copy application code
COPY src/ ./src/

# Use virtualenv
ENV PATH="/opt/venv/bin:$PATH"
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Quant service doesn't need external services at startup — data fetched on demand
EXPOSE 8002

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import httpx; httpx.get('http://localhost:8002/api/quant/health', timeout=5).raise_for_status()"

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8002", "--log-level", "info"]
