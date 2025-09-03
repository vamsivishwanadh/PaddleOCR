import React, { useState } from "react";
import {
  FileText,
  MapPin,
  BarChart3,
  Download,
  Copy,
  Check,
} from "lucide-react";

const ResultsDisplay = ({ results, selectedFile, isLoading }) => {
  const [copiedIndex, setCopiedIndex] = useState(null);

  const copyToClipboard = async (text, index) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  const downloadResults = () => {
    if (!results) return;

    const dataStr = JSON.stringify(results, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `paddleocr-results-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getStats = () => {
    if (!results?.results)
      return {
        totalTexts: 0,
        avgConfidence: 0,
        totalCharacters: 0,
        totalPages: 0,
      };

    const texts = results.results;
    const totalTexts = texts.length;
    const totalCharacters = texts.reduce(
      (sum, item) => sum + (item.text?.length || 0),
      0
    );
    const avgConfidence =
      texts.reduce((sum, item) => sum + (item.confidence || 0), 0) / totalTexts;

    // Count unique pages for PDF files
    const totalPages =
      results.file_type === "pdf"
        ? new Set(texts.map((item) => item.page).filter(Boolean)).size
        : 1;

    return {
      totalTexts,
      avgConfidence: Math.round(avgConfidence * 100) / 100,
      totalCharacters,
      totalPages,
    };
  };

  const formatCoordinates = (coordinates) => {
    if (!coordinates || !Array.isArray(coordinates)) return "N/A";
    return coordinates.map((coord) => `[${coord[0]}, ${coord[1]}]`).join(", ");
  };

  const stats = getStats();

  if (isLoading) {
    return (
      <div className="card">
        <div className="loading">
          <div className="spinner"></div>
          Processing your document...
        </div>
      </div>
    );
  }

  if (!results && !selectedFile) {
    return (
      <div className="card">
        <div className="empty-state">
          <FileText className="empty-state-icon" />
          <h3 style={{ marginBottom: "8px", color: "#4a5568" }}>
            No Results Yet
          </h3>
          <p>Upload a document to see extracted text and coordinates here.</p>
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="card">
        <div className="empty-state">
          <FileText className="empty-state-icon" />
          <h3 style={{ marginBottom: "8px", color: "#4a5568" }}>
            Ready to Process
          </h3>
          <p>Click "Extract Text" to analyze your document.</p>
        </div>
      </div>
    );
  }

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
        <h2 style={{ color: "#2d3748" }}>Extraction Results</h2>
        <button
          className="btn btn-secondary"
          onClick={downloadResults}
          style={{ padding: "8px 16px", fontSize: "0.9rem" }}
        >
          <Download size={16} />
          Download JSON
        </button>
      </div>

      {/* Statistics */}
      <div className="stats">
        <div className="stat-item">
          <div className="stat-value">{stats.totalTexts}</div>
          <div className="stat-label">Text Blocks</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{stats.avgConfidence}</div>
          <div className="stat-label">Avg Confidence</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{stats.totalCharacters}</div>
          <div className="stat-label">Total Characters</div>
        </div>
        {results.file_type === "pdf" && (
          <div className="stat-item">
            <div className="stat-value">{stats.totalPages}</div>
            <div className="stat-label">Pages</div>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="results">
        {results.results?.map((item, index) => (
          <div key={index} className="result-item">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "8px",
              }}
            >
              <div className="result-text">
                {item.text || "No text detected"}
              </div>
              <button
                onClick={() => copyToClipboard(item.text, index)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#667eea",
                  padding: "4px",
                  borderRadius: "4px",
                  display: "flex",
                  alignItems: "center",
                }}
                title="Copy text"
              >
                {copiedIndex === index ? (
                  <Check size={16} />
                ) : (
                  <Copy size={16} />
                )}
              </button>
            </div>

            <div className="result-confidence">
              <BarChart3
                size={14}
                style={{ marginRight: "4px", display: "inline" }}
              />
              Confidence: {(item.confidence * 100).toFixed(1)}%
              {item.page && (
                <span
                  style={{
                    marginLeft: "12px",
                    color: "#667eea",
                    fontWeight: "500",
                  }}
                >
                  Page {item.page}
                </span>
              )}
            </div>

            <div className="result-coordinates">
              <MapPin
                size={14}
                style={{ marginRight: "4px", display: "inline" }}
              />
              Coordinates: {formatCoordinates(item.bbox)}
            </div>
          </div>
        ))}
      </div>

      {results.results?.length === 0 && (
        <div className="empty-state">
          <FileText className="empty-state-icon" />
          <h3 style={{ marginBottom: "8px", color: "#4a5568" }}>
            No Text Detected
          </h3>
          <p>
            The document might be empty or the text might not be clearly
            visible.
          </p>
        </div>
      )}
    </div>
  );
};

export default ResultsDisplay;
