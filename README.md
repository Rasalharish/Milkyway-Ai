<div align="center">

# 🥛 Milkyway AI

**AI-Powered Dairy Production Monitoring System**

[![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white)](https://python.org)
[![YOLOv8](https://img.shields.io/badge/YOLOv8n-Ultralytics-00BFFF)](https://ultralytics.com)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![mAP](https://img.shields.io/badge/mAP%4050-98.4%25-22c55e)]()
[![Tests](https://img.shields.io/badge/tests-33%20passing-22c55e)]()

*A production-grade computer vision monitoring platform built on a real YOLOv8 model trained at Muralya Dairy.*

</div>

---

## 📋 Overview

### The Problem

Muralya Dairy bottles milk on a high-speed conveyor belt. Plant managers had no automated way to count throughput, detect gaps, or analyse shift performance. Production monitoring was done manually, leading to reporting delays and missed anomalies.

### The Solution

Milkyway AI wraps a custom-trained YOLOv8n model in a complete industrial monitoring platform:

- **Real-time detection** at ~35 ms/frame via YOLOv8n (98.4% mAP@50)
- **Centroid tracking** — each bottle gets a persistent ID across frames
- **Virtual line-crossing counter** — counts bottles that cross a configurable threshold line, not simply detections per frame
- **Live WebSocket dashboard** with sub-second latency
- **SQLite analytics** with hourly production stats and shift breakdowns
- **Alert engine** for conveyor gaps and anomaly detection
- **Demo mode** — runs the full pipeline without a physical camera
- **REST API** with Swagger/OpenAPI documentation
- **CSV / JSON export** for plant reporting

---

## 🏗️ Architecture

```
Camera / Video / Demo
        │
        ▼
  YOLOv8n Detector          ← assets/best.pt (98.4% mAP@50)
  (core/detector.py)
        │
        ▼
  Centroid Tracker          ← persistent bottle IDs across frames
  (core/tracker.py)
        │
        ▼
  Line Crossing Counter     ← counts bottles crossing virtual line once
  (core/counter.py)
        │
        ├─── SQLite DB      ← detection events, production counts, alerts
        │    (storage/)
        │
        ▼
  FastAPI Backend           ← REST API + WebSocket streaming
  (api/)
        │
        ▼
  React Dashboard           ← Live monitor, analytics, image upload
  (frontend/)
```

---

## 🧠 Model

| Property | Value |
|----------|-------|
| Architecture | YOLOv8n (nano) |
| Parameters | 3,011,043 (~3M) |
| GFLOPs | 8.1 |
| Input Size | 640 × 640 |
| **mAP@50** | **98.4%** |
| mAP@50-95 | 64.1% |
| Precision | 93.9% |
| Recall | 97.0% |
| Inference latency | ~35.9 ms/frame (CPU) |
| Training time | ~2h 25m (100 epochs) |
| Training device | Apple M5 (MPS) |
| Dataset | 1,073 images — Muralya Dairy conveyor belt |
| Classes | 1 (`milk_bottle`) |

> **Metric definitions**
> - **mAP@50** — mean Average Precision at IoU threshold 0.50 (primary detection quality metric)
> - **Precision** — of all predicted bottles, how many were real bottles
> - **Recall** — of all real bottles, how many were detected
> - **Inference latency** — wall-clock time for one forward pass on CPU
> - **Detection confidence** — per-box score output by the model head (threshold: 0.40)

---

## 🛠️ Technology Stack

| Layer | Technology |
|-------|-----------|
| Object Detection | [Ultralytics YOLOv8n](https://github.com/ultralytics/ultralytics) |
| Object Tracking | Custom centroid tracker (Euclidean distance matching) |
| Backend API | [FastAPI](https://fastapi.tiangolo.com) + [Uvicorn](https://www.uvicorn.org) |
| Real-time Stream | WebSocket (`/ws/stream`) |
| Database | SQLite via `sqlite3` |
| Frontend | React 19 + Vite 8 |
| Charts | Chart.js + react-chartjs-2 |
| Icons | Lucide React |
| Image processing | OpenCV, NumPy |
| ONNX inference | onnxruntime (edge deployment option) |
| Testing | pytest |

---

## 🚀 Quick Start

### Prerequisites

- Python 3.11+ 
- Node.js 18+

### 1. Install Dependencies

```bash
cd Milkyway_AI
pip install -r requirements.txt
```

### 2. Start the Backend

```bash
python run.py
```

The server starts at **http://localhost:8000**

- Dashboard: http://localhost:8000
- API Docs: http://localhost:8000/docs

### 3. Start the React Frontend (Development)

```bash
cd frontend
npm install
npm run dev
```

Frontend dev server: **http://localhost:5173**

### 4. Options

```bash
python run.py --port 9000         # custom port
python run.py --host 0.0.0.0      # expose on LAN
python run.py --reload            # dev mode with hot-reload
```

---

## 🎭 Demo Mode

Milkyway AI includes a full demo mode for use without plant hardware.

- Generates synthetic conveyor belt frames with animated milk bottles
- Runs frames through the **real tracker and counter pipeline** (not fake counts)
- Populates the database with realistic production history
- All dashboard metrics, charts, and alerts work in demo mode

Demo mode is enabled by default. Click **"Camera"** in the dashboard to switch to a real webcam.

> **All demo data is clearly labelled as `DEMO` in the dashboard — it is never presented as real production data.**

---

## 🌐 API Reference

Full interactive docs at **http://localhost:8000/docs**

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/` | Static dashboard |
| `POST` | `/detect/image` | Upload image → detections + annotated result |
| `WS` | `/ws/stream?demo=true` | Live detection stream |
| `GET` | `/analytics/summary` | Dashboard KPIs |
| `GET` | `/analytics/today` | Today's production counts by shift |
| `GET` | `/analytics/hourly?days=N` | Hourly breakdown (1–30 days) |
| `GET` | `/analytics/model-info` | Model metadata and training metrics |
| `GET` | `/analytics/alerts` | Recent system alerts |
| `GET` | `/analytics/events` | Detection event log |
| `GET` | `/reports/export/csv` | Download detection log as CSV |
| `GET` | `/reports/export/json` | Download hourly stats as JSON |

---

## 🧪 Testing

```bash
pip install pytest httpx
pytest tests/ -v
```

**33 tests** cover:
- `test_detector.py` — Detection dataclass, inference result, annotate_frame
- `test_tracker.py` — Track registration, persistence, disappear, multiple objects, max_distance
- `test_counter.py` — Line crossing, no double-count, both-direction crossing, reset
- `test_alert.py` — Gap alert, high-count alert, resolve, get_stats
- `test_api.py` — All REST endpoints, invalid input, CSV/JSON export

---

## 📁 Project Structure

```
Milkyway_AI/
├── run.py                          # Single launch script
├── requirements.txt
├── .gitignore
│
├── core/                           # AI pipeline
│   ├── detector.py                 # YOLOv8 inference wrapper (pt + onnx)
│   ├── tracker.py                  # Centroid multi-object tracker
│   └── counter.py                  # Virtual line-crossing counter
│
├── api/                            # FastAPI application
│   ├── main.py                     # App entry, lifespan, routing
│   ├── models.py                   # Pydantic schemas
│   └── routes/
│       ├── detection.py            # POST /detect/image
│       ├── stream.py               # WS /ws/stream
│       ├── analytics.py            # GET /analytics/*
│       └── reports.py              # GET /reports/*
│
├── frontend/                       # React 19 + Vite dashboard
│   └── src/
│       ├── pages/                  # LiveMonitor, Analytics, ImageDetect, ModelInfo, Alerts
│       ├── components/             # Topnav, Sidebar, LiveFeed, KPICard, MiniChart
│       ├── hooks/useStream.js      # WebSocket connection hook
│       └── lib/api.js              # API client
│
├── dashboard/                      # Static HTML dashboard (served by FastAPI)
│   ├── index.html
│   ├── css/style.css
│   └── js/
│
├── storage/
│   └── database.py                 # SQLite layer
│
├── alerts/
│   └── alert_engine.py             # Threshold-based alert system
│
├── demo/
│   └── demo_mode.py                # Synthetic frame + detection generator
│
├── tests/
│   ├── test_detector.py
│   ├── test_tracker.py
│   ├── test_counter.py
│   ├── test_alert.py
│   └── test_api.py
│
└── assets/
    ├── best.pt                     # YOLOv8n weights (6.2 MB) — Muralya trained
    ├── milk_bottle_detector.onnx   # ONNX export (11.8 MB)
    ├── training_graphs.png         # Loss + mAP curves (100 epochs)
    ├── BoxPR_curve.png             # Precision-Recall curve
    └── confusion_matrix_normalized.png
```

---

## ⚠️ Limitations

- **Demo mode does not use the YOLOv8 model** — it generates synthetic frames with simple shapes. The model is used for real camera and image upload inference only.
- **Camera mode requires a USB webcam or compatible capture device** at index 0.
- **Inference runs on CPU by default** — no GPU is required but throughput is ~35 ms/frame.
- **The tracker uses centroid distance matching** — it can lose tracks if bottles are fully occluded for more than 30 frames.
- **The dataset covers one class** (`milk_bottle`) — other objects are not detected.

---

## 🔮 Future Improvements

- RTSP / IP camera stream support
- Multi-class detection (caps, labels, damaged bottles)
- Edge deployment via ONNX + Raspberry Pi / NVIDIA Jetson
- Shift scheduling configuration via UI
- Email / Slack alert notifications
- Docker container + docker-compose for one-command deployment
- GPU inference via CUDA for higher throughput

---

## 📄 License

YOLOv8 weights trained on proprietary dairy dataset.  

---

<div align="center">
  Built with ❤️ using YOLOv8 · FastAPI · React · SQLite
</div>
