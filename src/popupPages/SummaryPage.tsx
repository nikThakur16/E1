import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { type RootState } from "../store";
import { useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";
import Heading from "../components/popup/Heading";
import DropdownMenu from "../components/popup/DropdownMenu";
import DownloadExtensionModal from "../components/popup/DownloadExtensionModal";
import { useGetSummaryWithActionsMutation } from "../store/api/authApi";
import { setSummaryFromApiResponse, setApiError, clearSummary } from "../store/slices/summarySlice";
import { setLectureNotesData, setPdfViewData } from "../store/slices/navigationSlice";
import { type KeyPoint } from "../store/slices/summarySlice";
import { useUpload } from "../context/UploadContext";
import Loader from "../components/popup/Loader";


export default function SummaryPage() {
  const { currentSummary, isLoading, error, apiError } = useSelector((state: RootState) => state.summary);
  const [getSummaryWithActions, { isLoading: isFetchingSummaryWithActions, error: summaryWithActionsError }] = useGetSummaryWithActionsMutation();

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [openSections, setOpenSections] = useState<string[]>(['aiactions']); 
  const [menuOpen, setMenuOpen] = useState(false);
  const [expandedActions, setExpandedActions] = useState(false);  
  const [showDownload, setShowDownload] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDisable, setIsDisable] = useState(false);
  const { clearUpload, isRehydrating, upload } = useUpload();


  // Helper function to determine if this is a URL response format
  const isUrlResponse = () => {
        return currentSummary?.extraction && currentSummary?.summarization;
  };

  // Helper function to get the correct summary data path
  const getSummaryData = () => {
    console.log("###########11111#################",currentSummary);
    if (isUrlResponse()) {
      console.log("###########22222#################",currentSummary);
      return {
        summary: currentSummary?.summary,
        summarization: currentSummary?.summarization,
        transcription: currentSummary?.summary?.transcription,
        aiActions: currentSummary?.aiActionList || [],
        };
      };
    
    return {
    
      summary: currentSummary?.summary?.summary,
      summarization: currentSummary?.summary?.summarization,
      transcription: currentSummary?.summary?.transcription,
      aiActions: currentSummary?.aiActionList || []
    };
  };

  // Helper function to safely extract key points
  const getKeyPoints = (): KeyPoint[] => {
    try {
      if (!currentSummary) return [];
      
      const { summary, summarization } = getSummaryData();
      
      // Try key_points from summary
      if (summary?.key_points && Array.isArray(summary.key_points)) {
        return summary.key_points.map((point: any) => {
          if (typeof point === 'string') {
            return { point };
          }
          if (point && typeof point === 'object' && 'point' in point) {
            return { point: String(point.point) };
          }
          return { point: String(point) };
        });
      }

      // Try keyPoints from summarization
      if (summarization?.keyPoints && Array.isArray(summarization.keyPoints)) {
        return summarization.keyPoints.map((point: any) => {
          if (typeof point === 'string') {
            return { point };
          }
          if (point && typeof point === 'object' && 'point' in point) {
            return { point: String(point.point) };
          }
          return { point: String(point) };
        });
      }

      return [];
    } catch (error) {
      console.error('Error extracting key points:', error);
      return [];
    }
  };

  // Helper function to safely extract text content
  const getTextContent = (content: any): string => {
    if (typeof content === 'string') return content;
    if (content?.text) return content.text;
    if (Array.isArray(content)) return content.join('\n');
    return String(content || '');
  };

  // Toggle section open/closed
  const toggleSection = (sectionName: string) => {
    setOpenSections(prev => 
      prev.includes(sectionName) 
        ? prev.filter(section => section !== sectionName)
        : [...prev, sectionName]
    );
  };

  // Check if section is open
  const isSectionOpen = (sectionName: string) => openSections.includes(sectionName);

  // Copy functionality
  const handleCopyToClipboard = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      console.log("Content copied to clipboard");
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = content;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
    }
  };

  // Export to PDF functionality with loader
  const handleExportToPDF = async () => {
    try {
      setLoading(true);
      
      // Simulate PDF generation delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const { summary, summarization, transcription } = getSummaryData();
      const keyPoints = getKeyPoints();
      
      // Prepare PDF data
      const pdfData = {
        title: summary?.title || "Untitled Summary",
        size: "4 MB", // You can calculate actual size if needed
        content: summary?.content || "",
        summary: summarization?.shortSummary || summary?.short_summary || "No summary available",
        keyPoints: keyPoints.map(kp => kp.point),
        transcription: getTextContent(transcription),
        createdAt: summary?.created_at || new Date().toISOString(),
        tag: summary?.tag || "Document"
      };
      
      // Store PDF data in Redux and navigate
      console.log("Storing PDF data in Redux:", pdfData);
      
      dispatch(setPdfViewData({
        pdfData: pdfData
      }));
      
      navigate('/popup/pdf-view');
      
    } catch (error) {
      console.error("Error generating PDF:", error);
      setLocalError("Failed to generate PDF. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Delete functionality: if text input, return to text page with prefilled content
  const handleDelete = () => {
   
    try {
      const stateText = (location.state as any)?.text as string | undefined;
      if (upload?.type === 'text' || (!!stateText && !upload)) {
        navigate('popup/text', { state: { text: upload?.text || stateText || '' } });
        return;
      }
      // Default: Go back to processing page, keep uploaded file (IDB)
      navigate('/popup/upload/process');
    } catch (e) {
      navigate('/popup/upload/process');
    }
  };

  // Handle home button click - clear data and navigate to home
  const handleHomeClick = async () => {
    // Clear all summary data
    dispatch(clearSummary());
    clearUpload();
    
    // Clear stored route
    if (chrome?.storage?.local) {
      try {
        await chrome.storage.local.remove('lastPopupRoute');
        console.log('Cleared stored route');
      } catch (error) {
        console.error('Error clearing stored route:', error);
      }
    }
    
    // Clear any local state
    setLocalError(null);
    setOpenSections([]);
    setMenuOpen(false);
    setExpandedActions(false);
    setShowDownload(false);
    
    // Navigate to home page
    navigate('/popup/home');
  };

  // Handle More button click - pass transcription data and summary ID
  const handleMoreActions = () => {
    try {
      const { summary, transcription } = getSummaryData();
      
      if (!transcription || !summary?.id) {
        setLocalError("Missing required data for AI actions");
        return;
      }
      
      console.log("Raw transcription data:", transcription);
      console.log("Summary ID:", summary.id);
      
      // Navigate to AI Actions page with state
      navigate('/popup/ai-actions', { 
        state: { 
          transcription: transcription,
          summaryId: summary.id 
        } 
      });
    } catch (error) {
      console.error("Error preparing AI actions:", error);
      setLocalError("Failed to prepare AI actions");
    }
  };

  // Handle action button click
  const handleActionClick = async (action: any) => {
    console.log("Action button clicked:", action);
    setLoading(true);
    try {
      const { summary, transcription } = getSummaryData();
      const transcriptionText = getTextContent(transcription);
      
      console.log("Summary data:", summary);
      console.log("Transcription text length:", transcriptionText?.length);
      
      if (!summary?.id || !transcriptionText) {
        console.error("Missing required data:", { summaryId: summary?.id, transcriptionLength: transcriptionText?.length });
        setLocalError("Missing required data for API call");
        return;
      }

      console.log("Calling API with:", {
        summary_id: summary.id,
        action_id: action.id,
        ai_content: transcriptionText
      });

      const response = await getSummaryWithActions({
        summary_id: summary.id,
        action_id: action.id,
        ai_content: transcriptionText
      }).unwrap();

      console.log("API Response:", response);

      // Store data in Redux and navigate
      console.log("Storing lecture notes data in Redux:", {
        apiResponse: response,
        actionTitle: action.title
      });
      
      dispatch(setLectureNotesData({
        apiResponse: response,
        actionTitle: action.title
      }));
      
      navigate('/popup/lecture-notes');

    } catch (error) {
      console.error("Error calling summary with actions API:", error);
      setLocalError("Failed to process AI action. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentSummary) {
      setTimeout(() => {
        setShowDownload(true);  
      }, 2000);
    }
  }, [currentSummary]);

  // Clear local error when component mounts or summary changes
  useEffect(() => {
    setLocalError(null);
  }, [currentSummary]);

  // Rehydrate summary from storage if page revisited without state
  useEffect(() => {
    (async () => {
      try {
        if (!currentSummary && chrome?.storage?.local) {
          const res = await chrome.storage.local.get('currentSummary');
          const stored = res?.currentSummary;
          if (stored) {
            console.log('Rehydrating summary from storage:', stored);
            dispatch(setSummaryFromApiResponse(stored));
          }
        }
      } catch (e) {
        console.log('rehydrate summary failed:', e);
      }
    })();
  }, []);

  // Additional useEffect to handle data restoration when component mounts
  useEffect(() => {
    console.log('SummaryPage mounted - currentSummary:', currentSummary);
    if (!currentSummary && chrome?.storage?.local) {
      console.log('No currentSummary found, attempting to restore from storage');
      chrome.storage.local.get('currentSummary').then(res => {
        const stored = res?.currentSummary;
        if (stored) {
          console.log('Found stored summary, restoring:', stored);
          dispatch(setSummaryFromApiResponse(stored));
        }
      }).catch(e => {
        console.log('Failed to restore from storage:', e);
      });
    }
  }, [currentSummary, dispatch]);

  // Display error if any
  const displayError = localError || apiError || error;

  if (isLoading || isRehydrating) {
    return <div className="text-center mt-20 text-gray-500">Loading...</div>;
  }

  if (displayError) {
    return (
      <div className="bg-[#F4F8FF] flex flex-col justify-center items-center py-6 px-8">
        <div className="w-full">
          <button onClick={handleHomeClick} className="hover:opacity-80 transition-opacity cursor-pointer">
            <img src="/popup/home.svg" alt="home" className="w-10 h-10" />
          </button>
        </div>
        
        <div className="w-full">
          <div className="flex justify-between items-center mb-4">
            <div>{""}</div>
            <Heading title="Summary" />
            <div>{""}</div>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <div className="text-red-600 text-lg font-semibold mb-2">
              Something went wrong
            </div>
            <div className="text-red-500 text-sm mb-4">
              {displayError}
            </div>
            <button
              onClick={() => {
                setLocalError(null);
                dispatch(setApiError(""));
                // You might want to retry fetching data here
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentSummary) {
    return (
      <div className="bg-[#F4F8FF] flex flex-col justify-center items-center py-6 px-8">
        <div className="w-full">
          <button onClick={handleHomeClick} className="hover:opacity-80 transition-opacity cursor-pointer">
            <img src="/popup/home.svg" alt="home" className="w-10 h-10" />
          </button>
        </div>
        
        <div className="w-full">
          <div className="flex justify-between items-center mb-4">
            <div>{""}</div>
            <Heading title="Summary" />
            <div>{""}</div>
          </div>

          <div className="text-center mt-20 text-gray-500">
            No summary data available
          </div>
        </div>
      </div>
    );
  }

  // Extract data from API response with safe fallbacks
  const { summary, summarization, transcription, aiActions } = getSummaryData();
  const isFetchingAIActions = false;
  const aiActionsError = false;



  if (!summary) {
    return (
      <div className="bg-[#F4F8FF] flex flex-col justify-center items-center py-6 px-8">
        <div className="w-full">
          <button onClick={handleHomeClick} className="hover:opacity-80 transition-opacity cursor-pointer">
            <img src="/popup/home.svg" alt="home" className="w-10 h-10" />
          </button>
        </div>
        
        <div className="w-full">
          <div className="flex justify-between items-center mb-4">
            <div>{""}</div>
            <Heading title="Summary" />
            <div>{""}</div>
          </div>

          <div className="text-center mt-20 text-gray-500">
            Invalid summary data format
          </div>
        </div>
      </div>
    );
  }

  const date = new Date(summary.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const tag = summary?.tag || "Document";
  const title = summary?.title || "Untitled";
  const overview = summarization?.shortSummary || summary?.short_summary || "No summary available";
  const keyPoints = getKeyPoints();
  const transcriptionText = getTextContent(transcription);
 
 
  return (
    <div className="bg-[#F4F8FF] flex flex-col h-[min-content]   items-center py-6 px-8">
      <div className="w-full">
        <button onClick={handleHomeClick} className="hover:opacity-80 transition-opacity cursor-pointer">
          <img src="/popup/home.svg" alt="home" className="w-10 h-10" />
        </button>
      </div>
      
      <div className="w-full">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div>{""}</div>
          <Heading title="Summary" />
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
              trianglePosition="right"
              width="w-44"
            />
          </div>
        </div>

        {/* PDF Generation Loader Overlay */}
        {loading && (
          <Loader isLoading={loading}/>
        )}

        {/* Date + Tag */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center text-[16px] text-[#4B5563] font-[400]">
            <img
              src="/popup/Calender.svg"
              alt="Calender"
              className="w-6 h-6 mr-2"
            />
            {date}
          </div>
          <span className="bg-[rgba(63,126,248,0.08)] text-[#3F7EF8] text-[16px] font-[500] px-2 py-1 rounded-[8px]">
            {tag}
          </span>
        </div>
        <h3 className="text-[18px] font-[600] text-[#1F2937] mb-2">{title}</h3>
        {/* Sections */}
        <div className="space-y-6">
          {/* Summary Section */}
          <div className="border border-[#BDD4FF] rounded-xl">
            <button
              onClick={() => toggleSection("summary")}
              className={`w-full flex items-center justify-between p-4 bg-[#E5EFFF] ${
                isSectionOpen("summary") ? "rounded-t-xl" : "rounded-xl"
              }`}
            >
              <div className="flex items-center gap-3 text-[16px] font-[600] text-[#1F2937]">
                <img
                  src="/popup/summary.svg"
                  alt="icon"
                  className="w-5 h-5"
                />
                <span>Summary</span>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const content = `${title}\n\n${overview}`;
                    handleCopyToClipboard(content);
                  }}
                  className="p-1 hover:bg-gray-200 rounded cursor-pointer"
                >
                  <img src="/popup/copy.svg" alt="copy" className="w-4 h-4" />
                </button>
                <img
                  src="/popup/arrow.svg"
                  alt="arrow"
                  className={`w-4 h-4 ${
                    isSectionOpen("summary") ? "rotate-180" : ""
                  }`}
                />
              </div>
            </button>
 

            {isSectionOpen("summary") && (
              <div className="p-4 bg-white rounded-b-xl">
                <div className="mb-4">
                 
                  <p className="text-[16px] font-[400] text-[#4B5563] leading-[1.46]">
                    {overview}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Key Points Section */}
          <div className="border border-[#BDD4FF] rounded-xl">
            <button
              onClick={() => toggleSection("keypoints")}
              className={`w-full flex items-center justify-between p-4 bg-[#E5EFFF] ${
                isSectionOpen("keypoints") ? "rounded-t-xl" : "rounded-xl"
              }`}
            >
              <div className="flex items-center gap-3 text-[16px] font-[600] text-[#1F2937]">
                <img
                  src="/popup/key.svg"
                  alt="icon"
                  className="w-5 h-5"
                />
                <span>Key Summary Points</span>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const content = keyPoints.map(kp => kp.point).join('\n');
                    handleCopyToClipboard(content);
                  }}
                  className="p-1 hover:bg-gray-200 rounded cursor-pointer"
                >
                  <img src="/popup/copy.svg" alt="copy" className="w-4 h-4" />
                </button>
                <img
                  src="/popup/arrow.svg"
                  alt="arrow"
                  className={`w-4 h-4 ${
                    isSectionOpen("keypoints") ? "rotate-180" : ""
                  }`}
                />
              </div>
            </button>

            {isSectionOpen("keypoints") && (
              <div className="p-4 bg-white rounded-b-xl">
                {keyPoints.length > 0 ? (
                  <ul className="space-y-2 text-[16px] font-[400] text-[#4B5563] leading-[1.46]">
                    {keyPoints.map((keyPoint, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-[#4B5563] mt-1 flex-shrink-0">•</span>
                        <span>{keyPoint.point}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[16px] font-[400] text-[#4B5563] leading-[1.46]">
                    No key points available
                  </p>
                )}
              </div>
            )}
          </div>

          {/* AI Actions Section */}
          <div className="border border-[#BDD4FF] rounded-xl">
            <button
              onClick={() => toggleSection("aiactions")}
              className={`w-full flex items-center justify-between p-4 bg-[#E5EFFF] ${
                isSectionOpen("aiactions") ? "rounded-t-xl" : "rounded-xl"
              }`}
            >
              <div className="flex items-center gap-3 text-[16px] font-[600] text-[#1F2937]">
                <img
                  src="/popup/AI.svg"
                  alt="icon"
                  className="w-5 h-5"
                />
                <span>AI Actions</span>
              </div>
              <div className="flex items-center gap-4">
                <img
                  src="/popup/arrow.svg"
                  alt="arrow"
                  className={`w-4 h-4 ${
                    isSectionOpen("aiactions") ? "rotate-180" : ""
                  }`}
                />
              </div>
            </button>

            {isSectionOpen("aiactions") && (
              <div className="p-4 bg-white rounded-b-xl">
                {isFetchingAIActions ? (
                  <div className="text-center text-gray-500">Loading AI Actions...</div>
                ) : aiActionsError ? (
                  <div className="text-center text-red-500">Error loading AI Actions</div>
                ) : (
                  <div className="flex flex-wrap gap-4">
                    {aiActions?.slice(0, 3)?.map((action, i: number) => (
                      <button
                        key={action.id || i}
                        onClick={() => handleActionClick(action)}
                        disabled={isFetchingSummaryWithActions || isDisable}
                        className="px-3 py-2 text-[14px] font-[600] leading-[24px] rounded-xl bg-[rgba(63,126,248,0.1)] border-[0.5px] border-[rgba(63,126,248,1)] text-[#3F7EF8] hover:bg-blue-100 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <img
                          src="/popup/AI.svg"
                          alt="icon"
                          className="w-6 h-6"
                        />
                        <span>{action?.title}</span>
                        {isFetchingSummaryWithActions && (
                          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin ml-1"></div>
                        )}
                      </button>
                    ))}

                    {/* More button */}
                    {aiActions?.length > 2 && !expandedActions && (
                      <button
                        onClick={handleMoreActions}
                        className="px-3 py-2 text-[14px] rounded-xl font-[600] text-[#3F7EF8] border-[0.5px] border-[#3F7EF8] bg-[rgba(63,126,248,0.1)] hover:bg-gray-100 cursor-pointer"
                      >
                        ... More
                      </button>
                    )}
                  </div>
                )}
                
                {/* Favorite (star) */}
                <div className="flex justify-end mt-4">
                  <img src="/popup/Aibtn.svg" alt="Aibtn" />
                </div>
              </div>
            )}
          </div>

          {/* Transcription Section */}
          <div className="border border-[#BDD4FF] rounded-xl">
            <button
              onClick={() => toggleSection("transcription")}
              className={`w-full flex items-center justify-between p-4 bg-[#E5EFFF] ${
                isSectionOpen("transcription") ? "rounded-t-xl" : "rounded-xl"
              }`}
            >
              <div className="flex items-center gap-3 text-[16px] font-[600] text-[#1F2937]">
                <img
                  src="/popup/key.svg"
                  alt="icon"
                  className="w-5 h-5"
                />
                <span>Transcription</span>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopyToClipboard(transcriptionText);
                  }}
                  className="p-1 hover:bg-gray-100 rounded cursor-pointer"
                >
                  <img src="/popup/copy.svg" alt="copy" className="w-4 h-4" />
                </button>
                <img
                  src="/popup/arrow.svg"
                  alt="arrow"
                  className={`w-4 h-4 ${
                    isSectionOpen("transcription") ? "rotate-180" : ""
                  }`}
                />
              </div>
            </button>

            {isSectionOpen("transcription") && (
              <div className="p-4 bg-white rounded-b-xl">
                <p className="text-[16px] font-[400] text-[#4B5563] leading-[1.46]">
                  {transcriptionText || "No transcription available"}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <DownloadExtensionModal 
        isOpen={showDownload} 
        onClose={() => setShowDownload(false)} 
      />
    </div>
  );
}
