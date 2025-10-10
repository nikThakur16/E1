import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { type RootState } from '../store';
import { setLectureNotesData } from '../store/slices/navigationSlice';
import { useGetAIActionsCategoriesQuery, useGetAIActionsQuery, useGetSummaryWithActionsMutation } from '../store/api/authApi';
import Heading from '../components/popup/Heading';
import BackButton from '../components/popup/BackButton';
import Loader from '../components/popup/Loader';

interface AIAction {
  id: number;
  type: string;
  title: string;
  description: string;
  prompt: string;
  is_active: boolean;
  is_default: boolean;
  order: number;
  category_id: number;
  category: {
    id: number;
    name: string;
  };
}

const AIActionsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  // Get passed data from navigation state
  const { transcription, summaryId } = location.state || {};

  // Console log the received data for verification
  useEffect(() => {
    console.log("=== AI Actions Page - Received Data ===");
    console.log("Raw transcription data:", transcription);
    console.log("Summary ID:", summaryId);
    console.log("Full location state:", location.state);
    console.log("=====================================");
  }, [transcription, summaryId, location.state]);

  const { data: aiActionsCategoriesData, isLoading: isFetchingAIActionsCategories, error: aiActionsCategoriesError } = useGetAIActionsCategoriesQuery();
  console.log("AI Actions Categories API Response:", aiActionsCategoriesData);
  
  // Use categories from API response or fallback to default
  const categories = useMemo(() => aiActionsCategoriesData?.data || [], [aiActionsCategoriesData]);
  
  const [activeTab, setActiveTab] = useState<string>('');
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [actionsCache, setActionsCache] = useState<{[key: number]: AIAction[]}>({});
  const [loadingAction, setLoadingAction] = useState<boolean>(false);

  // Fetch AI Actions for the active category
  const { data: aiActionsData, isLoading: isFetchingAIActions, error: aiActionsError } = useGetAIActionsQuery(activeCategoryId!, {
    skip: !activeCategoryId
  });

  // Hook for calling summary with actions API
  const [getSummaryWithActions] = useGetSummaryWithActionsMutation();

  // Initialize active tab when categories are loaded
  useEffect(() => {
    if (categories.length > 0 && !activeTab) {
      const firstCategory = categories[0];
      setActiveTab(firstCategory.name);
      setActiveCategoryId(firstCategory.id);
    }
  }, [categories, activeTab]);

  // Update actions cache when API data is received
  useEffect(() => {
    if (aiActionsData?.data && activeCategoryId && Array.isArray(aiActionsData.data)) {
      console.log("AI Actions API Response:", aiActionsData);
      setActionsCache(prev => ({
        ...prev,
        [activeCategoryId]: aiActionsData.data
      }));
    }
  }, [aiActionsData, activeCategoryId]);

  // Initialize favorites from localStorage or default
  useEffect(() => {
    const savedFavorites = localStorage.getItem('aiActionsFavorites');
    if (savedFavorites) {
      setFavorites(JSON.parse(savedFavorites));
    }
  }, []);

  const handleTabClick = (category: { id: number; name: string }) => {
    setActiveTab(category.name);
    setActiveCategoryId(category.id);
  };

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

  // Handle action click - same functionality as SummaryPage
  const handleActionClick = async (action: AIAction) => {
    try {
      console.log("=== Action Click Debug ===");
      console.log("Summary ID:", summaryId);
      console.log("Transcription:", transcription);
      console.log("Transcription type:", typeof transcription);
      console.log("Transcription.text:", transcription?.text);
      console.log("========================");
      
      if (!summaryId || !transcription) {
        console.error("Missing required data for API call");
        return;
      }
      
      // Handle different transcription formats
      let transcriptionText = '';
      if (typeof transcription === 'string') {
        transcriptionText = transcription;
      } else if (transcription?.text) {
        transcriptionText = transcription.text;
      } else if (transcription?.content) {
        transcriptionText = transcription.content;
      } else {
        console.error("Unable to extract transcription text");
        return;
      }

      setLoadingAction(true);

      console.log("Calling API with:", {
        summary_id: summaryId,
        action_id: action.id,
        ai_content: transcriptionText
      });

      const response = await getSummaryWithActions({
        summary_id: summaryId,
        action_id: action.id,
        ai_content: transcriptionText
      }).unwrap();

      console.log("API Response:", response);
      console.log("Action Title:", action.title);

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
    } finally {
      setLoadingAction(false);
    }
  };

  const handleBack = () => {
    navigate(-1); // Go back to previous page
  };

  // Get actions for the active category from cache
  const filteredActions = activeCategoryId ? (actionsCache[activeCategoryId] || []) : [];

  const getTabButtonClass = (categoryName: string) => {
    return `tab-button px-4 py-3 rounded-full text-[14px] font-[600] transition-colors cursor-pointer ${
      activeTab === categoryName ? 'bg-[#3F7EF8] border border-[#3F7EF8] text-white' : 'bg-[rgba(63,126,248,0.06)] text-[#3F7EF8]'
    }`;
  };

  if (isFetchingAIActionsCategories) {
    return (
      <Loader isLoading={isFetchingAIActionsCategories} />
    );
  }

  if (isFetchingAIActions) {
    return (
      <Loader isLoading={isFetchingAIActions} />
    );
  }

  if (aiActionsError) {
    return (
      <div className="bg-[#F4F8FF] flex py-6 px-8">
        <div className="w-full flex-col justify-center items-center min-h-screen">
          <div className="w-full items-center">
            <BackButton handleBack={handleBack} />
          </div>
          <div className="w-full text-center mb-4">
            <Heading title="AI Actions" />
          </div>
          <div className="text-center py-8">
            <p className="text-red-500 text-[14px]">Error loading AI Actions</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#F4F8FF] flex py-6 px-8">
      <div className="w-full flex-col justify-center items-center min-h-screen">
        {/* Header */}
        <div className="w-full items-center">
          <BackButton handleBack={handleBack} />
        </div>
        <div className="w-full text-center mb-4">
          <Heading title="AI Actions" />
        </div>

        {/* Scrollable Tabs Container - Show exactly 3 tabs at a time */}
        <div className="w-full mb-6">
          <div className="scrollable-tabs">
            {categories.map((category: { id: number; name: string }) => (
              <button
                key={category.id}
                onClick={() => handleTabClick(category)}
                className={`${getTabButtonClass(category.name)}`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* AI Actions List */}
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {filteredActions.map((action: AIAction) => (
            <div
              key={action.id}
              onClick={() => handleActionClick(action)}
              className={`bg-white rounded-2xl p-6 hover:border-[#BDD4FF] transition-colors cursor-pointe`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-[19px] font-[600] text-[#1F2937] mb-2">
                    {action.title}
                  </h3>
                  <p className="text-[15px] font-[400] w-[75%] text-[#6B7280] leading-[1.4]">
                    {action.description}
                  </p>
                
                </div>
                
                {/* Favorite Star */}
                <button
                  onClick={(e) => toggleFavorite(action.id, e)}
                  className="ml-3 p-1 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
                >
                  {favorites.includes(action.id.toString()) ? (
                    <img src="/popup/fav.svg" alt="fav" />
                    ) : (
                    <img src="/popup/nonfav.svg" alt="nonfav" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredActions.length === 0 && !isFetchingAIActions && (
          <div className="text-center py-8">
            <p className="text-[#6B7280] text-[14px]">
              No actions available for {activeTab} category
            </p>
          </div>
        )}
      </div>
      {loadingAction && (
        <Loader isLoading={loadingAction} />
      )}
    
    </div>
  );
};

export default AIActionsPage;
