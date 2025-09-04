import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, File, Image, FileText, X, FileUp } from "lucide-react";

const FileUpload = ({
  onFileSelect,
  onExtractText,
  isLoading,
  selectedFile,
}) => {
  const [dragActive, setDragActive] = useState(false);

  const onDrop = useCallback(
    (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".gif", ".bmp", ".tiff", ".webp"],
      "application/pdf": [".pdf"],
    },
    multiple: false,
    disabled: isLoading,
  });

  const handleRemoveFile = () => {
    onFileSelect(null);
  };

  const getFileIcon = (file) => {
    if (!file) return <Upload className="upload-icon" />;

    if (file.type.startsWith("image/")) {
      return <Image className="upload-icon" />;
    } else if (file.type === "application/pdf") {
      return <FileText className="upload-icon" />;
    } else {
      return <File className="upload-icon" />;
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="card">
      <h2
        style={{
          marginBottom: "var(--space-6)",
          color: "var(--gray-800)",
          fontSize: "1.5rem",
          fontWeight: "700",
          display: "flex",
          alignItems: "center",
          gap: "var(--space-3)",
        }}
      >
        <FileUp size={20} style={{ marginRight: "8px" }} />
        Upload Document
      </h2>

      {!selectedFile ? (
        <div
          {...getRootProps()}
          className={`upload-area ${isDragActive ? "dragover" : ""}`}
        >
          <input {...getInputProps()} />
          {getFileIcon()}
          <div className="upload-text">
            {isDragActive ? "Drop the file here..." : "Drag & drop a file here"}
          </div>
          <div className="upload-subtext">or click to select a file</div>
          <div
            className="upload-subtext"
            style={{ marginTop: "10px", fontSize: "0.8rem" }}
          >
            Supports: PNG, JPG, JPEG, GIF, BMP, TIFF, WebP, PDF
          </div>
        </div>
      ) : (
        <div
          style={{
            background: "var(--gray-50)",
            border: "2px solid var(--gray-200)",
            borderRadius: "var(--radius-xl)",
            padding: "var(--space-6)",
            position: "relative",
            transition: "all 0.3s ease",
            boxShadow: "var(--shadow-md)",
          }}
        >
          <button
            onClick={handleRemoveFile}
            style={{
              position: "absolute",
              top: "var(--space-3)",
              right: "var(--space-3)",
              background: "var(--white)",
              border: "1px solid var(--gray-300)",
              borderRadius: "var(--radius)",
              cursor: "pointer",
              color: "var(--gray-500)",
              padding: "var(--space-2)",
              transition: "all 0.2s ease",
              boxShadow: "var(--shadow-sm)",
            }}
            disabled={isLoading}
            onMouseOver={(e) => {
              e.target.style.background = "var(--error)";
              e.target.style.color = "var(--white)";
              e.target.style.transform = "scale(1.1)";
            }}
            onMouseOut={(e) => {
              e.target.style.background = "var(--white)";
              e.target.style.color = "var(--gray-500)";
              e.target.style.transform = "scale(1)";
            }}
          >
            <X size={20} />
          </button>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-4)",
              paddingRight: "var(--space-12)",
            }}
          >
            <div
              style={{
                background: "var(--white)",
                borderRadius: "var(--radius-lg)",
                padding: "var(--space-4)",
                boxShadow: "var(--shadow-sm)",
                border: "1px solid var(--gray-200)",
              }}
            >
              {getFileIcon(selectedFile)}
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontWeight: "700",
                  color: "var(--gray-800)",
                  marginBottom: "var(--space-1)",
                  fontSize: "1.1rem",
                }}
              >
                {selectedFile.name}
              </div>
              <div
                style={{
                  fontSize: "0.9rem",
                  color: "var(--gray-500)",
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-2)",
                }}
              >
                <span
                  style={{
                    background: "var(--gray-200)",
                    padding: "2px 8px",
                    borderRadius: "var(--radius)",
                    fontSize: "0.8rem",
                    fontWeight: "600",
                  }}
                >
                  {formatFileSize(selectedFile.size)}
                </span>
                <span>•</span>
                <span
                  style={{
                    background: "var(--primary-gradient)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                    fontWeight: "600",
                  }}
                >
                  {selectedFile.type}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedFile && (
        <div
          style={{
            marginTop: "var(--space-6)",
            textAlign: "center",
            animation: "fadeInUp 0.4s ease-out",
          }}
        >
          <button
            className={`btn ${isLoading ? "btn-loading" : ""}`}
            onClick={onExtractText}
            disabled={isLoading}
            style={{
              minWidth: "200px",
              fontSize: "1.1rem",
              fontWeight: "700",
              padding: "var(--space-4) var(--space-8)",
            }}
          >
            {isLoading ? (
              <>
                <div className="spinner"></div>
                Processing...
              </>
            ) : (
              <>
                <Upload size={20} />
                Extract Text
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
