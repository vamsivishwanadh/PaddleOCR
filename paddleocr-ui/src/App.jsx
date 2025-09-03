import React, { useState, useEffect } from "react";
import { Toaster, toast } from "react-hot-toast";
import FileUpload from "./components/FileUpload";
import FilePreview from "./components/FilePreview";
import ResultsDisplay from "./components/ResultsDisplay";
import TextOnlyDisplay from "./components/TextOnlyDisplay";
import { extractText, testConnection } from "./services/api";
import "./App.css";

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [showTextOnly, setShowTextOnly] = useState(false);

  // Test connection on app load
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const status = await testConnection();
        setConnectionStatus(status);
        if (status.success) {
          toast.success("Connected to PaddleOCR service");
        } else {
          toast.error(status.message);
        }
      } catch (error) {
        setConnectionStatus({
          success: false,
          message: "Connection test failed",
        });
        toast.error("Failed to connect to PaddleOCR service");
      }
    };

    checkConnection();
  }, []);

  const handleFileSelect = (file) => {
    setSelectedFile(file);
    setResults(null); // Clear previous results when new file is selected
    setShowTextOnly(false); // Reset text-only view when new file is selected
  };

  const handleExtractText = async () => {
    if (!selectedFile) {
      toast.error("Please select a file first");
      return;
    }

    setIsLoading(true);
    setResults(null);

    try {
      toast.loading("Processing document...", { id: "processing" });

      const response = await extractText(selectedFile);

      toast.success("Text extraction completed!", { id: "processing" });
      setResults(response);
    } catch (error) {
      console.error("Extraction error:", error);
      toast.error(error.message || "Failed to extract text", {
        id: "processing",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="App">
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: "#363636",
            color: "#fff",
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: "#4ade80",
              secondary: "#fff",
            },
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: "#ef4444",
              secondary: "#fff",
            },
          },
        }}
      />

      <div className="container">
        <header className="header">
          <h1>PaddleOCR Text Extraction</h1>
          <p>Upload documents to extract text with precise coordinates</p>

          {connectionStatus && (
            <div
              style={{
                marginTop: "20px",
                padding: "8px 16px",
                borderRadius: "20px",
                fontSize: "0.9rem",
                display: "inline-block",
                background: connectionStatus.success
                  ? "rgba(74, 222, 128, 0.2)"
                  : "rgba(239, 68, 68, 0.2)",
                color: connectionStatus.success ? "#4ade80" : "#ef4444",
                border: `1px solid ${
                  connectionStatus.success ? "#4ade80" : "#ef4444"
                }`,
              }}
            >
              {connectionStatus.success
                ? "✓ Service Connected"
                : "✗ Service Disconnected"}
            </div>
          )}
        </header>

        <div className="main-content">
          <div>
            <FileUpload
              onFileSelect={handleFileSelect}
              onExtractText={handleExtractText}
              isLoading={isLoading}
              selectedFile={selectedFile}
            />

            <FilePreview file={selectedFile} results={results} />

            {results && (
              <div style={{ marginTop: "20px", textAlign: "center" }}>
                <button
                  onClick={() => setShowTextOnly(!showTextOnly)}
                  style={{
                    padding: "10px 20px",
                    backgroundColor: showTextOnly ? "#3b82f6" : "#10b981",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "500",
                    transition: "all 0.2s ease",
                  }}
                  onMouseOver={(e) => {
                    e.target.style.transform = "translateY(-1px)";
                    e.target.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
                  }}
                  onMouseOut={(e) => {
                    e.target.style.transform = "translateY(0)";
                    e.target.style.boxShadow = "none";
                  }}
                >
                  {showTextOnly ? "Show Full Results" : "Extract Only Text"}
                </button>
              </div>
            )}
          </div>

          <div>
            {showTextOnly ? (
              <TextOnlyDisplay results={results} selectedFile={selectedFile} />
            ) : (
              <ResultsDisplay
                results={results}
                selectedFile={selectedFile}
                isLoading={isLoading}
              />
            )}
          </div>
        </div>

        {!connectionStatus?.success && (
          <div
            style={{
              marginTop: "40px",
              padding: "20px",
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: "12px",
              color: "#ef4444",
              textAlign: "center",
            }}
          >
            <h3 style={{ marginBottom: "10px" }}>Service Not Available</h3>
            <p style={{ marginBottom: "15px" }}>
              Please ensure PaddleOCR service is running on
              http://localhost:8868
            </p>
            <div style={{ fontSize: "0.9rem", opacity: 0.8 }}>
              <p>To start the service, run:</p>
              <code
                style={{
                  background: "rgba(0,0,0,0.1)",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  display: "inline-block",
                  marginTop: "5px",
                }}
              >
                hub serving start -m ocr_system -p 8868
              </code>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
