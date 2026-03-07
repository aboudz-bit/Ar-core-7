"""
TripoSR HTTP API Wrapper

Wraps TripoSR as a simple HTTP server for the AR-core-7 pipeline.
This script should be run inside the TripoSR repository directory.

Usage:
    cd TripoSR
    python ../server.py --port 8080 --device cuda

API:
    POST /generate
        Form data:
            image: file (JPG/PNG/WebP)
            output_format: str (default: "glb")
            mc_resolution: int (default: 256)
        Returns: GLB binary

    GET /health
        Returns: {"status": "ok", "device": "cuda"}
"""

import argparse
import io
import os
import sys
import tempfile
import time
from pathlib import Path

try:
    from flask import Flask, request, send_file, jsonify
except ImportError:
    print("Flask not found. Install with: pip install flask")
    sys.exit(1)

app = Flask(__name__)

# Global model reference
model = None
device = "cuda"


def load_model(device_name: str):
    """Load the TripoSR model."""
    global model, device
    device = device_name

    try:
        from tsr.system import TSR

        print(f"Loading TripoSR model on {device}...")
        model = TSR.from_pretrained(
            "stabilityai/TripoSR",
            config_name="config.yaml",
            weight_name="model.ckpt",
        )
        model.renderer.set_chunk_size(8192)
        model.to(device)
        print("TripoSR model loaded successfully.")
    except ImportError:
        print("ERROR: TripoSR not found. Run this script from inside the TripoSR directory.")
        print("  git clone https://github.com/VAST-AI-Research/TripoSR.git")
        print("  cd TripoSR && pip install -r requirements.txt")
        sys.exit(1)


@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "device": device,
        "model_loaded": model is not None,
    })


@app.route("/generate", methods=["POST"])
def generate():
    if model is None:
        return jsonify({"error": "Model not loaded"}), 503

    if "image" not in request.files:
        return jsonify({"error": "No image file provided"}), 400

    image_file = request.files["image"]
    output_format = request.form.get("output_format", "glb")
    mc_resolution = int(request.form.get("mc_resolution", 256))

    start_time = time.time()

    try:
        from PIL import Image
        import numpy as np

        # Read and preprocess the image
        image = Image.open(image_file.stream)
        if image.mode != "RGBA":
            image = image.convert("RGBA")

        # Run TripoSR inference
        with tempfile.TemporaryDirectory() as tmpdir:
            # Process image through the model
            scene_codes = model([image], device=device)

            # Extract mesh
            meshes = model.extract_mesh(
                scene_codes,
                resolution=mc_resolution,
            )

            mesh = meshes[0]

            # Export to GLB
            output_path = os.path.join(tmpdir, f"output.{output_format}")
            mesh.export(output_path)

            inference_time = time.time() - start_time
            file_size = os.path.getsize(output_path)

            print(f"Generated {output_format} in {inference_time:.1f}s ({file_size / 1024:.0f}KB)")

            return send_file(
                output_path,
                mimetype="model/gltf-binary" if output_format == "glb" else "application/octet-stream",
                as_attachment=True,
                download_name=f"generated.{output_format}",
            )

    except Exception as e:
        inference_time = time.time() - start_time
        print(f"Generation failed after {inference_time:.1f}s: {e}")
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="TripoSR HTTP API Server")
    parser.add_argument("--port", type=int, default=8080, help="Server port")
    parser.add_argument("--host", type=str, default="0.0.0.0", help="Server host")
    parser.add_argument("--device", type=str, default="cuda", choices=["cuda", "cpu"], help="Device to use")
    args = parser.parse_args()

    load_model(args.device)
    app.run(host=args.host, port=args.port, debug=False)
