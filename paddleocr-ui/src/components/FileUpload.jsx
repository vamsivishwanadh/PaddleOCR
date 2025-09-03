import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, File, Image, FileText, X } from "lucide-react";

const FileUpload = ({ onFileSelect, isLoading, selectedFile }) => {
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
      <h2 style={{ marginBottom: "20px", color: "#2d3748" }}>
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
            background: "#f7fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            padding: "20px",
            position: "relative",
          }}
        >
          <button
            onClick={handleRemoveFile}
            style={{
              position: "absolute",
              top: "10px",
              right: "10px",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#a0aec0",
              padding: "4px",
            }}
            disabled={isLoading}
          >
            <X size={20} />
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {getFileIcon(selectedFile)}
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontWeight: "600",
                  color: "#2d3748",
                  marginBottom: "4px",
                }}
              >
                {selectedFile.name}
              </div>
              <div style={{ fontSize: "0.85rem", color: "#718096" }}>
                {formatFileSize(selectedFile.size)} • {selectedFile.type}
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedFile && (
        <div style={{ marginTop: "20px", textAlign: "center" }}>
          <button
            className="btn"
            onClick={() => onFileSelect(selectedFile)}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="spinner"></div>
                Processing...
              </>
            ) : (
              <>
                <Upload size={16} />
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
