import React, { useState } from "react";
import {
  Bot,
  Copy,
  Download,
  X,
  Check,
  LayoutGrid,
  Table,
  Stethoscope,
  FileText,
} from "lucide-react";

const OpenAIResults = ({ analysis, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState("cards"); // 'cards' or 'table'

  if (!analysis || !analysis.success) {
    return (
      <div className="openai-results-container">
        <div className="openai-header">
          <h2>OpenAI Analysis Results</h2>
          <button onClick={onClose} className="close-btn">
            <X size={16} />
          </button>
        </div>
        <div className="no-results">
          <p>No analysis results to display</p>
        </div>
      </div>
    );
  }

  const { analysis: analysisData } = analysis;
  let icdCodes = analysisData.icd_codes || analysisData.icdCodes || [];
  const summary = analysisData.summary || "";
  const raw = analysisData.raw_response || "";

  // Helper: strip markdown code fences and parse JSON safely
  const parseJsonFromString = (text) => {
    if (!text || typeof text !== "string") return null;
    const trimmed = text.trim();
    // Extract between ```json ... ``` or ``` ... ``` if present
    const fenceMatch = trimmed.match(/```(?:json)?\n([\s\S]*?)```/i);
    const candidate = fenceMatch ? fenceMatch[1] : trimmed;
    // If still wrapped as stringified JSON, try to find first { and last }
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    const slice =
      start !== -1 && end !== -1 ? candidate.slice(start, end + 1) : candidate;
    try {
      return JSON.parse(slice);
    } catch (e) {
      return null;
    }
  };

  // Try to pull structured codes from raw_response or summary if empty
  if (!Array.isArray(icdCodes) || icdCodes.length === 0) {
    const parsedRaw = parseJsonFromString(raw);
    if (parsedRaw && Array.isArray(parsedRaw.icd_codes)) {
      icdCodes = parsedRaw.icd_codes;
    } else if (parsedRaw && Array.isArray(parsedRaw.icdCodes)) {
      icdCodes = parsedRaw.icdCodes;
    } else {
      const parsedSummary = parseJsonFromString(summary);
      if (parsedSummary && Array.isArray(parsedSummary.icd_codes)) {
        icdCodes = parsedSummary.icd_codes;
      } else if (parsedSummary && Array.isArray(parsedSummary.icdCodes)) {
        icdCodes = parsedSummary.icdCodes;
      }
    }
  }

  const getDescription = (item) => {
    if (!item) return "";
    return (
      item.description ||
      item.desc ||
      item.long_description ||
      item.full_description ||
      item.fullDescription ||
      item.label ||
      item.display ||
      item.title ||
      item.name ||
      ""
    );
  };

  // Build a map code -> description from free text
  const buildCodeDescMapFromText = (text) => {
    const map = {};
    if (!text) return map;
    const lines = text.split(/\r?\n/);
    // Patterns: CODE :|-|–|— description OR CODE description
    const patternSep =
      /^\s*[-*•]?\s*([A-TV-Z][0-9][0-9A-Z](?:\.[0-9A-Z]{1,4})?)\s*[:\-–—]\s*(.+)\s*$/i;
    const patternSpace =
      /^\s*[-*•]?\s*([A-TV-Z][0-9][0-9A-Z](?:\.[0-9A-Z]{1,4})?)\s+(.+)\s*$/i;
    for (const line of lines) {
      let m = line.match(patternSep) || line.match(patternSpace);
      if (m) {
        const code = m[1].toUpperCase();
        const desc = (m[2] || "").trim();
        if (desc && !map[code]) map[code] = desc;
      }
    }
    return map;
  };

  // Fallback: extract codes and descriptions from text if structured icd_codes array is empty
  const extractCodesFromText = (text) => {
    if (!text) return [];
    const lines = text.split(/\r?\n/);

    // Pattern captures: optional bullet, code, separator (: - – —), description
    const linePattern =
      /^\s*[-*•]?\s*([A-TV-Z][0-9][0-9A-Z](?:\.[0-9A-Z]{1,4})?)\s*[:\-–—]\s*(.+)\s*$/i;
    // Also allow just whitespace between code and description
    const spacePattern =
      /^\s*[-*•]?\s*([A-TV-Z][0-9][0-9A-Z](?:\.[0-9A-Z]{1,4})?)\s+(.+)\s*$/i;

    const items = [];
    const seen = new Set();

    for (const line of lines) {
      let m = line.match(linePattern);
      if (!m) m = line.match(spacePattern);
      if (m) {
        const code = m[1].toUpperCase();
        const description = (m[2] || "").trim();
        if (!seen.has(code) && description) {
          seen.add(code);
          items.push({ code, description });
        }
      }
    }

    // Second pass: capture codes appearing inline without a clear separator
    const codeRegex = /\b([A-TV-Z][0-9][0-9A-Z](?:\.[0-9A-Z]{1,4})?)\b/g; // exclude U (reserved)
    const allMatches = (text.match(codeRegex) || []).map((c) =>
      c.toUpperCase()
    );
    for (const code of allMatches) {
      if (seen.has(code)) continue;
      const lineWithCode = lines.find((l) => l.toUpperCase().includes(code));
      let description = "";
      if (lineWithCode) {
        const idx = lineWithCode.toUpperCase().indexOf(code);
        const after = lineWithCode.slice(idx + code.length);
        const sepIdx = after.search(/[:\-–—]/);
        if (sepIdx !== -1) {
          description = after.slice(sepIdx + 1).trim();
        } else {
          const tail = after.trim();
          if (tail.split(/\s+/).length > 1) description = tail;
        }
      }
      seen.add(code);
      items.push({ code, description });
    }

    return items;
  };

  // Structured preferred list (if available)
  const structuredCodes =
    Array.isArray(icdCodes) && icdCodes.length > 0
      ? icdCodes.map((c) => ({
          code: (c.code || "").toUpperCase(),
          description: getDescription(c),
          confidence: c.confidence,
          explanation: c.explanation,
          status: c.status || c.state || c.conditionStatus || "",
        }))
      : [];

  // Fallback display list
  const fallbackCodes =
    structuredCodes.length === 0 ? extractCodesFromText(raw || summary) : [];
  const displayCodes =
    structuredCodes.length > 0 ? structuredCodes : fallbackCodes;

  // Build a code->desc map from text to enrich display/plain-text when description missing
  const codeDescMap = buildCodeDescMapFromText(raw || summary);

  // Compose a plain text view for the ICD codes (Code: Description)
  const codesTextFromStructured =
    structuredCodes.length > 0
      ? structuredCodes
          .map((item) => {
            const desc =
              getDescription(item) ||
              codeDescMap[item.code] ||
              "(no description)";
            return `${item.code}: ${desc}`.trim();
          })
          .join("\n")
      : "";

  const codesTextFromDisplay = displayCodes
    .map((item) => {
      const code = (item.code || "").toUpperCase();
      const desc =
        getDescription(item) ||
        codeDescMap[code] ||
        item.description ||
        "(no description)";
      return `${code}: ${desc}`.trim();
    })
    .join("\n");

  const codesText = codesTextFromStructured || codesTextFromDisplay;

  const handleCopyCodes = async () => {
    try {
      let copyText = codesText || raw || summary;

      // If in table view, create a structured format for billing/coding
      if (viewMode === "table" && displayCodes.length > 0) {
        const tableText = displayCodes
          .map((item, index) => {
            const code = (item.code || "").toUpperCase();
            const desc =
              getDescription(item) ||
              codeDescMap[code] ||
              item.description ||
              "(no description)";
            const explanation = item.explanation || "";
            const statusRaw = item.status || "No Data";
            const statusLabel =
              statusRaw === "historical"
                ? "History"
                : typeof statusRaw === "string" && statusRaw.length
                ? statusRaw.charAt(0).toUpperCase() + statusRaw.slice(1)
                : "No Data";
            const confidence = item.confidence || "Medium";

            return `${
              index + 1
            }. ${desc}\n   Code: ${code}\n   Status: ${statusLabel}\n   Confidence: ${confidence}${
              explanation ? `\n   Note: ${explanation}` : ""
            }`;
          })
          .join("\n\n");

        copyText = `ICD-10 Codes Analysis\n${"=".repeat(50)}\n\n${tableText}`;
      }

      await navigator.clipboard.writeText(copyText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy codes: ", err);
    }
  };

  const handleDownloadCodes = () => {
    let content = "";

    if (displayCodes.length > 0) {
      // Create structured format for billing/coding workflow
      const header = "ICD-10 Codes Analysis Report\n" + "=".repeat(60) + "\n\n";
      const summaryInfo = `Total Codes: ${displayCodes.length}\nModel Used: ${
        analysis.model_used || "gpt-4o"
      }\nGenerated: ${new Date().toLocaleString()}\n\n`;

      const tableData = displayCodes
        .map((item, index) => {
          const code = (item.code || "").toUpperCase();
          const desc =
            getDescription(item) ||
            codeDescMap[code] ||
            item.description ||
            "(no description)";
          const explanation = item.explanation || "";
          const statusRaw = item.status || "No Data";
          const statusLabel =
            statusRaw === "historical"
              ? "History"
              : typeof statusRaw === "string" && statusRaw.length
              ? statusRaw.charAt(0).toUpperCase() + statusRaw.slice(1)
              : "No Data";
          const confidence = item.confidence || "No Data";

          return `${
            index + 1
          }. DIAGNOSIS: ${desc}\n   ICD-10 CODE: ${code}\n   STATUS: ${statusLabel}\n   CONFIDENCE: ${confidence}${
            explanation ? `\n   CLINICAL NOTE: ${explanation}` : ""
          }`;
        })
        .join("\n\n" + "-".repeat(50) + "\n\n");

      content = header + summaryInfo + tableData;
    } else {
      content = codesText || raw || summary || "No codes found";
    }

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `icd10_codes_${new Date().toISOString().split("T")[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="openai-results-container">
      <div className="openai-header">
        <h2>
          <Bot
            size={24}
            style={{ marginRight: "8px", verticalAlign: "middle" }}
          />
          OpenAI ICD-10 Analysis
        </h2>
        <div className="header-actions">
          <div className="view-toggle">
            <button
              onClick={() => setViewMode("cards")}
              className={`toggle-btn ${viewMode === "cards" ? "active" : ""}`}
              title="Card view"
            >
              <LayoutGrid size={14} />
              Cards
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`toggle-btn ${viewMode === "table" ? "active" : ""}`}
              title="Table view"
            >
              <Table size={14} />
              Table
            </button>
          </div>
          <button
            onClick={handleCopyCodes}
            className={`copy-btn ${copied ? "copied" : ""}`}
            title="Copy ICD-10 codes"
          >
            {copied ? (
              <>
                <Check size={16} />
                Copied!
              </>
            ) : (
              <>
                <Copy size={16} />
                Copy Codes
              </>
            )}
          </button>
          <button
            onClick={handleDownloadCodes}
            className="download-btn"
            title="Download ICD-10 codes"
          >
            <Download size={16} />
            Download
          </button>
          <button onClick={onClose} className="close-btn">
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="analysis-stats">
        <div className="stat-item">
          <span className="stat-label">Total ICD-10 Codes:</span>
          <span className="stat-value">{displayCodes.length}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Text Length:</span>
          <span className="stat-value">
            {analysis.text_length?.toLocaleString() || "Unknown"} chars
          </span>
        </div>
      </div>

      <div className="codes-section">
        <h3>
          <Stethoscope
            size={20}
            style={{ marginRight: "8px", verticalAlign: "middle" }}
          />
          ICD-10 Codes Found
        </h3>
        {displayCodes.length > 0 ? (
          viewMode === "table" ? (
            <div className="table-container">
              <table className="icd-table">
                <thead>
                  <tr>
                    <th>Diagnosis / Condition</th>
                    <th>ICD-10 Code</th>
                    <th>Status</th>
                    <th>Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {displayCodes.map((item, index) => {
                    const code = (item.code || "").toUpperCase();
                    const desc =
                      getDescription(item) ||
                      codeDescMap[code] ||
                      item.description ||
                      "(no description)";
                    const explanation = item.explanation || "";
                    const status = item.status || "No Data"; // Use status from API response
                    const statusLabel =
                      status === "historical"
                        ? "History"
                        : status && typeof status === "string"
                        ? status.charAt(0).toUpperCase() + status.slice(1)
                        : "No Data";
                    return (
                      <tr key={index} className="table-row">
                        <td className="diagnosis-cell">
                          <div className="diagnosis-text">{desc}</div>
                          {item.explanation && (
                            <div className="explanation-text">
                              <em>{item.explanation}</em>
                            </div>
                          )}
                        </td>
                        <td className="code-cell">
                          <span className="code-number">{code}</span>
                        </td>
                        <td className="status-cell">
                          <span
                            className={`status-badge status-${(
                              status || ""
                            ).toLowerCase()}`}
                          >
                            {statusLabel}
                          </span>
                        </td>
                        <td className="confidence-cell">
                          <span
                            className={`confidence-badge confidence-${
                              item.confidence || "medium"
                            }`}
                          >
                            {item.confidence || "Medium"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="codes-list">
              {displayCodes.map((item, index) => {
                const code = (item.code || "").toUpperCase();
                const desc =
                  getDescription(item) ||
                  codeDescMap[code] ||
                  item.description ||
                  "(no description)";
                return (
                  <div key={index} className="code-item">
                    <div className="code-header">
                      <span className="code-number">{code}</span>
                      {item.confidence && (
                        <span
                          className={`confidence-badge confidence-${item.confidence}`}
                        >
                          {item.confidence}
                        </span>
                      )}
                    </div>
                    <div className="code-description">{desc}</div>
                    {item.explanation && (
                      <div className="code-explanation">
                        <strong>Why this applies:</strong> {item.explanation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        ) : (
          <div className="no-codes">
            <p>
              No structured ICD-10 codes found. If the summary contains codes,
              use Copy/Download to export.
            </p>
          </div>
        )}
      </div>

      <style jsx>{`
        .openai-results-container {
          background: var(--white);
          border-radius: var(--radius-2xl);
          box-shadow: var(--shadow-2xl);
          overflow: hidden;
          margin-top: var(--space-6);
          border: 1px solid rgba(255, 255, 255, 0.2);
          position: relative;
          animation: fadeInUp 0.6s ease-out;
        }

        .openai-results-container::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: var(--success-gradient);
          border-radius: var(--radius-2xl) var(--radius-2xl) 0 0;
        }

        .openai-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--space-6);
          background: var(--success-gradient);
          color: var(--white);
          position: relative;
          overflow: hidden;
        }

        .openai-header::before {
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

        .openai-header:hover::before {
          left: 100%;
        }
        .header-actions {
          display: flex;
          gap: var(--space-3);
          align-items: center;
          flex-wrap: wrap;
        }

        .view-toggle {
          display: flex;
          gap: var(--space-1);
          background: rgba(255, 255, 255, 0.15);
          border-radius: var(--radius-lg);
          padding: var(--space-1);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .toggle-btn {
          padding: var(--space-2) var(--space-3);
          border: none;
          border-radius: var(--radius);
          cursor: pointer;
          font-size: 0.8rem;
          font-weight: 600;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          background: transparent;
          color: rgba(255, 255, 255, 0.8);
          position: relative;
          overflow: hidden;
        }

        .toggle-btn::before {
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
          transition: left 0.3s ease;
        }

        .toggle-btn:hover::before {
          left: 100%;
        }

        .toggle-btn.active {
          background: rgba(255, 255, 255, 0.25);
          color: var(--white);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .toggle-btn:hover {
          background: rgba(255, 255, 255, 0.2);
          color: var(--white);
          transform: translateY(-1px);
        }

        .copy-btn,
        .download-btn,
        .close-btn {
          padding: var(--space-3) var(--space-4);
          border: none;
          border-radius: var(--radius-lg);
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 600;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          background: rgba(255, 255, 255, 0.2);
          color: var(--white);
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
        .close-btn::before {
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
        .close-btn:hover::before {
          left: 100%;
        }
        .codes-section {
          padding: var(--space-6);
        }

        .codes-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
        }

        .code-item {
          background: var(--gray-50);
          border: 2px solid var(--gray-200);
          border-radius: var(--radius-xl);
          padding: var(--space-5);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }

        .code-item::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          width: 4px;
          height: 100%;
          background: var(--success-gradient);
          transform: scaleY(0);
          transition: transform 0.3s ease;
        }

        .code-item:hover::before {
          transform: scaleY(1);
        }

        .code-item:hover {
          background: var(--white);
          border-color: var(--gray-300);
          transform: translateY(-2px);
          box-shadow: var(--shadow-lg);
        }

        .code-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--space-3);
        }

        .code-number {
          font-family: var(--font-mono);
          font-weight: 800;
          color: var(--success);
          background: linear-gradient(
            135deg,
            rgba(16, 185, 129, 0.1) 0%,
            rgba(5, 150, 105, 0.1) 100%
          );
          padding: var(--space-2) var(--space-3);
          border-radius: var(--radius);
          border: 1px solid rgba(16, 185, 129, 0.2);
          font-size: 0.9rem;
        }
        .summary-section {
          padding: var(--space-6);
          border-top: 1px solid var(--gray-200);
          background: var(--gray-50);
        }

        .summary-content {
          background: var(--white);
          border: 2px solid var(--gray-200);
          border-radius: var(--radius-xl);
          padding: var(--space-5);
          font-family: var(--font-mono);
          font-size: 0.9rem;
          line-height: 1.6;
          color: var(--gray-700);
          box-shadow: var(--shadow-sm);
        }

        .table-container {
          overflow-x: auto;
          border-radius: var(--radius-xl);
          border: 2px solid var(--gray-200);
          box-shadow: var(--shadow-lg);
          background: var(--white);
        }

        .icd-table {
          width: 100%;
          border-collapse: collapse;
          background: var(--white);
        }

        .icd-table th {
          background: var(--gray-50);
          padding: var(--space-4) var(--space-5);
          text-align: left;
          font-weight: 700;
          color: var(--gray-800);
          border-bottom: 2px solid var(--gray-200);
          font-size: 0.9rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .icd-table td {
          padding: var(--space-4) var(--space-5);
          border-bottom: 1px solid var(--gray-200);
          vertical-align: top;
          transition: all 0.2s ease;
        }

        .table-row:hover {
          background: var(--gray-50);
          transform: scale(1.01);
        }
        .diagnosis-cell {
          max-width: 400px;
        }

        .diagnosis-text {
          font-weight: 600;
          color: var(--gray-800);
          margin-bottom: var(--space-1);
          line-height: 1.5;
        }

        .explanation-text {
          font-size: 0.8rem;
          color: var(--gray-500);
          font-style: italic;
          background: var(--gray-100);
          padding: var(--space-2);
          border-radius: var(--radius);
          border-left: 3px solid var(--gray-300);
        }

        .code-cell {
          text-align: center;
          min-width: 120px;
        }

        .status-cell {
          text-align: center;
          min-width: 100px;
        }

        .confidence-cell {
          text-align: center;
          min-width: 100px;
        }

        .status-badge {
          padding: var(--space-1) var(--space-3);
          border-radius: var(--radius-2xl);
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border: 1px solid transparent;
        }

        .status-active {
          background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
          color: #166534;
          border-color: #16a34a;
        }

        .status-review {
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          color: #92400e;
          border-color: #f59e0b;
        }

        .status-history {
          background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%);
          color: #3730a3;
          border-color: #6366f1;
        }

        .confidence-badge {
          padding: var(--space-1) var(--space-3);
          border-radius: var(--radius-2xl);
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: capitalize;
          border: 1px solid transparent;
        }

        .confidence-high {
          background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
          color: #166534;
          border-color: #16a34a;
        }

        .confidence-medium {
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          color: #92400e;
          border-color: #f59e0b;
        }

        .confidence-low {
          background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
          color: #991b1b;
          border-color: #ef4444;
        }

        @media (max-width: 768px) {
          .openai-header {
            flex-direction: column;
            gap: var(--space-4);
            text-align: center;
            padding: var(--space-5);
          }

          .header-actions {
            justify-content: center;
            flex-wrap: wrap;
          }

          .codes-section {
            padding: var(--space-4);
          }

          .table-container {
            font-size: 0.8rem;
          }

          .icd-table th,
          .icd-table td {
            padding: var(--space-2) var(--space-3);
          }
        }
      `}</style>
    </div>
  );
};

export default OpenAIResults;
