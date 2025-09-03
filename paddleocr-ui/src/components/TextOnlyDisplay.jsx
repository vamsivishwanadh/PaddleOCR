import React, { useState } from "react";
import { analyzeWithOpenAI } from "../services/api";
import { toast } from "react-hot-toast";

const TextOnlyDisplay = ({ results, selectedFile, onOpenAIAnalysis }) => {
  const [copied, setCopied] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  if (!results || !results.success) {
    return (
      <div className="results-container">
        <h2>Text Extraction Results</h2>
        <div className="no-results">
          <p>No results to display</p>
        </div>
      </div>
    );
  }

  // Extract all text from results
  const extractAllText = () => {
    if (!results.results || !Array.isArray(results.results)) {
      return "No text found";
    }

    return results.results
      .map((item) => item.text)
      .filter((text) => text && text.trim().length > 0)
      .join("\n");
  };

  const allText = extractAllText();

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(allText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  const handleDownloadText = () => {
    const blob = new Blob([allText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${
      selectedFile?.name?.replace(/\.[^/.]+$/, "") || "extracted_text"
    }.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleOpenAIAnalysis = async () => {
    if (!allText || allText.trim().length === 0) {
      toast.error("No text to analyze");
      return;
    }

    setIsAnalyzing(true);
    try {
      toast.loading("Analyzing with OpenAI...", { id: "openai-analysis" });

      const response = await analyzeWithOpenAI(allText);

      toast.success("Analysis completed!", { id: "openai-analysis" });

      // Pass the analysis results to the parent component
      if (onOpenAIAnalysis) {
        onOpenAIAnalysis(response);
      }
    } catch (error) {
      console.error("OpenAI analysis error:", error);
      toast.error(error.message || "Failed to analyze with OpenAI", {
        id: "openai-analysis",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="results-container">
      <div className="results-header">
        <h2>Extracted Text Only</h2>
        <div className="text-actions">
          <button
            onClick={handleCopyToClipboard}
            className={`copy-btn ${copied ? "copied" : ""}`}
            title="Copy to clipboard"
          >
            {copied ? "✓ Copied!" : "📋 Copy"}
          </button>
          <button
            onClick={handleDownloadText}
            className="download-btn"
            title="Download as text file"
          >
            💾 Download
          </button>
          <button
            onClick={handleOpenAIAnalysis}
            className="openai-btn"
            title="Analyze with OpenAI for ICD-10 codes"
            disabled={isAnalyzing}
          >
            {isAnalyzing ? "🔄 Analyzing..." : "🤖 Analyze with OpenAI"}
          </button>
        </div>
      </div>

      <div className="text-stats">
        <div className="stat-item">
          <span className="stat-label">File:</span>
          <span className="stat-value">{selectedFile?.name || "Unknown"}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Type:</span>
          <span className="stat-value">
            {results.file_type?.toUpperCase() || "Unknown"}
          </span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Text Lines:</span>
          <span className="stat-value">
            {results.results ? results.results.length : 0}
          </span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Characters:</span>
          <span className="stat-value">{allText.length.toLocaleString()}</span>
        </div>
        {results.processing_time && (
          <div className="stat-item">
            <span className="stat-label">Processing Time:</span>
            <span className="stat-value">
              {results.processing_time.toFixed(2)}s
            </span>
          </div>
        )}
      </div>

      <div className="text-content">
        <div className="text-display">{allText || "No text content found"}</div>
      </div>

      <style jsx>{`
        .results-container {
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }

        .results-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .results-header h2 {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 600;
        }

        .text-actions {
          display: flex;
          gap: 10px;
        }

        .copy-btn,
        .download-btn,
        .openai-btn {
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s ease;
          background: rgba(255, 255, 255, 0.2);
          color: white;
          backdrop-filter: blur(10px);
        }

        .copy-btn:hover,
        .download-btn:hover,
        .openai-btn:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: translateY(-1px);
        }

        .openai-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .openai-btn:disabled:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: none;
        }

        .copy-btn.copied {
          background: #10b981;
          color: white;
        }

        .text-stats {
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
          padding: 20px;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
        }

        .stat-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .stat-label {
          font-size: 12px;
          color: #64748b;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .stat-value {
          font-size: 14px;
          color: #1e293b;
          font-weight: 600;
        }

        .text-content {
          padding: 20px;
        }

        .text-display {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 20px;
          font-family: "Monaco", "Menlo", "Ubuntu Mono", monospace;
          font-size: 14px;
          line-height: 1.6;
          color: #374151;
          white-space: pre-wrap;
          word-wrap: break-word;
          max-height: 500px;
          overflow-y: auto;
          min-height: 200px;
        }

        .text-display::-webkit-scrollbar {
          width: 8px;
        }

        .text-display::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 4px;
        }

        .text-display::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }

        .text-display::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }

        @media (max-width: 768px) {
          .results-header {
            flex-direction: column;
            gap: 15px;
            text-align: center;
          }

          .text-stats {
            flex-direction: column;
            gap: 15px;
          }

          .text-actions {
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
};

export default TextOnlyDisplay;
