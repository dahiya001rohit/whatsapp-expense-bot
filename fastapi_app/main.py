"""
FynxAI — FastAPI HTTP service
Handles: GET /health, GET /qr
Spawns the Node.js Baileys bot as a managed subprocess on startup.
Reads QR state from MongoDB 'appstate' collection (written by the Node bot).
"""
from __future__ import annotations

import asyncio
import base64
import os
import subprocess
import time
from contextlib import asynccontextmanager
from io import BytesIO

import httpx
import qrcode
from fastapi import FastAPI
from fastapi.responses import HTMLResponse, JSONResponse

from .db import close_db, get_db, init_db

# ── App state ─────────────────────────────────────────────────────────────────

_node_proc: subprocess.Popen | None = None
_keep_alive_task: asyncio.Task | None = None
_start_time: float = 0.0


# ── Env validation ────────────────────────────────────────────────────────────

def _validate_env() -> None:
    # FIXED: crash early with clear message if required vars are missing
    required = ["MONGO_URI"]
    missing = [k for k in required if not os.getenv(k)]
    if missing:
        raise RuntimeError(f"❌ Missing required env vars: {', '.join(missing)}")


# ── Lifespan (startup / shutdown) ─────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    global _node_proc, _keep_alive_task, _start_time

    _validate_env()
    _start_time = time.time()

    # Connect to MongoDB via Motor
    await init_db()

    # FIXED: spawn Node bot as managed subprocess so both processes share one Render dyno
    node_entry = os.getenv("BOT_ENTRY", "bot.js")
    _node_proc = subprocess.Popen(["node", node_entry])
    print(f"🤖 Node bot started (pid={_node_proc.pid}, entry={node_entry})")

    # Start keep-alive background task
    _keep_alive_task = asyncio.create_task(_keep_alive_loop())

    yield  # ── app is running ──

    # Shutdown cleanup
    if _keep_alive_task and not _keep_alive_task.done():
        _keep_alive_task.cancel()

    if _node_proc and _node_proc.poll() is None:
        _node_proc.terminate()
        try:
            _node_proc.wait(timeout=10)
        except subprocess.TimeoutExpired:
            _node_proc.kill()

    await close_db()
    print("🛑 FynxAI service stopped")


# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(title="FynxAI API", version="1.0.0", lifespan=lifespan)


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health() -> JSONResponse:
    bot_alive = _node_proc is not None and _node_proc.poll() is None
    return JSONResponse({
        "status": "alive",
        "uptime": round(time.time() - _start_time, 2),
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "bot": "running" if bot_alive else "stopped",
    })


# ── QR ────────────────────────────────────────────────────────────────────────

@app.get("/qr", response_class=HTMLResponse)
async def qr_page() -> HTMLResponse:
    db = await get_db()
    doc = await db["appstate"].find_one({"key": "qr"})
    qr_value: str | None = doc.get("value") if doc else None

    if not qr_value:
        return HTMLResponse(
            """<!DOCTYPE html><html>
            <head><title>FynxAI — QR</title>
              <meta http-equiv="refresh" content="5">
              <style>body{font-family:sans-serif;text-align:center;padding:60px;
                background:#111;color:#eee}</style></head>
            <body>
              <h2>✅ Bot connected — no QR needed.</h2>
              <p style="color:#aaa">
                If the bot disconnected, restart the service and refresh this page.
              </p>
            </body></html>"""
        )

    # Generate QR image → base64 data URL
    img = qrcode.make(qr_value)
    buf = BytesIO()
    img.save(buf, format="PNG")
    data_url = "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()

    return HTMLResponse(
        f"""<!DOCTYPE html><html>
        <head><title>FynxAI — Scan QR</title>
          <meta http-equiv="refresh" content="20">
          <style>body{{font-family:sans-serif;text-align:center;padding:60px;
            background:#111;color:#eee}}
            img{{border:8px solid white;border-radius:12px}}</style></head>
        <body>
          <h2>📱 Scan with WhatsApp</h2>
          <p>Open WhatsApp → Linked Devices → Link a Device</p>
          <img src="{data_url}" alt="QR Code" width="400" />
          <p style="color:#aaa;font-size:0.85rem">
            Auto-refreshes every 20s. QR expires ~60s after generation.</p>
        </body></html>"""
    )


# ── Keep-alive background task ────────────────────────────────────────────────

async def _keep_alive_loop() -> None:
    """Ping /health every 10 min to prevent Render free tier sleep."""
    render_url = os.getenv("RENDER_EXTERNAL_URL") or os.getenv("RENDER_URL")
    if not render_url:
        print("⚠️  RENDER_EXTERNAL_URL not set — keep-alive disabled")
        return

    # Wait 60s after startup before first ping
    await asyncio.sleep(60)

    # FIXED: use httpx with explicit timeout so pings can't hang forever
    async with httpx.AsyncClient(timeout=httpx.Timeout(10.0)) as client:
        while True:
            try:
                resp = await client.get(f"{render_url}/health")
                print(f"✅ Keep-alive ping — {resp.status_code}")
            except Exception as exc:
                print(f"❌ Keep-alive ping failed — {exc}")
            await asyncio.sleep(600)  # 10 minutes
