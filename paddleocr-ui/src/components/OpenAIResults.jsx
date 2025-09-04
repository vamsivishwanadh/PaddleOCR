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
    const slice = start !== -1 && end !== -1 ? candidate.slice(start, end + 1) : candidate;
    try {
      return JSON.parse(slice);
    } catch (e) {
      return null;
    }
  };

  // Try to pull structured codes from raw_response or summary if empty
  if ((!Array.isArray(icdCodes) || icdCodes.length === 0)) {
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
    const patternSep = /^\s*[-*•]?\s*([A-TV-Z][0-9][0-9A-Z](?:\.[0-9A-Z]{1,4})?)\s*[:\-–—]\s*(.+)\s*$/i;
    const patternSpace = /^\s*[-*•]?\s*([A-TV-Z][0-9][0-9A-Z](?:\.[0-9A-Z]{1,4})?)\s+(.+)\s*$/i;
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
    const linePattern = /^\s*[-*•]?\s*([A-TV-Z][0-9][0-9A-Z](?:\.[0-9A-Z]{1,4})?)\s*[:\-–—]\s*(.+)\s*$/i;
    // Also allow just whitespace between code and description
    const spacePattern = /^\s*[-*•]?\s*([A-TV-Z][0-9][0-9A-Z](?:\.[0-9A-Z]{1,4})?)\s+(.+)\s*$/i;

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
    const allMatches = (text.match(codeRegex) || []).map((c) => c.toUpperCase());
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
  const structuredCodes = Array.isArray(icdCodes) && icdCodes.length > 0
    ? icdCodes.map((c) => ({ code: (c.code || "").toUpperCase(), description: getDescription(c), confidence: c.confidence, explanation: c.explanation }))
    : [];

  // Fallback display list
  const fallbackCodes = structuredCodes.length === 0 ? extractCodesFromText(raw || summary) : [];
  const displayCodes = structuredCodes.length > 0 ? structuredCodes : fallbackCodes;

  // Build a code->desc map from text to enrich display/plain-text when description missing
  const codeDescMap = buildCodeDescMapFromText(raw || summary);

  // Compose a plain text view for the ICD codes (Code: Description)
  const codesTextFromStructured = structuredCodes.length > 0
    ? structuredCodes.map((item) => {
        const desc = getDescription(item) || codeDescMap[item.code] || "(no description)";
        return `${item.code}: ${desc}`.trim();
      }).join("\n")
    : "";

  const codesTextFromDisplay = displayCodes
    .map((item) => {
      const code = (item.code || "").toUpperCase();
      const desc = getDescription(item) || codeDescMap[code] || item.description || "(no description)";
      return `${code}: ${desc}`.trim();
    })
    .join("\n");

  const codesText = codesTextFromStructured || codesTextFromDisplay;

  const handleCopyCodes = async () => {
    try {
      await navigator.clipboard.writeText(codesText || (raw || summary));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy codes: ", err);
    }
  };

  const handleDownloadCodes = () => {
    const detailedList = (structuredCodes.length > 0 ? structuredCodes : displayCodes);
    const detailedText = (detailedList.length ? detailedList : [])
      .map((item) => {
        const code = (item.code || "").toUpperCase();
        const desc = getDescription(item) || codeDescMap[code] || item.description || "(no description)";
        const parts = [`${code}: ${desc}`];
        if (item.explanation) parts.push(`Explanation: ${item.explanation}`);
        if (item.confidence) parts.push(`Confidence: ${item.confidence}`);
        return parts.join("\n");
      })
      .join("\n---\n");

    const content = detailedText || (codesText || (raw || summary) || "No codes found");
    const blob = new Blob([content], { type: "text/plain" });
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
          <span className="stat-value">{displayCodes.length}</span>
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
        {displayCodes.length > 0 ? (
          <div className="codes-list">
            {displayCodes.map((item, index) => {
              const code = (item.code || "").toUpperCase();
              const desc = getDescription(item) || codeDescMap[code] || item.description || "(no description)";
              return (
                <div key={index} className="code-item">
                  <div className="code-header">
                    <span className="code-number">{code}</span>
                    {item.confidence && (
                      <span className={`confidence-badge confidence-${item.confidence}`}>
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
        ) : (
          <div className="no-codes">
            <p>No structured ICD-10 codes found. If the summary contains codes, use Copy/Download to export.</p>
          </div>
        )}
      </div>

      {(codesText || raw || summary) && (
        <div className="summary-section">
          <h3>📝 Plain Text Codes</h3>
          <pre className="summary-content" style={{ whiteSpace: "pre-wrap" }}>
            {codesText || raw || summary}
          </pre>
        </div>
      )}

      <style jsx>{`
        .openai-results-container { background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden; margin-top: 20px; }
        .openai-header { display: flex; justify-content: space-between; align-items: center; padding: 20px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; }
        .header-actions { display: flex; gap: 10px; align-items: center; }
        .copy-btn, .download-btn, .close-btn { padding: 8px 16px; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500; transition: all 0.2s ease; background: rgba(255, 255, 255, 0.2); color: white; }
        .codes-section { padding: 20px; }
        .codes-list { display: flex; flex-direction: column; gap: 15px; }
        .code-item { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; }
        .code-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .code-number { font-family: monospace; font-weight: 700; color: #10b981; background: rgba(16, 185, 129, 0.1); padding: 4px 8px; border-radius: 4px; }
        .summary-section { padding: 20px; border-top: 1px solid #e2e8f0; }
        .summary-content { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; }
      `}</style>
    </div>
  );
};

export default OpenAIResults;