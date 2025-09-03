#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Test script to verify PaddleOCR 3.x API
"""

from paddleocr import PaddleOCR
import cv2
import numpy as np
from PIL import Image
import io

def test_ocr():
    print("Testing PaddleOCR 3.x API...")
    
    try:
        # Initialize PaddleOCR
        ocr = PaddleOCR(
            use_doc_orientation_classify=False,
            use_doc_unwarping=False,
            use_textline_orientation=False,
            lang='ch'
        )
        print("✓ PaddleOCR initialized successfully")
        
        # Create a simple test image with text
        # Create a white image
        img = np.ones((100, 300, 3), dtype=np.uint8) * 255
        
        # Add some text using OpenCV
        cv2.putText(img, 'Test OCR', (50, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 0), 2)
        
        # Test OCR
        result = ocr.predict(img)
        print(f"✓ OCR result: {result}")
        
        if result and result[0]:
            print("✓ OCR detected text successfully")
            for line in result[0]:
                if line:
                    text = line[1][0]
                    confidence = line[1][1]
                    print(f"  Text: '{text}', Confidence: {confidence}")
        else:
            print("⚠ No text detected in test image")
            
    except Exception as e:
        print(f"✗ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_ocr()