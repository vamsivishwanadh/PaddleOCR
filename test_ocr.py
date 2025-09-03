#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Simple OCR test script using PaddleOCR 3.x
"""

from paddleocr import PaddleOCR
import cv2
import numpy as np

def test_ocr():
    """Test OCR functionality"""
    print("Initializing PaddleOCR...")
    
    # Initialize PaddleOCR with Chinese and English support
    ocr = PaddleOCR(use_textline_orientation=True, lang='ch')
    
    print("PaddleOCR initialized successfully!")
    
    # Create a simple test image with text
    # Create a white image
    img = np.ones((100, 300, 3), dtype=np.uint8) * 255
    
    # Add some text (this is just a placeholder - you would use real images)
    cv2.putText(img, 'Hello World', (50, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 0), 2)
    
    print("Running OCR on test image...")
    
    try:
        # Run OCR
        result = ocr.ocr(img, cls=True)
        
        print("OCR Results:")
        for idx in range(len(result)):
            res = result[idx]
            for line in res:
                print(f"Text: {line[1][0]}, Confidence: {line[1][1]:.4f}")
        
        print("OCR test completed successfully!")
        return True
        
    except Exception as e:
        print(f"OCR test failed: {e}")
        return False

if __name__ == "__main__":
    test_ocr()
