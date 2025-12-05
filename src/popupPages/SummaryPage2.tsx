import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { type RootState } from "../store";
import { useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";
import {
  setSummaryFromApiResponse,
  setSummary,
  setApiError,
  clearSummary,
  type KeyPoint,
} from "../store/slices/summarySlice";
import {
  setLectureNotesData,
  setPdfViewData,
} from "../store/slices/navigationSlice";
import { useUpload } from "../context/UploadContext";
import { useGetSummaryWithActionsMutation, useGetAIActionsCategoriesQuery, useGetAIActionsQuery } from "../store/api/authApi";
import Heading from "../components/popup/Heading";
import DropdownMenu from "../components/popup/DropdownMenu";
import TitleEditModal from "../components/popup/TitleEditModal";
import CancelModal from "../components/popup/CancelModal";
import { useUpdateSummaryMutation, useDeleteSummaryMutation } from "../store/api/authApi";

export default function SummaryPage2() {
  const { currentSummary, isLoading, error, apiError } = useSelector(
    (state: RootState) => state.summary
  );
  const [
    getSummaryWithActions,
    { isLoading: isFetchingSummaryWithActions, error: summaryWithActionsError },
  ] = useGetSummaryWithActionsMutation();

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<string>("summary"); // 'summary', 'ai-action', 'transcription'
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);
  const [activeCategoryName, setActiveCategoryName] = useState<string>("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isDisable, setIsDisable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isTitleModalOpen, setIsTitleModalOpen] = useState(false);
  const [titleUpdateError, setTitleUpdateError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { clearUpload, isRehydrating, upload } = useUpload();
  
  // Update summary mutation
  const [updateSummary, { isLoading: isUpdatingTitle }] = useUpdateSummaryMutation();
  // Delete summary mutation
  const [deleteSummary, { isLoading: isDeletingSummary }] = useDeleteSummaryMutation();

  // Fetch AI Actions Categories
  const { data: aiActionsCategoriesData, isLoading: isFetchingCategories } = useGetAIActionsCategoriesQuery();
  const categories = aiActionsCategoriesData?.data || [];

  // Fetch AI Actions for the active category
  const { data: aiActionsData, isLoading: isFetchingAIActions } = useGetAIActionsQuery(activeCategoryId!, {
    skip: !activeCategoryId
  });

  // Initialize favorites from localStorage
  useEffect(() => {
    const savedFavorites = localStorage.getItem('aiActionsFavorites');
    if (savedFavorites) {
      setFavorites(JSON.parse(savedFavorites));
    }
  }, []);

  // Initialize active category when categories are loaded
  useEffect(() => {
    if (categories.length > 0 && !activeCategoryId && activeTab === "ai-action") {
      const firstCategory = categories[0];
      setActiveCategoryId(firstCategory.id);
      setActiveCategoryName(firstCategory.name);
    }
  }, [categories, activeTab]);

  // Get actions from API or fallback to currentSummary
  const getAIActionsForDisplay = () => {
    if (activeCategoryId && aiActionsData?.data) {
      return aiActionsData.data;
    }
    // Fallback to actions from summary
    const { aiActions } = getSummaryData();
    return aiActions || [];
  };

  // Helper function to determine if this is a URL response format
  const isUrlResponse = () => {
    return currentSummary?.extraction && currentSummary?.summarization;
  };

  // Helper function to get the correct summary data path
  const getSummaryData = () => {
    if (isUrlResponse()) {
      return {
        summary: currentSummary?.summary,
        summarization: currentSummary?.summarization,
        transcription: currentSummary?.summary?.transcription?.content,
        aiActions: currentSummary?.aiActionList || [],
      };
    }

    return {
      summary: currentSummary?.summary,
      summarization: currentSummary?.summary?.summarization,
      transcription: currentSummary?.summary?.transcription,
      aiActions: currentSummary?.aiActionList || [],
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
          if (typeof point === "string") {
            return { point };
          }
          if (point && typeof point === "object" && "point" in point) {
            return { point: String(point.point) };
          }
          return { point: String(point) };
        });
      }

      // Try keyPoints from summarization
      if (summarization?.keyPoints && Array.isArray(summarization.keyPoints)) {
        return summarization.keyPoints.map((point: any) => {
          if (typeof point === "string") {
            return { point };
          }
          if (point && typeof point === "object" && "point" in point) {
            return { point: String(point.point) };
          }
          return { point: String(point) };
        });
      }

      return [];
    } catch (error) {
      console.error("Error extracting key points:", error);
      return [];
    }
  };

  // Helper function to safely extract text content
  const getTextContent = (content: any): string => {
    if (typeof content === "string") return content;
    if (content?.text) return content.text;
    if (Array.isArray(content)) return content.join("\n");
    return String(content || "");
  };

  // Handle home button click
  const handleHomeClick = async () => {
    dispatch(clearSummary());
    clearUpload();

    if (chrome?.storage?.local) {
      try {
        await chrome.storage.local.remove("lastPopupRoute");
      } catch (error) {
        console.error("Error clearing stored route:", error);
      }
    }

    navigate("/popup/home");
  };

  // Handle action button click
  const handleActionClick = async (action: any) => {
    setLoading(true);
    try {
      const { summary, transcription } = getSummaryData();
      const transcriptionText = getTextContent(transcription);

      if (!summary?.id || !transcriptionText) {
        setLocalError("Missing required data for API call");
        return;
      }

      const response = await getSummaryWithActions({
        summary_id: summary.id,
        action_id: action.id,
        ai_content: transcriptionText,
      }).unwrap();

      dispatch(
        setLectureNotesData({
          apiResponse: response,
          actionTitle: action.title,
        })
      );

      navigate("/popup/lecture-notes");
    } catch (error) {
      console.error("Error calling summary with actions API:", error);
      setLocalError("Failed to process AI action. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle More Actions
  const handleMoreActions = () => {
    try {
      const { summary, transcription } = getSummaryData();

      if (!transcription || !summary?.id) {
        setLocalError("Missing required data for AI actions");
        return;
      }

      navigate("/popup/ai-actions", {
        state: {
          transcription: transcription,
          summaryId: summary.id,
        },
      });
    } catch (error) {
      console.error("Error preparing AI actions:", error);
      setLocalError("Failed to prepare AI actions");
    }
  };

  // Toggle favorite for an action
  const toggleFavorite = (actionId: number, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent card click when clicking favorite
    const actionIdStr = actionId.toString();
    const newFavorites = favorites.includes(actionIdStr)
      ? favorites.filter(id => id !== actionIdStr)
      : [...favorites, actionIdStr];
    
    setFavorites(newFavorites);
    localStorage.setItem('aiActionsFavorites', JSON.stringify(newFavorites));
    console.log('Updated favorites list:', newFavorites);
  };

  // Handle edit title click
  const handleEditTitleClick = () => {
    setTitleUpdateError(null);
    setIsTitleModalOpen(true);
  };

  // Handle title save from modal
  const handleTitleSave = async (newTitle: string) => {
    const { summary } = getSummaryData();
    if (!summary?.id || !newTitle.trim()) {
      setIsTitleModalOpen(false);
      return;
    }

    setTitleUpdateError(null);
    try {
      const response = await updateSummary({
        id: summary.id,
        title: newTitle.trim(),
      }).unwrap();

      console.log('Title update response:', response);

      // Only update title if API response status is 1 (success)
      if (response?.status === 1 && response?.data) {
        // Handle both array and object response formats
        let updatedSummary = Array.isArray(response.data) 
          ? response.data[0] 
          : response.data;
        
        // If the response data is a single summary object (not wrapped in summary property),
        // we need to update the current summary structure while preserving the nested format
        if (updatedSummary && currentSummary) {
          // Create updated summary that matches the current structure
          const updatedCurrentSummary = {
            ...currentSummary,
            summary: {
              ...currentSummary.summary,
              ...updatedSummary, // Spread the updated fields (including title)
            },
          };
          
          // Update Redux state with the updated summary
          dispatch(setSummaryFromApiResponse(updatedCurrentSummary));
          
          // Update chrome storage for persistence
          if (chrome?.storage?.local) {
            await chrome.storage.local.set({
              currentSummary: updatedCurrentSummary,
            });
            console.log('Updated summary in chrome storage with new title');
          }

          setIsTitleModalOpen(false);
          console.log('Title updated successfully');
        } else {
          throw new Error('Invalid response format');
        }
      } else {
        // Status is not 1 - do NOT update title, show error instead
        throw new Error(response?.message || 'Failed to update title');
      }
    } catch (error: any) {
      console.error('Error updating title:', error);
      setTitleUpdateError(error?.data?.message || error?.message || 'Failed to update title. Please try again.');
      // Keep modal open on error so user can retry
    }
  };

  // Export to PDF functionality - navigate to PDF preview page
  const handleExportToPDF = async () => {
    try {
      const { summary, transcription } = getSummaryData();
      if (!summary) {
        setLocalError("No summary data available");
        return;
      }

      const title = summary?.title || "Untitled Summary";
      const htmlContent = summary?.summary_html || "No summary available";
      const transcriptionText = getTextContent(transcription);
      const keyPoints = getKeyPoints();
      const tag = summary?.content_type || "Document";
      const date = summary?.created_at
        ? new Date(summary.created_at).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : new Date().toLocaleDateString();

      // Prepare PDF data
      const pdfData = {
        title: title,
        summary_html: htmlContent,
        content: htmlContent, // Fallback for PDFViewPage
        summary: htmlContent, // Text summary for display
        keyPoints: keyPoints.map((kp) => kp.point),
        transcription: transcriptionText,
        tag: tag,
        createdAt: date,
        size: "N/A", // Size will be calculated when PDF is generated
      };

      // Store current route for back navigation
      if (chrome?.storage?.local) {
        await chrome.storage.local.set({
          navigationRoute: location.pathname,
        });
      }

      // Store PDF data in Redux and navigate to PDF preview page
      dispatch(setPdfViewData({ pdfData }));
      navigate("/popup/pdf-view");
    } catch (error) {
      console.error("Error preparing PDF data:", error);
      setLocalError("Failed to prepare PDF. Please try again.");
    }
  };

  // Show delete confirmation modal
  const handleDelete = () => {
    setShowDeleteModal(true);
  };

  // Confirm delete - call API and handle navigation
  const confirmDelete = async () => {
    try {
      const { summary } = getSummaryData();
      
      if (!summary?.id) {
        setLocalError("Summary ID not found. Cannot delete.");
        setShowDeleteModal(false);
        return;
      }

      // Call delete API
      await deleteSummary({ id: summary?.id }).unwrap();
      
      // Clear summary data from Redux
      dispatch(clearSummary());
      clearUpload();
      
      // Clear stored summary from chrome storage
      if (chrome?.storage?.local) {
        try {
          await chrome.storage.local.remove('currentSummary');
        } catch (error) {
          console.error('Error clearing stored summary:', error);
        }
      }
      
      // Close modal
      setShowDeleteModal(false);
      
      // Navigate based on upload type
      const stateText = (location.state as any)?.text as string | undefined;
      if (upload?.type === 'text' || (!!stateText && !upload)) {
        navigate('/popup/text', { state: { text: upload?.text || stateText || '' } });
      } else {
        // Default: Go back to processing page
        navigate('/popup/upload/process');
      }
    } catch (error: any) {
      console.error("Error deleting summary:", error);
      setLocalError(error?.data?.message || "Failed to delete summary. Please try again.");
      setShowDeleteModal(false);
    }
  };

  // Rehydrate summary from storage only if we don't have one in Redux
  // and we're not coming from a navigation with new summary data
  useEffect(() => {
    (async () => {
      try {
        // Don't rehydrate if we have summary data in location state (new summary)
        const locationState = location.state as any;
        if (locationState?.summary) {
          console.log('Summary data provided via navigation state, skipping rehydration');
          return;
        }
        
        // Only rehydrate if we don't have a summary in Redux
        if (!currentSummary && chrome?.storage?.local) {
          const res = await chrome.storage.local.get("currentSummary");
          const stored = res?.currentSummary;
          if (stored) {
            console.log('Rehydrating summary from storage');
            dispatch(setSummaryFromApiResponse(stored));
          }
        }
      } catch (e) {
        console.log("rehydrate summary failed:", e);
      }
    })();
  }, []);

  // Display error if any
  const displayError = localError || apiError || error;

  if (displayError) {
    return (
      <div className="bg-[#F4F8FF] flex flex-col justify-center items-center py-6 px-8 min-h-screen">
        <div className="w-full max-w-4xl">
          <button
            onClick={handleHomeClick}
            className="hover:opacity-80 transition-opacity cursor-pointer mb-4"
          >
            <img src="/popup/home.svg" alt="home" className="w-10 h-10" />
          </button>
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <div className="text-red-600 text-lg font-semibold mb-2">
              Something went wrong
            </div>
            <div className="text-red-500 text-sm mb-4">{displayError}</div>
            <button
              onClick={() => {
                setLocalError(null);
                dispatch(setApiError(""));
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
      <div className="bg-[#F4F8FF] flex flex-col justify-center items-center py-6 px-8 min-h-screen">
        <div className="w-full max-w-4xl">
          <button
            onClick={handleHomeClick}
            className="hover:opacity-80 transition-opacity cursor-pointer mb-4"
          >
            <img src="/popup/home.svg" alt="home" className="w-10 h-10" />
          </button>
          <div className="text-center mt-20 text-gray-500">
            No summary data available
          </div>
        </div>
      </div>
    );
  }

  // Extract data from API response
  const { summary, summarization, transcription, aiActions } = getSummaryData();

  if (!summary) {
    return (
      <div className="bg-[#F4F8FF] flex flex-col justify-center items-center py-6 px-8 min-h-screen">
        <div className="w-full max-w-4xl">
          <button
            onClick={handleHomeClick}
            className="hover:opacity-80 transition-opacity cursor-pointer mb-4"
          >
            <img src="/popup/home.svg" alt="home" className="w-10 h-10" />
          </button>
          <div className="text-center mt-20 text-gray-500">
            Invalid summary data format
          </div>
        </div>
      </div>
    );
  }

  const date = new Date(summary.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const tag = summary?.content_type || "Document";
  const title = summary?.title || "Untitled";
  const overview = summary?.summary_html || "No summary available";
  const keyPoints = getKeyPoints();
  const transcriptionText = getTextContent(transcription);

  return (
    <div className="bg-white  min-h-screen py-6 ">
      <div className="max-w-4xl mx-auto ">
        {/* Home Button */}
        <div className="px-8">
          <button
            onClick={handleHomeClick}
            className="hover:opacity-80 transition-opacity cursor-pointer mb-2"
          >
            <img src="/popup/home.svg" alt="home" className="w-10 h-10" />
          </button>

          {/* Summary Title and Three Dot Menu */}
          <div className="flex justify-between items-center mb-6">
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
        </div>

        {/* Header Section */}
        <div className="  py-6 px-8 bg-[#F4F8FF]  ">
          {/* Date */}
          <div className="flex items-center text-[16px] text-[#4B5563] font-[400] mb-4">
            <img
              src="/popup/Calender.svg"
              alt="Calendar"
              className="w-6 h-6 mr-2"
            />
            {date}
          </div>

          {/* Title with Edit Icon */}
          <div className="flex items-start justify-between mb-4">
            <h1 className="text-2xl font-bold max-w-[80%] text-[#1F2937] flex-1">
              {title}
            </h1>
            <button
              onClick={handleEditTitleClick}
              className="ml-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={isUpdatingTitle}
            >
              <img src="/popup/edit.svg" alt="edit" />
            </button>
          </div>

          {/* Tag */}
          <div className="flex items-center gap-2">
            <img src="/popup/key.svg" alt="Document" className="w-5 h-5" />
            <span className="bg-[rgba(63,126,248,0.1)] text-[#3F7EF8] text-[14px] font-[500] px-8 py-1.5 rounded-lg">
              {tag}
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className=" px-8 flex justify-between items-end border-b border-gray-200">
          <button
            onClick={() => setActiveTab("summary")}
            className={`relative px-6 py-3 font-semibold text-[16px] transition-all ${
              activeTab === "summary" ? "text-[#3F7EF8]" : "text-[#4B5563]"
            }`}
          >
            Summary
            {activeTab === "summary" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#3F7EF8]"></div>
            )}
          </button>

          <button
            onClick={() => setActiveTab("ai-action")}
            className={`relative px-6 py-3 font-semibold text-[16px] transition-all ${
              activeTab === "ai-action" ? "text-[#3F7EF8]" : "text-[#4B5563]"
            }`}
          >
            AI Action
            {activeTab === "ai-action" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#3F7EF8]"></div>
            )}
          </button>

          <button
            onClick={() => setActiveTab("transcription")}
            className={`relative px-6 py-3 font-semibold text-[16px] transition-all ${
              activeTab === "transcription"
                ? "text-[#3F7EF8]"
                : "text-[#4B5563]"
            }`}
          >
            Transcription
            {activeTab === "transcription" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#3F7EF8]"></div>
            )}
          </button>
        </div>

        {/* Tab Content */}
        <div>
          {/* Summary Tab Content */}
      <div className=" px-8">
      {activeTab === "summary" && (
            <>
               {/* Overview Section */}
               <div className="bg-white rounded-xl ">
        
                 <div
                   className="summary-html-content text-[16px] text-[#4B5563] leading-relaxed"
                   dangerouslySetInnerHTML={{ __html: overview }}
                 />
               </div>
               <div className="h-px w-[96%] mx-auto bg-[#3F7EF8]/30"></div>


  
              {/* Review & Rating Section */}
              <div className="bg-white rounded-xl py-6  ">
                <div className="flex items-start gap-3 mb-4">
             <img src="/popup/review.svg" alt="review" className=" mt-2"  />
                 <div>
                 <h2 className="text-[16px] font-semibold text-[#1F2937]">
                    Review & Rating
                  </h2>
                  <p className="text-[14px] text-[#4B5563]  font-[400]">
                  We'd love to hear what you think!
                </p>
                 </div>
                </div>
                <div className="flex items-center  gap-4">
                  <button className="w-full flex items-center justify-center gap-4 px-6 py-3 border border-[#E2E8F0] bg-white text-[#4B5563] rounded-xl transition-colors font-semibold text-[16px]">
                  <img src="/popup/like.svg" alt="like" className="" />
                    Like
                  </button>
                  <button className="w-full flex items-center justify-center gap-4 px-6 py-3 border border-[#E2E8F0] bg-white text-[#4B5563] rounded-xl transition-colors font-semibold text-[16px]">
                    <img src="/popup/dislike.svg" alt="dislike" className="" />
                    Dislike
                  </button>
                </div>
              </div>
              <div className="h-px w-[96%] mx-auto bg-[#3F7EF8]/30"></div>

               {/* AI Action Section - Also visible in Summary tab */}
               <div className="bg-white rounded-xl py-6 ">
                 <div className="flex items-center gap-3 mb-6">
                   <img src="/popup/AI.svg" alt="AI" className="w-6 h-6" />
                   <h2 className="text-[16px] font-semibold text-[#1F2937]">
                     AI Action
                   </h2>
                 </div>

                 <div className="space-y-3 flex flex-wrap gap-4">
                   {aiActions?.slice(0, 3)?.map((action: any, i: number) => (
                     <button
                       key={action.id || i}
                       onClick={() => handleActionClick(action)}
                       disabled={isFetchingSummaryWithActions || isDisable}
                       className="w-fit flex items-center gap-3 px-4 py-3 bg-[rgba(63,126,248,0.1)] border border-[#3F7EF8] text-[#3F7EF8] rounded-xl hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed max-h-[52px]"
                     >
                       <img src="/popup/AI.svg" alt="AI" className="w-6 h-6" />
                       <span className="font-semibold text-[14px]">
                         {action?.title}
                       </span>
                       {isFetchingSummaryWithActions && (
                         <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin ml-auto"></div>
                       )}
                     </button>
                   ))}

                   {aiActions?.length > 3 && (
                     <button
                       onClick={handleMoreActions}
                       className="w-fit px-4 py-1! text-[#3F7EF8] border border-[#3F7EF8] rounded-xl hover:bg-gray-50 transition-colors font-semibold text-[14px] max-h-[52px] bg-[rgba(63,126,248,0.1)]"
                     >
                       ... More
                     </button>
                   )}
                 </div>
               </div>
              <div className="h-px w-[96%] mx-auto bg-[#3F7EF8]/30"></div>
                  {/* Chat with Section - Always visible */}
          <div className="bg-white rounded-xl p-6 ">
            <div className="flex items-center gap-3 mb-4">
             <img src="/popup/chat.svg" alt="chat" className="" />
              <h2 className="text-[16px] font-semibold text-[#1F2937]">
                Chat with
              </h2>
            </div>
            <p className="text-[14px] text-[#4B5563] font-[400] mb-4">
              Recording/Audio/Video/Document/<br />Image/URL/Text
            </p>
            <button className="w-full bg-[#3F7EF8] text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors text-[16px]">
              Chat
            </button>
          </div>
            </>
          )}
      </div>

          {/* AI Action Tab Content */}
          {activeTab === "ai-action" && (
            <div className="">
              {/* Category Tabs */}
              {categories.length > 0 && (
                <div className="flex gap-3 mb-6 h-[65px] bg-[#E5EFFF] px-4 py-3 overflow-x-auto ">
                  {categories.map((category: any) => (
                    <button
                      key={category.id}
                      onClick={() => {
                        setActiveCategoryId(category.id);
                        setActiveCategoryName(category.name);
                      }}
                      className={`px-4  w-fit! rounded-[26px] border bg-white shadow-[0px_8px_16px_0px_#1C191705] font-semibold text-[14px] whitespace-nowrap transition-all ${
                        activeCategoryId === category.id
                          ? "bg-[rgba(63,126,248,0.1)] text-[#3F7EF8] border-[#3F7EF8]"
                          : "text-[#4B5563] border-gray-300 hover:bg-gray-100"
                      }`}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              )}

              {/* Loading State */}
              {(isFetchingAIActions || isFetchingCategories) && (
                <div className="flex justify-center items-center py-12">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}

              {/* AI Action Cards */}
              {!isFetchingAIActions && !isFetchingCategories && (
                <div className="space-y-4 px-8">
                  {getAIActionsForDisplay().map((action: any, i: number) => (
                    <button
                      key={action.id || i}
                      onClick={() => handleActionClick(action)}
                      disabled={isFetchingSummaryWithActions || isDisable}
                      className="w-full bg-white rounded-[16px] p-4  border-[0.5px] border-[#BDD4FF] shadow-[0px_8px_16px_0px_#1C191705,3px_4px_8px_0px_#1C191708] hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed text-left relative"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="text-[16px] font-semibold text-[#1F2937] mb-2">
                            {action?.title}
                          </h3>
                          <p className="text-[14px] max-w-[350px] text-[#4B5563] font-[400] leading-relaxed">
                            {action?.description || "No description available"}
                          </p>
                        </div>
                        <div className="flex items-start gap-2 flex-shrink-0">
                          {/* Favorite Star Button */}
                          <button
                            onClick={(e) => toggleFavorite(action.id, e)}
                            className="p-1 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
                          >
                            {favorites.includes(action.id.toString()) ? (
                              <img src="/popup/fav.svg" alt="fav" className="w-5 h-5" />
                            ) : (
                              <img src="/popup/nonfav.svg" alt="nonfav" className="w-5 h-5" />
                            )}
                          </button>
                   
                        </div>
                      </div>
                      {isFetchingSummaryWithActions && (
                        <div className="absolute top-4 right-4 w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      )}
                    </button>
                  ))}

                  {getAIActionsForDisplay().length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      No AI actions available for this category
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Transcription Tab Content */}
          {activeTab === "transcription" && (
            <div className="bg-white rounded-xl p-6 ">
              <div className="flex items-center gap-3 mb-4">
                <img
                  src="/popup/key.svg"
                  alt="Transcription"
                  className="w-6 h-6"
                />
                <h2 className="text-[16px] font-semibold text-[#1F2937]">
                  Transcription
                </h2>
              </div>
              <p className="text-[16px] text-[#4B5563] leading-relaxed whitespace-pre-wrap">
                {transcriptionText || "No transcription available"}
              </p>
            </div>
          )}

      
        </div>
      </div>

      {/* Styles */}
      <style>{`
        .summary-html-content {
          font-size: 16px;
          line-height: 1.75;
          color: #4B5563;
        }
        
        .summary-html-content h1,
        .summary-html-content h2,
        .summary-html-content h3,
        .summary-html-content h4,
        .summary-html-content h5,
        .summary-html-content h6 {
          font-weight: 600 !important;
          color: #1F2937 !important;
          margin-top: 1.5rem;
          margin-bottom: 1rem;
          line-height: 1.3;
          display: block;
        }
        
        .summary-html-content h1 {
          font-size: 24px !important;
          color: #3F7EF8 !important;
        }
        
        .summary-html-content h2 {
          font-size: 20px !important;
          font-weight: 600 !important;
          color: #3F7EF8 !important;
        }
        
        .summary-html-content h3 {
          font-size: 18px !important;
          color: #3F7EF8 !important;
        }
        
        .summary-html-content h4 {
          font-size: 16px !important;
          font-weight: 600 !important;
          color: #3F7EF8 !important;
        }
        
        .summary-html-content p {
          margin-bottom: 1rem;
          line-height: 1.75;
          color: #4B5563;
          display: block;
        }
        
        .summary-html-content strong,
        .summary-html-content b {
          font-weight: 600 !important;
          color: #1F2937 !important;
        }
        
        .summary-html-content ul,
        .summary-html-content ol {
          margin-top: 0.75rem;
          margin-bottom: 1rem;
          padding-left: 1.5rem;
          list-style-position: outside;
          display: block;
        }
        
        .summary-html-content ul {
          list-style-type: disc;
        }
        
        .summary-html-content ul li::marker {
          color: #3F7EF8;
        }
        
        .summary-html-content ol {
          list-style-type: decimal;
        }
        
        .summary-html-content ol li::marker {
          color: #3F7EF8;
        }
        
        .summary-html-content li {
          margin-bottom: 0.5rem;
          line-height: 1.75;
          color: #4B5563;
          display: list-item;
        }
        
        .summary-html-content li strong,
        .summary-html-content li b {
          font-weight: 600 !important;
          color: #1F2937 !important;
        }
        
        .summary-html-content div {
          line-height: 1.75;
        }
        
        .summary-html-content * {
          box-sizing: border-box;
        }
      `}</style>

      {/* Title Edit Modal */}
      <TitleEditModal
        isOpen={isTitleModalOpen}
        onClose={() => {
          setIsTitleModalOpen(false);
          setTitleUpdateError(null);
        }}
        onSave={handleTitleSave}
        title={title}
        placeholder="e.g., 'Weekly Sales Report Summary - July 2025'"
        label="Title"
        instruction="Add a Descriptive Summary Title"
        isLoading={isUpdatingTitle}
        error={titleUpdateError}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <CancelModal
          onClose={() => setShowDeleteModal(false)}
          onCancel={confirmDelete}
          title="Delete Summary"
          description="Are you sure you want to delete this summary? This action cannot be undone."
          btnText="Delete"
        />
      )}
    </div>
  );
}
