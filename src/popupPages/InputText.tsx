import { useNavigate, useLocation } from "react-router";
import BackButton from "../components/popup/BackButton";
import { useState, useEffect } from "react";
import Heading from "../components/popup/Heading";
import Button from "../components/comman/button";

import GenratingSumModal from "../components/popup/GenratingSumModal";
import { useGetSummaryWithTextMutation } from "../store/api/authApi";
import { setSummary, clearSummary } from "../store/slices/summarySlice";
import { useDispatch } from "react-redux";

const InputText = () => {
  const location = useLocation();
  const [text, setText] = useState<string>((location.state as any)?.text || "");
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState(""); // State to show error message

  const maxChars = 10000;
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [getSummaryWithText] = useGetSummaryWithTextMutation();

  // Clear old summary when component mounts (user is starting fresh)
  useEffect(() => {
    dispatch(clearSummary());
    if (chrome?.storage?.local) {
      chrome.storage.local.remove('currentSummary').catch((e) => {
        console.error('Failed to clear old summary on mount:', e);
      });
    }
  }, [dispatch]);

  const handleGenerateSummary = async () => {

    // Remove all spaces and count remaining characters
    const charCount = text.replace(/\s/g, "").length;

    if (charCount < 20) {
      setError("Please enter at least 20 characters (spaces are not counted).");
      return;
    }

    setError("");
    
    // Clear old summary data before generating new one
    dispatch(clearSummary());
    if (chrome?.storage?.local) {
      try {
        await chrome.storage.local.remove('currentSummary');
        console.log('Cleared old summary from storage before generating new one');
      } catch (e) {
        console.error('Failed to clear old summary:', e);
      }
    }
    
    setShowModal(true); 
    
    try {
      const res = await getSummaryWithText({text: text}).unwrap();
      console.log("text summary",res);
      const summaryData = res?.data?.[0];
      
      if(res?.status === 1 && summaryData){
        // Set new summary in Redux
        dispatch(setSummary(summaryData));
        
        // Ensure storage is saved before navigation
        if (chrome?.storage?.local) {
          try {
            await chrome.storage.local.set({ currentSummary: summaryData });
            console.log('Stored text summary to chrome storage');
            
            // Store route for persistence
            await chrome.storage.local.set({ lastPopupRoute: '/popup/summary' });
            console.log('Stored route: /popup/summary');
          } catch (e) {
            console.error('Failed to store summary:', e);
          }
        }
        
        setShowModal(false);
        navigate("/popup/summary", { state: { summary: res?.data, text } });
      }else{
        setShowModal(false);
        setError(res?.message || "Something went wrong");
      }
    } catch (error: any) {
      setShowModal(false);
      setError(error?.data?.message || error?.message || "Something went wrong");
    }
  };

  return (
    <div className="bg-[#F4F8FF] h-full px-4 py-8">
      <div className="w-full">
        <BackButton handleBack={() => {
          setText("");
          navigate('/popup/upload');
        }} />
      </div>

      <div className="w-full text-center">
        <Heading title="Add text" />

        <div className="px-2">
          <div className="flex flex-col w-full mt-4 mb-8 rounded-[16px] bg-white relative">
            <div className="relative">
              <textarea
                className="w-full text-[#4B5563] text-[16px] font-[400] min-h-[300px] max-h-[520px] p-6 rounded-lg resize-none"
                placeholder="Start typing or paste your text here..."
                value={text}
                maxLength={maxChars}
                onChange={(e) => setText(e.target.value)}
              />
              {/* Character count overlay */}
              <div className="absolute bottom-3 right-5 text-[#4B5563] text-[16px] font-[400] pointer-events-none">
                {text.length}/{maxChars}
              </div>
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-sm mb-2">
              {error}
            </div>
          )}

          <Button title="Generate Summary" onClick={handleGenerateSummary} />
        </div>
      </div>

      {showModal && (
        <GenratingSumModal
          title="Generating Summary..."
          description="Processing content for summarization…"
          border=""
          iconSrc="/web/loader.gif"
        />
      )}
    </div>
  );
};

export default InputText;
