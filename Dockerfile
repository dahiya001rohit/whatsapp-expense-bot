# FynxAI — Docker image with Node.js (Baileys bot) + Python (FastAPI HTTP)
# Render free tier: one Docker web service runs both processes.
# FastAPI is the web service; it spawns the Node bot on startup.

FROM node:20-bookworm-slim

# Install Python 3.11 + pip
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      python3 python3-pip python3-venv \
      ca-certificates curl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Node dependencies first (better layer cache)
COPY package*.json ./
RUN npm install --omit=dev

# Install Python dependencies
COPY requirements.txt ./
RUN pip3 install --no-cache-dir -r requirements.txt

# Copy application source
COPY . .

# Render injects PORT; uvicorn binds to it.
# FastAPI spawns bot.js as a subprocess on startup.
CMD ["sh", "-c", "uvicorn fastapi_app.main:app --host 0.0.0.0 --port ${PORT:-3000}"]
