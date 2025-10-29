import { useNavigate, useLocation } from "react-router";
import BackButton from "../components/popup/BackButton";
import { useState } from "react";
import Heading from "../components/popup/Heading";
import Button from "../components/comman/button";

import GenratingSumModal from "../components/popup/GenratingSumModal";
import { useGetSummaryWithTextMutation } from "../store/api/authApi";
import { setSummary } from "../store/slices/summarySlice";
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

  const handleGenerateSummary = () => {

    // Remove all spaces and count remaining characters
    const charCount = text.replace(/\s/g, "").length;

    if (charCount < 20) {
      setError("Please enter at least 20 characters (spaces are not counted).");
      return;
    }

    setError("");
    setShowModal(true); 
    getSummaryWithText({text: text}).then((res) => {
      console.log("text summary",res);
      dispatch(setSummary(res?.data?.data[0]));
      if(res?.data?.status === 1){
        setShowModal(false);
        navigate("/popup/summary", { state: { summary: res?.data?.data, text } });
      }else{
        setShowModal(false);
        setError(res?.data?.message || "Something went wrong");
      }
    });
    };

  return (
    <div className="bg-[#F4F8FF] px-4 py-8">
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
