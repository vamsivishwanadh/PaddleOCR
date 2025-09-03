## PaddleOCR — Local Usage and Deployment Guide (Windows-friendly)

This README is tailored for running and deploying this repository locally on Windows, with concise steps for CLI/API usage, service deployment (HubServing and Docker), and links to advanced docs.

### What is inside this repo

- PaddleOCR 3.x Python package (`paddleocr`) with a unified CLI entrypoint `paddleocr` and high-level pipelines (PP-OCRv5, PP-StructureV3, PP-ChatOCRv4, etc.).
- Training/inference utilities and configs under `tools/`, `configs/`, `ppocr/`, `ppstructure/`.
- Ready-made service deployment templates in `deploy/` (PaddleHub Serving, C++/Lite, Android/iOS, Docker, etc.).
- Extensive documentation under `docs/` and `readme/`.

### Core features

- PP-OCRv5: multilingual general OCR (detection + recognition + optional orientation).
- PP-StructureV3: complex document parsing to JSON/Markdown (tables, charts, formulas, layout, etc.).
- PP-ChatOCRv4: document understanding and key info extraction (optionally integrates LLMs).
- High-performance inference (CPU, NVIDIA GPU, other accelerators), ONNX export and runtimes.
- Command-line and Python APIs with automatic model download/management via `paddlex`.

---

## 1) Prerequisites

- OS: Windows 10/11 (also works on Linux/macOS)
- Python: 3.8 – 3.12 (64-bit)
- Optional GPU: recent NVIDIA driver + CUDA toolkit version supported by your chosen PaddlePaddle build

Install Python build tools (recommended):

```powershell
python -m pip install --upgrade pip
python -m pip install setuptools wheel
```

Install PaddlePaddle first (choose one):

- CPU only:

```powershell
python -m pip install paddlepaddle
```

- GPU (pick the right CUDA build as per PaddlePaddle’s install guide):

```powershell
# Example (adjust version/CUDA per your environment)
python -m pip install paddlepaddle-gpu
```

Reference: PaddlePaddle install guide (see the badge link in the main `README.md`).

---

## 2) Local repository setup (editable install)

From the repo root `PaddleOCR/`:

```powershell
# Optional: use a virtual environment
python -m venv .venv
.\.venv\Scripts\activate

# Install PaddleOCR from source (core features)
python -m pip install -e .

# Or install with all optional features (doc parsing, IE, translation)
python -m pip install -e ".[all]"

# (Optional) Extra dependencies used by training/data tools
python -m pip install -r requirements.txt
```

Notes:

- The CLI `paddleocr` will be available in your environment after install (`pyproject.toml` exposes `paddleocr = paddleocr.__main__:console_entry`).
- Models are fetched automatically (default source is HuggingFace; configurable via env `PADDLE_PDX_MODEL_SOURCE`).

---

## 3) Quick start — CLI

Run PP-OCRv5 on a demo image:

```powershell
paddleocr ocr -i https://paddle-model-ecology.bj.bcebos.com/paddlex/imgs/demo_image/general_ocr_002.png --use_doc_orientation_classify False --use_doc_unwarping False --use_textline_orientation False
```

Run PP-StructureV3:

```powershell
paddleocr pp_structurev3 -i https://paddle-model-ecology.bj.bcebos.com/paddlex/imgs/demo_image/pp_structure_v3_demo.png --use_doc_orientation_classify False --use_doc_unwarping False
```

Get command help:

```powershell
paddleocr ocr --help
```

Tip: Use absolute Windows paths or forward slashes for local files, e.g. `-i D:/data/image.png`.

---

## 4) Quick start — Python API

```python
from paddleocr import PaddleOCR

ocr = PaddleOCR(
    use_doc_orientation_classify=False,
    use_doc_unwarping=False,
    use_textline_orientation=False,
)

result = ocr.predict(input="https://paddle-model-ecology.bj.bcebos.com/paddlex/imgs/demo_image/general_ocr_002.png")

for res in result:
    res.print()
    res.save_to_img("output")
    res.save_to_json("output")
```

Advanced pipelines are available via `PPStructureV3`, `PPChatOCRv4Doc`, etc. See examples in the main `README.md`.

---

## 5) Training and evaluation (brief)

This repo includes training utilities for detection/recognition and structured parsing.

Typical flow (example only; adjust config to your scenario):

```powershell
# Train using a YAML config
python tools/train.py -c configs/det/PP-OCRv5/ch_PP-OCRv5_det.yml

# Evaluate
python tools/eval.py -c configs/det/PP-OCRv5/ch_PP-OCRv5_det.yml

# Export inference model
python tools/export_model.py -c configs/det/PP-OCRv5/ch_PP-OCRv5_det.yml -o Global.save_inference_dir=./inference/det_model
```

See `configs/` for available model configs and the docs under `docs/version3.x/` for detailed guidance.

---

## 6) Run as a local service

### A) PaddleHub Serving (built-in templates)

PaddleOCR ships HubServing modules under `deploy/hubserving/` (detection, recognition, end-to-end `ocr_system`, structure parsing, KIE, etc.).

1. Install PaddleHub (example older version used by the template docs):

```powershell
python -m pip install paddlehub==2.1.0 -i https://mirror.baidu.com/pypi/simple
```

2. Prepare inference models (if needed) as described in `deploy/hubserving/README.md` (the default paths can be customized in each module’s `params.py`).

3. Install and start a module (CPU mode example):

```powershell
hub install deploy/hubserving/ocr_system
hub serving start -m ocr_system -p 8868
```

Windows note: HubServing’s multi-process mode isn’t supported on Windows; run single-process.

4. Send a request:

```powershell
python tools/test_hubserving.py --server_url=http://127.0.0.1:8868/predict/ocr_system --image_dir=./doc/imgs/
```

Details and return schema are documented in `deploy/hubserving/README.md`.

### B) Docker (service image)

**Note**: The existing Docker files in `deploy/docker/hubserving/` are outdated (PaddleOCR 2.x). For GPU support, you have two options:

#### Option 1: Use the existing GPU Dockerfile (outdated but functional)

```powershell
# Navigate to GPU Docker directory
cd deploy/docker/hubserving/gpu

# Build GPU image (note: this uses PaddleOCR 2.x)
docker build -t paddleocr:gpu .

# Run with GPU support (Docker 19.03+)
docker run --rm -dp 8868:8868 --gpus all --name paddle_ocr paddleocr:gpu

# Or with nvidia-docker (older Docker versions)
nvidia-docker run --rm -dp 8868:8868 --name paddle_ocr paddleocr:gpu
```

#### Option 2: Create a modern Dockerfile for PaddleOCR 3.x (recommended)

Create a new `Dockerfile` in the repo root:

```dockerfile
FROM nvidia/cuda:11.8-devel-ubuntu20.04

# Install Python and dependencies
RUN apt-get update && apt-get install -y \
    python3.8 python3.8-dev python3-pip \
    libgl1-mesa-glx libglib2.0-0 libsm6 libxext6 libxrender-dev \
    && rm -rf /var/lib/apt/lists/*

# Set Python 3.8 as default
RUN update-alternatives --install /usr/bin/python python /usr/bin/python3.8 1
RUN update-alternatives --install /usr/bin/pip pip /usr/bin/pip3 1

# Install PaddlePaddle GPU
RUN pip install paddlepaddle-gpu

# Copy and install PaddleOCR
COPY . /PaddleOCR
WORKDIR /PaddleOCR
RUN pip install -e ".[all]"

# Expose port
EXPOSE 8868

# Start HubServing
CMD ["hub", "install", "deploy/hubserving/ocr_system", "&&", "hub", "serving", "start", "-m", "ocr_system", "-p", "8868"]
```

Then build and run:

```powershell
# Build modern GPU image
docker build -t paddleocr3:gpu .

# Run with GPU support
docker run --rm -dp 8868:8868 --gpus all --name paddle_ocr3 paddleocr3:gpu
```

Then call the service at `http://localhost:8868/predict/ocr_system`.

### C) Other deployments

- C++ inference: `deploy/cpp_infer/`
- Mobile: `deploy/android_demo/`, `deploy/ios_demo/`, `deploy/lite/`
- ONNX export/high-performance runtimes: see docs under `docs/version3.x/deployment/`
- MCP server (for agent integration): `mcp_server/` and docs linked from the main README

---

## 7) Common environment tips (Windows)

- If GPU is not detected, confirm you installed the correct `paddlepaddle-gpu` build for your CUDA, and that `nvidia-smi` works.
- If model downloads are slow, you can switch sources via environment variable:
  - `set PADDLE_PDX_MODEL_SOURCE=HuggingFace` (default) or `BOS`
- Use absolute paths for data to avoid Windows path issues.
- For large batch inference, consider enabling MKL-DNN on CPU (already handled by framework defaults in 3.x).

---

## 8) Repository structure (selected)

- `paddleocr/`: Python package with CLI, models, and pipelines
- `tools/`: train/eval/export/infer scripts for various tasks
- `configs/`: YAML config files for detection/recognition/structure/KIE
- `deploy/`: serving, C++/Lite, mobile, docker, and more
- `docs/`, `readme/`: documentation and tutorials

---

## 9) Useful commands (cheat sheet)

- Install from source (all features):

```powershell
python -m pip install -e ".[all]"
```

- CLI OCR on a local image:

```powershell
paddleocr ocr -i D:/path/to/your/image.jpg --use_doc_orientation_classify False --use_doc_unwarping False --use_textline_orientation False
```

- Python API minimal example:

```python
from paddleocr import PaddleOCR
ocr = PaddleOCR(use_doc_orientation_classify=False, use_doc_unwarping=False, use_textline_orientation=False)
print(ocr.predict(input="D:/path/to/your/image.jpg"))
```

- Start HubServing (end-to-end system):

```powershell
hub install deploy/hubserving/ocr_system
hub serving start -m ocr_system -p 8868
```

- Build and run GPU Docker (modern approach):

```powershell
# Create modern Dockerfile (see Option 2 in section 6B)
docker build -t paddleocr3:gpu .
docker run --rm -dp 8868:8868 --gpus all --name paddle_ocr3 paddleocr3:gpu
```

- Build and run GPU Docker (legacy approach):

```powershell
cd deploy/docker/hubserving/gpu
docker build -t paddleocr:gpu .
docker run --rm -dp 8868:8868 --gpus all --name paddle_ocr paddleocr:gpu
```

---

## 10) Where to go next

- Main project `README.md` (feature highlights, examples)
- Versioned docs under `docs/version3.x/` (installation, pipelines, deployment, troubleshooting)
- HubServing docs: `deploy/hubserving/README.md`
- High-performance inference and ONNX: see deployment docs in `docs/version3.x/deployment/`
