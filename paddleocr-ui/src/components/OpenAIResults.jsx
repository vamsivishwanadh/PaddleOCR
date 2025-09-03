import React, { useState } from "react";

const OpenAIResults = ({ analysis, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!analysis || !analysis.success) {
    return (
      <div className="openai-results-container">
        <div className="openai-header">
          <h2>OpenAI Analysis Results</h2>
          <button onClick={onClose} className="close-btn">
            ✕
          </button>
        </div>
        <div className="no-results">
          <p>No analysis results to display</p>
        </div>
      </div>
    );
  }

  const { analysis: analysisData } = analysis;
  const icdCodes = analysisData.icd_codes || [];
  const summary = analysisData.summary || "No summary available";

  const handleCopyCodes = async () => {
    const codesText = icdCodes
      .map((code) => `${code.code}: ${code.description}`)
      .join("\n");

    try {
      await navigator.clipboard.writeText(codesText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy codes: ", err);
    }
  };

  const handleDownloadCodes = () => {
    const codesText = icdCodes
      .map(
        (code) =>
          `${code.code}: ${code.description}\nExplanation: ${code.explanation}\nConfidence: ${code.confidence}\n`
      )
      .join("\n---\n");

    const blob = new Blob([codesText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "icd10_codes.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="openai-results-container">
      <div className="openai-header">
        <h2>🤖 OpenAI ICD-10 Analysis</h2>
        <div className="header-actions">
          <button
            onClick={handleCopyCodes}
            className={`copy-btn ${copied ? "copied" : ""}`}
            title="Copy ICD-10 codes"
          >
            {copied ? "✓ Copied!" : "📋 Copy Codes"}
          </button>
          <button
            onClick={handleDownloadCodes}
            className="download-btn"
            title="Download ICD-10 codes"
          >
            💾 Download
          </button>
          <button onClick={onClose} className="close-btn">
            ✕
          </button>
        </div>
      </div>

      <div className="analysis-stats">
        <div className="stat-item">
          <span className="stat-label">Total ICD-10 Codes:</span>
          <span className="stat-value">{icdCodes.length}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Model Used:</span>
          <span className="stat-value">
            {analysis.model_used || "gpt-3.5-turbo"}
          </span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Text Length:</span>
          <span className="stat-value">
            {analysis.text_length?.toLocaleString() || "Unknown"} chars
          </span>
        </div>
      </div>

      {summary && (
        <div className="summary-section">
          <h3>📋 Summary</h3>
          <div className="summary-content">{summary}</div>
        </div>
      )}

      <div className="codes-section">
        <h3>🏥 ICD-10 Codes Found</h3>
        {icdCodes.length > 0 ? (
          <div className="codes-list">
            {icdCodes.map((code, index) => (
              <div key={index} className="code-item">
                <div className="code-header">
                  <span className="code-number">{code.code}</span>
                  <span
                    className={`confidence-badge confidence-${code.confidence}`}
                  >
                    {code.confidence}
                  </span>
                </div>
                <div className="code-description">{code.description}</div>
                {code.explanation && (
                  <div className="code-explanation">
                    <strong>Why this applies:</strong> {code.explanation}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="no-codes">
            <p>No ICD-10 codes were identified in the text.</p>
          </div>
        )}
      </div>

      <style jsx>{`
        .openai-results-container {
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          overflow: hidden;
          margin-top: 20px;
        }

        .openai-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
        }

        .openai-header h2 {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 600;
        }

        .header-actions {
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .copy-btn,
        .download-btn {
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
        .download-btn:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: translateY(-1px);
        }

        .copy-btn.copied {
          background: #3b82f6;
          color: white;
        }

        .close-btn {
          padding: 8px 12px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 16px;
          font-weight: 500;
          background: rgba(255, 255, 255, 0.2);
          color: white;
          transition: all 0.2s ease;
        }

        .close-btn:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: translateY(-1px);
        }

        .analysis-stats {
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

        .summary-section {
          padding: 20px;
          border-bottom: 1px solid #e2e8f0;
        }

        .summary-section h3 {
          margin: 0 0 15px 0;
          color: #1e293b;
          font-size: 1.2rem;
        }

        .summary-content {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 15px;
          font-size: 14px;
          line-height: 1.6;
          color: #374151;
        }

        .codes-section {
          padding: 20px;
        }

        .codes-section h3 {
          margin: 0 0 20px 0;
          color: #1e293b;
          font-size: 1.2rem;
        }

        .codes-list {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .code-item {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 15px;
          transition: all 0.2s ease;
        }

        .code-item:hover {
          border-color: #10b981;
          box-shadow: 0 2px 8px rgba(16, 185, 129, 0.1);
        }

        .code-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }

        .code-number {
          font-family: "Monaco", "Menlo", "Ubuntu Mono", monospace;
          font-size: 16px;
          font-weight: 700;
          color: #10b981;
          background: rgba(16, 185, 129, 0.1);
          padding: 4px 8px;
          border-radius: 4px;
        }

        .confidence-badge {
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .confidence-high {
          background: #dcfce7;
          color: #166534;
        }

        .confidence-medium {
          background: #fef3c7;
          color: #92400e;
        }

        .confidence-low {
          background: #fee2e2;
          color: #991b1b;
        }

        .code-description {
          font-size: 14px;
          color: #374151;
          font-weight: 500;
          margin-bottom: 8px;
        }

        .code-explanation {
          font-size: 13px;
          color: #6b7280;
          line-height: 1.5;
        }

        .no-codes {
          text-align: center;
          padding: 40px 20px;
          color: #6b7280;
        }

        .no-results {
          text-align: center;
          padding: 40px 20px;
          color: #6b7280;
        }

        @media (max-width: 768px) {
          .openai-header {
            flex-direction: column;
            gap: 15px;
            text-align: center;
          }

          .header-actions {
            justify-content: center;
          }

          .analysis-stats {
            flex-direction: column;
            gap: 15px;
          }

          .code-header {
            flex-direction: column;
            gap: 8px;
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  );
};

export default OpenAIResults;
