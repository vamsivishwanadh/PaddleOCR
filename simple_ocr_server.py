#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Simple OCR HTTP Server using PaddleOCR 3.x
This provides a REST API for OCR functionality
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from paddleocr import PaddleOCR
import cv2
import numpy as np
import base64
import io
from PIL import Image
import traceback
import fitz  # PyMuPDF for PDF processing
import json

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Initialize PaddleOCR
print("Initializing PaddleOCR...")
ocr = None

def initialize_ocr():
    global ocr
    try:
        print("Attempting to initialize PaddleOCR...")
        # PaddleOCR 3.x initialization
        ocr = PaddleOCR(
            use_doc_orientation_classify=False,
            use_doc_unwarping=False,
            use_textline_orientation=False,
            lang='en'
        )
        print("PaddleOCR initialized successfully!")
        return True
    except PermissionError as e:
        print(f"Permission error initializing PaddleOCR: {e}")
        print("This is likely due to Windows file permissions on the model files.")
        print("Please try running the server as Administrator or delete the model cache:")
        print("Delete folder: C:\\Users\\SDS\\.paddlex\\official_models\\")
        return False
    except Exception as e:
        print(f"Failed to initialize PaddleOCR: {e}")
        print("Trying alternative initialization...")
        try:
            # Try with minimal parameters
            ocr = PaddleOCR(lang="en")
            print("PaddleOCR initialized with alternative parameters!")
            return True
        except Exception as e2:
            print(f"Alternative initialization also failed: {e2}")
            return False

# Initialize OCR
initialize_ocr()

def warmup_ocr():
    """Warm-up to trigger model download at startup to avoid first-request latency"""
    global ocr
    try:
        if ocr is None:
            return
        import numpy as np
        dummy = (np.ones((64, 64, 3), dtype=np.uint8) * 255)
        print("Warming up OCR (this may download models on first run)...")
        _ = ocr.predict(dummy)
        print("Warm-up finished.")
    except Exception as e:
        print(f"Warm-up skipped: {e}")

warmup_ocr()

def process_pdf(pdf_bytes):
    """Process PDF using PaddleOCR's built-in predict_iter method"""
    try:
        # Save PDF bytes to temporary file
        import tempfile
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as temp_file:
            temp_file.write(pdf_bytes)
            temp_pdf_path = temp_file.name
        
        print(f"Processing PDF using predict_iter: {temp_pdf_path}")
        
        all_results = []
        page_count = 0
        
        # Use PaddleOCR's efficient predict_iter for PDFs
        for i, res in enumerate(ocr.predict_iter(temp_pdf_path)):
            page_idx = res.json.get("page_index", i)
            page_count += 1
            
            print(f"Processing PDF page {page_idx + 1}")
            import time
            t0 = time.time()
            
            # Extract text results from the response
            page_results = []
            if hasattr(res, 'json') and res.json:
                json_data = res.json
                
                # Print the complete JSON structure for reference
                print(f"\n=== COMPLETE JSON FOR PAGE {page_idx + 1} ===")
                print(json.dumps(json_data.get('rec_texts', []), indent=2, ensure_ascii=False))
                print(f"=== END JSON FOR PAGE {page_idx + 1} ===\n")
                
                # Save complete JSON data to file for debugging
                json_filename = f"debug_page_{page_idx + 1}.json"
                with open(json_filename, 'w', encoding='utf-8') as f:
                    json.dump(json_data, f, indent=2, ensure_ascii=False)
                print(f"Saved complete JSON data to: {json_filename}")
                
                # Extract data from the nested "res" structure
                res_data = json_data.get('res', {})
                rec_texts = res_data.get('rec_texts', [])
                rec_scores = res_data.get('rec_scores', [])
                rec_boxes = res_data.get('rec_boxes', [])

                # Print the complete JSON structure for reference
                print(f"\n=222222== COMPLETE JSON FOR PAGE {page_idx + 1} ===")
                print(json.dumps(rec_texts, indent=2, ensure_ascii=False))
                print(f"==222222222= END JSON FOR PAGE {page_idx + 1} ===\n")
                
                # Combine texts, scores, and boxes
                print(f"Processing {len(rec_texts)} text lines for page {page_idx + 1}")
                for i, text in enumerate(rec_texts):
                    confidence = rec_scores[i] if i < len(rec_scores) else 0.0
                    bbox = rec_boxes[i] if i < len(rec_boxes) else []
                    
                    page_results.append({
                        "text": text,
                        "confidence": float(confidence),
                        "bbox": bbox,
                        "page": page_idx + 1,
                        "text_type": json_data.get('text_type', 'general'),
                        "model_settings": json_data.get('model_settings', {})
                    })
                
                print(f"Added {len(page_results)} results for page {page_idx + 1}")
            
            processing_time = time.time() - t0
            print(f"OCR completed for page {page_idx + 1} in {processing_time:.2f} seconds")
            print(f"Page {page_idx + 1} results: {len(page_results)} text lines")
            
            all_results.extend(page_results)
        
        # Clean up temporary file
        import os
        os.unlink(temp_pdf_path)
        
        print(f"PDF processing complete: {page_count} pages, {len(all_results)} total text lines")
        print(f"Returning {len(all_results)} results to frontend")
        if len(all_results) > 0:
            print(f"First result sample: {all_results[0]}")
        return all_results
        
    except Exception as e:
        print(f"PDF processing error: {e}")
        # Clean up temp file if it exists
        try:
            if 'temp_pdf_path' in locals():
                os.unlink(temp_pdf_path)
        except:
            pass
        raise e

def process_image(image_bytes):
    """Process image file and run OCR"""
    try:
        # Convert to PIL Image
        pil_image = Image.open(io.BytesIO(image_bytes))
        
        # Convert to OpenCV format
        cv_image = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
        
        # Downscale very large images for faster inference while keeping readability
        max_side = 1280
        h, w = cv_image.shape[:2]
        scale = max(h, w) / max_side
        if scale > 1.0:
            new_w = int(w / scale)
            new_h = int(h / scale)
            cv_image = cv2.resize(cv_image, (new_w, new_h), interpolation=cv2.INTER_AREA)
            print(f"Downscaled image from {w}x{h} to {new_w}x{new_h}")
        
        # Run OCR
        print(f"Running OCR on image of size: {cv_image.shape}")
        import time
        t0 = time.time()
        result = ocr.predict(cv_image)
        print(f"OCR completed in {time.time() - t0:.2f} seconds")
        print(f"OCR result type: {type(result)}, length: {len(result) if result else 'None'}")
        
        # Format results
        ocr_results = []
        if result and result[0]:
            print(f"Processing {len(result[0])} detected text lines")
            for line in result[0]:
                if line:
                    text = line[1][0]
                    confidence = line[1][1]
                    bbox = line[0]
                    ocr_results.append({
                        "text": text,
                        "confidence": float(confidence),
                        "bbox": bbox
                    })
        else:
            print("No text detected in image")
        
        return ocr_results
        
    except Exception as e:
        print(f"Image processing error: {e}")
        raise e

@app.route('/ocr', methods=['POST'])
def ocr_endpoint():
    """OCR endpoint that accepts base64 encoded images or PDFs"""
    try:
        if ocr is None:
            return jsonify({"error": "OCR not initialized"}), 500
        
        # Get the data
        data = request.get_json()
        if not data or 'file' not in data:
            return jsonify({"error": "No file data provided"}), 400
        
        # Decode base64 data
        file_data = data['file']
        if file_data.startswith('data:'):
            # Remove data URL prefix (e.g., data:image/jpeg;base64, or data:application/pdf;base64,)
            file_data = file_data.split(',')[1]
        
        # Decode base64 to bytes
        file_bytes = base64.b64decode(file_data)
        print(f"Received file data: {len(file_bytes)} bytes")
        
        # Start timing
        import time
        start_time = time.time()
        
        # Determine file type and process accordingly
        try:
            # Try to open as image first
            pil_image = Image.open(io.BytesIO(file_bytes))
            # If successful, it's an image
            print(f"Processing as image: {pil_image.format}, size: {pil_image.size}")
            ocr_results = process_image(file_bytes)
            file_type = "image"
        except Exception as img_error:
            print(f"Not an image, trying as PDF. Image error: {img_error}")
            # If not an image, try as PDF
            try:
                print("Processing as PDF...")
                ocr_results = process_pdf(file_bytes)
                file_type = "pdf"
            except Exception as pdf_error:
                print(f"PDF processing failed: {pdf_error}")
                return jsonify({
                    "error": f"Unsupported file format. Must be an image (PNG, JPG, etc.) or PDF. Image error: {str(img_error)}, PDF error: {str(pdf_error)}"
                }), 400
        
        total_time = time.time() - start_time
        print(f"Total processing time: {total_time:.2f} seconds")
        print(f"Final results count: {len(ocr_results)}")
        
        response_data = {
            "success": True,
            "file_type": file_type,
            "results": ocr_results,
            "processing_time": total_time
        }
        
        print(f"Sending response to frontend: {len(ocr_results)} results")
        return jsonify(response_data)
        
    except Exception as e:
        print(f"OCR error: {e}")
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "ocr_initialized": ocr is not None
    })

@app.route('/test', methods=['GET'])
def test():
    """Simple test endpoint"""
    return jsonify({'message': 'Server is responding', 'timestamp': datetime.now().isoformat()})

@app.route('/reinit', methods=['POST'])
def reinitialize_ocr():
    """Reinitialize OCR endpoint"""
    global ocr
    try:
        success = initialize_ocr()
        if success:
            return jsonify({
                "success": True,
                "message": "OCR reinitialized successfully"
            })
        else:
            return jsonify({
                "success": False,
                "message": "Failed to reinitialize OCR"
            }), 500
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Error during reinitialization: {str(e)}"
        }), 500

@app.route('/', methods=['GET'])
def index():
    """Simple test endpoint"""
    return jsonify({
        "message": "PaddleOCR Server is running",
        "ocr_initialized": ocr is not None,
        "endpoints": {
            "POST /ocr": "OCR endpoint - send base64 encoded image",
            "GET /health": "Health check",
            "POST /reinit": "Reinitialize OCR (if initialization failed)",
            "GET /": "This message"
        }
    })

if __name__ == '__main__':
    print("Starting PaddleOCR Server on port 8868...")
    app.run(host='0.0.0.0', port=8868, debug=False)
