import axios from "axios";

const API_BASE_URL = "http://localhost:8868";

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 600000, // 60 seconds timeout for OCR processing
  headers: {
    "Content-Type": "application/json",
  },
});

// Convert file to base64
export const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      // Remove the data:image/jpeg;base64, prefix
      const base64 = reader.result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

// Send OCR request to PaddleOCR service
export const extractText = async (file) => {
  try {
    const base64 = await fileToBase64(file);

    const response = await api.post("/ocr", {
      file: base64,
    });

    return response.data;
  } catch (error) {
    console.error("OCR API Error:", error);

    if (error.response) {
      // Server responded with error status
      throw new Error(
        `Server error: ${error.response.status} - ${
          error.response.data?.error || "Unknown error"
        }`
      );
    } else if (error.request) {
      // Request was made but no response received
      throw new Error(
        "No response from server. Please check if PaddleOCR service is running on http://localhost:8868"
      );
    } else {
      // Something else happened
      throw new Error(`Request error: ${error.message}`);
    }
  }
};

// Test connection to PaddleOCR service
export const testConnection = async () => {
  try {
    // Try to make a simple request to test connectivity
    const response = await api.get("/health");
    return { success: true, message: "Service is running" };
  } catch (error) {
    if (
      error.code === "ECONNREFUSED" ||
      error.message.includes("Network Error")
    ) {
      return {
        success: false,
        message:
          "Cannot connect to PaddleOCR service. Please ensure it's running on http://localhost:8868",
      };
    }
    return {
      success: false,
      message: `Connection test failed: ${error.message}`,
    };
  }
};

// Analyze text with OpenAI for ICD-10 code extraction
export const analyzeWithOpenAI = async (text) => {
  try {
    const response = await api.post("/analyze-openai", {
      text: text,
    });
    return response.data;
  } catch (error) {
    console.error("OpenAI API Error:", error);

    if (error.response) {
      // Server responded with error status
      throw new Error(
        `Server error: ${error.response.status} - ${
          error.response.data?.error || "Unknown error"
        }`
      );
    } else if (error.request) {
      // Request was made but no response received
      throw new Error(
        "No response from server. Please check if the service is running."
      );
    } else {
      // Something else happened
      throw new Error(`Request error: ${error.message}`);
    }
  }
};

export default api;
