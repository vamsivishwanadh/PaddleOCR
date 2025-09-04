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
import openai
import json
from PIL import Image, ImageFile
# Allow loading truncated images to avoid errors on some PNGs
ImageFile.LOAD_TRUNCATED_IMAGES = True
import traceback
import fitz  # PyMuPDF for PDF processing
import json
import requests

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# OpenAI configuration
OPENAI_API_KEY = ""


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
                
                # Extract data from the nested "res" structure
                res_data = json_data.get('res', {})
                rec_texts = res_data.get('rec_texts', [])
                rec_scores = res_data.get('rec_scores', [])
                rec_boxes = res_data.get('rec_boxes', [])

                
                # Combine texts, scores, and boxes
                print(f"Processing {len(rec_texts)} text lines for page {page_idx + 1}")
                for i, text in enumerate(rec_texts):
                    confidence = rec_scores[i] if i < len(rec_scores) else 0.0
                    bbox = rec_boxes[i] if i < len(rec_boxes) else []
                    
                    page_results.append({
                        "text": text,
                        "confidence": float(confidence),
                        "bbox": convert_numpy_to_list(bbox),
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

def convert_numpy_to_list(obj):
    """Convert numpy arrays to Python lists for JSON serialization"""
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, (list, tuple)):
        return [convert_numpy_to_list(item) for item in obj]
    elif isinstance(obj, dict):
        return {key: convert_numpy_to_list(value) for key, value in obj.items()}
    else:
        return obj

def process_image(image_bytes):
    """Process image file and run OCR"""
    try:
        # Convert to PIL Image
        pil_image = Image.open(io.BytesIO(image_bytes))
        # Normalize to RGB (handles PNG with alpha or paletted images)
        if pil_image.mode not in ("RGB", "L"):
            pil_image = pil_image.convert("RGB")
        elif pil_image.mode == "L":
            pil_image = pil_image.convert("RGB")
        
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
        if result:

            # Case 1: Newer dict-based schema: [{ 'rec_texts': [...], 'rec_scores': [...], 'rec_boxes': ... }]
            if isinstance(result[0], dict) and (
                'rec_texts' in result[0] or 'rec_scores' in result[0] or 'rec_boxes' in result[0]
            ):
                print("Parsing OCR result in dict schema (rec_texts/rec_scores/rec_boxes)")
                first = result[0]
                rec_texts = first.get('rec_texts', [])
                if rec_texts is None:
                    rec_texts = []
                rec_scores = first.get('rec_scores', [])
                if rec_scores is None:
                    rec_scores = []
                rec_boxes = first.get('rec_boxes', [])
                if rec_boxes is None:
                    rec_boxes = []
                for i, text in enumerate(rec_texts):
                    confidence = rec_scores[i] if i < len(rec_scores) else 0.0
                    bbox = rec_boxes[i] if i < len(rec_boxes) else []
                    
                    ocr_results.append({
                        "text": text,
                        "confidence": float(confidence),
                        "bbox": convert_numpy_to_list(bbox)
                    })
            # Case 2: Legacy list schema: [[bbox, [text, score]], ...]
            elif isinstance(result[0], list) or isinstance(result[0], tuple):
                lines = result[0] if isinstance(result[0], list) else result
                print(f"Processing {len(lines)} detected text lines (legacy schema)")
                for line in lines:
                    if not line:
                        continue
                    try:
                        text = line[1][0]
                        confidence = line[1][1]
                        bbox = line[0]
                        ocr_results.append({
                            "text": text,
                            "confidence": float(confidence),
                            "bbox": convert_numpy_to_list(bbox)
                        })
                    except Exception:
                        # Fallback: try dict-like
                        if isinstance(line, dict):
                            text = line.get('text', '')
                            confidence = float(line.get('score', 0.0))
                            bbox = line.get('bbox', [])
                            ocr_results.append({"text": text, "confidence": confidence, "bbox": convert_numpy_to_list(bbox)})
            else:
                print("Unexpected OCR result structure; returning raw text strings if available")
                # Attempt to flatten any strings present
                try:
                    for item in result:
                        if isinstance(item, str):
                            ocr_results.append({"text": item, "confidence": 0.0, "bbox": []})
                except Exception:
                    pass
        else:
            print("No text detected in image")
        
        return ocr_results
        
    except Exception as e:
        print(f"Image processing error: {e}")
        raise e

def lookup_icd10_description(code: str) -> str:
    """Lookup ICD-10-CM code description using NIH Clinical Tables API.
    Tries multiple query variants (with and without dot). Returns empty string on failure.
    """
    try:
        norm = (code or "").strip().upper().rstrip(':;.,')
        if not norm:
            return ""
        candidates = [norm]
        # variant: remove dot
        if '.' in norm:
            candidates.append(norm.replace('.', ''))
        # variant: ensure uppercase
        candidates = list(dict.fromkeys(candidates))  # de-dup

        url = "https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search"
        for term in candidates:
            for field_param in ("df", "sf"):
                params = {
                    "terms": term,
                    field_param: "code,name",
                    "maxList": 5,
                }
                try:
                    r = requests.get(url, params=params, timeout=10)
                    r.raise_for_status()
                    data = r.json()
                    # data structure: [numFound, time, [codes...], [names...]]
                    if isinstance(data, list) and len(data) >= 4:
                        codes = data[2] or []
                        names = data[3] or []
                        # try exact code match first
                        for i, c in enumerate(codes):
                            if c and c.upper() in (norm, term) and i < len(names):
                                return names[i]
                        # fallback: first name if any
                        if names:
                            return names[0]
                except Exception as inner_e:
                    print(f"ICD-10 lookup attempt failed for {term} ({field_param}): {inner_e}")
                    continue
        print(f"ICD-10 lookup: no match for {code}")
        return ""
    except Exception as e:
        print(f"ICD-10 lookup failed for {code}: {e}")
        return ""

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
    from datetime import datetime
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

@app.route('/analyze-openai', methods=['POST'])
def analyze_with_openai():
    """Analyze extracted text with OpenAI for ICD-10 code extraction"""
    try:
        if not OPENAI_API_KEY:
            return jsonify({
                "success": False,
                "error": "OpenAI API key not configured. Please set OPENAI_API_KEY environment variable."
            }), 500
        
        data = request.get_json()
        if not data or 'text' not in data:
            return jsonify({"error": "No text data provided"}), 400
        
        text = data['text']
        if not text or not text.strip():
            return jsonify({"error": "Empty text provided"}), 400
        
        print(f"Analyzing text with OpenAI (length: {len(text)} characters)")
        
        # Create the prompt for ICD-10 code extraction
        prompt = f"""
You are a medical coding expert. Analyze the following medical text and extract all relevant ICD-10 codes with their full descriptions.

For each condition, status, diagnosis, or medical finding mentioned, provide:
1. The ICD-10 code
2. The full official description
3. A brief explanation of why this code applies
4. The status of the diagnosis or condition (active/historical/need review)

Format your response as a JSON object with this structure:
{{
    "icd_codes": [
        {{
            "code": "ICD-10 code",
            "description": "Full official description",
            "explanation": "Why this code applies to the text",
            "confidence": "high/medium/low",
            "status": "active/historical/need review"
        }}
    ],
    "summary": "Brief summary of the medical conditions found",
    "total_codes": number
}}

Medical text to analyze:
{text}

Please be thorough and accurate. Only include codes that are clearly mentioned or strongly implied in the text.
"""
        
        # Call OpenAI API
        client = openai.OpenAI(
    api_key=OPENAI_API_KEY
)
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a medical coding expert specializing in ICD-10 code extraction."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=2000,
            temperature=0.3
        )
        
        # Extract the response
        ai_response = response.choices[0].message.content.strip()
        print(f"OpenAI response received: {len(ai_response)} characters")
        
        # Try to parse as JSON
        try:
            parsed_response = json.loads(ai_response)
        except json.JSONDecodeError:
            # If not valid JSON, wrap it in a structured response
            parsed_response = {
                "icd_codes": [],
                "summary": ai_response,
                "total_codes": 0,
                "raw_response": ai_response
            }
        
        # Fallback: enrich missing descriptions via NIH Clinical Tables lookup
        enriched = []
        for item in parsed_response.get("icd_codes", []):
            code = (item.get("code") or "").strip()
            desc = (item.get("description") or item.get("desc") or item.get("title") or item.get("name") or "").strip()
            if code and not desc:
                desc = lookup_icd10_description(code)
            item["description"] = desc
            enriched.append(item)
        parsed_response["icd_codes"] = enriched
        
        return jsonify({
            "success": True,
            "analysis": parsed_response,
            "text_length": len(text)
        })
        
    except Exception as e:
        print(f"OpenAI analysis error: {e}")
        print(traceback.format_exc())
        return jsonify({
            "success": False,
            "error": f"OpenAI analysis failed: {str(e)}"
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
