import { useNavigate } from "react-router";
import BackButton from "../components/popup/BackButton";
import Heading from "../components/popup/Heading";
import { Stepper } from "../components/popup/Stepper";
import UploadPreviewCard from "../components/popup/UploadPreviewCard";
import { useUpload } from "../context/UploadContext";
import ErrorPage from "../components/popup/ErrorPage";
import { useEffect, useState, useMemo } from "react";
import {
  useGetSummaryForUrlMutation,
  useUploadFileAndGetSummaryMutation,
} from "../store/api/authApi";
import { useDispatch } from "react-redux";
import { setSummary, setLoading, setError, clearSummary } from "../store/slices/summarySlice";
import type { SummaryData } from "../store/slices/summarySlice";
import GenratingSumModal from "../components/popup/GenratingSumModal";
import Loader from "../components/popup/Loader";

type Step = {
  title: string;
  description: string;
};

const Processing = () => {
  const { upload, clearUpload, isRehydrating } = useUpload();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [uploadSummary, { isLoading, isError, error }] =
    useUploadFileAndGetSummaryMutation();
  const [uploadUrl] = useGetSummaryForUrlMutation();

  const [showError, setShowError] = useState(false);
  const [showSummaryErrorModal, setShowSummaryErrorModal] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [summaryResult, setSummaryResult] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [hasAutoTriggered, setHasAutoTriggered] = useState(false); // Add this state
  const [loader, setLoader] = useState(false);

  // Map file types correctly
  const getFileType = (uploadType: string) => {
    switch (uploadType) {
      case "image":
        return "image";
      case "video":
        return "video";
      case "audio":
        return "audio";
      case "url":
      case "text":
        return uploadType; // Keep as is for url and text
      default:
        return "document"; // pdf, doc, xls, ppt, txt, etc.
    }
  };

  // Get steps configuration based on file type
  const getStepsForFileType = (fileType: string): Step[] => {
    switch (fileType) {
      case "audio":
        return [
          {
            title: "Audio Analysis",
            description: "Detects tone, clarity, and background noise.",
          },
          {
            title: "Transcription",
            description: "Converts your voice into written text.",
          },
          {
            title: "AI Summary",
            description: "Highlights key points from your recording.",
          },
        ];

      case "video":
        return [
          {
            title: "Video Analysis",
            description:
              "Detects speech, clarity, background noise from the video.",
          },
          {
            title: "Transcription",
            description:
              "Extracts and converts spoken content into written text.",
          },
          {
            title: "AI Summary",
            description:
              "Summarizes the key points and topics from your video.",
          },
        ];

      case "image":
        return [
          {
            title: "Text Detection",
            description:
              "Detects and reads text areas from the uploaded image.",
          },
          {
            title: "OCR (Optical Character Recognition)",
            description: "Extracts readable text from the image using AI.",
          },
          {
            title: "Content Structuring",
            description:
              "Organizes extracted content for clarity and accuracy.",
          },
          {
            title: "AI Summary",
            description:
              "Generates a concise summary highlighting the key insights.",
          },
        ];

      case "url":
        return [
          {
            title: "Fetching Content",
            description: "Retrieve the webpage content.",
          },
          {
            title: "Extracting Key Information",
            description: "Identify titles, descriptions, and main content.",
          },
          {
            title: "AI Summary",
            description: "Create concise notes with AI.",
          },
        ];

      case "document":
      default:
        return [
          {
            title: "Reading File Contents",
            description: "Extracting text from the uploaded document.",
          },
          {
            title: "Analyzing Text Structure",
            description: "Detecting document structure and layout.",
          },
          {
            title: "AI Summary",
            description: "Condensing your content into concise key points.",
          },
        ];
    }
  };

  // Get dynamic title based on file type
  const getStepperTitle = (fileType: string): string => {
    switch (fileType) {
      case "audio":
        return "Steps to Analyze your Audio";
      case "video":
        return "Steps to Analyze your Video";
      case "image":
        return "Steps to Analyze your Image";
      case "url":
        return "Steps to Analyze your URL";
      case "text":
        return "Steps to Summarize your Text";
      case "document":
      default:
        return "Steps to Analyze your File";
    }
  };

  // Get current file type and steps
  const currentFileType = useMemo(() => {
    return upload ? getFileType(upload.type) : "document";
  }, [upload?.type]);

  const steps = useMemo(() => {
    return getStepsForFileType(currentFileType);
  }, [currentFileType]);

  const stepperTitle = useMemo(() => {
    return getStepperTitle(currentFileType);
  }, [currentFileType]);

  const handleDiscard = async () => {
    await clearUpload();
    dispatch(setLoading(false));
    setIsProcessing(false);
    setShowSummaryErrorModal(false);
    setErrorMessage("");
    navigate("/popup/upload");
  };

  const handleCloseSummaryErrorModal = async () => {
    setShowSummaryErrorModal(false);
    setIsProcessing(false);
    dispatch(setLoading(false));
    await clearUpload();
    navigate("/popup/home");
  };

  const handleGenerateSummary = async () => {
    if (!upload) {
      console.log(upload, "0000000");
      console.error("No file to process");
      return;
    }

    // Stop any playing audio before starting summary generation
    const stopAllAudio = () => {
      const audioElements = document.querySelectorAll("audio");
      audioElements.forEach((audio) => {
        if (audio && !audio.paused) {
          audio.pause();
          audio.currentTime = 0;
        }
      });
    };

    // Stop audio immediately
    stopAllAudio();

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

    setIsProcessing(true);
    setCurrentStep(1); // Start with step 1 (first step to show loader)
    setCompletedSteps([]);
    dispatch(setLoading(true));

    try {
      const fileType = getFileType(upload?.type);
      const stepsForType = getStepsForFileType(fileType);
      const totalSteps = stepsForType.length;

      console.log("00000000000", upload, fileType, "Total steps:", totalSteps);
      // Dynamic step progression based on the number of steps
      const stepIntervals: NodeJS.Timeout[] = [];

      // Progress through all steps except the last one (which completes after API call)
      for (let i = 0; i < totalSteps - 1; i++) {
        const timeout = setTimeout(() => {
          setCompletedSteps(Array.from({ length: i + 1 }, (_, idx) => idx));
          setCurrentStep(i + 2);
        }, (i + 1) * 2000); // Each step takes 2 seconds
        stepIntervals.push(timeout);
      }

      // Call the API
      let result;

      if (fileType === "url") {
        result = await uploadUrl({
          url: upload?.fileUrl,
        }).unwrap();
      } else {
        if (!upload.file) {
          throw new Error("File is required for upload");
        }
        result = await uploadSummary({
          file: upload.file,
          type: fileType,
        }).unwrap();
      }

      console.log("result", result);
      // Complete all steps after API response
      setTimeout(() => {
        (async () => {
          setCompletedSteps(
            Array.from({ length: totalSteps }, (_, idx) => idx)
          );
          setCurrentStep(0); // Reset for display
          setSummaryResult(result);

          // Store summary data in Redux
          if (result?.status === 1) {
            if (fileType == "url" || fileType == "text") {
              const summaryData: SummaryData = result?.data;
              dispatch(setSummary(summaryData));
              // Ensure storage is saved before navigation
              if (chrome?.storage?.local) {
                try {
                  await chrome.storage.local.set({
                    currentSummary: summaryData,
                  });
                  console.log("Stored text/url summary to chrome storage");
                } catch (e) {
                  console.error("Failed to store summary:", e);
                }
              }
            } else {
              const summaryData: SummaryData = result?.data;
              dispatch(setSummary(summaryData));
              // Ensure storage is saved before navigation
              if (chrome?.storage?.local) {
                try {
                  await chrome.storage.local.set({
                    currentSummary: summaryData,
                  });
                  console.log("Stored file summary to chrome storage");
                } catch (e) {
                  console.error("Failed to store summary:", e);
                }
              }
            }

            // Stop any remaining audio before navigation
            stopAllAudio();

            // Store route for persistence
            if (chrome?.storage?.local) {
              await chrome.storage.local.set({
                lastPopupRoute: "/popup/summary",
              });
              console.log("Stored route: /popup/summary");
            }

            // Redirect to summary page after successful generation
            navigate("/popup/summary");
          } else if (result?.status === 0) {
            // Show error modal when status is 0
            setErrorMessage(result?.message);
            setShowSummaryErrorModal(true);
          }

          setIsProcessing(false);
          dispatch(setLoading(false));

          // Clear all intervals
          stepIntervals.forEach((interval) => clearTimeout(interval));
        })();
      }, 1000);
    } catch (error) {
      console.error("Summary generation failed:", error);
      setIsProcessing(false);
      dispatch(setError("Failed to generate summary. Please try again."));
      setShowError(true);
    } finally {
    }
  };
  const handleRetry = async () => {
    setLoader(true);
    await handleGenerateSummary();
    setLoader(false);
  };

  const handleUploadAgain = () => {
    navigate("/popup/upload");
  };

  const handleGoHome = () => {
    navigate("/popup/home");
  };

  useEffect(() => {
    // Wait for rehydration to complete before showing error
    if (!upload && !isRehydrating) {
      const timer = setTimeout(() => {
        setShowError(true);
      }, 2000); // Increased timeout to allow for rehydration from other tabs
      return () => clearTimeout(timer);
    } else {
      setShowError(false);
    }
  }, [upload, isRehydrating]);

  // Add useEffect to automatically trigger summary API when recording is ready

  if (showError) {
    return (
      <ErrorPage
        heading="Oops! File upload failed"
        descriptions={[
          "We couldn't process your file right now but don't worry, your recording is safe.",
          "You can find it anytime under the Unprocessed tab in mobile apps.",
        ]}
        footerDescriptions={[
          "Check your internet connection",
          "Try again in a few moments ",
        ]}
        onRetry={() => handleUploadAgain()}
        onHome={() => handleGoHome()}
      />
    );
  }

  if (showSummaryErrorModal) {
    return (
      <>
        <ErrorPage
          heading="Oops! Something went wrong"
          descriptions={[errorMessage]}
          footerDescriptions={[
            "Check your internet",
            "Update the extension ",
            "Try again in a few seconds",
          ]}
          onRetry={() => handleRetry()}
          onHome={() => handleCloseSummaryErrorModal()}
        />
        {loader && <Loader isLoading={loader} />}
      </>
    );
  }

  return (
    <div className="p-4 bg-[#F4F8FF] min-h-screen">
      <div className="w-full">
        <BackButton handleBack={handleDiscard} />
      </div>

      <div className="w-full text-center">
        <Heading title="Uploaded File" />
      </div>

      <div className="px-6">
        {upload && <UploadPreviewCard upload={upload} />}
        <Stepper
          steps={steps}
          title={stepperTitle}
          currentStep={currentStep}
          completedSteps={completedSteps}
          isProcessing={isProcessing}
          onGenerateSummary={handleGenerateSummary}
          summaryResult={summaryResult}
        />
      </div>
    </div>
  );
};

export default Processing;
