import BackButton from "../components/popup/BackButton";
import { useNavigate } from "react-router";
import Heading from "../components/popup/Heading";
import { Stepper } from "../components/popup/Stepper";
import { useState, useEffect, useRef } from "react";
import { useUploadFileAndGetSummaryMutation } from "../store/api/authApi";
import { useDispatch } from "react-redux";
import { setSummary, setLoading, setError } from "../store/slices/summarySlice";
import type { SummaryData } from "../store/slices/summarySlice";
import GenratingSumModal from "../components/popup/GenratingSumModal";
import { useUpload } from '../context/UploadContext';
import ErrorPage from "../components/popup/ErrorPage";
import Loader from "../components/popup/Loader";

const AudioProcessing = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [uploadSummary, { isLoading, isError, error }] = useUploadFileAndGetSummaryMutation();
  const { upload, clearUpload } = useUpload();
  
  // Loader state
  const [currentIcon, setCurrentIcon] = useState("/popup/RS1.svg");
  const [currentDescription, setCurrentDescription] = useState("Your voice, our focus - detecting tone and cutting out the noise.");
  const [stopLoader, setStopLoader] = useState(true);
  
  // Audio-related state
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioSize, setAudioSize] = useState<string>("0 MB");
  const audioRef = useRef<HTMLAudioElement>(null);

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [showError, setShowError] = useState(false);
  const [showSummaryErrorModal, setShowSummaryErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [summaryResult, setSummaryResult] = useState<any>(null);
  const [loader, setLoader] = useState(false);

  const stepIcons = ["/popup/RS1.svg", "/popup/RS2.svg", "/popup/RS3.svg"];
  const description = [
    "Your voice, our focus - detecting tone and cutting out the noise.",
    "Every word matters - converting voice to text.",
    "Extracting what matters - your smart summary is on the way."
  ];

  // No longer needed - we receive File objects directly from UploadContext

  // Process audio with API
  const processAudio = async (audioFile: File) => {
    setIsProcessing(true);
    setCurrentStep(0);
    setCompletedSteps([]);
    setStopLoader(false);
    dispatch(setLoading(true));

    try {
      // Step 1: Reading File Contents
      setCurrentStep(1);
      setCurrentIcon(stepIcons[0]);
      setCurrentDescription(description[0]);
      setTimeout(() => {
        setCompletedSteps([0]);
        setCurrentStep(2);
        setCurrentIcon(stepIcons[1]);
        setCurrentDescription(description[1]);
      }, 2000);

      // Step 2: Analyzing Text Structure  
      setTimeout(() => {
        setCompletedSteps([0, 1]);
        setCurrentStep(3);
        setCurrentIcon(stepIcons[2]);
        setCurrentDescription(description[2]);
      }, 3000);

      // Call the API
      const result = await uploadSummary({
        file: audioFile,
        type: 'audio'
      }).unwrap();

      // Store API response for dynamic handling
      setSummaryResult(result);

      // Step 3: AI Summary Complete
      setTimeout(() => {
        setCompletedSteps([0, 1, 2]);
        setCurrentStep(0); // Reset for display
        setStopLoader(true);
        
        // Handle API response dynamically
        if (result?.status === 1) {
          // Success - show completion and navigate
          const summaryData: SummaryData = result.data[0];
          dispatch(setSummary(summaryData));
          
          // Redirect to summary page after successful generation
          setTimeout(() => {
            navigate("/popup/summary");
          }, 1000);
        
        } else if (result?.status === 0) {
          // Error - show error state
          setErrorMessage(result?.message || "Failed to process audio");
          setShowSummaryErrorModal(true);
        } else {
          // Unknown status - show generic error
          setErrorMessage("Unexpected response from server. Please try again.");
          setShowSummaryErrorModal(true);
        }
        
        setIsProcessing(false);
        dispatch(setLoading(false));
      }, 1000);

    } catch (error) {
      console.error('Error processing audio:', error);
      setErrorMessage("Failed to process audio. Please try again.");
      setShowSummaryErrorModal(true);
      setIsProcessing(false);
      setStopLoader(true);
      dispatch(setLoading(false));
    }
  };

  // Load recorded audio data from UploadContext on component mount
  useEffect(() => {
    const loadRecordedAudio = async () => {
      try {
        console.log('🎵 Loading recorded audio data from UploadContext...');
        console.log('🔍 Upload context state:', {
          hasUpload: !!upload,
          uploadType: upload?.type,
          hasFile: !!upload?.file,
          fileName: upload?.file?.name,
          fileSize: upload?.file?.size,
          hasFileUrl: !!upload?.fileUrl
        });
        
        if (upload && upload.type === 'audio' && upload.file) {
          console.log('✅ Found recorded audio file in context:', {
            fileName: upload.file.name,
            fileSize: upload.file.size,
            fileType: upload.file.type,
            sizeInMB: `${(upload.file.size / 1024 / 1024).toFixed(2)} MB`
          });
          
          setAudioSize(`${(upload.file.size / 1024 / 1024).toFixed(2)} MB`);
          
            // Use the file URL from context for playback
            if (upload.fileUrl) {
              setAudioUrl(upload.fileUrl);
              console.log('🎧 Audio URL from context:', {
                url: upload.fileUrl.substring(0, 50) + '...'
              });
            }
            
            console.log('📁 Using audio file from context for API:', {
              name: upload.file.name,
              size: upload.file.size,
              type: upload.file.type
            });

            // Start processing immediately with the file from context
            processAudio(upload.file);
          
        } else {
          console.warn('⚠️ No recorded audio file found in UploadContext');
          setErrorMessage("No recorded audio found. Please record audio first.");
          setShowError(true);
        }
      } catch (error) {
        console.error('❌ Error loading recorded audio from context:', error);
        setErrorMessage("Failed to load recorded audio");
        setShowError(true);
      }
    };

    loadRecordedAudio();
    
    // Cleanup audio URL on unmount
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [upload]);

  // Handle showError state similar to Processing.tsx
  useEffect(() => {
    if (!upload) {
      const timer = setTimeout(() => {
        setShowError(true);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setShowError(false);
    }
  }, [upload]);

  // Audio player controls
  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => {
        setIsPlaying(true);
        }).catch((error) => {
          console.error('Error playing audio:', error);
        });
    }
  };

  const formatTime = (seconds: number) => {
    // Handle invalid values (NaN, Infinity, negative)
    if (!isFinite(seconds) || isNaN(seconds) || seconds < 0) {
      return "0 seconds";
    }
    
    const totalSeconds = Math.floor(seconds);
    
    // If less than 60 seconds, show in seconds
    if (totalSeconds < 60) {
      return `${totalSeconds} seconds`;
    }
    
    // If less than 3600 seconds (1 hour), show in minutes
    if (totalSeconds < 3600) {
      const minutes = Math.floor(totalSeconds / 60);
      const remainingSeconds = totalSeconds % 60;
      
      if (remainingSeconds === 0) {
        return `${minutes} minute${minutes > 1 ? 's' : ''}`;
      } else {
        return `${minutes} minute${minutes > 1 ? 's' : ''} ${remainingSeconds} second${remainingSeconds > 1 ? 's' : ''}`;
      }
    }
    
    // If 3600 seconds or more, show in hours
    const hours = Math.floor(totalSeconds / 3600);
    const remainingMinutes = Math.floor((totalSeconds % 3600) / 60);
    const remainingSeconds = totalSeconds % 60;
    
    if (remainingMinutes === 0 && remainingSeconds === 0) {
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    } else if (remainingSeconds === 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}`;
    } else {
      return `${hours} hour${hours > 1 ? 's' : ''} ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''} ${remainingSeconds} second${remainingSeconds > 1 ? 's' : ''}`;
    }
  };

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioUrl]);

  const handleDiscard = async () => {
    dispatch(setLoading(false));
    setIsProcessing(false);
    setStopLoader(true);
    setShowSummaryErrorModal(false);
    setErrorMessage("");
    
    // Clear the upload context to remove audio data
    await clearUpload();
    
    navigate("/popup/record");
  };

  const handleCloseSummaryErrorModal = async () => {
    setShowSummaryErrorModal(false);
    setIsProcessing(false);
    setStopLoader(true);
    dispatch(setLoading(false));
    
    // Clear the upload context to remove audio data
    await clearUpload();
    
    navigate("/popup/record");
  };

  const handleRetry = async () => {
    setLoader(true);
    // Retry processing the audio
    if (upload && upload?.type === 'audio' && upload?.file) {
      await processAudio(upload?.file);
    }
    setLoader(false);
  };

  const handleUploadAgain = () => {
    navigate("/popup/record");
  };

  const handleGoHome = () => {
    navigate("/popup/home");
  };

  const steps = [
    {
      title: "Processing Audio",
      description: "Analyzing your recorded audio content.",
    },
    {
      title: "Speech to Text",
      description: "Converting your voice to readable text.",
    },
    {
      title: "AI Summary",
      description: "Creating a smart summary of your recording.",
    },
  ];

  if (showError) {
    return (
      <ErrorPage
        heading="Oops! Audio processing failed"
        descriptions={[
          "We couldn't process your audio recording right now but don't worry, your recording is safe.",
          "You can find it anytime under the Unprocessed tab in mobile apps."
        ]}
        footerDescriptions={[
          "Check your internet connection",
          "Try again in a few moments "
        ]}
        onRetry={() => handleUploadAgain()}
        onHome={() => handleGoHome()}
      />
    );
  }

  if(showSummaryErrorModal){
    return (
      <>
      <ErrorPage
      heading="Oops! Something went wrong"
    descriptions={[
      "We couldn't generate your summary due to a technical issue. Your file is uploaded and safe on server. This will appear in Unprocessed section in the mobile apps."
    ]}
    footerDescriptions={[
      "Check your internet",
      "Update the extension ",
      "Try again in a few seconds"
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
        <Heading title="Processing Recording" />
        <p className="text-[16px] font-[400] text-[#4B5563] leading-[1.46] mt-2">
          {currentDescription}
        </p>
      </div>

      <div className="px-6">
        {/* Loader with dynamic icon */}
        <div className="w-full flex justify-center my-6">
          <div className="relative flex items-center justify-center">
            <div className={`absolute h-28 w-28 rounded-full border-4 border-blue-500 border-t-transparent ${!stopLoader && isProcessing ? "block" : "hidden"} animate-spin`}></div>
            <img src={currentIcon} alt="step icon" className="h-24 w-24" />
          </div>
        </div>

        <Stepper
          steps={steps}
          title="Steps to Process your Audio"
          currentStep={currentStep}
          completedSteps={completedSteps}
          isProcessing={isProcessing}
          summaryResult={summaryResult}
        />
      </div>

     
    </div>
  );
};

export default AudioProcessing;
