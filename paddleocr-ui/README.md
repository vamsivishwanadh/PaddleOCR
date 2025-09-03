# PaddleOCR Text Extraction UI

A modern React + Vite web application for uploading documents and extracting text using PaddleOCR service.

## Features

- 📁 **Drag & Drop File Upload** - Support for images (PNG, JPG, JPEG, GIF, BMP, TIFF, WebP) and PDFs
- 🔍 **Real-time Text Extraction** - Connect to PaddleOCR service for accurate text recognition
- 📄 **PDF Processing** - Extract text from all pages of PDF documents
- 📍 **Coordinate Visualization** - See exactly where text was detected with bounding boxes
- 📊 **Confidence Scores** - View accuracy metrics for each detected text block
- 📑 **Page Information** - For PDFs, see which page each text block was found on
- 💾 **Export Results** - Download extraction results as JSON
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile devices
- 🎨 **Modern UI** - Clean, intuitive interface with smooth animations

## Prerequisites

- Node.js 16+ and npm/yarn
- PaddleOCR service running on `http://localhost:8868`

## Quick Start

1. **Install dependencies:**

   ```bash
   cd paddleocr-ui
   npm install
   ```

2. **Start the development server:**

   ```bash
   npm run dev
   ```

3. **Open your browser:**
   Navigate to `http://localhost:3000`

## PaddleOCR Service Setup

### Option 1: Use the Simple OCR Server (Recommended)

1. **Install Python dependencies:**
   ```bash
   pip install -r requirements_server.txt
   ```

2. **Start the simple OCR server:**
   ```bash
   python simple_ocr_server.py
   ```

### Option 2: Use PaddleOCR HubServing

```bash
# Start PaddleOCR HubServing
hub serving start -m ocr_system -p 8868
```

The UI will automatically detect if the service is available and show connection status.

## Usage

1. **Upload a Document:**

   - Drag and drop a file onto the upload area, or
   - Click to browse and select a file

2. **View Results:**

   - Text extraction happens automatically
   - See detected text with confidence scores
   - View coordinate information for each text block
   - For PDFs, see page numbers for each text block

3. **Visualize Coordinates:**

   - Toggle "Show Coordinates" to see bounding boxes on images
   - Each detected text region is highlighted with a blue box
   - PDF pages are processed individually with page numbers shown

4. **Export Data:**
   - Click "Download JSON" to save results
   - Copy individual text blocks to clipboard
   - Results include page information for PDF files

## API Integration

The app connects to the OCR service via the `/ocr` endpoint:

```javascript
// Example API call
const response = await fetch("/api/ocr", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    image: base64EncodedFile, // Can be image or PDF
  }),
});

// Response format
{
  "success": true,
  "file_type": "pdf", // or "image"
  "results": [
    {
      "text": "Extracted text",
      "confidence": 0.95,
      "bbox": [[x1, y1], [x2, y2], [x3, y3], [x4, y4]],
      "page": 1 // Only present for PDF files
    }
  ]
}
```

## Project Structure

```
paddleocr-ui/
├── src/
│   ├── components/
│   │   ├── FileUpload.jsx      # Drag & drop file upload
│   │   ├── FilePreview.jsx     # Document preview with coordinates
│   │   └── ResultsDisplay.jsx  # Text results and statistics
│   ├── services/
│   │   └── api.js              # PaddleOCR API integration
│   ├── App.jsx                 # Main application component
│   ├── App.css                 # Application styles
│   ├── index.css               # Global styles
│   └── main.jsx                # Application entry point
├── package.json
├── vite.config.js              # Vite configuration with proxy
└── README.md
```

## Configuration

### Vite Proxy Setup

The app uses Vite's proxy feature to connect to PaddleOCR service:

```javascript
// vite.config.js
export default defineConfig({
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8868",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
```

### Environment Variables

You can customize the PaddleOCR service URL by creating a `.env` file:

```bash
VITE_PADDLEOCR_URL=http://localhost:8868
```

## Build for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## Troubleshooting

### Service Connection Issues

- Ensure PaddleOCR service is running on port 8868
- Check firewall settings
- Verify the service URL in browser developer tools

### File Upload Issues

- Check file size limits (large files may timeout)
- Ensure file format is supported
- Check browser console for errors

### Performance Issues

- Large images may take longer to process
- Consider resizing images before upload
- Check PaddleOCR service logs for processing time

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.
