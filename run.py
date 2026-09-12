#!/usr/bin/env python3
"""
run.py
------
Single entry-point launcher for Milkyway AI.

Usage:
    python run.py              # starts on http://localhost:8000
    python run.py --port 9000  # custom port
    python run.py --host 0.0.0.0  # expose on all interfaces (LAN)
    python run.py --reload     # hot-reload for development
"""

import sys
import io
import argparse
from pathlib import Path

# Force UTF-8 output so emoji in print() work on Windows console
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

# ── Ensure project root is importable ─────────────────────────────────────
PROJECT_ROOT = Path(__file__).parent
sys.path.insert(0, str(PROJECT_ROOT))


def main():
    parser = argparse.ArgumentParser(
        description="Milkyway AI — Dairy Production Monitoring Server",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument("--host",   default="127.0.0.1", help="Host to bind on")
    parser.add_argument("--port",   default=8000, type=int, help="Port to listen on")
    parser.add_argument("--reload", action="store_true", help="Enable hot-reload (dev mode)")
    parser.add_argument("--workers",default=1, type=int, help="Number of worker processes")
    args = parser.parse_args()

    print("""
  +====================================================+
  |  Milkyway AI  --  Production Monitor               |
  |  YOLOv8n  mAP@50: 98.4%                            |
  +====================================================+
    """)
    print(f"  Dashboard  : http://{args.host}:{args.port}")
    print(f"  API Docs   : http://{args.host}:{args.port}/docs")
    print(f"  Mode       : {'development (hot-reload)' if args.reload else 'production'}")
    print()

    import uvicorn
    uvicorn.run(
        "api.main:app",
        host    = args.host,
        port    = args.port,
        reload  = args.reload,
        workers = 1 if args.reload else args.workers,
        log_level = "info",
    )


if __name__ == "__main__":
    main()
