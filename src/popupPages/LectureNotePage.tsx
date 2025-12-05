import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { type RootState } from "../store";
import { clearLectureNotesData, setPdfViewData, loadLectureNotesData } from "../store/slices/navigationSlice";
import Heading from "../components/popup/Heading";
import DropdownMenu from "../components/popup/DropdownMenu";
import BackButton from "../components/popup/BackButton";
import Button from "../components/comman/button";
import Loader from "../components/popup/Loader";

export default function LectureNotePage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { lectureNotesData } = useSelector((state: RootState) => state.navigation);
  
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [apiTitle, setApiTitle] = useState<string>("Lecture Notes");
  const [responseHtml, setResponseHtml] = useState<string>("");
  
  console.log("0099", lectureNotesData);

  // Handle Export to PDF
  const handleExportToPDF = async () => {
    try {
      setIsGeneratingPDF(true);
      
      // Simulate PDF generation delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Extract plain text from HTML for PDF (remove HTML tags)
      const plainText = responseHtml.replace(/<[^>]*>/g, '').trim();
      
      // Prepare PDF data
      const pdfData = {
        title: apiTitle || "Lecture Notes",
        size: `${(plainText.length / 1024).toFixed(2)} KB`,
        content: plainText,
        summary: plainText.substring(0, 200) + (plainText.length > 200 ? "..." : ""),
        keyPoints: [],
        transcription: plainText,
        createdAt: new Date().toISOString(),
        tag: "Lecture Notes"
      };
      
      dispatch(setPdfViewData({
        pdfData: pdfData
      }));
      
      setTimeout(async () => {
        if(chrome?.storage?.local) {
          await chrome.storage.local.set({ navigationRoute: '/popup/lecture-notes' });
        }
        navigate('/popup/pdf-view');
      }, 100);
      
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Handle Delete
  const handleDelete = () => {
    dispatch(clearLectureNotesData());  
    navigate("/popup/summary");
  };

  // Handle Copy
  const handleCopyContent = async () => {
    try {
      // Extract plain text from HTML
      const textToCopy = responseHtml.replace(/<[^>]*>/g, '').trim();
      await navigator.clipboard.writeText(textToCopy);
      alert("Content copied to clipboard!");
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = responseHtml.replace(/<[^>]*>/g, '').trim();
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      alert("Content copied to clipboard!");
    }
  };

  // Handle back navigation
  const handleBack = () => {
    if (isNavigating) {
      return;
    }
    setIsNavigating(true);
    setTimeout(() => {
      navigate("/popup/summary");
    }, 100);
  };

  // Process API response data
  const processApiResponse = (apiResponse: any, actionTitle: string) => {
    setIsLoading(true);
    
    // Extract response_html from API response
    const htmlContent = apiResponse?.data?.response_html || "";
    
    setResponseHtml(htmlContent);
    setIsLoading(false);
  };

  // Load persisted data from storage on mount
  useEffect(() => {
    const loadPersistedData = async () => {
      try {
        // Check chrome storage first
        if (chrome?.storage?.local) {
          const result = await chrome.storage.local.get(['lectureNotesData']);
          if (result.lectureNotesData && !lectureNotesData) {
            console.log('Loading persisted lecture notes data from chrome storage');
            dispatch(loadLectureNotesData(result.lectureNotesData));
          }
        } else {
          // Fallback to localStorage
          const persistedData = localStorage.getItem('lectureNotesData');
          if (persistedData && !lectureNotesData) {
            const parsedData = JSON.parse(persistedData);
            console.log('Loading persisted lecture notes data from localStorage');
            dispatch(loadLectureNotesData(parsedData));
          }
        }
      } catch (error) {
        console.error('Error loading persisted lecture notes data:', error);
      }
    };

    loadPersistedData();
  }, []);

  // Simple useEffect that uses Redux data
  useEffect(() => {

    
    // Reset navigation state when data changes
    setIsNavigating(false);
    setApiTitle(lectureNotesData?.actionTitle || "summary");
    
    if (lectureNotesData?.apiResponse) {
      console.log("Processing lecture notes data from Redux");
      processApiResponse(lectureNotesData.apiResponse, lectureNotesData.actionTitle);
    } else {
      console.log("No lecture notes data found in Redux, showing empty state");
      setResponseHtml("");
      setIsLoading(false);
    }
  }, [lectureNotesData]);

  // Note: Removed automatic lecture notes data clearing on unmount to preserve data during navigation
  // Lecture notes data will be cleared when explicitly navigating away or when new data is generated


  if (isLoading) {
    return (
      <div className="bg-[#F4F8FF] flex flex-col justify-center items-center py-6 px-8">
        <div className="text-center mt-20 text-gray-500">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          Processing AI response...
        </div>
      </div>
    );
  }

  if (!responseHtml) {
    return (
      <div className="bg-[#F4F8FF] flex flex-col justify-center items-center py-6 px-8">
        <div className="w-full mb-[2rem]">
          <BackButton handleBack={handleBack} />
        </div>
        <div className="text-center mt-20 text-gray-500">
          No content available. Please generate some content first.
        </div>
      </div>
    );
  }

  console.log("responseHtml0099", responseHtml);
  return (
    <div className="bg-[#F4F8FF] flex h-full flex-col  items-center py-6 px-8">
      <div className="w-full mb-[2rem]">
        <BackButton handleBack={handleBack} />
      </div>

      <div className="w-full">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div>{""}</div>
          <Heading title={apiTitle} />
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1 rounded-full hover:bg-gray-100 cursor-pointer"
            >
              <img src="/popup/3Dot.svg" alt="3Dot" className="w-8 h-8" />
            </button>

            <DropdownMenu
              isOpen={menuOpen}
              onClose={() => setMenuOpen(false)}
              onExportPDF={handleExportToPDF}
              onDelete={handleDelete}
              onCopy={handleCopyContent}
              trianglePosition="right"
              width="w-44"
            />
          </div>
        </div>

        {/* PDF Generation Loader Overlay */}
        {isGeneratingPDF && (
          <Loader isLoading={isGeneratingPDF}/>
        )}

        {/* Content - Display HTML directly */}
        <div className="border border-[#BDD4FF] rounded-xl bg-white p-4">
          <div 
            className="lecture-notes-html-content"
            dangerouslySetInnerHTML={{ __html: responseHtml }}
          />
        </div>
        
        <style>{`
          .lecture-notes-html-content {
            font-size: 16px;
            line-height: 1.46;
            color: #4B5563;
          }
          
          .lecture-notes-html-content h1,
          .lecture-notes-html-content h2,
          .lecture-notes-html-content h3,
          .lecture-notes-html-content h4,
          .lecture-notes-html-content h5,
          .lecture-notes-html-content h6 {
            font-weight: 600 !important;
            color: #1F2937 !important;
            margin-top: 1.5rem;
            margin-bottom: 1rem;
            line-height: 1.3;
            display: block;
          }
          
          .lecture-notes-html-content h1 {
            font-size: 24px !important;
          }
          
          .lecture-notes-html-content h2 {
            font-size: 20px !important;
            font-weight: 600 !important;
          }
          
          .lecture-notes-html-content h3 {
            font-size: 18px !important;
          }
          
          .lecture-notes-html-content h4 {
            font-size: 16px !important;
            font-weight: 600 !important;
          }
          
          .lecture-notes-html-content p {
            margin-bottom: 1rem;
            line-height: 1.46;
            color: #4B5563;
            display: block;
          }
          
          .lecture-notes-html-content strong,
          .lecture-notes-html-content b {
            font-weight: 600 !important;
            color: #1F2937 !important;
          }
          
          .lecture-notes-html-content ul,
          .lecture-notes-html-content ol {
            margin-top: 0.75rem;
            margin-bottom: 1rem;
            padding-left: 1.5rem;
            list-style-position: outside;
            display: block;
          }
          
          .lecture-notes-html-content ul {
            list-style-type: disc;
          }
          
          .lecture-notes-html-content ol {
            list-style-type: decimal;
          }
          
          .lecture-notes-html-content li {
            margin-bottom: 0.5rem;
            line-height: 1.46;
            color: #4B5563;
            display: list-item;
          }
          
          .lecture-notes-html-content li strong,
          .lecture-notes-html-content li b {
            font-weight: 600 !important;
            color: #1F2937 !important;
          }
          
          .lecture-notes-html-content div {
            line-height: 1.46;
          }
          
          .lecture-notes-html-content * {
            box-sizing: border-box;
          }
        `}</style>

        {/* Share Button */}
        <div className="mt-4 px-8 w-full">
          <Button title="Share" onClick={handleCopyContent} />
        </div>
      </div>
    </div>
  );
}
