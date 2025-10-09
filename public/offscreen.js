// Simple debugging utility for offscreen.js
const offscreenDebugger = {
  log: (action, details = {}, error = null) => {
    const timestamp = new Date().toLocaleTimeString();
    const actionIcon = action.includes('START') ? '🎬' : 
                      action.includes('STOP') ? '⏹️' :
                      action.includes('PAUSE') ? '⏸️' :
                      action.includes('RESUME') ? '▶️' :
                      action.includes('ERROR') ? '❌' : '📝';
    
    const message = `${actionIcon} [${timestamp}] Offscreen → ${action}`;
    
    if (error) {
      console.group(`%c${message}`, 'color: #FF1744; font-weight: bold;');
      console.error('Error Details:', error);
      console.log('Context:', details);
      console.groupEnd();
    } else {
      console.group(`%c${message}`, 'color: #2196F3; font-weight: bold;');
      if (Object.keys(details).length > 0) {
        console.log('Details:', details);
      }
      console.groupEnd();
    }
    
    // Store in chrome storage for persistence
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get('offscreenDebugLogs').then(result => {
        const logs = result.offscreenDebugLogs || [];
        logs.push({
          timestamp: Date.now(),
          action,
          details,
          error: error ? error.toString() : null
        });
        // Keep only last 50 logs
        if (logs.length > 50) logs.splice(0, logs.length - 50);
        chrome.storage.local.set({ offscreenDebugLogs: logs });
      }).catch(() => {});
    }
  }
};

class AudioRecorder {
  constructor() {
    this.recorder = null;
    this.chunks = [];
    this.mediaStream = null;

    this.isRecording = false;
    this.isPaused = false;
    this.lastError = null;

    // timing helpers
    this.startTime = 0;
    this.pauseStart = 0;
    this.totalPaused = 0;

    // stop/processing promise so callers can await processing
    this._stopPromise = null;
    this._stopResolve = null;
    this.onChunk = null; // callback for each chunk
    
    offscreenDebugger.log('AUDIO_RECORDER_INITIALIZED', {
      userAgent: navigator.userAgent,
      mediaDevicesSupported: !!navigator.mediaDevices,
      getUserMediaSupported: !!navigator.mediaDevices?.getUserMedia
    });
  }

  // Check if microphone permission is granted
  async checkMicrophonePermission() {
    try {
      // Try to enumerate devices to check permission status
      if (!navigator.mediaDevices?.enumerateDevices) {
        return { hasPermission: false, error: "MediaDevices API not supported" };
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputDevices = devices.filter(device => device.kind === 'audioinput');
      
      // If we can see device labels, we have permission
      const hasPermission = audioInputDevices.some(device => device.label !== '');
      
      return { hasPermission, error: null };
    } catch (error) {
      console.warn("Permission check failed:", error);
      return { hasPermission: false, error: error.message };
    }
  }

  // Request microphone permission with user-friendly handling
  async requestMicrophonePermission() {
    try {
      console.log("🎤 Requesting microphone permission...");
      
      // Check if browser supports getUserMedia
      if (!navigator.mediaDevices?.getUserMedia) {
        return { granted: false, error: "getUserMedia not supported in this browser" };
      }

      // Request permission with minimal constraints first
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      console.log("✅ Microphone permission granted");
      
      // Stop the test stream immediately
      stream.getTracks().forEach(track => track.stop());
      
      return { granted: true, error: null };
      
    } catch (error) {
      console.error("❌ Microphone permission denied:", error);
      
      let errorMessage = "Microphone access denied";
      
      if (error.name === "NotAllowedError") {
        errorMessage = "Microphone permission denied by user. Please click 'Allow' when prompted.";
      } else if (error.name === "NotFoundError") {
        errorMessage = "No microphone device found. Please connect a microphone.";
      } else if (error.name === "NotReadableError") {
        errorMessage = "Microphone is being used by another application.";
      } else if (error.name === "OverconstrainedError") {
        errorMessage = "Microphone constraints not supported.";
      } else if (error.name === "SecurityError") {
        errorMessage = "Microphone access blocked by browser security settings.";
      }
      
      return { granted: false, error: errorMessage };
    }
  }

  getCurrentRecordingBase64() {
    return this.chunks.length === 0
      ? null
      : this.chunks.map((c) => c.base64 || "").join("");
  }

  async startRecording(mediaStream = null, permissionGrantedInMainPage = false) {
    offscreenDebugger.log('START_RECORDING_ATTEMPT', {
      isRecording: this.isRecording,
      hasMediaStream: !!mediaStream,
      permissionGrantedInMainPage: !!permissionGrantedInMainPage,
      timestamp: Date.now()
    });
    
    if (this.isRecording) {
      console.warn("Recording already in progress");
      offscreenDebugger.log('START_RECORDING_ERROR', { reason: 'Already recording' });
      return;
    }

    try {
      console.log("🎙️ Starting recording...");
      
      offscreenDebugger.log('START_RECORDING_INIT', {
        mediaStreamProvided: !!mediaStream,
        permissionGrantedInMainPage: !!permissionGrantedInMainPage,
        userAgent: navigator.userAgent,
        mediaDevicesSupported: !!navigator.mediaDevices
      });

      // Reset timing helpers
      this.startTime = Date.now();
      this.pauseStart = 0;
      this.totalPaused = 0;

      // Use passed media stream or request new one
      if (mediaStream) {
        console.log("✅ Using provided media stream");
        this.mediaStream = mediaStream;
      } else {
        console.log("🎤 Requesting microphone access in offscreen document...");
        
        // Skip permission check if permission was already granted in main page
        if (!permissionGrantedInMainPage) {
          console.log("Checking microphone permission in offscreen context...");
          // First check permission
          const permissionCheck = await this.checkMicrophonePermission();
          if (!permissionCheck.hasPermission) {
            const permissionRequest = await this.requestMicrophonePermission();
            if (!permissionRequest.granted) {
              throw new Error(permissionRequest.error || "Microphone permission denied by user. Please click 'Allow' when prompted.");
            }
          }
          
          // Check if browser supports getUserMedia
          if (!navigator.mediaDevices?.getUserMedia) {
            throw new Error("getUserMedia not supported in this browser");
          }
          
          // Since permission was granted in main page, try to get MediaStream directly
          // The browser should allow this since permission was already granted
          console.log("🎤 Creating MediaStream in offscreen context (permission pre-granted)...");
          this.mediaStream = await navigator.mediaDevices.getUserMedia({
            video: false,
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              sampleRate: 44100,
              channelCount: 1
            }
          });
          console.log("✅ MediaStream created in offscreen document using pre-granted permission");
        } else {
          console.log("✅ Skipping permission check - permission already granted in main page context");
          
          // Check if browser supports getUserMedia
          if (!navigator.mediaDevices?.getUserMedia) {
            throw new Error("getUserMedia not supported in this browser");
          }
          
          // Since permission was granted in main page, try to get MediaStream directly
          // The browser should allow this since permission was already granted
          console.log("🎤 Creating MediaStream in offscreen context (permission pre-granted)...");
          this.mediaStream = await navigator.mediaDevices.getUserMedia({
            video: false,
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              sampleRate: 44100,
              channelCount: 1
            }
          });
          console.log("✅ MediaStream created in offscreen document using pre-granted permission");
        }
      }

      if (!window.MediaRecorder) {
        throw new Error("MediaRecorder not supported in this browser");
      }

      console.log("✅ Media stream ready");
      
      offscreenDebugger.log('MEDIA_STREAM_READY', {
        streamId: this.mediaStream.id,
        audioTracks: this.mediaStream.getAudioTracks().length,
        tracks: this.mediaStream.getTracks().map(track => ({
          kind: track.kind,
          enabled: track.enabled,
          readyState: track.readyState
        }))
      });

      // Determine MIME type
      let preferredMime = "audio/webm;codecs=opus";
      if (!MediaRecorder.isTypeSupported(preferredMime)) {
        console.warn(`${preferredMime} not supported, falling back to audio/webm`);
        preferredMime = "audio/webm";
        
        offscreenDebugger.log('MIME_TYPE_FALLBACK', {
          preferred: "audio/webm;codecs=opus",
          fallback: preferredMime
        });
      }
  
      this.recorder = new MediaRecorder(this.mediaStream, {
        mimeType: preferredMime,
        audioBitsPerSecond: 128000,
      });
  
      this.chunks = [];
      this.isRecording = true;
      this.isPaused = false;
      
      offscreenDebugger.log('MEDIA_RECORDER_CREATED', {
        mimeType: preferredMime,
        audioBitsPerSecond: 128000,
        recorderState: this.recorder.state,
        startTime: this.startTime
      });
  
      // Stop promise for awaiting processing
      this._stopPromise = new Promise((resolve) => {
        this._stopResolve = resolve;
      });
  
      // Handle chunks as they come
      this.recorder.ondataavailable = async (e) => {
        if (e.data && e.data.size > 0) {
          this.chunks.push(e.data);
          const base64Chunk = await this.blobToBase64(e.data);
          chrome.runtime.sendMessage({
            from: "offscreen",
            action: "updateRecordingChunk",
            data: { chunk: base64Chunk, timestamp: Date.now() },
          });
        }
      };
  
      this.recorder.onerror = (ev) => {
        console.error("MediaRecorder error:", ev);
        this._setError(ev?.error || ev);
      };
  
      this.recorder.onstop = async () => {
        try {
          const mimeToUse = this.recorder?.mimeType || "audio/webm";
          await this.processRecording(mimeToUse);
        } catch (err) {
          this._setError(err);
        } finally {
          this.isRecording = false;
          this.isPaused = false;
          if (this._stopResolve) {
            this._stopResolve();
            this._stopResolve = null;
            this._stopPromise = null;
          }
        }
      };
  
      // Start recording, flush chunks every second
      this.recorder.start(1000);
      console.log("🎬 Recording started with mime:", preferredMime);
      
      offscreenDebugger.log('RECORDING_STARTED_SUCCESS', {
        mimeType: preferredMime,
        chunkInterval: 1000,
        recorderState: this.recorder.state,
        startTime: this.startTime,
        mediaStreamId: this.mediaStream.id,
        timestamp: Date.now()
      });
  
    } catch (error) {
      console.error("❌ Error in startRecording:", error);
      
      offscreenDebugger.log('START_RECORDING_ERROR', {
        error: error.message,
        errorName: error.name,
        stack: error.stack,
        isRecording: this.isRecording,
        mediaStreamExists: !!this.mediaStream
      }, error);
      
      this.cleanup();
      throw error;
    }
  }
  

  _setError(error) {
    this.lastError = error instanceof Error ? error.message : String(error);
    console.error("Recording error:", this.lastError);
    try {
      chrome.runtime.sendMessage({
        from: "offscreen",
        action: "recordingError",
        error: this.lastError,
      });
    } catch (e) {
      console.warn("Unable to send error message to runtime:", e);
    }
  }

  pause() {
    offscreenDebugger.log('PAUSE_RECORDING_ATTEMPT', {
      isRecording: this.isRecording,
      isPaused: this.isPaused,
      recorderState: this.recorder?.state,
      elapsedTime: Date.now() - this.startTime - this.totalPaused
    });
    
    // Check if not recording at all
    if (!this.isRecording) {
      const errorMsg = "Cannot pause: not recording";
      console.warn(errorMsg);
      offscreenDebugger.log('PAUSE_RECORDING_ERROR', {
        reason: 'Not recording',
        isRecording: this.isRecording,
        isPaused: this.isPaused,
        recorderState: this.recorder?.state,
        suggestion: 'Start recording first'
      });
      return false;
    }

    // If already paused, return success (idempotent operation)
    if (this.isPaused) {
      console.log("Recording is already paused - returning success");
      offscreenDebugger.log('PAUSE_RECORDING_ALREADY_PAUSED', {
        reason: 'Already paused - idempotent success',
        isRecording: this.isRecording,
        isPaused: this.isPaused,
        recorderState: this.recorder?.state
      });
      return true; // Return success instead of error
    }

    try {
      if (this.recorder && this.recorder.state === "recording") {
        this.recorder.pause();
        this.isPaused = true;
        this.pauseStart = Date.now();

        const elapsedBeforePause =
          Date.now() - this.startTime - this.totalPaused;
          
        offscreenDebugger.log('PAUSE_RECORDING_SUCCESS', {
          pauseStart: this.pauseStart,
          elapsedBeforePause,
          recorderState: this.recorder.state,
          totalPausedBefore: this.totalPaused
        });

        chrome.runtime.sendMessage({
          from: "offscreen",
          action: "updateRecordingState",
          data: {
            recordingPaused: true,
            pauseTimestamp: this.pauseStart,
            totalPaused: this.totalPaused, // Send totalPaused directly
            elapsedBeforePause,
            recordingState: {
              isRecording: true,
              isPaused: true,
              startTime: this.startTime,
              elapsedTime: elapsedBeforePause,
            },
          },
        });

        console.log("Recording paused at (ms):", elapsedBeforePause);
        return true;
      }
    } catch (err) {
      this._setError(err);
    }
    return false;
  }

  resume() {
    offscreenDebugger.log('RESUME_RECORDING_ATTEMPT', {
      isRecording: this.isRecording,
      isPaused: this.isPaused,
      recorderState: this.recorder?.state,
      pauseStart: this.pauseStart,
      totalPausedBefore: this.totalPaused
    });
    
    // Check if not recording at all
    if (!this.isRecording) {
      const errorMsg = "Cannot resume: not recording";
      console.warn(errorMsg);
      offscreenDebugger.log('RESUME_RECORDING_ERROR', {
        reason: 'Not recording',
        isRecording: this.isRecording,
        isPaused: this.isPaused,
        recorderState: this.recorder?.state,
        suggestion: 'Start recording first'
      });
      return false;
    }

    // If already resumed (not paused), return success (idempotent operation)
    if (!this.isPaused) {
      console.log("Recording is already resumed - returning success");
      offscreenDebugger.log('RESUME_RECORDING_ALREADY_RESUMED', {
        reason: 'Already resumed - idempotent success',
        isRecording: this.isRecording,
        isPaused: this.isPaused,
        recorderState: this.recorder?.state
      });
      return true; // Return success instead of error
    }

    try {
      if (this.recorder && this.recorder.state === "paused") {
        this.recorder.resume();
        // accumulate paused duration
        const pauseDuration = this.pauseStart ? Date.now() - this.pauseStart : 0;
        if (this.pauseStart) {
          this.totalPaused += pauseDuration;
          this.pauseStart = 0;
        }
        this.isPaused = false;
        
        offscreenDebugger.log('RESUME_RECORDING_SUCCESS', {
          pauseDuration,
          totalPaused: this.totalPaused,
          recorderState: this.recorder.state,
          elapsedTime: Date.now() - this.startTime - this.totalPaused
        });

        chrome.runtime.sendMessage({
          from: "offscreen",
          action: "updateRecordingState",
          data: {
            recordingPaused: false,
            resumeTimestamp: Date.now(),
            totalPaused: this.totalPaused, // Send totalPaused directly
            recordingState: {
              isRecording: true,
              isPaused: false,
              startTime: this.startTime,
              elapsedTime: Date.now() - this.startTime - this.totalPaused,
            },
          },
        });

        console.log("Recording resumed");
        return true;
      }
    } catch (err) {
      this._setError(err);
    }
    return false;
  }

  async processRecording(mimeType = "audio/webm") {
    if (!this.chunks || this.chunks.length === 0) {
      const err = new Error("No audio data to process");
      this._setError(err);
      throw err;
    }

    let blob, base64Data, durationMs;
    try {
      // Create the blob
      blob = new Blob(this.chunks, { type: mimeType });
      console.log("Created blob, bytes:", blob.size);

      // Convert to base64 string
      base64Data = await this.blobToBase64(blob);

      // Calculate actual duration
      durationMs = Date.now() - this.startTime - this.totalPaused;

      // Save locally as a safeguard
      try {
        await chrome?.storage?.local?.set({
          lastRecordingData: base64Data,
          recordingTimestamp: Date.now(),
          recordingDurationMs: durationMs,
        });
      } catch (storageErr) {
        console.warn("Failed to save recording locally:", storageErr);
      }

      // Send to background for persistent storage / further processing
      try {
        const currentBase64 = this.getCurrentRecordingBase64(); // latest chunks
        chrome.runtime.sendMessage({
          from: "offscreen",
          action: "saveRecording",
          data: {
            audioData: currentBase64 || base64Data,
            timestamp: Date.now(),
            duration: durationMs,
            mimeType,
            status: "completed",
          },
        });
        console.log("Sent recording to background successfully");
      } catch (msgErr) {
        console.warn("Failed to send recording to background:", msgErr);
      }

      console.log(
        "Recording processed successfully, duration(ms):",
        durationMs
      );
    } catch (err) {
      this._setError(err);
      throw err;
    } finally {
      // Always clean resources
      this.cleanup();
    }
  }

  // Helper to get full base64 from chunks
  getCurrentRecordingBase64() {
    if (!this.chunks || this.chunks.length === 0) return null;
    return this.chunks.map((c) => c.base64 || "").join("") || null;
  }

  blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = (e) => reject(e);
      reader.onloadend = () => {
        const result = reader.result;
        if (typeof result === "string") {
          // result is like "data:audio/webm;base64,AAAA..."
          const parts = result.split(",");
          resolve(parts.length > 1 ? parts[1] : parts[0]);
        } else {
          reject(new Error("Unexpected FileReader result"));
        }
      };
      reader.readAsDataURL(blob);
    });
  }

  async saveRecordingData(base64Data) {
    try {
      if (chrome?.storage?.local) {
        await chrome?.storage?.local?.set({
          lastRecordingData: base64Data,
          recordingTimestamp: Date.now(),
        });
        console.log("Recording data saved to Chrome storage");
      } else {
        chrome.runtime.sendMessage({
          from: "offscreen",
          action: "saveRecordingData",
          data: base64Data,
        });
      }
    } catch (err) {
      console.error("saveRecordingData error:", err);
      chrome.runtime.sendMessage({
        from: "offscreen",
        action: "saveRecordingData",
        data: base64Data,
      });
    }
  }

  cleanup() {
    console.log("Cleaning up recording resources");
    try {
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach((t) => {
          try {
            t.stop();
          } catch (e) {}
        });
        this.mediaStream = null;
      }
    } catch (e) {
      console.warn("cleanup error:", e);
    }

    // don't null _stopPromise here, that is resolved when onstop finishes
    this.recorder = null;
    this.chunks = [];
    this.isRecording = false;
    this.isPaused = false;
    this.pauseStart = 0;
    this.totalPaused = 0;
  }

  stop() {
    offscreenDebugger.log('STOP_RECORDING_ATTEMPT', {
      isRecording: this.isRecording,
      isPaused: this.isPaused,
      recorderState: this.recorder?.state,
      totalElapsed: Date.now() - this.startTime - this.totalPaused,
      chunksCount: this.chunks.length
    });
    
    if (!this.isRecording) {
      console.warn("Not recording - cannot stop");
      offscreenDebugger.log('STOP_RECORDING_ERROR', {
        reason: 'Not recording',
        isRecording: this.isRecording
      });
      return;
    }

    try {
      if (this.recorder && this.recorder.state !== "inactive") {
        // stop triggers recorder.onstop -> processRecording -> resolves _stopPromise
        this.recorder.stop();
        
        offscreenDebugger.log('STOP_RECORDING_INITIATED', {
          recorderState: this.recorder.state,
          chunksCount: this.chunks.length,
          totalElapsed: Date.now() - this.startTime - this.totalPaused,
          totalPaused: this.totalPaused
        });
      } else {
        // nothing to do; resolve stop promise if present
        if (this._stopResolve) {
          this._stopResolve();
          this._stopResolve = null;
          this._stopPromise = null;
        }
        
        offscreenDebugger.log('STOP_RECORDING_NO_ACTION', {
          reason: 'Recorder already inactive',
          recorderState: this.recorder?.state
        });
      }
    } catch (err) {
      offscreenDebugger.log('STOP_RECORDING_ERROR', {
        error: err.message,
        errorName: err.name,
        recorderState: this.recorder?.state
      }, err);
      this._setError(err);
    }
  }

  // return a Promise that resolves when processing is finished (or resolves immediately if none)
  waitForStop() {
    return this._stopPromise || Promise.resolve();
  }
}

// helper: wait for a storage key to appear (race-safe)
function waitForStorageKey(key, timeoutMs = 5000) {
  return new Promise((resolve) => {
    chrome?.storage?.local?.get(key, (initial) => {
      if (initial && initial[key]) return resolve(initial[key]);
      let settled = false;
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          chrome.storage.onChanged.removeListener(handler);
          resolve(null);
        }
      }, timeoutMs);

      function handler(changes, area) {
        if (area !== "local") return;
        if (changes[key]?.newValue && !settled) {
          settled = true;
          clearTimeout(timer);
          chrome.storage.onChanged.removeListener(handler);
          resolve(changes[key].newValue);
        }
      }
      chrome.storage.onChanged.addListener(handler);
    });
  });
}

// instantiate
const audioRecorder = new AudioRecorder();

// message listener (unchanged shape, but uses waitForStop so we don't override handlers)
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  console.log("Offscreen received message:", msg);

  (async () => {
    try {
      switch (msg.action) {
        case "checkMicrophonePermission":
          console.log("Checking microphone permission in offscreen...");
          const permissionStatus = await audioRecorder.checkMicrophonePermission();
          sendResponse(permissionStatus);
          break;

        case "requestMicrophonePermission":
          console.log("Requesting microphone permission in offscreen...");
          const permissionResult = await audioRecorder.requestMicrophonePermission();
          sendResponse(permissionResult);
          break;

        case "startRecording":
          console.log("Starting recording in offscreen...");
          console.log("🎤 Offscreen received parameters:", {
            hasMediaStream: !!msg.mediaStream,
            permissionGrantedInMainPage: msg.permissionGrantedInMainPage,
            message: msg
          });
          try {
            await audioRecorder.startRecording(msg.mediaStream, msg.permissionGrantedInMainPage); // Pass the stream and permission flag
            console.log("Recording started successfully in offscreen");
            sendResponse({ status: "started" });
          } catch (error) {
            console.error("❌ Offscreen startRecording error:", error);
            sendResponse({ status: "error", error: error.message || error.toString() });
          }
          break;

        case "stopRecording":
          console.log("Stopping recording in offscreen...");
          audioRecorder.stop();
          await audioRecorder.waitForStop();
          console.log("Recording stopped successfully in offscreen");
          sendResponse({ status: "stopped" });
          break;

        case "pauseRecording":
          const paused = audioRecorder.pause();
          offscreenDebugger.log('PAUSE_RECORDING_RESPONSE', {
            success: paused,
            currentState: {
              isRecording: audioRecorder.isRecording,
              isPaused: audioRecorder.isPaused,
              recorderState: audioRecorder.recorder?.state
            }
          });
          sendResponse({ status: paused ? "paused" : "failed" });
          break;

        case "resumeRecording":
          const resumed = audioRecorder.resume();
          offscreenDebugger.log('RESUME_RECORDING_RESPONSE', {
            success: resumed,
            currentState: {
              isRecording: audioRecorder.isRecording,
              isPaused: audioRecorder.isPaused,
              recorderState: audioRecorder.recorder?.state
            }
          });
          sendResponse({ status: resumed ? "resumed" : "failed" });
          break;

        case "getRecordingStatus":
          sendResponse({
            isRecording: audioRecorder.isRecording,
            isPaused: audioRecorder.isPaused,
            startTime: audioRecorder.startTime || null,
            elapsedMs: audioRecorder.isRecording
              ? Date.now() - audioRecorder.startTime - audioRecorder.totalPaused
              : 0,
          });
          break;
          case "getRecordingUrl": {
            try {
              // 1) Wait for recorder to finish processing (if it is stopping)
              if (typeof audioRecorder.waitForStop === "function") {
                await audioRecorder.waitForStop();
              }
          
              // 2) Try to get base64 directly from the recorder (fastest)
              let base64 = null;
              if (typeof audioRecorder?.getCurrentRecordingBase64 === "function") {
                base64 = audioRecorder?.getCurrentRecordingBase64();
              }
          
              // 3) If recorder doesn't have it (null/empty), wait briefly for storage fallback
              if (!base64) {
                // Try to read from storage immediately
                const data = await new Promise((res) => chrome?.storage?.local?.get(["lastRecordingData"], res));
                if (data && data.lastRecordingData) {
                  base64 = data.lastRecordingData;
                } else {
                  // Wait a short time for the storage write (race-safe)
                  const waited = await waitForStorageKey("lastRecordingData", 5000); // 5s timeout
                  if (waited) base64 = waited;
                }
              }
          
              sendResponse({
                status: base64 ? "ok" : "empty",
                data: base64 || null,
                timestamp: Date.now(),
              });
            } catch (err) {
              console.error("Error in getRecordingUrl:", err);
              sendResponse({
                status: "error",
                error: err instanceof Error ? err.message : String(err),
                timestamp: Date.now(),
              });
            }
            break;
          }
          
        default:
          sendResponse({ status: "unknown_action" });
      }
    } catch (error) {
      console.error("Error in offscreen:", error);
      sendResponse({
        status: "error",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })();

  return true; // keep channel open for async sendResponse
});

// cleanup on unload
window.addEventListener("beforeunload", () => {
  audioRecorder.cleanup();
});
