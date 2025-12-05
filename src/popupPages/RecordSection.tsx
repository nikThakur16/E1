import React, { useState, useRef, useEffect, useCallback } from "react";
import type { AuthResponse } from "../components/config/auth.types";
import { useNavigate } from "react-router-dom";
import { useAudioWaveform } from "../hooks/useAudioWaveform";
import BackButton from "../components/popup/BackButton";
import CancelModal from "../components/popup/CancelModal";
import mediaDebugger from "../helper/MediaDebugger";
import stateRecoveryManager from "../helper/StateRecovery";
import { useUpload } from '../context/UploadContext';

export default function RecordSection() {
  const navigate = useNavigate();
  const [recording, setRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("Ready to record");
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [savedRecordings, setSavedRecordings] = useState<
    Array<{ id: string; data: string; timestamp: number; duration: number }>
  >([]);
  const [showModal, setShowModal] = useState(false);

  const [stream, setStream] = useState<any | null>(null);
  const [waveformData, setWaveformData] = useState<number[]>(
    Array(60).fill(10)
  );
  const waveform = useAudioWaveform(stream, 60, isPaused);
  const timerRef = useRef<number | null>(null);
  const recordingStartTimeRef = useRef<number | null>(null);
  const lastPauseTimeRef = useRef<number | null>(null);
  const lastElapsedTimeRef = useRef<number>(0);
  const actualRecordingTimeRef = useRef<number>(0); // Track actual recording time only
  const isPausedRef = useRef<boolean>(false);
  const savingRef = useRef(false);
  const discardingRef = useRef(false);
  const pauseResumeInProgressRef = useRef<boolean>(false);

  // Add state to track if we're waiting for blob creation
  const [waitingForBlob, setWaitingForBlob] = useState(false);

  const { setUpload, clearUpload } = useUpload();

  // Helper function to safely clean up streams (real or simulated)
  const safelyCleanupStream = (streamToClean: any, context: string = "") => {
    if (!streamToClean) return;

    console.log(`🧹 Cleaning up ${context ? context + " " : ""}stream...`);

    // Only call getTracks if it's a real MediaStream, not a simulated one
    if (
      streamToClean.getTracks &&
      typeof streamToClean.getTracks === "function"
    ) {
      streamToClean
        .getTracks()
        .forEach((track: MediaStreamTrack) => track.stop());

      return {
        streamId: streamToClean.id || "unknown",
        tracksCount: streamToClean.getTracks().length,
        type: "real",
      };
    } else {

      return {
        streamId: "simulated",
        tracksCount: 0,
        type: "simulated",
      };
    }
  };

  // Initialize state with recovery on component mount
  useEffect(() => {
    const initializeState = async () => {
      try {
        // Get the current recording state immediately to avoid flicker
        if (chrome?.storage?.local) {
          const currentState = await chrome.storage.local.get([
            "isRecording",
            "isPaused",
            "elapsedSeconds",
          ]);

          console.log(
            "RecordSection initializing with current state:",
            currentState
          );

          if (currentState.isRecording) {
            setRecording(true);
            setIsPaused(currentState.isPaused || false);
            isPausedRef.current = currentState.isPaused || false;

            // Use the stored elapsedSeconds directly for immediate accurate display
            if (typeof currentState.elapsedSeconds === "number") {
              setElapsed(currentState.elapsedSeconds);
              lastElapsedTimeRef.current = currentState.elapsedSeconds;
            }

            setStatus(
              currentState.isPaused
                ? "Recording paused"
                : "Recording in progress..."
            );

            // No MediaStream needed - waveform will be simulated to avoid mic permission conflicts
            console.log(
              "Recording active - using simulated waveform to avoid mic permission conflicts"
            );

            console.log("Initialized with timer:", {
              isRecording: true,
              isPaused: currentState.isPaused,
              elapsedSeconds: currentState.elapsedSeconds,
            });
          } else {
            // Not recording
            setRecording(false);
            setIsPaused(false);
            isPausedRef.current = false;
            setElapsed(0);
            setStatus("Ready to record");
          }
        }
      } catch (error) {
        console.error("Error initializing RecordSection state:", error);
        setStatus("Ready to record");
      }
    };

    initializeState();
  }, []);

  // Manage stream state for local waveform hook (when not recording)
  useEffect(() => {
    if (recording) {
      // When recording, we get waveform data from content script
      // Clear any local stream to avoid conflicts
      if (stream) {
        console.log(
          "🧹 Clearing local stream - using content script waveform data"
        );
        if (stream && typeof stream.getTracks === "function") {
          stream.getTracks().forEach((track: MediaStreamTrack) => {
            track.stop();
          });
        }
        setStream(null);
      }
    } else if (!recording && !stream) {
      // When not recording, use simulated stream for default waveform
      console.log("🎵 Using simulated waveform for idle state");
      setStream({ simulate: true });
    }
  }, [recording]);

  // Listen for timer updates from background script
  useEffect(() => {
    const handleTimerUpdate = (event: CustomEvent) => {
      const data = event.detail;
      console.log("RecordSection received timer update:", data);

      if (data.action === "timerUpdate") {
        // Real-time timer update from background - only update if values are valid
        if (
          typeof data.elapsedSeconds === "number" &&
          data.elapsedSeconds >= 0
        ) {
          setElapsed(data.elapsedSeconds);
          lastElapsedTimeRef.current = data.elapsedSeconds;
        }

        setRecording(data.isRecording);
        setIsPaused(data.isPaused);
        isPausedRef.current = data.isPaused;

        // Update status
        if (data.isRecording) {
          setStatus(
            data.isPaused ? "Recording paused" : "Recording in progress..."
          );
        }

        console.log("Timer updated:", {
          elapsedSeconds: data.elapsedSeconds,
          isPaused: data.isPaused,
          isRecording: data.isRecording,
        });
      } else if (data.action === "recordingStateChanged") {
        // State change (start/stop/pause/resume) - only update if values are valid
        const wasRecording = recording;
        setRecording(data.isRecording);
        setIsPaused(data.isPaused);
        isPausedRef.current = data.isPaused;

        if (
          typeof data.elapsedSeconds === "number" &&
          data.elapsedSeconds >= 0
        ) {
          setElapsed(data.elapsedSeconds);
          lastElapsedTimeRef.current = data.elapsedSeconds;
        }

        if (data.isRecording) {
          setStatus(
            data.isPaused ? "Recording paused" : "Recording in progress..."
          );

          // If recording just started and we don't have a stream, we'll get waveform data from content script
          if (!wasRecording && !stream) {
            console.log(
              "🎵 Cross-tab recording detected - will receive waveform data from content script"
            );
            // No need to request MediaStream - content script will send waveform data
          }
        } else {
          // Reset state when recording stops (unless manually navigating to processing)
          setElapsed(0);
          lastElapsedTimeRef.current = 0;
          setStatus("Ready to record");

          // Clear waveform data when recording stops
          console.log("🧹 Clearing waveform data - recording stopped...");
          setWaveformData(Array(60).fill(10)); // Reset to default
          if (stream) {
            setStream(null);
          }
        }

       
      }
    };

    // Add event listener for timer updates
    window.addEventListener(
      "recordingStateUpdate",
      handleTimerUpdate as EventListener
    );

    // ALSO listen for direct window messages (backup communication channel)
    const handleDirectMessage = (event: MessageEvent) => {
      console.log("🎤 RecordSection received direct window message:", {
        type: event.data?.type,
        origin: event.origin,
        timestamp: event.data?.timestamp,
      });

      // Handle content script responses that might come through direct window messages
      if (event.data?.type === "RECORDING_STATE_UPDATE") {
        console.log(
          "🎤 Processing direct recording state update:",
          event.data.data
        );
        const updateEvent = new CustomEvent("recordingStateUpdate", {
          detail: event.data.data,
        });
        window.dispatchEvent(updateEvent);
      } else if (event.data?.type === "WAVEFORM_DATA") {
        // Handle waveform data from content script
        const isFromRecordingTab = event.data.fromRecordingTab;
        console.log("🎵 Received waveform data from content script:", {
          dataLength: event.data.data?.length,
          maxValue: event.data.data ? Math.max(...event.data.data) : 0,
          avgValue: event.data.data
            ? event.data.data.reduce((a: number, b: number) => a + b, 0) /
              event.data.data.length
            : 0,
          fromRecordingTab: isFromRecordingTab,
          source: isFromRecordingTab ? "Recording Tab" : "Local",
        });

        if (event.data.data && Array.isArray(event.data.data)) {
          setWaveformData(event.data.data);

       
        }
      }
    };

    window.addEventListener("message", handleDirectMessage);

    return () => {
      window.removeEventListener(
        "recordingStateUpdate",
        handleTimerUpdate as EventListener
      );
      window.removeEventListener("message", handleDirectMessage);

      // Reset navigation flag when component unmounts
    };
  }, [ recording,stream]);
  const processRecordingBlob = async (blob: Blob, duration: number) => {
    try {
      console.log('🎯 Processing recording blob directly...', {
        blobSize: blob.size,
        blobType: blob.type,
        duration: duration
      });
      setStatus('Processing recording...');
      
      console.log('📊 Recording blob details:', {
        blobSize: blob.size,
        blobType: blob.type,
        sizeInMB: (blob.size / 1024 / 1024).toFixed(2) + ' MB',
        duration: duration
      });
      
      // Convert blob to File object for upload context
      const audioFile = new File([blob], `recording_${Date.now()}.webm`, {
        type: 'audio/webm'
      });
      
      console.log('📁 Created audio file:', {
        name: audioFile.name,
        size: audioFile.size,
        type: audioFile.type
      });
      
      // Set upload object in context - Direct file transfer without local storage
      const durationInSeconds = duration / 1000; // Convert milliseconds to seconds
      console.log('RecordSection - Setting upload with duration:', durationInSeconds, 'seconds');
      await setUpload({
        type: 'audio',
        file: audioFile,
        name: audioFile.name,
        size: audioFile.size,
        mime: audioFile.type,
        fileUrl: URL.createObjectURL(blob),
        duration: durationInSeconds
      });
      
      console.log('✅ Upload object set in context - ready for direct transfer');
      
      // Create audio URL for playback (optional)
      const audioUrl = URL?.createObjectURL(blob);
      setAudioUrl(audioUrl);
      
      console.log('✅ Recording blob processed successfully - navigating to processing');
      
      // Navigate directly to processing page with audio data in context
      navigate('/popup/record/process');
      
    } catch (error) {
      console.error('❌ Error processing recording blob:', error);
      setStatus('Error processing recording');
      
      // Clear upload context on error to prevent stale data
      await clearUpload();
      
      // Navigate to error page
      navigate('/popup/error');
    }
  };

  // Add message listener for download trigger and snapshot results
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Handle direct blob from content script (for finish button)
      if (event.data?.type === 'RECORDING_BLOB_READY' && event.data?.data?.blob) {
        console.log('🎯 Received recording blob directly from content script:', {
          blobSize: event.data.data.blob.size,
          blobType: event.data.data.blob.type,
          sessionId: event.data.data.sessionId,
          duration: event.data.data.duration
        });
        
        // Process the blob immediately - call API
        processRecordingBlob(event.data?.data?.blob, event.data?.data?.duration);
      } else if (event.data?.type === 'RECORDING_BLOB_READY') {
        console.log('⚠️ RECORDING_BLOB_READY received but no blob data:', event.data);
      }
      
      // Handle download trigger from content script
      if (event.data?.type === 'TRIGGER_DOWNLOAD' && event.data?.data?.blob) {
        console.log('📥 Received download trigger from content script:', {
          blobSize: event.data.data.blob.size,
          blobType: event.data.data.blob.type,
          sessionId: event.data.data.sessionId
        });
        
        // Trigger download with the provided blob
        downloadRecording(event.data?.data?.blob);
      }
      
      // Handle snapshot result
      if (event.data?.type === 'RECORDING_SNAPSHOT_RESULT') {
        console.log('🎬 Received recording snapshot result:', event.data.data);
        // This will be handled by the Promise in handleSaveForLater
      }
    };

    window.addEventListener('message', handleMessage);
    
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  // Add function to process recording blob directly


  // ---- helpers ----
  const sendMessage = (msg: { action: string; [key: string]: unknown }) =>
    new Promise<any>((resolve, reject) => {
      try {
        chrome.runtime.sendMessage(msg, (response) => {
          if (chrome.runtime.lastError) {
            console.error("Chrome runtime error:", chrome.runtime.lastError);
            reject(chrome.runtime.lastError);
            return;
          }
          resolve(response);
        });
      } catch (err) {
        console.error("Error sending message:", err);
        reject(err);
      }
    });

  // Helper function to request microphone permission via content script
  const requestMicrophonePermission = async (): Promise<boolean> => {
    try {
      console.log("🎤 Requesting microphone permission via content script...");

      // Send permission request to content script (main page context)
      return new Promise((resolve) => {
        let permissionGranted = false;

        // Set up listener for permission result
        const handlePermissionResult = (event: MessageEvent) => {
          console.log("🎤 Popup received message event:", {
            type: event.data?.type,
            origin: event.origin,
            source: event.source,
            data: event.data,
          });

          if (event.data?.type === "MICROPHONE_PERMISSION_RESULT") {
            console.log("🎤 Processing permission result:", event.data.data);

            if (permissionGranted) return; // Already handled
            permissionGranted = true;

            const result = event.data.data;
            if (result.success) {
              console.log(
                "✅ Microphone permission granted via content script!"
              );
              setStatus("✅ Microphone permission granted!");
              resolve(true); // Indicate permission granted
            } else {
              console.error("❌ Microphone permission denied:", result);

              // Handle different types of errors
              switch (result.error) {
                case "NotAllowedError":
                  setStatus(
                    "❌ Microphone permission denied. Click the microphone icon in your address bar to allow access."
                  );
                  alert(`❌ Microphone permission denied.

To start recording, please:

1. Look for the microphone icon (🎤) in your browser's address bar
2. Click on it and select "Allow"
3. If you don't see the icon, reload this page and try again
4. Or go to browser Settings → Privacy → Microphone and allow access

Then click the record button again.`);
                  break;

                case "NotFoundError":
                  setStatus(
                    "❌ No microphone detected. Please connect a microphone."
                  );
                  alert(
                    "No microphone found. Please connect a microphone to your device and try again."
                  );
                  break;

                case "NotReadableError":
                  setStatus(
                    "❌ Microphone is being used by another application."
                  );
                  alert(
                    "Your microphone is being used by another application. Please close other apps that might be using your microphone and try again."
                  );
                  break;

                default:
                  setStatus(`❌ Microphone error: ${result.message}`);
                  alert(
                    `Microphone access error: ${result.message}\n\nPlease check your microphone settings and try again.`
                  );
              }

              resolve(false); // Indicate permission denied
            }

            // Remove listener after handling
            window.removeEventListener("message", handlePermissionResult);
          }
        };

        // Add listener for permission result
        console.log("🎤 Adding permission result listener...");
        window.addEventListener("message", handlePermissionResult);

        // Request permission from content script
        console.log("🎤 Sending permission request to content script...");

        // Try multiple methods to communicate with content script
        try {
          // Method 1: Direct postMessage to parent window
          if (window.parent && window.parent !== window) {
            console.log("🎤 Sending to parent window...");
            window.parent.postMessage(
              {
                type: "REQUEST_MICROPHONE_PERMISSION",
                timestamp: Date.now(),
              },
              "*"
            );
          }

          // Method 2: Direct postMessage to top window
          if (window.top && window.top !== window) {
            console.log("🎤 Sending to top window...");
            window.top.postMessage(
              {
                type: "REQUEST_MICROPHONE_PERMISSION",
                timestamp: Date.now(),
              },
              "*"
            );
          }

          // Method 3: Try direct window communication
          console.log("🎤 Sending to window...");
          window.postMessage(
            {
              type: "REQUEST_MICROPHONE_PERMISSION",
              timestamp: Date.now(),
            },
            "*"
          );
        } catch (commError) {
          console.error("🎤 Communication error:", commError);
        }

        console.log("🎤 Permission request sent to content script");

        // Set a timeout to try direct browser permission if content script doesn't respond
        setTimeout(async () => {
          if (permissionGranted) return; // Already handled

          console.warn(
            "🎤 Content script permission request timeout, trying direct browser permission..."
          );

          try {
            // Direct browser permission as fallback
            console.log("🎤 Trying direct browser permission...");
            setStatus("Requesting microphone access directly...");

            const stream = await navigator.mediaDevices.getUserMedia({
              audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
                sampleRate: 44100,
                channelCount: 1,
              },
            });

            // Permission granted - stop the test stream
            stream.getTracks().forEach((track) => track.stop());

            console.log("✅ Direct browser microphone permission granted!");
            setStatus("✅ Microphone permission granted!");
            permissionGranted = true;
            window.removeEventListener("message", handlePermissionResult);
            resolve(true);
          } catch (directError: any) {
            console.error(
              "❌ Direct browser permission also failed:",
              directError
            );

            let errorMessage = "Microphone access denied.";
            if (directError.name === "NotAllowedError") {
              errorMessage =
                "Microphone permission denied. Please allow access in your browser settings.";
            } else if (directError.name === "NotFoundError") {
              errorMessage =
                "No microphone device found. Please connect a microphone.";
            } else if (directError.name === "NotReadableError") {
              errorMessage = "Microphone is being used by another application.";
            }

            setStatus(`❌ ${errorMessage}`);
            alert(
              `${errorMessage}\n\nPlease:\n1. Check your browser's microphone settings\n2. Ensure no other applications are using your microphone\n3. Try refreshing the page and granting permission when prompted`
            );

            permissionGranted = true;
            window.removeEventListener("message", handlePermissionResult);
            resolve(false);
          }
        }, 15000); // Try direct permission after 15 seconds if content script doesn't respond
      });
    } catch (error) {
      console.error("❌ Error requesting microphone permission:", error);
      setStatus("❌ Error requesting microphone permission. Please try again.");
      alert("Error requesting microphone permission. Please try again.");
      return false;
    }
  };

  // const formatClock = (secs: number) => {
  //   const m = Math.floor(secs / 60);
  //   const s = Math.floor(secs % 60);
  //   return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  // };

  // ---------- Robust timer + controls (paste-in replacement) ----------

  // Ensure isPausedRef syncs with state to avoid closure staleness
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // stopTimer (stable, clears interval)
  const stopTimer = useCallback(() => {
    if (timerRef.current != null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    // don't necessarily null recordingStartTimeRef here if you want resume to work
  }, []);

  // pauseTimer (clears interval and records pause time)
  const pauseTimer = useCallback(() => {
    console.log("Pausing timer at elapsed time:", lastElapsedTimeRef.current);
    if (timerRef.current != null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    lastPauseTimeRef.current = Date.now();
    console.log("Timer paused at:", lastPauseTimeRef.current);
  }, []);

  // resumeTimer - DISABLED: Timer is now managed by background script
  const resumeTimer = useCallback(() => {
    console.log(
      "Timer is now managed by background script - local timer disabled"
    );
    lastPauseTimeRef.current = null;
  }, []);

  // Timer is now managed by background script - no local timer needed
  const startTimer = useCallback((initialElapsed = 0) => {
    console.log("Timer management is now handled by background script");
    // Just update local state - background handles the actual timing
    setElapsed(initialElapsed);
    lastElapsedTimeRef.current = initialElapsed;
    actualRecordingTimeRef.current = initialElapsed;
  }, []);

  // handleStartStop (robust start/stop with checks + timer handling)
  // handleStartStop (robust start/stop with automatic audioUrl handling)
  const handleStartStop = async () => {
    const functionStartTime = Date.now();
    mediaDebugger.startPerformanceTrack("RecordSection-START_STOP");

    console.log("🎯 handleStartStop called with state:", {
      recording,
      isPaused,
      elapsed,
      timestamp: functionStartTime,
      action: recording ? "STOP" : "START",
    });

    try {
      setIsLoading(true);

      if (!recording) {
        // ---------- START RECORDING ----------
        mediaDebugger.logStartRecording("RecordSection", {
          timestamp: functionStartTime,
          userAgent: navigator.userAgent,
          chromeAvailable: !!chrome?.runtime,
          offscreenAvailable: !!chrome?.offscreen,
        });

        setStatus("Requesting microphone access...");
        console.log("Starting recording...");

        // Check Chrome extension context
        if (!chrome?.runtime) {
          throw new Error("Chrome extension APIs not available");
        }
        if (!chrome?.offscreen) {
          throw new Error(
            "Chrome offscreen API not available. Chrome 109+ required"
          );
        }

        // Test background connectivity
        const testResponse = await sendMessage({ action: "getStatus" });
        console.log("Background script test response:", testResponse);

        // Request microphone permission directly in the popup (no redirect needed!)
        setStatus(
          "Click 'Allow' when browser asks for microphone permission..."
        );
        console.log("🎤 About to call requestMicrophonePermission()...");

        // Test communication with content script first
        console.log("🧪 Testing communication with content script...");
        window.parent.postMessage(
          {
            type: "TEST_MESSAGE",
            data: "Hello from popup!",
          },
          "*"
        );

        const hasPermission = await requestMicrophonePermission();
        console.log(
          "🎤 requestMicrophonePermission() returned:",
          hasPermission
        );

        if (!hasPermission) {
          // Permission was denied, error already handled in helper function
          setIsLoading(false);
          return;
        }

        console.log(
          "✅ Microphone permission confirmed, proceeding with recording..."
        );
        setStatus("Microphone permission granted, starting recording...");

        // Store flag indicating permission was granted via content script
        await chrome?.storage?.local.set({
          currentView: "recording",
          recordingStartTime: Date.now(),
          microphonePermissionGranted: true, // Flag for offscreen document
        });

        setStatus("Starting recording...");
        // Use content script recording instead of offscreen when permission granted in main page
        console.log(
          "🎤 Starting recording via content script (main page context)..."
        );

        // Send recording request to content script
        const recordingResult = await new Promise<{
          success: boolean;
          error?: string;
          message?: string;
        }>((resolve) => {
          // Set up listener for recording result
          const handleRecordingResult = (event: MessageEvent) => {
            if (event.data.type === "START_RECORDING_RESULT") {
              console.log("Received start recording result:", event.data.data);
              resolve(event.data.data);
              window.removeEventListener("message", handleRecordingResult);
            }
          };

          window.addEventListener("message", handleRecordingResult);

          // Send start recording request to content script
          window.parent.postMessage(
            {
              type: "START_RECORDING_IN_MAIN_PAGE",
            },
            "*"
          );

          // Timeout after 10 seconds
          setTimeout(() => {
            window.removeEventListener("message", handleRecordingResult);
            resolve({ success: false, error: "Timeout" });
          }, 10000);
        });

        console.log("Content script recording response:", recordingResult);

        if (!recordingResult.success) {
          throw new Error(
            `Failed to start recording: ${
              recordingResult.error ||
              recordingResult.message ||
              "Unknown error"
            }`
          );
        }

        // Immediately set recording state in popup for instant feedback
        console.log(
          "✅ Recording started successfully, updating popup state..."
        );
        setRecording(true);
        setIsPaused(false);
        isPausedRef.current = false;
        setElapsed(0);
        lastElapsedTimeRef.current = 0;

        // The real MediaStream for waveform will be created by the useEffect hook above
        // No need to create a simulated stream here since we want real audio visualization

        setStatus("Recording in progress...");
        console.log("🎬 Popup state updated for recording");

        mediaDebugger.logSuccess("RecordSection", "START_RECORDING", {
          timestamp: Date.now() - functionStartTime,
          response: recordingResult,
          recordingActive: true,
          streamSimulated: true,
        });

        // Timer is managed by background script - no local timer needed
        console.log("Recording started successfully!");
      } else {
        // ---------- STOP RECORDING ----------
        mediaDebugger.log("STOP_RECORDING_START", "RecordSection", {
          elapsedTime: lastElapsedTimeRef.current,
          streamActive: stream?.active,
          recordingDuration:
            Date.now() -
            (await chrome?.storage?.local.get("recordingStartTime"))
              ?.recordingStartTime,
        });

        setStatus("Stopping recording...");
        console.log("Stopping recording...");

        // Clean up the waveform MediaStream
        if (stream) {
          const cleanupResult = safelyCleanupStream(stream, "waveform");

          mediaDebugger.log("STREAM_CLEANUP", "RecordSection", cleanupResult);

          setStream(null);
        }

        // Check if recording is actually active before stopping
        const currentState = await chrome.storage.local.get([
          "isRecording",
          "recordingTabId",
          "isPaused",
        ]);
        // console.log("🔍 Current state check before stopping:", {
        //   isRecording: currentState.isRecording,
        //   isPaused: currentState.isPaused,
        //   localRecording: recording,
        //   localIsPaused: isPaused,
        //   recordingTabId: currentState.recordingTabId,
        // });

        if (!currentState?.isRecording) {
          console.warn("⚠️ Recording is not active in storage - cannot stop");
          setStatus("No active recording to stop");
          return;
        }

        // Use content script to stop recording - try current tab first, then recording tab
        console.log("🎤 Stopping recording via content script...");

        const stopResult = await new Promise<{
          success: boolean;
          error?: string;
          message?: string;
          blob: Blob;
          duration: number;
          sessionId?: string;
        }>((resolve) => {
          // Set up listener for stop recording result
          const handleStopResult = (event: MessageEvent) => {
            if (event.data?.type === "STOP_RECORDING_RESULT") {
              console.log("Received stop recording result:", event.data?.data);
              resolve(event.data?.data);
              window.removeEventListener("message", handleStopResult);
            }
          };

          window.addEventListener("message", handleStopResult);

          // Send stop recording request to content script
          window.parent.postMessage(
            {
              type: "STOP_RECORDING_IN_MAIN_PAGE",
            },
            "*"
          );
          

          // Timeout after 10 seconds - if no response, try via background script
          setTimeout(async () => {
            window.removeEventListener("message", handleStopResult);

            // Try to stop via background script forwarding to recording tab
            if (currentState?.recordingTabId) {
              console.log(
                "⏰ Direct stop timeout, trying via background script to recording tab..."
              );
              try {
                const bgResponse = await chrome.runtime.sendMessage({
                  action: "forwardRecordingCommand",
                  command: "stop",
                  targetTabId: currentState.recordingTabId,
                });
                resolve(bgResponse || { success: true, blob: new Blob(), duration: 0 });
              } catch (error) {
                resolve({
                  success: false,
                  error: "Timeout and background forwarding failed",
                  blob: new Blob(),
                  duration: 0
                });
              }
            } else {
              resolve({ success: false, error: "Timeout", blob: new Blob(), duration: 0 });
            }
          }, 10000);
        });

        console.log("Stop recording response:", stopResult);
        console.log("🔍 Stop result details:", {
          success: stopResult.success,
          hasBlob: !!stopResult.blob,
          blobSize: stopResult.blob?.size || 0,
          duration: stopResult.duration,
          sessionId: stopResult.sessionId,
          error: stopResult.error,
          message: stopResult.message
        });

        if (!stopResult.success) {
          console.warn(
            "Stop recording failed:",
            stopResult.error || stopResult.message
          );
        }

        // Process the recording blob if we have one
        if (stopResult.blob && stopResult.blob.size > 0) {
          console.log("🎯 Processing recording blob from stop result...", {
            blobSize: stopResult.blob.size,
            blobType: stopResult.blob.type,
            duration: stopResult.duration
          });
          await processRecordingBlob(stopResult.blob, stopResult.duration || 0);
          return; // processRecordingBlob will handle navigation
        } else {
          console.log("⚠️ No blob in stop result, waiting for RECORDING_BLOB_READY message...");
          console.log("🔍 Available stop result properties:", Object.keys(stopResult));
 
        }

        stopTimer();
        setRecording(false);
        setIsPaused(false);
        isPausedRef.current = false;
        setElapsed(0);
        lastElapsedTimeRef.current = 0;
        setStatus("Processing recording...");

        // Clear waveform data when recording stops
        console.log("🧹 Clearing waveform data - recording stopped...");
        setWaveformData(Array(60).fill(10)); // Reset to default

        // Clear simulated waveform
        if (stream) {
          console.log("🧹 Clearing simulated waveform...");
          setStream(null);
        }

        console.log("🎬 Popup state reset after recording stop");
        console.log("🧭 Recording stopped - audio data will be processed directly via context");
      }
    
    } catch (error) {
      console.error("Recording error:", error);

      let errorMessage = "An unexpected error occurred";

      if (error instanceof Error) {
        if (error.message.includes("permission")) {
          errorMessage =
            "Microphone permission is required. Please allow access and try again.";
        } else if (error.message.includes("not available")) {
          errorMessage =
            "Chrome extension APIs not available. Please try reloading the extension.";
        } else if (error.message.includes("getUserMedia not supported")) {
          errorMessage = "Your browser doesn't support audio recording.";
        } else if (error.message.includes("No microphone device found")) {
          errorMessage =
            "No microphone found. Please connect a microphone and try again.";
        } else if (
          error.message.includes("being used by another application")
        ) {
          errorMessage =
            "Microphone is in use by another app. Please close other apps and try again.";
        } else {
          errorMessage = error.message;
        }
      }

      setStatus(`Error: ${errorMessage}`);

      mediaDebugger.logError("RecordSection", "START_STOP_RECORDING", error, {
        errorMessage,
        recording,
        stream: !!stream,
        elapsedTime: lastElapsedTimeRef.current,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
      });

      // Cleanup media stream on error
      if (stream) {
        safelyCleanupStream(stream, "error");
        setStream(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // togglePause (atomic updates with ref to avoid stale closures)
  const togglePause = async () => {
    console.log("🔄 togglePause called with current state:", {
      isPaused: isPausedRef.current,
      recording,
      inProgress: pauseResumeInProgressRef.current,
      action: isPausedRef.current ? "RESUME" : "PAUSE",
    });

    // Prevent rapid successive calls
    if (pauseResumeInProgressRef.current) {
      mediaDebugger.logWarning(
        "RecordSection",
        "PAUSE_RESUME_DEBOUNCE",
        "Operation already in progress",
        {
          isPaused: isPausedRef.current,
          recording,
        }
      );
      console.log("Pause/Resume operation already in progress, ignoring...");
      return;
    }

    pauseResumeInProgressRef.current = true;
    const actionType = isPausedRef.current ? "RESUME" : "PAUSE";
    mediaDebugger.startPerformanceTrack(
      `RecordSection-${actionType}_RECORDING`
    );

    try {
      // First validate current state with background
      const currentState = await chrome?.storage?.local.get([
        "isRecording",
        "isPaused",
      ]);
      const backgroundRecording = currentState?.isRecording || false;
      const backgroundPaused = currentState?.isPaused || false;

      mediaDebugger.log("STATE_VALIDATION_BEFORE_TOGGLE", "RecordSection", {
        localRecording: recording,
        localPaused: isPausedRef.current,
        backgroundRecording,
        backgroundPaused,
        actionType,
      });

      // Validate state consistency
      if (!backgroundRecording) {
        throw new Error(
          "Recording not active in background. Please start recording first."
        );
      }

      if (isPausedRef.current && !backgroundPaused) {
        // Local state says paused but background says not paused - sync states
        mediaDebugger.logWarning(
          "RecordSection",
          "STATE_SYNC",
          "Local and background pause states out of sync",
          {
            localPaused: isPausedRef.current,
            backgroundPaused,
          }
        );
        isPausedRef.current = backgroundPaused;
        setIsPaused(backgroundPaused);
      }

      console.log(
        `🔄 ${isPausedRef.current ? "Resuming" : "Pausing"} recording...`
      );

      if (isPausedRef.current) {
        mediaDebugger.logResumeRecording("RecordSection", {
          previousPausedState: isPausedRef.current,
          elapsedTime: lastElapsedTimeRef.current,
          timestamp: Date.now(),
        });
      } else {
        mediaDebugger.logPauseRecording("RecordSection", {
          currentDuration: lastElapsedTimeRef.current,
          timestamp: Date.now(),
          wasRecording: recording,
        });
      }

      const action = isPausedRef.current ? "resumeRecording" : "pauseRecording";

      // Use content script for pause/resume instead of background script
      console.log(
        `🎤 ${
          isPausedRef.current ? "Resuming" : "Pausing"
        } recording via content script...`
      );

      const pauseResumeResult = await new Promise<{
        success: boolean;
        error?: string;
        message?: string;
      }>((resolve) => {
        // Set up listener for pause/resume result
        const handlePauseResumeResult = (event: MessageEvent) => {
          console.log("🎤 Popup received message event for pause/resume:", {
            type: event.data?.type,
            origin: event.origin,
            source: event.source,
            data: event.data,
          });

          const expectedType = isPausedRef.current
            ? "RESUME_RECORDING_RESULT"
            : "PAUSE_RECORDING_RESULT";
          if (event.data.type === expectedType) {
            console.log(
              `✅ Received expected ${action} result:`,
              event.data.data
            );
            resolve(event.data.data);
            window.removeEventListener("message", handlePauseResumeResult);
          }
        };

        window.addEventListener("message", handlePauseResumeResult);

        // Send pause/resume request to content script
        const messageType = isPausedRef.current
          ? "RESUME_RECORDING_IN_MAIN_PAGE"
          : "PAUSE_RECORDING_IN_MAIN_PAGE";
        console.log(`📤 Sending ${messageType} to content script...`);

        // Try multiple communication methods
        try {
          // Method 1: Parent window
          if (window.parent && window.parent !== window) {
            console.log("📤 Sending via window.parent...");
            window.parent.postMessage(
              {
                type: messageType,
                timestamp: Date.now(),
                from: "popup",
              },
              "*"
            );
          }

          // Method 2: Top window
          if (window.top && window.top !== window) {
            console.log("📤 Sending via window.top...");
            window.top.postMessage(
              {
                type: messageType,
                timestamp: Date.now(),
                from: "popup",
              },
              "*"
            );
          }

          // Method 3: Direct window
          console.log("📤 Sending via window.postMessage...");
          window.postMessage(
            {
              type: messageType,
              timestamp: Date.now(),
              from: "popup",
            },
            "*"
          );
        } catch (commError) {
          console.error("❌ Communication error:", commError);
        }

        console.log(
          `📤 ${messageType} requests sent to content script via multiple channels`
        );

        // Timeout after 10 seconds
        setTimeout(() => {
          console.warn(`⏰ ${action} request timeout after 10 seconds`);
          window.removeEventListener("message", handlePauseResumeResult);
          resolve({
            success: false,
            error: "Timeout",
            message: `${action} request timed out. Please try again.`,
          });
        }, 10000);
      });

      console.log(`📋 ${action} response:`, pauseResumeResult);

      if (pauseResumeResult.success) {
        // Flip pause state synchronously via ref + state
        const newPausedState = !isPausedRef.current;
        isPausedRef.current = newPausedState;
        setIsPaused(newPausedState);

        if (newPausedState) {
          // We are now paused
          console.log(
            "⏸️ Recording paused - keeping waveform active for visual feedback"
          );

          mediaDebugger.logSuccess("RecordSection", "PAUSE_RECORDING", {
            response: pauseResumeResult,
            elapsedTime: lastElapsedTimeRef.current,
            pausedTime: Date.now(),
            timerStopped: true,
          });

          // Timer is managed by background script - no local timer control needed
          await chrome?.storage?.local.set({
            pausedTime: Date.now(),
            isPaused: true,
          });
          setStatus("Recording paused");
        } else {
          // We are now resumed
          console.log("▶️ Recording resumed");

          mediaDebugger.logSuccess("RecordSection", "RESUME_RECORDING", {
            response: pauseResumeResult,
            elapsedTime: lastElapsedTimeRef.current,
            resumeTime: Date.now(),
            timerRestarted: true,
          });

          // Timer is managed by background script - no local timer control needed
          await chrome?.storage?.local.set({
            isPaused: false,
            pausedTime: null,
          });
          setStatus("Recording in progress...");
        }
      } else {
        console.warn("Unexpected pause/resume response:", pauseResumeResult);
        throw new Error(
          `${action} failed: ${
            pauseResumeResult?.error ||
            pauseResumeResult?.message ||
            "Unknown error"
          }`
        );
      }
    } catch (error) {
      console.error("Pause/Resume error:", error);

      mediaDebugger.logError("RecordSection", "PAUSE_RESUME", error, {
        isPaused: isPausedRef.current,
        recording,
        elapsedTime: lastElapsedTimeRef.current,
        timestamp: Date.now(),
      });

      setStatus(
        `Pause/Resume error: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    } finally {
      // Always reset the in-progress flag
      pauseResumeInProgressRef.current = false;
    }
  };

  // cleanup on unmount (prevent leaking intervals)
  useEffect(() => {
    return () => {
      if (timerRef.current != null) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      // Clean up MediaStream on unmount
      if (stream) {
        safelyCleanupStream(stream, "component unmount");
      }
    };
  }, [stream]);

  // const fetchRecording = useCallback(async (): Promise<void> => {
  //   try {
  //     console.log("Fetching recording...");
  //     const res = await sendMessage({ action: "getRecordingUrl" });
  //     console.log("Recording data response:", res);

  //     if (res?.hasData && res.data) {
  //       console.log("Creating audio blob from base64 data...");

  //       const byteChars = atob(res.data);
  //       const byteNumbers = new Uint8Array(byteChars.length);
  //       for (let i = 0; i < byteChars.length; i++) {
  //         byteNumbers[i] = byteChars.charCodeAt(i);
  //       }

  //       let blob: Blob;
  //       try {
  //         blob = new Blob([byteNumbers], { type: "audio/webm;codecs=opus" });
  //       } catch {
  //         blob = new Blob([byteNumbers], { type: "audio/webm" });
  //       }

  //       const url = URL.createObjectURL(blob);
  //       setAudioUrl(url);

  //       // Clean up old object URLs
  //       if (audioRef.current?.src) {
  //         URL.revokeObjectURL(audioRef.current.src);
  //       }

  //       if (audioRef.current) {
  //         audioRef.current.onloadedmetadata = () => {
  //           console.log("Audio metadata loaded:", audioRef.current?.duration);
  //         };
  //         audioRef.current.onerror = (e) => {
  //           console.error("Audio load error:", e);
  //           setStatus("Error loading audio playback");
  //         };
  //       }
  //     } else {
  //       console.log("No recording data found");
  //       setAudioUrl(null);
  //     }
  //   } catch (error) {
  //     console.error("Error fetching recording:", error);
  //     setAudioUrl(null);
  //   }
  // }, []);

  // ---- Audio playback ----
  const togglePlay = (): void => {
    const el = audioRef.current;
    if (!el) {
      console.warn("Audio element not found");
      return;
    }

    if (isPlaying) {
      el.pause();
      setIsPlaying(false);
      console.log("Audio paused");
    } else {
      if (el.ended) {
        el.currentTime = 0;
      }

      el.play()
        .then(() => {
          setIsPlaying(true);
          console.log("Audio started playing");
        })
        .catch((error: DOMException) => {
          console.error("Error playing audio:", error);
          setStatus(`Audio playback error: ${error.name} - ${error.message}`);

          if (error.name === "NotAllowedError") {
            setStatus(
              "Audio playback blocked. Please allow playback in browser."
            );
          } else if (error.name === "NotSupportedError") {
            setStatus("Audio format not supported.");
          }
        });
    }
  };

  // ---- Audio element listeners ----
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    const onLoaded = () => setDuration(el.duration || 0);
    const onTime = () => setCurrentTime(el.currentTime || 0);
    const onEnded = () => setIsPlaying(false);

    el.addEventListener("loadedmetadata", onLoaded);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("ended", onEnded);

    return () => {
      el.removeEventListener("loadedmetadata", onLoaded);
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("ended", onEnded);
    };
  }, [audioUrl]);

  // Handle back navigation
  const handleBack = async () => {
    try {
      console.log("🔙 Back/Discard button clicked - clearing recording data");

      if (recording && !audioUrl) {
        const confirmLeave = window.confirm(
          "Are you sure you want to leave? Your recording will be lost."
        );
        if (!confirmLeave) return;

        // Stop recording if user confirms
        console.log("🛑 Stopping active recording due to back/discard action");

        // Stop recording via content script
        try {
          const stopResult = await new Promise<{
            success: boolean;
            error?: string;
          }>((resolve) => {
            const handleStopResult = (event: MessageEvent) => {
              if (event.data.type === "STOP_RECORDING_RESULT") {
                resolve(event.data.data);
                window.removeEventListener("message", handleStopResult);
              }
            };

            window.addEventListener("message", handleStopResult);
            window.parent.postMessage(
              { type: "STOP_RECORDING_IN_MAIN_PAGE" },
              "*"
            );

            setTimeout(() => {
              window.removeEventListener("message", handleStopResult);
              resolve({ success: false, error: "Timeout" });
            }, 5000);
          });

          console.log("📋 Stop recording result for back action:", stopResult);
        } catch (error) {
          console.warn(
            "⚠️ Failed to stop recording via content script:",
            error
          );
        }

        // Clean up waveform stream
        if (stream) {
          safelyCleanupStream(stream, "back navigation");
          setStream(null);
        }

        // Clear waveform data
        setWaveformData(Array(60).fill(10));
      } else if (audioUrl) {
        const confirmDiscard = window.confirm(
          "Are you sure you want to discard this recording?"
        );
        if (!confirmDiscard) return;

        console.log("🗑️ User confirmed discard - clearing recording data");
      }

      // Clear all recording-related data from storage
      console.log("🧹 Clearing all recording data from storage...");
      await chrome?.storage?.local.remove([
        "isRecording",
        "isPaused",
        "recordingStartTime",
        "pausedTime",
        "elapsedSeconds",
        "currentView",
        "lastRecordingStatus",
        "recordingTabId",
      ]);

      // Reset local state
      setRecording(false);
      setIsPaused(false);
      setElapsed(0);
      setAudioUrl(null);
      setStatus("Ready to record");
      setWaveformData(Array(60).fill(10));
      if (stream) {
        setStream(null);
      }

      // Clear recording view state
      await chrome?.storage?.local.set({
        currentView: null,
      });

      // Clear upload context to prevent old recordings from appearing in upload page
      await clearUpload();

      console.log("✅ All recording data cleared - navigating to home");
      // Always navigate back to home
      navigate("/popup/home");
    } catch (error) {
      console.error("❌ Error handling back navigation:", error);
      // Still navigate to home even if cleanup fails
      navigate("/popup/home");
    }
  };

  // Save current route when component mounts
  useEffect(() => {
    const savePreviousRoute = async () => {
      try {
        const { lastPopupRoute } = await chrome.storage.local.get(
          "lastPopupRoute"
        );
        if (lastPopupRoute && lastPopupRoute !== "/popup/record") {
          await chrome?.storage?.local.set({ previousRoute: lastPopupRoute });
        }
      } catch (error) {
        console.error("Error saving previous route:", error);
      }
    };

    savePreviousRoute();
  }, []);

  // ---- Save/Discard Recording (with refs to prevent double actions) ----

  // const saveRecording = async (): Promise<void> => {
  //   if (savingRef.current) return; // prevent spam clicks
  //   savingRef.current = true;

  //   try {
  //     setStatus("Saving recording...");

  //     const res = await sendMessage({ action: "getRecordingUrl" });

  //     if (res?.hasData && res.data) {
  //       const newRecording = {
  //         id: `recording_${Date.now()}`,
  //         data: res.data,
  //         timestamp: Date.now(),
  //         duration: elapsed,
  //       };

  //       setSavedRecordings((prev) => [...prev, newRecording]);

  //       console.log("Recording saved:", {
  //         id: newRecording.id,
  //         duration: newRecording.duration,
  //         dataSize: newRecording.data.length,
  //         timestamp: new Date(newRecording.timestamp).toLocaleString(),
  //       });

  //       setStatus("Recording saved successfully!");

  //       // Reset current state
  //       setAudioUrl(null);
  //       setRecording(false);
  //       setIsPaused(false);
  //       setElapsed(0);
  //       stopTimer();

  //       // Tell background to clear temp buffer
  //       await sendMessage({ action: "discardRecording" });
  //     } else {
  //       setStatus("No recording data to save");
  //     }
  //   } catch (error) {
  //     console.error("Error saving recording:", error);
  //     setStatus(`Error saving recording: ${(error as Error).message}`);
  //   } finally {
  //     savingRef.current = false;
  //   }
  // };

  const discardRecording = async (): Promise<void> => {
    if (discardingRef.current) return; // prevent spam clicks
    discardingRef.current = true;

    try {
      setStatus("Discarding recording...");
      await sendMessage({ action: "discardRecording" });

      // Clean up waveform stream
      if (stream) {
        safelyCleanupStream(stream, "discard");
        setStream(null);
      }

      // Reset local state
      setRecording(false);
      setIsPaused(false);
      setAudioUrl(null);
      setElapsed(0);
      stopTimer();

      setStatus("Recording discarded");
    } catch (error) {
      console.error("Error discarding recording:", error);
      setStatus(`Error discarding recording: ${(error as Error).message}`);
    } finally {
      discardingRef.current = false;
    }
  };

  // Modified downloadRecording function to handle "Save for Later" scenario
  const downloadRecording = async (blob?: Blob, isSaveForLater: boolean = false): Promise<void> => {
    try {
      console.log("💾 Starting audio download...");
      setStatus("Preparing download...");

      let audioBlob: Blob;
      let timestamp: number;

      if (blob) {
        // Use provided blob directly
        audioBlob = blob;
        timestamp = Date.now();
        console.log("📊 Using provided blob:", {
          blobSize: blob.size,
          blobType: blob.type,
          sizeInMB: (blob.size / 1024 / 1024).toFixed(2) + " MB"
        });
      } else {
        // No blob provided and no local storage - cannot download
        setStatus("No recording data found to download");
        console.error("❌ No recording data available for download");
        return;
      }

      // Create filename
      const date = new Date(timestamp);
      const filename = `recording_${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}_${date.getHours().toString().padStart(2, '0')}-${date.getMinutes().toString().padStart(2, '0')}-${date.getSeconds().toString().padStart(2, '0')}.webm`;

      // Try chrome.downloads API first (if available and permission granted)
      try {
        if (chrome?.downloads && chrome?.downloads?.download) {
          console.log("📥 Attempting download via chrome.downloads API...");
          
          const url = URL.createObjectURL(audioBlob);
          
          await new Promise<void>((resolve, reject) => {
            chrome.downloads.download({
              url: url,
              filename: filename,
              saveAs: false
            }, (downloadId) => {
              URL.revokeObjectURL(url);
              if (chrome.runtime.lastError) {
                console.warn("⚠️ chrome.downloads failed, falling back to <a> link:", chrome.runtime.lastError);
                reject(chrome.runtime.lastError);
              } else {
                console.log("✅ Download started via chrome.downloads API, ID:", downloadId);
                resolve();
              }
            });
          });

          setStatus("Recording downloaded successfully!");
          console.log("✅ Audio download completed via chrome.downloads:", filename);
          return;
        }
      } catch (downloadsError) {
        console.warn("⚠️ chrome.downloads API failed, falling back to <a> link:", downloadsError);
      }

      // Fallback to <a> link download
      console.log("📥 Using <a> link download fallback...");
      const url = URL.createObjectURL(audioBlob);
      
      // Create temporary download link and trigger download
      const downloadLink = document.createElement('a');
      downloadLink.href = url;
      downloadLink.download = filename;
      downloadLink.style.display = 'none';
      
      // Add to DOM, click, and remove
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      // Clean up the URL
      URL.revokeObjectURL(url);

      setStatus("Recording downloaded successfully!");
      console.log("✅ Audio download completed via <a> link:", filename);

    } catch (error) {
      console.error("❌ Error downloading recording:", error);
      setStatus(`Download failed: ${(error as Error).message}`);
    }
  };

  // New function to handle "Save for Later" with current recording snapshot
  const handleSaveForLater = async (): Promise<void> => {
  

    try {
      console.log("💾 Save for Later clicked - creating snapshot of current recording...");
      setWaitingForBlob(true);
      setStatus("Creating snapshot of current recording...");

      // Request a snapshot of current recording from content script
      const snapshotResult = await new Promise<{
        success: boolean;
        blob?: Blob;
        error?: string;
      }>((resolve) => {
        const handleSnapshotResult = (event: MessageEvent) => {
          if (event.data.type === "RECORDING_SNAPSHOT_RESULT") {
            console.log("📸 Received recording snapshot:", event.data.data);
            resolve(event.data.data);
            window.removeEventListener("message", handleSnapshotResult);
          }
        };

        window.addEventListener("message", handleSnapshotResult);
        
        // Request snapshot from content script
        window.parent.postMessage(
          { type: "REQUEST_RECORDING_SNAPSHOT" },
          "*"
        );

        // Timeout after 10 seconds
        setTimeout(() => {
          window.removeEventListener("message", handleSnapshotResult);
          resolve({ success: false, error: "Timeout" });
        }, 10000);
      });

      if (!snapshotResult.success || !snapshotResult.blob) {
        throw new Error(`Failed to create snapshot: ${snapshotResult.error}`);
      }

      console.log("📦 Snapshot blob created:", {
        size: snapshotResult.blob.size,
        type: snapshotResult.blob.type,
        sizeInMB: (snapshotResult.blob.size / 1024 / 1024).toFixed(2) + " MB"
      });

      // Download the snapshot blob directly
      await downloadRecording(snapshotResult.blob, true);
      
      console.log("✅ Save for Later completed successfully!");

    } catch (error) {
      console.error("❌ Error in Save for Later:", error);
      setStatus(`Save for Later failed: ${(error as Error).message}`);
    } finally {
      setWaitingForBlob(false);
    }
  };
  // ---- DISABLED: State restore is now handled by background script timer ----
  useEffect(() => {
    console.log(
      "Old state restoration disabled - using background script timer"
    );
  }, []);

  // (UI remains unchanged, only logic improved)
  return (
    <div className=" flex items-center justify-center max-h-fit">
      <div className="  p-4 flex flex-col items-center text-center">
        {/* Back Button */}
        <BackButton handleBack={handleBack} />
        <div className="w-[80%]">
          {/* Title */}
          <h2 className="text-[24px] font-semibold tracking-[-1%] text-[#1F2937] mb-4">
            Record Session
          </h2>

          {/* Timer */}
          <div className="text-[30px] font-bold text-[#4B5563] mb-1"> 
            <span>{Math.floor(elapsed / 3600)}</span>
            <span className="align-super text-[12px] ml-0.5">H</span>{" "}
            <span>
              {Math.floor((elapsed % 3600) / 60)
                .toString()
                .padStart(2, "0")}
            </span>
            <span className="align-super text-[12px] ml-0.5">M</span>{" "}
            <span>{(elapsed % 60).toString().padStart(2, "0")}</span>
            <span className="align-super text-[12px] ml-0.5">S</span>
          </div>

          <div className="h-16 w-full flex items-center justify-center mb-6 relative">
            <div className="flex gap-1 items-center justify-center w-full h-full">
              {(recording ? waveformData : waveform).map((barHeight, i) => (
                <div
                  key={i}
                  className={`w-[1px] ${
                    recording
                      ? isPaused
                        ? "bg-orange-500"
                        : "bg-red-600"
                      : "bg-blue-400"
                  } rounded-sm`}
                  style={{
                    height: `${barHeight}px`,
                    // Center the bar vertically
                    transform: `translateY(${(64 - barHeight) / 2}px)`,
                    transition: "height 35ms linear, transform 35ms linear",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Playback */}

          {/* Test Microphone Button */}
          {/* Temporarily disabled - permissions now handled by content script
          {!recording && !audioUrl && (
          <button
            onClick={async () => {
              try {
                console.log("🎤 Testing microphone access...");
                if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                  alert("ERROR: getUserMedia not supported in this browser!");
                  return;
                }
                
                const testStream = await navigator.mediaDevices.getUserMedia({ 
                  audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 44100,
                    channelCount: 1,
                  }
                });
                
                console.log("✅ Microphone access granted, testing audio levels...");
                
                // Test audio levels for 3 seconds
                const audioContext = new AudioContext();
                const source = audioContext.createMediaStreamSource(testStream);
                const analyser = audioContext.createAnalyser();
                analyser.fftSize = 256;
                const dataArray = new Uint8Array(analyser.frequencyBinCount);
                source.connect(analyser);
                
                let maxLevel = 0;
                const startTime = Date.now();
                
                const checkAudio = () => {
                  analyser.getByteFrequencyData(dataArray);
                  const currentMax = Math.max(...Array.from(dataArray));
                  maxLevel = Math.max(maxLevel, currentMax);
                  
                  if (Date.now() - startTime < 3000) {
                    requestAnimationFrame(checkAudio);
                  } else {
                    console.log(`🎤 Audio test complete. Max level detected: ${maxLevel}`);
                    alert(`Microphone test complete!\nMax audio level: ${maxLevel}\n${maxLevel > 10 ? '✅ Microphone is working!' : '❌ No audio detected - check microphone permissions/settings'}`);
                    
                    // Cleanup
                    if (testStream && testStream.getTracks) {
                      testStream.getTracks().forEach(track => track.stop());
                    }
                    audioContext.close();
                  }
                };
                
                alert("Speak into your microphone for 3 seconds...");
                checkAudio();
                
              } catch (error) {
                console.error("❌ Microphone test failed:", error);
                alert(`ERROR: Microphone access denied - ${error instanceof Error ? error.message : String(error)}`);
              }
            }}
            className="px-4 py-2 bg-green-500 text-white rounded mb-2 text-sm"
          >
            🎤 Test Microphone
          </button>
        )}
        */}

          {/* Controls */}
          <div className="flex flex-col items-center gap-2 mb-4">
            {/* Main Recording Button */}
            {!recording && (
              <img
                onClick={handleStartStop}
                role="button"
                src="/popup/startRecord.svg"
                alt="start"
                className="h-20 w-20 cursor-pointer hover:opacity-80 transition-opacity"
              />
            )}

            {/* Recording in Progress - Show Pause/Resume */}
            {recording &&
              (isPaused ? (
                <img
                  onClick={togglePause}
                  role="button"
                  src="/popup/resumeRecord.svg"
                  alt="resume"
                  className="h-20 w-20 cursor-pointer hover:opacity-80 transition-opacity"
                />
              ) : (
                <img
                  onClick={() => {
                    console.log(
                      "🔴 Main finish button clicked - Current state:",
                      {
                        recording,
                        isPaused,
                        elapsed,
                        timestamp: Date.now(),
                      }
                    );
                    handleStartStop();
                  }}
                  role="button"
                  src="/popup/finishRecord.svg"
                  alt="finish"
                  className="h-20 w-20 cursor-pointer hover:opacity-80 transition-opacity"
                />
              ))}
            {recording ? (
              <span className="font-[600] text-[#4B5563] text-[14px] ">
                {isPaused ? "Resume" : "Finish"}
              </span>
            ) : (
              <span className="text-[14px] font-bold mt-3 mb-6 ">
                Press the button to start the recording
              </span>
            )}

            {recording && (
              <div className="flex items-start w-[80%] mt-4 mb-6 justify-between ">
                <div 
                  onClick={handleSaveForLater}
                  className=" w-1/3 flex flex-col items-center cursor-pointer hover:opacity-80 transition-opacity"
                  style={{ opacity: waitingForBlob ? 0.5 : 1, pointerEvents: waitingForBlob ? 'none' : 'auto' }}
                >
                  <img
                    src="/popup/savelater.svg"
                    alt="save later"
                    className="h-5 w-5 mb-1"
                  />
                  <span className="text-[14px] text-[#3F7EF8] font-[500] leading-[1]">
                    {waitingForBlob ? "Preparing..." : "Save for later"}
                  </span>
                </div>
                <div
                  onClick={() => setShowModal(true)}
                  className=" w-1/3 flex flex-col items-center cursor-pointer "
                >
                  <img
                    src="/popup/discard.svg"
                    alt="discard"
                    className="h-5 w-5 mb-1"
                  />
                  <span className="text-[14px] text-[#4B5563] font-[500]">
                    discard
                  </span>
                </div>
                {isPaused ? (
                  <div
                    onClick={() => {
                      console.log(
                        "🔴 Small finish button clicked - Current state:",
                        {
                          recording,
                          isPaused,
                          elapsed,
                          timestamp: Date.now(),
                        }
                      );
                      handleStartStop();
                    }}
                    role="button"
                    className="cursor-pointer  w-1/3 flex flex-col items-center"
                  >
                    <img
                      src="/popup/finish.svg"
                      alt="finish"
                      className="h-6 w-6"
                    />
                    <span className="text-[14px] text-[#E12E3A] font-[500]">
                      finish
                    </span>
                  </div>
                ) : (
                  <div
                    onClick={togglePause}
                    role="button"
                    className="cursor-pointer w-1/3 flex flex-col items-center"
                  >
                    <img
                      src="/popup/pause.svg"
                      alt="pause"
                      className="h-6 w-6"
                    />
                    <span className="text-[14px] text-[#3F7EF8] font-[500] ">
                      pause
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* <div className="text-center">
            <p className="text-xs text-[#1F2937] font-bold mb-1">
              {recording
                ? isPaused
                  ? "Recording Paused"
                  : "Recording in progress..."
                : audioUrl
                ? "Recording Complete"
                : "Ready to record"}
            </p>
          
            {isLoading && (
              <div className="flex justify-center mt-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              </div>
            )}
          </div> */}

            <p className="font-[400]  italic text-[#4B5563] text-[12px] ">
              <span className="font-bold">Tip:</span> Recording continues even
              if you switch tabs or apps. Focus on your conversation, we'll
              handle the rest.
            </p>
            {recording && (
              <p className="font-[400] mt-4 italic text-[#4B5563] text-[12px] ">
                <span className="font-bold">Tip:</span> Use 'Save for Later' to
                download this file and summarize it whenever you're ready.
              </p>
            )}
          </div>

          {/* Saved Recordings Section */}
          {/* {savedRecordings.length > 0 && (
            <div className="mt-6 w-full">
              <h3 className="text-lg font-semibold text-[#1F2937] mb-3">
                Saved Recordings
              </h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {savedRecordings.map((recording) => (
                  <div
                    key={recording.id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-[500] text-[#1F2937]">
                        Recording {recording.id.split("_")[1]}
                      </p>
                      <p className="text-xs text-[#6B7280]">
                        Duration: {Math.floor(recording.duration / 60)}:
                        {(recording.duration % 60).toString().padStart(2, "0")}{" "}
                        | Saved:{" "}
                        {new Date(recording.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        try {
                          // Create blob URL for this recording
                          const byteChars = atob(recording.data);
                          const byteNumbers = new Uint8Array(byteChars.length);
                          for (let i = 0; i < byteChars.length; i++) {
                            byteNumbers[i] = byteChars.charCodeAt(i);
                          }

                          // Try multiple formats for compatibility
                          let blob;
                          try {
                            blob = new Blob([byteNumbers], {
                              type: "audio/webm;codecs=opus",
                            });
                          } catch {
                            blob = new Blob([byteNumbers], {
                              type: "audio/webm",
                            });
                          }

                          const url = URL.createObjectURL(blob);
                          setAudioUrl(url);
                          setStatus("Playing saved recording");
                        } catch (error) {
                          console.error(
                            "Error playing saved recording:",
                            error
                          );
                          setStatus("Error playing saved recording");
                        }
                      }}
                      className="px-3 py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
                    >
                      Play
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )} */}
        </div>
      </div>
      {showModal && (
        <CancelModal
          onClose={() => setShowModal(false)}
          title="Discard Recording?"
          description="Are you sure you want to discard this recording session? This cannot be undone."
          btnText="Discard"
          onCancel={handleBack}
        />
      )}
    </div>
  );
}
