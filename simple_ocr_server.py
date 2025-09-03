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
            lang='ch'
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
            ocr = PaddleOCR(lang='ch')
            print("PaddleOCR initialized with alternative parameters!")
            return True
        except Exception as e2:
            print(f"Alternative initialization also failed: {e2}")
            return False

# Initialize OCR
initialize_ocr()

def process_pdf(pdf_bytes):
    """Convert PDF to images and run OCR on each page"""
    try:
        # Open PDF with PyMuPDF
        pdf_document = fitz.open(stream=pdf_bytes, filetype="pdf")
        all_results = []
        
        for page_num in range(len(pdf_document)):
            # Get page
            page = pdf_document[page_num]
            
            # Convert page to image (pixmap)
            mat = fitz.Matrix(2.0, 2.0)  # 2x zoom for better quality
            pix = page.get_pixmap(matrix=mat)
            
            # Convert pixmap to PIL Image
            img_data = pix.tobytes("png")
            pil_image = Image.open(io.BytesIO(img_data))
            
            # Convert to OpenCV format
            cv_image = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
            
            # Run OCR on this page
            print(f"Running OCR on PDF page {page_num + 1}, image size: {cv_image.shape}")
            result = ocr.predict(cv_image)
            print(f"OCR result for page {page_num + 1}: {len(result[0]) if result and result[0] else 0} text lines")
            
            # Format results for this page
            page_results = []
            if result and result[0]:
                for line in result[0]:
                    if line:
                        text = line[1][0]
                        confidence = line[1][1]
                        bbox = line[0]
                        page_results.append({
                            "text": text,
                            "confidence": float(confidence),
                            "bbox": bbox,
                            "page": page_num + 1
                        })
            
            all_results.extend(page_results)
        
        pdf_document.close()
        return all_results
        
    except Exception as e:
        print(f"PDF processing error: {e}")
        raise e

def process_image(image_bytes):
    """Process image file and run OCR"""
    try:
        # Convert to PIL Image
        pil_image = Image.open(io.BytesIO(image_bytes))
        
        # Convert to OpenCV format
        cv_image = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
        
        # Run OCR
        print(f"Running OCR on image of size: {cv_image.shape}")
        result = ocr.predict(cv_image)
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
        if not data or 'image' not in data:
            return jsonify({"error": "No image data provided"}), 400
        
        # Decode base64 data
        file_data = data['image']
        if file_data.startswith('data:'):
            # Remove data URL prefix (e.g., data:image/jpeg;base64, or data:application/pdf;base64,)
            file_data = file_data.split(',')[1]
        
        # Decode base64 to bytes
        file_bytes = base64.b64decode(file_data)
        
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
        
        return jsonify({
            "success": True,
            "file_type": file_type,
            "results": ocr_results
        })
        
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
