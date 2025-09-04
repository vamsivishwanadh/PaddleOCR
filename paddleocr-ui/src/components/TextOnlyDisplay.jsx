import React, { useState } from "react";
import { Copy, Download, Bot, Check, Loader2 } from "lucide-react";
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
            {copied ? (
              <>
                <Check size={16} />
                Copied!
              </>
            ) : (
              <>
                <Copy size={16} />
                Copy
              </>
            )}
          </button>
          <button
            onClick={handleDownloadText}
            className="download-btn"
            title="Download as text file"
          >
            <Download size={16} />
            Download
          </button>
          <button
            onClick={handleOpenAIAnalysis}
            className="openai-btn"
            title="Analyze with OpenAI for ICD-10 codes"
            disabled={isAnalyzing}
          >
            {isAnalyzing ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Bot size={16} />
                Analyze with OpenAI
              </>
            )}
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
          background: var(--white);
          border-radius: var(--radius-2xl);
          box-shadow: var(--shadow-2xl);
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.2);
          position: relative;
          animation: fadeInUp 0.6s ease-out;
        }

        .results-container::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: var(--primary-gradient);
          border-radius: var(--radius-2xl) var(--radius-2xl) 0 0;
        }

        .results-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--space-6);
          background: var(--primary-gradient);
          color: var(--white);
          position: relative;
          overflow: hidden;
        }

        .results-header::before {
          content: "";
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.1),
            transparent
          );
          transition: left 0.5s ease;
        }

        .results-header:hover::before {
          left: 100%;
        }

        .results-header h2 {
          margin: 0;
          font-size: 1.75rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: var(--space-3);
        }

        .text-actions {
          display: flex;
          gap: var(--space-3);
          flex-wrap: wrap;
        }

        .copy-btn,
        .download-btn,
        .openai-btn {
          padding: var(--space-3) var(--space-4);
          border: none;
          border-radius: var(--radius-lg);
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 600;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          background: rgba(255, 255, 255, 0.2);
          color: var(--white);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.3);
          position: relative;
          overflow: hidden;
          min-height: 44px;
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }

        .copy-btn::before,
        .download-btn::before,
        .openai-btn::before {
          content: "";
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.2),
            transparent
          );
          transition: left 0.5s ease;
        }

        .copy-btn:hover::before,
        .download-btn:hover::before,
        .openai-btn:hover::before {
          left: 100%;
        }

        .copy-btn:hover,
        .download-btn:hover,
        .openai-btn:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        }

        .openai-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .openai-btn:disabled:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: none;
          box-shadow: none;
        }

        .copy-btn.copied {
          background: var(--success-gradient);
          color: var(--white);
          border-color: rgba(16, 185, 129, 0.5);
        }

        .text-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: var(--space-4);
          padding: var(--space-6);
          background: var(--gray-50);
          border-bottom: 1px solid var(--gray-200);
        }

        .stat-item {
          display: flex;
          flex-direction: column;
          gap: var(--space-1);
          background: var(--white);
          padding: var(--space-4);
          border-radius: var(--radius-lg);
          border: 1px solid var(--gray-200);
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .stat-item::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: var(--primary-gradient);
          transform: scaleX(0);
          transition: transform 0.3s ease;
        }

        .stat-item:hover::before {
          transform: scaleX(1);
        }

        .stat-item:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-lg);
        }

        .stat-label {
          font-size: 0.75rem;
          color: var(--gray-500);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .stat-value {
          font-size: 1rem;
          color: var(--gray-800);
          font-weight: 700;
        }

        .text-content {
          padding: var(--space-6);
        }

        .text-display {
          background: var(--gray-50);
          border: 2px solid var(--gray-200);
          border-radius: var(--radius-xl);
          padding: var(--space-6);
          font-family: var(--font-mono);
          font-size: 0.9rem;
          line-height: 1.7;
          color: var(--gray-700);
          white-space: pre-wrap;
          word-wrap: break-word;
          max-height: 600px;
          overflow-y: auto;
          min-height: 300px;
          box-shadow: var(--shadow-sm);
          transition: all 0.3s ease;
        }

        .text-display:hover {
          border-color: var(--gray-300);
          box-shadow: var(--shadow-md);
        }

        .text-display::-webkit-scrollbar {
          width: 8px;
        }

        .text-display::-webkit-scrollbar-track {
          background: var(--gray-100);
          border-radius: var(--radius);
        }

        .text-display::-webkit-scrollbar-thumb {
          background: var(--gray-300);
          border-radius: var(--radius);
        }

        .text-display::-webkit-scrollbar-thumb:hover {
          background: var(--gray-400);
        }

        @media (max-width: 1024px) {
          .text-stats {
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: var(--space-3);
          }
        }

        @media (max-width: 768px) {
          .results-header {
            flex-direction: column;
            gap: var(--space-4);
            text-align: center;
            padding: var(--space-5);
          }

          .results-header h2 {
            font-size: 1.5rem;
          }

          .text-stats {
            grid-template-columns: 1fr 1fr;
            gap: var(--space-3);
            padding: var(--space-4);
          }

          .text-actions {
            justify-content: center;
            flex-wrap: wrap;
          }

          .text-content {
            padding: var(--space-4);
          }

          .text-display {
            padding: var(--space-4);
            font-size: 0.85rem;
            min-height: 250px;
          }
        }

        @media (max-width: 480px) {
          .text-stats {
            grid-template-columns: 1fr;
            gap: var(--space-2);
          }

          .text-actions {
            flex-direction: column;
            gap: var(--space-2);
          }

          .copy-btn,
          .download-btn,
          .openai-btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
};

export default TextOnlyDisplay;
