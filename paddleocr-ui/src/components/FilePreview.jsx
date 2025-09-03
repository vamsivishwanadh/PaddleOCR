import React, { useState, useEffect } from "react";
import { Image, FileText, Eye, EyeOff } from "lucide-react";

const FilePreview = ({ file, results }) => {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [showCoordinates, setShowCoordinates] = useState(false);

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);

      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setPreviewUrl(null);
    }
  }, [file]);

  const drawCoordinates = (canvas, ctx, coordinates) => {
    if (!coordinates || !Array.isArray(coordinates)) return;

    ctx.strokeStyle = "#667eea";
    ctx.lineWidth = 2;
    ctx.fillStyle = "rgba(102, 126, 234, 0.1)";

    coordinates.forEach((coord, index) => {
      if (coord && coord.length >= 4) {
        const [x1, y1, x2, y2, x3, y3, x4, y4] = coord.flat();

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineTo(x3, y3);
        ctx.lineTo(x4, y4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Add index number
        ctx.fillStyle = "#667eea";
        ctx.font = "12px Arial";
        ctx.fillText(index.toString(), x1, y1 - 5);
        ctx.fillStyle = "rgba(102, 126, 234, 0.1)";
      }
    });
  };

  const createImageWithCoordinates = () => {
    if (!previewUrl || !results?.results?.[0]) return previewUrl;

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        canvas.width = img.width;
        canvas.height = img.height;

        ctx.drawImage(img, 0, 0);

        // Draw coordinates for each detected text
        results.results[0].forEach((item) => {
          if (item.text_region) {
            drawCoordinates(canvas, ctx, [item.text_region]);
          }
        });

        resolve(canvas.toDataURL());
      };
      img.src = previewUrl;
    });
  };

  const [imageWithCoords, setImageWithCoords] = useState(null);

  useEffect(() => {
    if (showCoordinates && previewUrl && results?.results?.[0]) {
      createImageWithCoordinates().then(setImageWithCoords);
    } else {
      setImageWithCoords(null);
    }
  }, [showCoordinates, previewUrl, results]);

  if (!file) {
    return (
      <div className="card">
        <div className="empty-state">
          <Eye className="empty-state-icon" />
          <h3 style={{ marginBottom: "8px", color: "#4a5568" }}>No Preview</h3>
          <p>Upload a document to see a preview here.</p>
        </div>
      </div>
    );
  }

  const isImage = file.type.startsWith("image/");
  const isPdf = file.type === "application/pdf";

  return (
    <div className="card">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <h2 style={{ color: "#2d3748" }}>Document Preview</h2>
        {isImage && results?.results?.[0] && (
          <button
            className="btn btn-secondary"
            onClick={() => setShowCoordinates(!showCoordinates)}
            style={{ padding: "8px 16px", fontSize: "0.9rem" }}
          >
            {showCoordinates ? <EyeOff size={16} /> : <Eye size={16} />}
            {showCoordinates ? "Hide" : "Show"} Coordinates
          </button>
        )}
      </div>

      <div className="preview-section">
        {isImage ? (
          <div style={{ textAlign: "center" }}>
            <img
              src={imageWithCoords || previewUrl}
              alt="Document preview"
              className="preview-image"
              style={{
                maxWidth: "100%",
                maxHeight: "500px",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
              }}
            />
            {showCoordinates && (
              <div
                style={{
                  marginTop: "10px",
                  fontSize: "0.85rem",
                  color: "#718096",
                  background: "#f7fafc",
                  padding: "8px",
                  borderRadius: "4px",
                }}
              >
                Blue boxes show detected text regions with their index numbers
              </div>
            )}
          </div>
        ) : isPdf ? (
          <div
            style={{
              background: "#f7fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              padding: "40px",
              textAlign: "center",
            }}
          >
            <FileText
              size={64}
              style={{ color: "#cbd5e0", marginBottom: "16px" }}
            />
            <h3 style={{ color: "#4a5568", marginBottom: "8px" }}>
              PDF Document
            </h3>
            <p
              style={{
                color: "#718096",
                fontSize: "0.9rem",
                marginBottom: "12px",
              }}
            >
              PDF preview is not available. Text extraction will work on all
              pages.
            </p>
            {results?.file_type === "pdf" && results?.results && (
              <div
                style={{
                  background: "#e8f2ff",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  fontSize: "0.85rem",
                  color: "#667eea",
                  fontWeight: "500",
                }}
              >
                {
                  new Set(
                    results.results.map((item) => item.page).filter(Boolean)
                  ).size
                }{" "}
                page(s) processed
              </div>
            )}
          </div>
        ) : (
          <div
            style={{
              background: "#f7fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              padding: "40px",
              textAlign: "center",
            }}
          >
            <FileText
              size={64}
              style={{ color: "#cbd5e0", marginBottom: "16px" }}
            />
            <h3 style={{ color: "#4a5568", marginBottom: "8px" }}>Document</h3>
            <p style={{ color: "#718096", fontSize: "0.9rem" }}>
              Preview not available for this file type.
            </p>
          </div>
        )}
      </div>

      <div
        style={{
          marginTop: "20px",
          padding: "12px",
          background: "#f7fafc",
          borderRadius: "8px",
          fontSize: "0.85rem",
          color: "#4a5568",
        }}
      >
        <strong>File Info:</strong> {file.name} ({Math.round(file.size / 1024)}{" "}
        KB)
      </div>
    </div>
  );
};

export default FilePreview;
