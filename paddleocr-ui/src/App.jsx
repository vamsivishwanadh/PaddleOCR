import React, { useState, useEffect } from "react";
import { Toaster, toast } from "react-hot-toast";
import {
  Rocket,
  Check,
  X,
  BarChart3,
  FileText,
  AlertTriangle,
} from "lucide-react";
import FileUpload from "./components/FileUpload";
import FilePreview from "./components/FilePreview";
import ResultsDisplay from "./components/ResultsDisplay";
import TextOnlyDisplay from "./components/TextOnlyDisplay";
import OpenAIResults from "./components/OpenAIResults";
import { extractText, testConnection } from "./services/api";
import "./App.css";

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [showTextOnly, setShowTextOnly] = useState(false);
  const [openAIAnalysis, setOpenAIAnalysis] = useState(null);

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
    setOpenAIAnalysis(null); // Clear previous OpenAI analysis
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

  const handleOpenAIAnalysis = (analysis) => {
    setOpenAIAnalysis(analysis);
  };

  const handleCloseOpenAIResults = () => {
    setOpenAIAnalysis(null);
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
          <h1>
            <Rocket
              size={32}
              style={{ marginRight: "12px", verticalAlign: "middle" }}
            />
            PaddleOCR Text Extraction
          </h1>
          <p>
            Upload documents to extract text with precise coordinates and
            AI-powered analysis
          </p>

          {connectionStatus && (
            <div
              className={`connection-status ${
                connectionStatus.success ? "connected" : "disconnected"
              }`}
            >
              {connectionStatus.success ? (
                <>
                  <Check size={20} />
                  Service Connected
                </>
              ) : (
                <>
                  <X size={20} />
                  Service Disconnected
                </>
              )}
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
              <div
                style={{
                  marginTop: "var(--space-6)",
                  textAlign: "center",
                  animation: "fadeInUp 0.4s ease-out",
                }}
              >
                <button
                  onClick={() => setShowTextOnly(!showTextOnly)}
                  className={`btn ${
                    showTextOnly ? "btn-secondary" : "btn-success"
                  }`}
                  style={{
                    minWidth: "200px",
                    fontSize: "1rem",
                    fontWeight: "700",
                    padding: "var(--space-4) var(--space-6)",
                  }}
                >
                  {showTextOnly ? (
                    <>
                      <BarChart3 size={18} />
                      Show Full Results
                    </>
                  ) : (
                    <>
                      <FileText size={18} />
                      Extract Only Text
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          <div>
            {showTextOnly ? (
              <TextOnlyDisplay
                results={results}
                selectedFile={selectedFile}
                onOpenAIAnalysis={handleOpenAIAnalysis}
              />
            ) : (
              <ResultsDisplay
                results={results}
                selectedFile={selectedFile}
                isLoading={isLoading}
              />
            )}

            {openAIAnalysis && (
              <OpenAIResults
                analysis={openAIAnalysis}
                onClose={handleCloseOpenAIResults}
              />
            )}
          </div>
        </div>

        {!connectionStatus?.success && (
          <div className="service-warning">
            <h3>
              <AlertTriangle
                size={20}
                style={{ marginRight: "8px", verticalAlign: "middle" }}
              />
              Service Not Available
            </h3>
            <p>
              Please ensure PaddleOCR service is running on
              <br />
              <strong>http://localhost:8868</strong>
            </p>
            <div style={{ fontSize: "0.9rem", opacity: 0.9 }}>
              <p>To start the service, run:</p>
              <code>hub serving start -m ocr_system -p 8868</code>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
