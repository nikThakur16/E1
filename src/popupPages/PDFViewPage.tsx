import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { type RootState } from "../store";
import {
  clearPdfViewData,
  loadPdfViewData,
} from "../store/slices/navigationSlice";
import jsPDF from "jspdf";
import { formatFileSize } from "../helper/formatSize";
import BackButton from "../components/popup/BackButton";
import { generatePDFFromHTML } from "../helper/generatePDF";

interface PDFViewPageProps {
  pdfData?: {
    title: string;
    size: string;
    content: string;
    summary: string;
    summary_html?: string;
    keyPoints?: string[];
    transcription?: string;
    createdAt?: string;
    tag: string;
  };
}

export default function PDFViewPage({
  pdfData: propPdfData,
}: PDFViewPageProps) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { pdfViewData } = useSelector((state: RootState) => state.navigation);

  const [pdfData, setPdfData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [calculatedSize, setCalculatedSize] =
    useState<string>("Calculating...");
  const [isCalculatingSize, setIsCalculatingSize] = useState(false);

  // Load persisted data from storage on mount
  useEffect(() => {
    const loadPersistedData = async () => {
      try {
        // Check chrome storage first
        if (chrome?.storage?.local) {
          const result = await chrome.storage.local.get(["pdfViewData"]);
          if (result.pdfViewData && !pdfViewData) {
            console.log("Loading persisted PDF data from chrome storage");
            dispatch(loadPdfViewData(result.pdfViewData));
          }
        } else {
          // Fallback to localStorage
          const persistedData = localStorage.getItem("pdfViewData");
          if (persistedData && !pdfViewData) {
            const parsedData = JSON.parse(persistedData);
            console.log("Loading persisted PDF data from localStorage");
            dispatch(loadPdfViewData(parsedData));
          }
        }
      } catch (error) {
        console.error("Error loading persisted PDF data:", error);
      }
    };

    loadPersistedData();
  }, []);

  useEffect(() => {
    console.log("=== PDFViewPage useEffect triggered ===");
    console.log("PDF view data from Redux:", pdfViewData);
    console.log("Prop PDF data:", propPdfData);
    console.log("=====================================");

    if (pdfViewData?.pdfData) {
      console.log("Using PDF data from Redux");
      setPdfData(pdfViewData.pdfData);
      setIsLoading(false);
    } else if (propPdfData) {
      console.log("Using prop PDF data");
      setPdfData(propPdfData);
      setIsLoading(false);
    } else {
      console.log("No PDF data found");
      setIsLoading(false);
    }
  }, [pdfViewData, propPdfData]);

  // Calculate PDF size when pdfData is available
  useEffect(() => {
    const calculatePDFSize = async () => {
      if (!pdfData) return;

      setIsCalculatingSize(true);
      try {
        const htmlContent = pdfData.summary_html || pdfData.content;
        const title = pdfData.title || "Untitled";
        const keyPoints = pdfData.keyPoints || [];

        // More accurate estimation based on content
        let estimatedBytes = 0;

        // Base PDF structure overhead (~5KB)
        estimatedBytes += 5000;

        // Title size (text encoding: ~1 byte per char)
        estimatedBytes += title.length;

        // HTML content size (compressed in PDF, estimate 0.3x of original)
        if (htmlContent && htmlContent.includes("<")) {
          // Remove HTML tags for text estimation
          const textContent = htmlContent.replace(/<[^>]*>/g, "");
          estimatedBytes += Math.ceil(textContent.length * 0.4);

          // Add overhead for HTML structure and formatting
          estimatedBytes += Math.ceil(htmlContent.length * 0.1);
        } else {
          // Plain text content
          const textContent = pdfData.summary || pdfData.content || "";
          estimatedBytes += Math.ceil(textContent.length * 0.5);
        }

        // Key points overhead
        if (keyPoints.length > 0) {
          const keyPointsText = keyPoints.join(" ");
          estimatedBytes += Math.ceil(keyPointsText.length * 0.4);
          estimatedBytes += keyPoints.length * 200; // Formatting overhead per point
        }

        // Add padding for images, fonts, and PDF structure
        estimatedBytes = Math.ceil(estimatedBytes * 1.2);

        // Minimum size
        estimatedBytes = Math.max(estimatedBytes, 10000);

        setCalculatedSize(formatFileSize(estimatedBytes));
      } catch (error) {
        console.error("Error calculating PDF size:", error);
        setCalculatedSize("Unknown");
      } finally {
        setIsCalculatingSize(false);
      }
    };

    if (pdfData) {
      // Add a small delay to avoid blocking the UI
      const timer = setTimeout(() => {
        calculatePDFSize();
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [pdfData]);

  // Note: Removed automatic PDF data clearing on unmount to preserve summary data
  // PDF data will be cleared when explicitly navigating away or when new PDF is generated

  const handleBack = () => {
    setTimeout(() => {
      if (chrome?.storage?.local) {
        chrome.storage.local.get("navigationRoute", async (result) => {
          await chrome.storage.local.remove("navigationRoute");
          navigate(result.navigationRoute);
        });
      }
    }, 100);
  };

  const handleDownload = async () => {
    if (!pdfData) {
      console.error("No PDF data available for download");
      return;
    }

    try {
      // Check if we have HTML content (summary_html)
      const htmlContent = pdfData.summary_html || pdfData.content;

      if (htmlContent && htmlContent.includes("<")) {
        // Use HTML to PDF generator for better formatting
        await generatePDFFromHTML({
          title: pdfData.title,
          htmlContent: htmlContent,
          logoUrl: "/web/logo.svg",
          companyName: "SummarizeX",
          fileName: `${pdfData.title
            .replace(/[^a-z0-9]/gi, "_")
            .toLowerCase()}.pdf`,
        });
      } else {
        // Fallback to plain text PDF generation
        const doc = new jsPDF();
        doc.setFontSize(20);
        doc.text(pdfData.title, 20, 20);
        doc.setFontSize(14);
        doc.text("Summary:", 20, 40);
        doc.setFontSize(12);
        const summaryLines = doc.splitTextToSize(
          pdfData.summary || pdfData.content,
          170
        );
        doc.text(summaryLines, 20, 50);
        doc.save(`${pdfData.title}.pdf`);
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
      // Fallback to basic PDF
      const doc = new jsPDF();
      doc.text(pdfData.title, 20, 20);
      doc.text(pdfData.summary || "No content available", 20, 40);
      doc.save(`${pdfData.title}.pdf`);
    }
  };

  const handleShare = async () => {
    if (!pdfData) {
      console.error("No PDF data available for sharing");
      return;
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: pdfData.title,
          text: pdfData.summary,
          url: window.location.href,
        });
      } catch (error) {
        console.error("Error sharing:", error);
        // Fallback to copying to clipboard
        handleCopyToClipboard();
      }
    } else {
      // Fallback to copying to clipboard
      handleCopyToClipboard();
    }
  };

  const handleCopyToClipboard = async () => {
    if (!pdfData) return;

    try {
      await navigator.clipboard.writeText(pdfData.summary);
      console.log("Content copied to clipboard");
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
    }
  };

  // Show loading state while waiting for data
  if (isLoading) {
    return (
      <div className="bg-gray-100 flex flex-col items-center justify-center py-6 px-8">
        <div className="w-full max-w-4xl">
          <button
            onClick={handleBack}
            className="flex items-center text-gray-600 hover:text-gray-800 mb-4"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-gray-600">Loading PDF data...</div>
        </div>
      </div>
    );
  }

  // If no PDF data is available, show error message
  if (!pdfData) {
    return (
      <div className="bg-gray-100  flex flex-col items-center justify-center py-6 px-8">
        <div className="w-full max-w-4xl">
          <button
            onClick={handleBack}
            className="flex items-center text-gray-600 hover:text-gray-800 mb-4"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="text-red-500 text-lg font-semibold mb-4">
            No PDF Data Available
          </div>
          <p className="text-gray-600 mb-6">
            The PDF data could not be loaded. Please try generating the PDF
            again.
          </p>
          <button
            onClick={handleBack}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Format date for display - handles both string dates and Date objects
  const formatDate = (dateInput?: string | Date) => {
    if (!dateInput) {
      return new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }

    try {
      // If it's already a formatted string (from SummaryPage), return it
      if (typeof dateInput === "string" && dateInput.includes(",")) {
        // Check if it's already formatted (contains comma from toLocaleDateString)
        const dateObj = new Date(dateInput);
        if (!isNaN(dateObj.getTime())) {
          return dateObj.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          });
        }
        // If it's a valid formatted string, return it
        return dateInput;
      }

      // Try to parse as Date
      const date =
        typeof dateInput === "string" ? new Date(dateInput) : dateInput;

      if (isNaN(date.getTime())) {
        // Invalid date, return current date
        return new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      }

      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }
  };

  // Get HTML content
  const htmlContent = pdfData.summary_html || pdfData.content || "";
  const title = pdfData.title || "Untitled Summary";
  const keyPoints = pdfData.keyPoints || [];
  const tag = pdfData.tag || "Document";
  const createdAt = formatDate(pdfData.createdAt);
  const fileSize = isCalculatingSize
    ? "Calculating..."
    : calculatedSize || "Unknown";

  return (
    <div className="bg-[#F4F8FF] min-h-screen flex flex-col items-center py-6 px-4 overflow-auto">
      {/* Back Button */}
      <div className="w-full max-w-4xl mb-4">
        <BackButton handleBack={handleBack} />
      </div>

      {/* PDF Preview Container - A4-like proportions */}
      <div className="w-full max-w-4xl px-4 mb-6">
        {/* PDF Document Preview */}
        <div>
          {/* PDF Content */}
          <div>
            {/* Header with Logo and Date */}
            <div className="flex  justify-between items-center  gap-4 mb-8 pb-6 border-b-2 border-gray-300">
              <div className="flex items-center gap-4">
                <div className="">
                  <img
                    src="/popup/logo-blue.svg"
                    alt="Logo"
                    className="h-8 w-auto"
               
                  />
                </div>
                {/* <div>
                  <h1 className="text-2xl font-bold text-[#1F2937] m-0 leading-tight">
                    SummarizeX
                  </h1>
                  <p className="text-xs text-gray-500 mt-0.5">
                    AI-Powered Summarization
                  </p>
                </div> */}
              </div>
              <div >
                <div className="font-semibold mb-1 text-gray-700">
                  Generated on:
                </div>
                <div className="text-gray-600">{createdAt}</div>
              </div>
            </div>

            {/* Title */}
            <h2 className="text-xl w-full font-bold text-[#1F2937] text-center mb-6 pb-4 border-b-4 border-[#3F7EF8] ">
              {title}
            </h2>

            {/* Document Metadata */}
            <div className="flex flex-wrap items-center gap-3 mb-8">
              <span className="bg-gradient-to-r from-blue-50 to-blue-100 text-[#3F7EF8] px-4 py-2 rounded-lg font-semibold text-sm shadow-sm border border-blue-200">
                {tag}
              </span>
              <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
                <svg
                  className="w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
                  />
                </svg>
                <span className="font-medium">Size:</span>
                <span className="font-semibold text-gray-700">
                  {isCalculatingSize ? (
                    <span className="inline-flex items-center gap-1">
                      <span className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></span>
                      Calculating...
                    </span>
                  ) : (
                    fileSize
                  )}
                </span>
              </div>
            </div>

            {/* HTML Content */}
            {htmlContent && (
              <div
                className="pdf-preview-content mb-8"
                dangerouslySetInnerHTML={{ __html: htmlContent }}
              />
            )}

            {/* Key Points Section */}
            {keyPoints && keyPoints.length > 0 && (
              <div className="mt-8 pt-6 border-t-2 border-gray-200 bg-blue-50/30 rounded-lg p-6 -mx-2">
                <h3 className="text-xl font-semibold text-[#1F2937] mb-4 flex items-center gap-2">
                  <svg
                    className="w-5 h-5 text-[#3F7EF8]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Key Points
                </h3>
                <ul className="space-y-3 text-[#4B5563]">
                  {keyPoints.map((point: string, index: number) => (
                    <li
                      key={index}
                      className="flex items-start gap-3 bg-white p-3 rounded-lg shadow-sm border border-gray-100"
                    >
                      <span className="text-[#3F7EF8] mt-0.5 flex-shrink-0 font-bold text-lg">
                        •
                      </span>
                      <span className="flex-1 leading-relaxed">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="w-full max-w-4xl">
        <div>
          <div className="flex gap-4">
            <button
              onClick={handleDownload}
              className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3.5 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Download PDF ({fileSize})
            </button>
            <button
              onClick={handleShare}
              className="flex-1 bg-gray-100 text-gray-800 px-6 py-3.5 rounded-lg font-semibold hover:bg-gray-200 transition-all duration-200 flex items-center justify-center gap-2 border border-gray-300 hover:border-gray-400"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                />
              </svg>
              Share
            </button>
          </div>
        </div>
      </div>

      {/* PDF Preview Styling */}
      <style>{`
        .pdf-preview-content {
          font-size: 15px;
          line-height: 1.75;
          color: #374151;
          font-family: 'Georgia', 'Times New Roman', serif;
        }
        
        .pdf-preview-content h1,
        .pdf-preview-content h2,
        .pdf-preview-content h3,
        .pdf-preview-content h4,
        .pdf-preview-content h5,
        .pdf-preview-content h6 {
          font-weight: 700;
          color: #111827;
          margin-top: 24px;
          margin-bottom: 16px;
          line-height: 1.3;
          letter-spacing: -0.02em;
        }
        
        .pdf-preview-content h1 {
          font-size: 28px;
          border-bottom: 3px solid #3F7EF8;
          padding-bottom: 12px;
        }
        
        .pdf-preview-content h2 {
          font-size: 24px;
          border-bottom: 2px solid #E5E7EB;
          padding-bottom: 8px;
        }
        
        .pdf-preview-content h3 {
          font-size: 20px;
        }
        
        .pdf-preview-content h4 {
          font-size: 18px;
          font-weight: 600;
        }
        
        .pdf-preview-content h5 {
          font-size: 16px;
        }
        
        .pdf-preview-content h6 {
          font-size: 15px;
        }
        
        .pdf-preview-content p {
          margin-bottom: 16px;
          line-height: 1.8;
          color: #374151;
          text-align: justify;
        }
        
        .pdf-preview-content p:first-of-type {
          margin-top: 0;
        }
        
        .pdf-preview-content strong,
        .pdf-preview-content b {
          font-weight: 700;
          color: #111827;
        }
        
        .pdf-preview-content em,
        .pdf-preview-content i {
          font-style: italic;
          color: #4B5563;
        }
        
        .pdf-preview-content ul,
        .pdf-preview-content ol {
          margin-top: 16px;
          margin-bottom: 20px;
          padding-left: 32px;
        }
        
        .pdf-preview-content ul {
          list-style-type: disc;
        }
        
        .pdf-preview-content ol {
          list-style-type: decimal;
        }
        
        .pdf-preview-content li {
          margin-bottom: 10px;
          line-height: 1.75;
          color: #374151;
        }
        
        .pdf-preview-content li strong,
        .pdf-preview-content li b {
          font-weight: 700;
          color: #111827;
        }
        
        .pdf-preview-content img {
          max-width: 100%;
          height: auto;
          margin: 20px 0;
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .pdf-preview-content blockquote {
          border-left: 4px solid #3F7EF8;
          padding-left: 20px;
          margin: 20px 0;
          color: #4B5563;
          font-style: italic;
          background-color: #F9FAFB;
          padding: 16px 20px;
          border-radius: 0 8px 8px 0;
        }
        
        .pdf-preview-content code {
          background-color: #F3F4F6;
          padding: 3px 8px;
          border-radius: 4px;
          font-family: 'Courier New', 'Monaco', monospace;
          font-size: 0.9em;
          color: #DC2626;
          border: 1px solid #E5E7EB;
        }
        
        .pdf-preview-content pre {
          background-color: #1F2937;
          color: #F9FAFB;
          padding: 16px;
          border-radius: 8px;
          overflow-x: auto;
          margin: 20px 0;
          border: 1px solid #374151;
        }
        
        .pdf-preview-content pre code {
          background-color: transparent;
          padding: 0;
          border: none;
          color: inherit;
        }
        
        .pdf-preview-content table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          border-radius: 8px;
          overflow: hidden;
        }
        
        .pdf-preview-content table th,
        .pdf-preview-content table td {
          border: 1px solid #E5E7EB;
          padding: 12px 16px;
          text-align: left;
        }
        
        .pdf-preview-content table th {
          background-color: #3F7EF8;
          color: #FFFFFF;
          font-weight: 600;
        }
        
        .pdf-preview-content table tr:nth-child(even) {
          background-color: #F9FAFB;
        }
        
        .pdf-preview-content table tr:hover {
          background-color: #F3F4F6;
        }
        
        .pdf-preview-content a {
          color: #3F7EF8;
          text-decoration: underline;
        }
        
        .pdf-preview-content a:hover {
          color: #2563EB;
        }
        
        .pdf-preview-content hr {
          border: none;
          border-top: 2px solid #E5E7EB;
          margin: 24px 0;
        }
      `}</style>
    </div>
  );
}
