// Simple debugging utility for background.js


function assertOffscreenAvailable() {
  if (!chrome.offscreen?.createDocument) {
    throw new Error(
      "Offscreen API is not available. Chrome 109+ is required."
    );
  }
}

// Legacy permission functions - now handled by content script
/*
async function checkMicrophonePermission() {
  try {
    console.log("🔍 Checking microphone permission...");
    // Test microphone access
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(track => track.stop());
    console.log("✅ Microphone permission available");
    return { hasPermission: true, error: null };
  } catch (error) {
    console.log("❌ Microphone permission denied:", error);

    return { hasPermission: false, error: error.message };
  }
}

async function requestMicrophonePermission() {
  try {
    console.log("🎤 Requesting microphone permission...");
    
    // Create a tab to request permission with our custom UI
    const tab = await chrome.tabs.create({
      url: chrome.runtime.getURL("permissionRequest.html"),
      active: true
    });
    
    // Wait for the permission result
    return new Promise((resolve) => {
      const messageListener = (message, sender, sendResponse) => {
        if (sender.tab?.id === tab.id) {
          if (message.action === 'permissionGranted') {
            console.log("✅ Microphone permission granted");
            chrome.runtime.onMessage.removeListener(messageListener);
            resolve({ granted: true, error: null });
          } else if (message.action === 'permissionDenied' || message.action === 'permissionPageClosed') {
            console.log("❌ Microphone permission denied");
            chrome.runtime.onMessage.removeListener(messageListener);
            resolve({ granted: false, error: message.result?.error || "Permission denied by user" });
          }
        }
      };
      
      chrome.runtime.onMessage.addListener(messageListener);
      
      // Set up a timeout in case the user doesn't respond
      setTimeout(() => {
        chrome.runtime.onMessage.removeListener(messageListener);
        chrome.tabs.remove(tab.id).catch(() => {});
        resolve({ granted: false, error: "Permission request timed out" });
      }, 60000); // 60 second timeout
    });
    
  } catch (error) {
    console.error("❌ Error requesting microphone permission:", error);
    return { granted: false, error: error.message };
  }
}
*/

async function ensureOffscreen() {
  try {
    const hasDocument = await chrome.offscreen.hasDocument?.();
    if (hasDocument) {
    
      return;
    }

   
    await chrome.offscreen.createDocument({
      url: "offScreen.html",
      reasons: ["USER_MEDIA"],
      justification: "Record microphone audio even when popup is closed",
    });
   
    
    // Wait a moment for the document to load
    await new Promise(resolve => setTimeout(resolve, 100));
    
  } catch (error) {

    throw new Error(`Offscreen document creation failed: ${error.message}`);
  }
}

async function cleanupOffscreen() {
  try {
    const hasDocument = await chrome.offscreen.hasDocument?.();
    if (hasDocument) {
      await chrome.offscreen.closeDocument();
      
    }
  } catch (error) {
    console.error("❌ Error closing offscreen document:", error);
  }
}

// -------------------------------
// Storage helpers
// -------------------------------
async function setRecordingState(state) {
  await chrome.storage.local?.set({ ...state, lastUpdated: Date.now() });
  
  // Notify all content scripts about recording state change
  if (state.hasOwnProperty('isRecording') || state.hasOwnProperty('isPaused') || state.hasOwnProperty('recordingStartTime')) {
    try {
      // Get the complete current state for accurate timer sync
      const currentState = await getRecordingState();
      const tabs = await chrome.tabs.query({});
      
      for (const tab of tabs) {
        // Only try to notify tabs with injectable URLs
        if (isInjectableUrl(tab.url)) {
          try {
            await chrome.tabs.sendMessage(tab.id, {
              action: 'recordingStateChanged',
              isRecording: currentState.isRecording,
              isPaused: currentState.isPaused,
              elapsedSeconds: currentState.elapsedSeconds,
              timestamp: Date.now() // Current timestamp for sync
            });
          } catch (error) {
            // Tab might not have content script - ignore silently
          }
        }
      }
    } catch (error) {
      console.error('Error notifying tabs of recording state change:', error);
    }
  }
}

async function getRecordingState() {
  const data = await chrome?.storage?.local?.get([
    "isRecording",
    "isPaused",
    "recordingStartTime",
    "pausedTime",
    "totalPaused",
    "elapsedAtPause",
    "lastRecordingData",
    "recordingTimestamp",
    "lastRecordingStatus",
    "currentView",
    "elapsedSeconds", // Added for global timer
    "lastUpdated", // Added for global timer
    "recordingTabId" // Added for recording tab ID
  ]);

  return {
    isRecording: !!data.isRecording,
    isPaused: !!data.isPaused,
    recordingStartTime: data.recordingStartTime ?? null,
    pausedTime: data.pausedTime ?? null,
    totalPaused: typeof data.totalPaused === "number" ? data.totalPaused : 0,
    elapsedAtPause: data.elapsedAtPause ?? null,
    lastRecordingData: data.lastRecordingData,
    recordingTimestamp: data.recordingTimestamp,
    lastRecordingStatus: data.lastRecordingStatus,
    currentView: data.currentView ?? null,
    elapsedSeconds: data.elapsedSeconds ?? 0, // Added for global timer
    lastUpdated: data.lastUpdated ?? 0, // Added for global timer
    recordingTabId: data.recordingTabId ?? null, // Added for cross-tab management
  };
}

// Wait until offscreen saves audio into storage (race-safe)
async function waitForRecordingData(timeoutMs = 8000) {
  // Guard: if storage isn't available, skip and let caller fallback
  if (!chrome?.storage?.local) {
    console.warn("waitForRecordingData: chrome?.storage?.local? not available in this context");
    return false;
  }

  const first = await chrome?.storage?.local?.get([
    "lastRecordingData",
    "recordingTimestamp",
  ]);
  if (first.lastRecordingData) return true;

  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(false);
      }
    }, timeoutMs);

    function handler(changes, areaName) {
      if (areaName !== "local") return;
      const hit =
        changes.lastRecordingData?.newValue ||
        changes.recordingTimestamp?.newValue;
      if (hit && !settled) {
        settled = true;
        clearTimeout(timer);
        chrome.storage.onChanged.removeListener(handler);
        resolve(true);
      }
    }

    chrome.storage.onChanged.addListener(handler);
  });
}


async function sendMessageToOffscreen(message, retries = 3, delayBaseMs = 200) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(` Sending message to offscreen (attempt ${attempt}):`, message);
      
      const res = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(message, (response) => {
          if (chrome.runtime.lastError) {
            console.error(`❌ Chrome runtime error (attempt ${attempt}):`, chrome.runtime.lastError);
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            console.log(`📥 Response from offscreen (attempt ${attempt}):`, response);
            resolve(response);
          }
        });
      });
      return res;
    } catch (err) {
      console.warn(`⚠️ sendMessageToOffscreen attempt ${attempt} failed:`, err);
      if (attempt === retries) {
        console.error(`❌ All attempts failed. Last error:`, err);
        throw err;
      }
      await new Promise((r) => setTimeout(r, delayBaseMs * attempt));
    }
  }
}

function safeRespond(sendResponse, payload) {
  try {
    sendResponse(payload);
  } catch (e) {
    console.warn("sendResponse threw after async path (ignored):", e);
  }
}

assertOffscreenAvailable();

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  console.log("📩 Background received message:", msg);

  (async () => {
    // Handle login data storage from web pages
    if (msg.type === 'STORE_LOGIN_DATA') {
      try {
        console.log("💾 Storing login data from web page:", msg.data);
        await chrome.storage.local.set({
          token: msg.data.token,
          user: msg.data.user,
          loggedIn: msg.data.loggedIn
        });
        console.log("✅ Login data stored successfully in extension storage");
        safeRespond(sendResponse, { success: true });
        return;
      } catch (error) {
        console.error("❌ Error storing login data:", error);
        safeRespond(sendResponse, { success: false, error: error.message });
        return;
      }
    }
    // Direct ingestion from offscreen: saveRecording
    if (msg.from === "offscreen" && msg.action === "saveRecording") {
      if (!msg.data?.audioData) {
        safeRespond(sendResponse, {
          status: "error",
          error: "Missing audioData",
        });
        return;
      }
      await chrome?.storage?.local?.set({
        lastRecordingData: msg.data.audioData,
        recordingTimestamp: msg.data.timestamp,
      });
      safeRespond(sendResponse, { status: "saved" });
      return;
    }
    if (msg.from === "offscreen" && msg.action === "updateRecordingChunk") {
      const existing =
        (await chrome?.storage?.local?.get("lastRecordingData"))
          .lastRecordingData || "";
      await chrome?.storage?.local?.set({
        lastRecordingData: existing + msg.data.chunk,
        recordingTimestamp: msg.data.timestamp,
      });
      safeRespond(sendResponse, { status: "chunkSaved" });
      return;
    }
    if (msg.from === "offscreen" && msg.action === "updateRecordingState") {
      // Handle state updates from offscreen (pause/resume)
      try {
        const updateData = {
          isPaused: msg.data.recordingPaused,
          lastUpdated: Date.now()
        };
        
        // Include totalPaused if provided directly from offscreen
        if (typeof msg.data.totalPaused === 'number') {
          updateData.totalPaused = msg.data.totalPaused;
        }
        
        // Add pause/resume timestamps
        if (msg.data.pauseTimestamp) {
          updateData.pausedTime = msg.data.pauseTimestamp;
        }
        if (msg.data.resumeTimestamp) {
          updateData.pausedTime = null; // Clear pause time on resume
        }
        
        await setRecordingState(updateData);
        console.log("Updated recording state from offscreen:", updateData);
        safeRespond(sendResponse, { status: "updated" });
      } catch (error) {
        console.error("Failed to update recording state:", error);
        safeRespond(sendResponse, { status: "error", error: error.message });
      }
      return;
    }
    // Popup-driven actions
    try {
      switch (msg.action) {
        case "startRecording": {
          try {
            backgroundDebugger.log('START_RECORDING_REQUEST', {
              hasMediaStream: !!msg.mediaStream,
              timestamp: Date.now(),
              sender: msg.from || 'popup'
            });
            
            console.log("🎙️ Starting recording process...");
            
            // Skip permission check - permissions are now handled in content script
            console.log("✅ Microphone permission handled by content script");
            
            // Step 2: Ensure offscreen document exists
            await ensureOffscreen();
            console.log("✅ Offscreen document ensured");
            
            backgroundDebugger.log('OFFSCREEN_DOCUMENT_READY', {
              timestamp: Date.now()
            });
            
            // Step 3: Send start recording message to offscreen
            const off = await sendMessageToOffscreen({
              from: "background",
              action: "startRecording",
              mediaStream: msg.mediaStream, // Pass the stream from popup
              permissionGrantedInMainPage: msg.permissionGrantedInMainPage // Pass permission flag
            });
            
            console.log("📥 Offscreen response:", off);
            
            backgroundDebugger.log('OFFSCREEN_START_RESPONSE', {
              response: off,
              success: off?.status === "started"
            });
            
            if (off?.status !== "started") {
              if (off?.error && off.error.includes("permission")) {
                throw new Error("Microphone access was denied. Please allow microphone permissions and try again.");
              }
              throw new Error(`Failed to start recording: ${off?.error || 'Unknown error'}`);
            }

            // Update recording state
            const recordingStartTime = Date.now();
            
            // Initialize global timer state
            globalRecordingState = {
              isRecording: true,
              isPaused: false,
              elapsedSeconds: 0,
              recordingStartTime,
              pausedTime: null
            };
            
            await setRecordingState({
              isRecording: true,
              isPaused: false,
              recordingStartTime,
              pausedTime: null,
              elapsedSeconds: 0,
              currentView: "recording",
            });
            
            // Start the global timer
            startGlobalTimer();

            backgroundDebugger.log('START_RECORDING_SUCCESS', {
              recordingStartTime,
              stateUpdated: true,
              timestamp: Date.now()
            });

            console.log("✅ Recording state updated successfully");
            
            safeRespond(sendResponse, {
              status: "started",
              timestamp: recordingStartTime,
            });
          } catch (err) {
            console.error("❌ Error in startRecording:", err);
            
            backgroundDebugger.log('START_RECORDING_ERROR', {
              error: err.message,
              stack: err.stack,
              timestamp: Date.now()
            }, err);
            
            safeRespond(sendResponse, { 
              status: "error", 
              error: err.message 
            });
          }
          break;
        }

        case "stopRecording": {
          try {
            backgroundDebugger.log('STOP_RECORDING_REQUEST', {
              timestamp: Date.now(),
              sender: msg.from || 'popup'
            });
            
            const off = await sendMessageToOffscreen({
              from: "background",
              action: "stopRecording",
            });
            
            backgroundDebugger.log('OFFSCREEN_STOP_RESPONSE', {
              response: off,
              success: off?.status === "stopped"
            });
            
            if (off?.status !== "stopped")
              throw new Error("Failed to stop recording");
        
            // Wait for the data to actually exist in storage
            const gotData = await waitForRecordingData(10000);
            if (!gotData) throw new Error("Recording data not found after stop");
            
            backgroundDebugger.log('RECORDING_DATA_VERIFIED', {
              dataFound: gotData,
              timestamp: Date.now()
            });
        
            // Update background state
            const finishedAt = Date.now();
            await setRecordingState({
              isRecording: false,
              isPaused: false,
              recordingStartTime: null,
              pausedTime: null,
              currentView: "recording",
              lastRecordingStatus: {
                isRecording: false,
                hasRecording: true,
                finishedAt,
              },
            });
            
            backgroundDebugger.log('STOP_RECORDING_SUCCESS', {
              finishedAt,
              stateUpdated: true,
              hasData: true
            });
        
            // Stop global timer
            stopGlobalTimer();
            
            // Reset global state
            globalRecordingState = {
              isRecording: false,
              isPaused: false,
              elapsedSeconds: 0,
              recordingStartTime: null,
              pausedTime: null
            };
            
            // Respond to popup
            safeRespond(sendResponse, { status: "stopped", hasData: true });
          } catch (err) {
            backgroundDebugger.log('STOP_RECORDING_ERROR', {
              error: err.message,
              timestamp: Date.now()
            }, err);
            
            safeRespond(sendResponse, { status: "error", error: err.message });
          }
          break;
        }
        

        case "pauseRecording": {
          try {
            backgroundDebugger.log('PAUSE_RECORDING_REQUEST', {
              timestamp: Date.now(),
              sender: msg.from || 'popup'
            });
            
            const off = await sendMessageToOffscreen({
              from: "background",
              action: "pauseRecording",
            });
            
            backgroundDebugger.log('OFFSCREEN_PAUSE_RESPONSE', {
              response: off,
              success: off?.status === "paused"
            });
            
            if (off?.status !== "paused")
              throw new Error("Failed to pause recording");

            const pausedTime = Date.now();
            
            // Update global state to paused
            globalRecordingState.isPaused = true;
            globalRecordingState.pausedTime = pausedTime;
            
            await setRecordingState({
              isPaused: true,
              isRecording: true,
              pausedTime,
              elapsedSeconds: globalRecordingState.elapsedSeconds, // Keep current elapsed time
              currentView: "recording",
            });
            
            backgroundDebugger.log('PAUSE_RECORDING_SUCCESS', {
              pausedTime,
              stateUpdated: true
            });

            safeRespond(sendResponse, { status: "paused" });
          } catch (err) {
            backgroundDebugger.log('PAUSE_RECORDING_ERROR', {
              error: err.message,
              timestamp: Date.now()
            }, err);
            
            safeRespond(sendResponse, { status: "error", error: err.message });
          }
          break;
        }

        case "resumeRecording": {
          try {
            backgroundDebugger.log('RESUME_RECORDING_REQUEST', {
              timestamp: Date.now(),
              sender: msg.from || 'popup'
            });
            
            // Note: This case is for legacy offscreen recording only
            // Content script recordings are handled via recordingResumedInContentScript
            console.log("⚠️ Legacy offscreen resume recording - content script recordings use different flow");
            
            const off = await sendMessageToOffscreen({
              from: "background",
              action: "resumeRecording",
            });
            
            backgroundDebugger.log('OFFSCREEN_RESUME_RESPONSE', {
              response: off,
              success: off?.status === "resumed"
            });
            
            if (off?.status !== "resumed")
              throw new Error("Failed to resume recording");

            const resumeTime = Date.now();
            
            // Update global state to resumed (elapsed time continues from where it was)
            globalRecordingState.isPaused = false;
            globalRecordingState.pausedTime = null;
            
            await setRecordingState({
              isPaused: false,
              isRecording: true,
              pausedTime: null,
              elapsedSeconds: globalRecordingState.elapsedSeconds, // Keep current elapsed time
              currentView: "recording",
              lastRecordingStatus: {
                isRecording: true,
                isPaused: false,
                resumeTime,
              },
            });
            
            backgroundDebugger.log('RESUME_RECORDING_SUCCESS', {
              resumeTime,
              stateUpdated: true
            });

            safeRespond(sendResponse, { status: "resumed" });
          } catch (err) {
            backgroundDebugger.log('RESUME_RECORDING_ERROR', {
              error: err.message,
              timestamp: Date.now()
            }, err);
            
            safeRespond(sendResponse, { status: "error", error: err.message });
          }
          break;
        }

        case "getRecordingUrl": {
          try {
            console.log("📥 Getting recording URL...");
            
            // Try to read recording from chrome.storage.local first (content script recordings)
            const storageData = await chrome.storage.local.get(['lastRecordingData', 'recordingTimestamp']);
            
            if (storageData.lastRecordingData) {
              console.log("✅ Found recording data in storage (content script recording)");
              sendResponse({
                hasData: true,
                data: storageData.lastRecordingData,
                timestamp: storageData.recordingTimestamp || Date.now()
              });
              break;
            }
            
            // Fallback to offscreen document for legacy recordings
            const off = await sendMessageToOffscreen({
              from: "background",
              action: "getRecordingUrl",
            });
            
            sendResponse(off);
          } catch (err) {
            console.error("❌ Error getting recording URL:", err);
            sendResponse({ hasData: false, error: err.message });
          }
          break;
        }

        case "recordingStartedInContentScript": {
      
          
          const recordingStartTime = msg.timestamp || Date.now();
          
          // Get the sender's tab ID to store as the recording tab
          const senderTabId = _sender?.tab?.id;
       
          
          // Initialize global timer state
          globalRecordingState = {
            isRecording: true,
            isPaused: false,
            elapsedSeconds: 0,
            recordingStartTime,
            pausedTime: null
          };
          
          await setRecordingState({
            isRecording: true,
            isPaused: false,
            recordingStartTime,
            pausedTime: null,
            elapsedSeconds: 0,
            recordingTabId: senderTabId, // Store which tab is recording
            currentView: "recording",
          });

          // Start the timer
          startGlobalTimer();
          
          // Broadcast state to all tabs
          broadcastRecordingState();
          
          sendResponse({ success: true });
          break;
        }

        case "recordingStoppedInContentScript": {
         
          
          // Stop the timer
          stopGlobalTimer();
          
          globalRecordingState = {
            isRecording: false,
            isPaused: false,
            elapsedSeconds: 0,
            recordingStartTime: null,
            pausedTime: null
          };
          
          await setRecordingState({
            isRecording: false,
            isPaused: false,
            recordingStartTime: null,
            pausedTime: null,
            elapsedSeconds: 0,
            recordingTabId: null, // Clear recording tab ID
            currentView: "home",
          });
          
          // Broadcast state to all tabs
          broadcastRecordingState();
          
          sendResponse({ success: true });
          break;
        }

        case "recordingPausedInContentScript": {
          console.log("⏸️ Content script recording paused, updating background state...");
          
          // Pause the timer
          pauseGlobalTimer();
          
          await setRecordingState({
            isPaused: true,
            pausedTime: Date.now(),
          });
          
          // Broadcast state to all tabs
          broadcastRecordingState();
          
          sendResponse({ success: true });
          break;
        }

        case "recordingResumedInContentScript": {
          console.log("▶️ Content script recording resumed, updating background state...");
          
          // Resume the timer
          resumeGlobalTimer();
          
          await setRecordingState({
            isPaused: false,
            pausedTime: null,
          });
          
          // Broadcast state to all tabs
          broadcastRecordingState();
          
          sendResponse({ success: true });
          break;
        }

        case "getCurrentTabId": {
          // Helper action to get current tab ID
          const tabId = _sender?.tab?.id;
          console.log("📍 Returning current tab ID:", tabId);
          sendResponse({ tabId });
          break;
        }

        case "forwardRecordingCommand": {
          console.log(`🔄 Forwarding ${msg.command} command from tab ${msg.fromTabId} to recording tab ${msg.targetTabId}`);
          
          try {
            // Forward the command to the target tab (recording tab)
            let messageType;
            if (msg.command === 'pause') {
              messageType = 'PAUSE_RECORDING_IN_MAIN_PAGE';
            } else if (msg.command === 'resume') {
              messageType = 'RESUME_RECORDING_IN_MAIN_PAGE';
            } else if (msg.command === 'stop') {
              messageType = 'STOP_RECORDING_IN_MAIN_PAGE';
            } else {
              throw new Error(`Unknown command: ${msg.command}`);
            }
            
            // Send message directly to the recording tab's content script
            const response = await new Promise((resolve, reject) => {
              chrome.tabs.sendMessage(msg.targetTabId, {
                type: messageType,
                forwardedFrom: msg.fromTabId,
                timestamp: Date.now()
              }, (result) => {
                if (chrome.runtime.lastError) {
                  console.error('❌ Failed to forward to recording tab:', chrome.runtime.lastError);
                  reject(chrome.runtime.lastError);
                } else {
                  console.log(`✅ Successfully forwarded ${msg.command} to recording tab:`, result);
                  resolve(result);
                }
              });
            });
            
            sendResponse(response || { success: true });
          } catch (error) {
            console.error(`❌ Error forwarding ${msg.command} command:`, error);
            sendResponse({ 
              success: false, 
              message: `Failed to forward ${msg.command} command to recording tab` 
            });
          }
          break;
        }

        case "broadcastWaveformData": {
          // Broadcast waveform data to all tabs for real-time sync
          try {
            const fromTabId = _sender?.tab?.id;
  
            
            const tabs = await chrome.tabs.query({});
            let successCount = 0;
            
            for (const tab of tabs) {
              if (isInjectableUrl(tab.url) && tab.id !== fromTabId) {
                try {
                  await chrome.tabs.sendMessage(tab.id, {
                    action: 'waveformDataUpdate',
                    data: msg.data,
                    timestamp: msg.timestamp,
                    fromTabId: fromTabId
                  });
                  successCount++;
                } catch (error) {
                  // Tab might not have content script - ignore
                }
              }
            }
            
            console.log(`✅ Broadcasted waveform data to ${successCount} tabs`);
            sendResponse({ success: true, tabsReached: successCount });
          } catch (error) {
            console.error('❌ Error broadcasting waveform data:', error);
            sendResponse({ success: false, error: error.message });
          }
          break;
        }
        

        case "discardRecording": {
          try {
            await chrome?.storage?.local?.remove([
              "lastRecordingData",
              "recordingTimestamp",
            ]);
            await setRecordingState({
              isRecording: false,
              isPaused: false,
              recordingStartTime: null,
              pausedTime: null,
            });
            safeRespond(sendResponse, { status: "discarded" });
          } catch (err) {
            safeRespond(sendResponse, { status: "error", error: err.message });
          }
          break;
        }

        case "getStatus": {
          try {
            const s = await getRecordingState();
            const now = Date.now();
            const pausedSpan =
              s.isPaused && s.pausedTime && s.recordingStartTime
                ? Math.max(0, now - s.pausedTime)
                : 0;
            const elapsedMs =
              s.recordingStartTime != null
                ? Math.max(
                    0,
                    now -
                      s.recordingStartTime -
                      (s.totalPaused ?? 0) -
                      (s.isPaused ? pausedSpan : 0)
                  )
                : null;

            safeRespond(sendResponse, {
              status: s.isRecording ? "recording" : "stopped",
              isPaused: s.isPaused || false,
              hasRecording: !!s.lastRecordingData,
              startTime: s.recordingStartTime,
              pausedTime: s.pausedTime,
              totalPaused: s.totalPaused ?? 0,
              elapsedMs,
            });
          } catch (err) {
            safeRespond(sendResponse, { status: "error", error: err.message });
          }
          break;
        }

        case "closePermissionTab":
          // Handle permission tab close request
          try {
            const tabs = await chrome.tabs.query({ url: chrome.runtime.getURL("permissionRequest.html") });
            for (const tab of tabs) {
              await chrome.tabs.remove(tab.id);
            }
            safeRespond(sendResponse, { status: "closed" });
          } catch (err) {
            console.error("Error closing permission tab:", err);
            safeRespond(sendResponse, { status: "error", error: err.message });
          }
          break;

        case "getCurrentTabId": {
          // Helper action to get current tab ID
          const tabId = _sender?.tab?.id;
          console.log("📍 Returning current tab ID:", tabId);
          sendResponse({ tabId });
          break;
        }

        case "forwardRecordingCommand": {
          console.log(`🔄 Forwarding ${msg.command} command from tab ${msg.fromTabId} to recording tab ${msg.targetTabId}`);
          
          try {
            // Forward the command to the target tab (recording tab)
            const messageType = msg.command === 'pause' ? 'PAUSE_RECORDING_IN_MAIN_PAGE' : 'RESUME_RECORDING_IN_MAIN_PAGE';
            
            // Send message directly to the recording tab's content script
            const response = await new Promise((resolve, reject) => {
              chrome.tabs.sendMessage(msg.targetTabId, {
                type: messageType,
                forwardedFrom: msg.fromTabId,
                timestamp: Date.now()
              }, (result) => {
                if (chrome.runtime.lastError) {
                  console.error('❌ Failed to forward to recording tab:', chrome.runtime.lastError);
                  reject(chrome.runtime.lastError);
                } else {
                  console.log(`✅ Successfully forwarded ${msg.command} to recording tab:`, result);
                  resolve(result);
                }
              });
            });
            
            sendResponse(response || { success: true });
          } catch (error) {
            console.error(`❌ Error forwarding ${msg.command} command:`, error);
            sendResponse({ 
              success: false, 
              message: `Failed to forward ${msg.command} command to recording tab` 
            });
          }
          break;
        }

        default:
          console.warn("⚠️ Unknown action or sender:", msg.action, msg.from);
          safeRespond(sendResponse, {
            status: "unknown_action",
            action: msg.action,
          });
      }
    } catch (err) {
      console.error("❌ Background error:", err);
      safeRespond(sendResponse, { status: "error", error: err.message });
    }
  })();

  return true; // async response
});

// Centralized timer management - single source of truth
let globalTimerInterval = null;
let globalRecordingState = {
  isRecording: false,
  isPaused: false,
  elapsedSeconds: 0,
  recordingStartTime: null,
  pausedTime: null
};

// Initialize global state from storage on startup
(async function initializeGlobalState() {
  try {
    const storedState = await getRecordingState();
    globalRecordingState = {
      isRecording: storedState.isRecording,
      isPaused: storedState.isPaused,
      elapsedSeconds: storedState.elapsedSeconds || 0,
      recordingStartTime: storedState.recordingStartTime,
      pausedTime: storedState.pausedTime
    };
    
    // Restart timer if recording was active
    if (globalRecordingState.isRecording && !globalRecordingState.isPaused) {
      startGlobalTimer();
    }
    
    console.log('Global timer state initialized:', globalRecordingState);
  } catch (error) {
    console.error('Error initializing global timer state:', error);
  }
})();

// Start the global timer
function startGlobalTimer() {
  if (globalTimerInterval) {
    clearInterval(globalTimerInterval);
  }
  
  globalTimerInterval = setInterval(async () => {
    if (globalRecordingState.isRecording && !globalRecordingState.isPaused) {
      globalRecordingState.elapsedSeconds++;
      
      // Update storage with current elapsed time
      await chrome.storage.local.set({
        elapsedSeconds: globalRecordingState.elapsedSeconds,
        lastUpdated: Date.now()
      });
      
      // Broadcast to all tabs
      broadcastTimerUpdate();
    }
  }, 1000);
}

// Stop the global timer
function stopGlobalTimer() {
  if (globalTimerInterval) {
    clearInterval(globalTimerInterval);
    globalTimerInterval = null;
  }
}

// Broadcast timer updates to all tabs
async function broadcastTimerUpdate() {
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (isInjectableUrl(tab.url)) {
        try {
          await chrome.tabs.sendMessage(tab.id, {
            action: 'timerUpdate',
            elapsedSeconds: globalRecordingState.elapsedSeconds,
            isRecording: globalRecordingState.isRecording,
            isPaused: globalRecordingState.isPaused,
            timestamp: Date.now()
          });
        } catch (error) {
          // Tab might not have content script - ignore
        }
      }
    }
  } catch (error) {
    console.error('Error broadcasting timer update:', error);
  }
}

// Pause the global timer (used when content script pauses recording)
function pauseGlobalTimer() {
  globalRecordingState.isPaused = true;
  globalRecordingState.pausedTime = Date.now();
  console.log('Global timer paused at:', globalRecordingState.elapsedSeconds, 'seconds');
}

// Resume the global timer (used when content script resumes recording)
function resumeGlobalTimer() {
  globalRecordingState.isPaused = false;
  globalRecordingState.pausedTime = null;
  console.log('Global timer resumed at:', globalRecordingState.elapsedSeconds, 'seconds');
}

// Broadcast recording state to all tabs
async function broadcastRecordingState() {
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (isInjectableUrl(tab.url)) {
        try {
          await chrome.tabs.sendMessage(tab.id, {
            action: 'recordingStateChanged',
            isRecording: globalRecordingState.isRecording,
            isPaused: globalRecordingState.isPaused,
            elapsedSeconds: globalRecordingState.elapsedSeconds,
            timestamp: Date.now()
          });
        } catch (error) {
          // Tab might not have content script - ignore
        }
      }
    }
  } catch (error) {
    console.error('Error broadcasting recording state:', error);
  }
}

// Check if URL is injectable (not restricted)
function isInjectableUrl(url) {
  if (!url) return false;
  
  const restrictedSchemes = ['chrome:', 'chrome-extension:', 'moz-extension:', 'edge:', 'about:'];
  const restrictedUrls = ['chrome://newtab/', 'chrome://extensions/', 'chrome://settings/'];
  
  // Check for restricted schemes
  for (const scheme of restrictedSchemes) {
    if (url.startsWith(scheme)) return false;
  }
  
  // Check for specific restricted URLs
  for (const restrictedUrl of restrictedUrls) {
    if (url.startsWith(restrictedUrl)) return false;
  }
  
  return true;
}

// Handle extension icon clicks - redirect to DOM popup or open window popup
chrome.action.onClicked.addListener(async (tab) => {
  console.log('Extension icon clicked on tab:', tab.id, 'URL:', tab.url);

  if (!isInjectableUrl(tab.url)) {
    console.log('Restricted page detected, redirecting to safe URL...');

    try {
      // Open your safe page in a new tab
      const newTab = await chrome.tabs.create({
        url: "https://summarizex.ai/", // 🔴 Replace with your desired URL
        active: true
      });

      // Once the tab is loaded, inject content script and show popup
      chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
        if (tabId === newTab.id && info.status === "complete") {
          chrome.tabs.onUpdated.removeListener(listener);
          
          // Try to show popup in new tab
          chrome.tabs.sendMessage(newTab.id, { action: "showDOMPopup" }, () => {
            if (chrome.runtime.lastError) {
              console.warn("Content script not ready, injecting...");
              chrome.scripting.executeScript({
                target: { tabId: newTab.id },
                files: ['content-script.js']
              }).then(() => {
                chrome.tabs.sendMessage(newTab.id, { action: "showDOMPopup" });
              }).catch(err => {
                console.error("Injection failed:", err);
              });
            }
          });
        }
      });
    } catch (err) {
      console.error('Failed to open safe page for popup:', err);
    }

    return;
  }

  // ✅ Normal behavior if URL is injectable
  try {
    await chrome.tabs.sendMessage(tab.id, { action: 'showDOMPopup' });
    console.log('Popup opened in current tab');
  } catch (error) {
    console.log('Content script not found, injecting...');
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content-script.js']
      });
      setTimeout(() => {
        chrome.tabs.sendMessage(tab.id, { action: 'showDOMPopup' });
      }, 500);
    } catch (injectError) {
      console.error('Failed to inject content script:', injectError);
    }
  }
});


// Fallback popup window for when DOM injection fails
async function openFallbackPopup() {
  console.log('Opening fallback popup window');
  try {
    await chrome.windows.create({
      url: chrome.runtime.getURL('index.html'),
      type: 'popup',
      width: 650,
      height: 700,
      right: 0,
      top: 0,
      focused: true
    });
  } catch (error) {
    console.error('Failed to open fallback popup:', error);
  }
}

// Listen for tab activation to sync recording state
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  console.log('Tab activated:', activeInfo.tabId);
  
  try {
    // Get current recording state
    const state = await getRecordingState();
    
    // Get tab info to check if it's injectable
    const tab = await chrome.tabs.get(activeInfo.tabId);
    
    if (isInjectableUrl(tab.url)) {
      // Send current recording state to the newly activated tab
      try {
        await chrome.tabs.sendMessage(activeInfo.tabId, {
          action: 'recordingStateChanged',
          isRecording: state.isRecording,
          isPaused: state.isPaused,
          elapsedSeconds: state.elapsedSeconds,
          timestamp: Date.now()
        });
        console.log('Synced recording state to activated tab');
      } catch (error) {
        // Content script might not be loaded yet - that's ok
        console.log('Could not sync to activated tab (content script not ready)');
      }
    }
  } catch (error) {
    console.error('Error syncing state to activated tab:', error);
  }
});

// Listen for tab updates (page reload, navigation) to sync state
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Only act when page is completely loaded
  if (changeInfo.status === 'complete' && isInjectableUrl(tab.url)) {
    try {
      const state = await getRecordingState();
      
      // Small delay to ensure content script is ready
      setTimeout(async () => {
        try {
          await chrome.tabs.sendMessage(tabId, {
            action: 'recordingStateChanged',
            isRecording: state.isRecording,
            isPaused: state.isPaused,
            elapsedSeconds: state.elapsedSeconds,
            timestamp: Date.now()
          });
          console.log('Synced recording state to updated tab');
        } catch (error) {
          // Content script might not be ready yet - that's ok
        }
      }, 1000);
    } catch (error) {
      console.error('Error syncing state to updated tab:', error);
    }
  }
});

// Periodic sync to ensure all tabs stay updated (backup safety measure)
let lastKnownRecordingState = false;
let lastKnownPauseState = false;
let timerSyncInterval = null;

// Start timer sync when recording begins
function startTimerSync() {
  if (timerSyncInterval) return; // Already running
  
  console.log('Starting periodic timer sync...');
  timerSyncInterval = setInterval(async () => {
    try {
      const state = await getRecordingState();
      
      // Only sync timer updates if actively recording (not paused)
      // Reduce frequency to avoid conflicts with local timers
      if (state.isRecording && !state.isPaused) {
        const tabs = await chrome.tabs.query({});
        for (const tab of tabs) {
          if (isInjectableUrl(tab.url)) {
            try {
              await chrome.tabs.sendMessage(tab.id, {
                action: 'timerStateUpdate',
                isRecording: state.isRecording,
                isPaused: state.isPaused,
                recordingStartTime: state.recordingStartTime,
                pausedTime: state.pausedTime,
                totalPaused: state.totalPaused,
                timestamp: Date.now()
              });
            } catch (error) {
              // Content script might not be ready - ignore
            }
          }
        }
      }
    } catch (error) {
      console.error('Error in timer sync:', error);
    }
  }, 5000); // Reduced frequency: Update every 5 seconds to prevent conflicts
}

// Stop timer sync when recording stops
function stopTimerSync() {
  if (timerSyncInterval) {
    console.log('Stopping timer sync...');
    clearInterval(timerSyncInterval);
    timerSyncInterval = null;
  }
}

setInterval(async () => {
  try {
    const state = await getRecordingState();
    
    // Handle recording state changes
    if (state.isRecording !== lastKnownRecordingState) {
      console.log('Recording state changed detected in periodic check, syncing all tabs...');
      lastKnownRecordingState = state.isRecording;
      
             // Timer sync is now handled by individual tabs calculating from shared state
       if (state.isRecording) {
         // startTimerSync(); // Disabled - tabs calculate their own timers
       } else {
         stopTimerSync();
       }
      
      const tabs = await chrome.tabs.query({});
      for (const tab of tabs) {
        if (isInjectableUrl(tab.url)) {
          try {
                         await chrome.tabs.sendMessage(tab.id, {
               action: 'recordingStateChanged',
               isRecording: state.isRecording,
               isPaused: state.isPaused,
               elapsedSeconds: state.elapsedSeconds,
               timestamp: Date.now()
             });
          } catch (error) {
            // Content script might not be ready - ignore
          }
        }
      }
    }
    
        // Handle pause state changes
    if (state.isPaused !== lastKnownPauseState) {
      console.log('Pause state changed, syncing all tabs...');
      lastKnownPauseState = state.isPaused;
      
      const tabs = await chrome.tabs.query({});
      for (const tab of tabs) {
        if (isInjectableUrl(tab.url)) {
          try {
            await chrome.tabs.sendMessage(tab.id, {
              action: 'recordingStateChanged',
              isRecording: state.isRecording,
              isPaused: state.isPaused,
              elapsedSeconds: state.elapsedSeconds,
              timestamp: Date.now()
            });
          } catch (error) {
            // Content script might not be ready - ignore
          }
        }
      }
    }
  } catch (error) {
    console.error('Error in periodic state sync:', error);
  }
}, 10000); // Check every 10 seconds - reduced frequency to avoid interference
