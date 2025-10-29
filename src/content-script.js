// Content script to inject popup as DOM overlay
(function() {
  'use strict';

  console.log('SummarizeX Content Script Loaded');

  let isPopupVisible = false;
  let popupContainer = null;
  let floatingIcon = null;
  let isRecordingActive = false;
  let mediaRecorder = null;
  let recordedChunks = [];
  let isRecordingTab = false; // Track if this tab is the one actively recording
  let audioContext = null;
  let analyser = null;
  let waveformInterval = null;

  // Add session management variables
  let currentRecordingSessionId = null;
  let recordingStartTime = null;

  // Check and sync recording state
  async function checkRecordingState() {
    if (chrome?.storage?.local) {
      try {
        const result = await chrome.storage.local.get([
          'isRecording', 'isPaused', 'elapsedSeconds', 'recordingTabId'
        ]);
        console.log('Content script - current recording state:', result);
        updateFloatingIconVisibility(!!result.isRecording);
        
        // Check if this tab is the recording tab
        if (result.recordingTabId) {
          // Get current tab ID to compare
          chrome.runtime.sendMessage({ action: 'getCurrentTabId' }, (response) => {
            isRecordingTab = (response?.tabId === result.recordingTabId);
            console.log('🎤 This tab is recording tab:', isRecordingTab, 'Current:', response?.tabId, 'Recording:', result.recordingTabId);
          });
        }
      } catch (error) {
        console.error('Error checking recording state:', error);
      }
    }
  }

  // Listen for messages from popup about changes
  function handlePopupMessages(message, sender, sendResponse) {
    console.log('Content script received message:', message);
    
    switch (message.type) {
      case 'ROUTE_CHANGED':
        console.log('🔄 Route changed in popup:', message.route);
        // You can add logic here to update the content script UI based on route changes
        // For example, update floating icon state, show different UI elements, etc.
        break;
        
      case 'SUMMARY_CHANGED':
        console.log('📝 Summary changed in popup');
        // You can add logic here to update the content script UI based on summary changes
        // For example, update any summary-related UI elements
        break;
        
      case 'UPLOAD_CHANGED':
        console.log('📁 Upload changed in popup');
        // You can add logic here to update the content script UI based on upload changes
        break;
        
      default:
        // Handle other existing message types
        break;
    }
  }

  // Add message listener for popup changes
  if (chrome?.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener(handlePopupMessages);
  }

  // Listen for storage changes to automatically update content script
  function handleStorageChanges(changes, areaName) {
    if (areaName === 'local') {
      console.log('Content script detected storage changes:', changes);
      
      // Handle recording state changes
      if (changes.isRecording || changes.isPaused || changes.elapsedSeconds) {
        console.log('🔄 Recording state changed, updating UI');
        checkRecordingState();
      }
      
      // Handle route changes
      if (changes.lastPopupRoute) {
        console.log('🔄 Popup route changed:', changes.lastPopupRoute.newValue);
        // Update any route-related UI elements
        updateUIForRoute(changes.lastPopupRoute.newValue);
        
        // Notify popup about route change for synchronization
        chrome.runtime.sendMessage({
          type: 'SYNC_DATA',
          data: { route: changes.lastPopupRoute.newValue }
        }).catch(() => {
          // Ignore errors if popup is not open
        });
      }
      
      // Handle summary changes
      if (changes.currentSummary) {
        console.log('📝 Summary data changed');
        // Update any summary-related UI elements
        updateUIForSummary(changes.currentSummary.newValue);
        
        // Notify popup about summary change for synchronization
        chrome.runtime.sendMessage({
          type: 'SYNC_DATA',
          data: { summary: changes.currentSummary.newValue }
        }).catch(() => {
          // Ignore errors if popup is not open
        });
      }
      
      // Handle upload changes
      if (changes['popup:upload']) {
        console.log('📁 Upload data changed');
        // Update any upload-related UI elements
        updateUIForUpload(changes['popup:upload'].newValue);
        
        // Notify popup about upload change for synchronization
        chrome.runtime.sendMessage({
          type: 'SYNC_DATA',
          data: { upload: changes['popup:upload'].newValue }
        }).catch(() => {
          // Ignore errors if popup is not open
        });
      }
    }
  }

  // Add storage change listener
  if (chrome?.storage?.onChanged) {
    chrome.storage.onChanged.addListener(handleStorageChanges);
  }

  // Helper functions to update UI based on changes
  function updateUIForRoute(route) {
    // Add logic here to update content script UI based on route
    // For example, change floating icon appearance, show different tooltips, etc.
    console.log('Updating UI for route:', route);
  }

  function updateUIForSummary(summary) {
    // Add logic here to update content script UI based on summary
    // For example, update tooltips, show summary preview, etc.
    console.log('Updating UI for summary:', summary);
  }

  function updateUIForUpload(upload) {
    // Add logic here to update content script UI based on upload
    // For example, update floating icon, show upload status, etc.
    console.log('Updating UI for upload:', upload);
  }

  // Immediately sync recording state and forward to popup to prevent flicker
  async function checkAndSyncRecordingState() {
    if (chrome?.storage?.local) {
      try {
        const result = await chrome.storage.local.get([
          'isRecording', 'isPaused', 'elapsedSeconds'
        ]);
        console.log('Content script - immediately syncing state:', result);
        
        updateFloatingIconVisibility(!!result.isRecording);
        
        // Immediately forward to popup to prevent flicker
        forwardTimerStateToPopup({
          action: 'recordingStateChanged',
          isRecording: result.isRecording,
          isPaused: result.isPaused,
          elapsedSeconds: result.elapsedSeconds,
          timestamp: Date.now()
        });
      } catch (error) {
        console.error('Error syncing recording state:', error);
      }
    }
  }

  // Listen for recording state changes
  function monitorRecordingState() {
    if (chrome?.storage?.local) {
      // Check initial state
      checkRecordingState();

      // Listen for storage changes
      chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local' && changes.isRecording) {
          updateFloatingIconVisibility(!!changes.isRecording.newValue);
        }
      });
    }

    // Listen for page visibility changes (tab switching)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        // Tab became visible - immediately sync recording state to prevent flicker
        console.log('Tab became visible, immediately syncing recording state...');
        checkAndSyncRecordingState();
      }
    });

    // Listen for focus events (additional tab switching detection)
    window.addEventListener('focus', () => {
      console.log('Window focused, immediately syncing recording state...');
      checkAndSyncRecordingState();
    });
  }

  // Update floating icon visibility based on recording state
  function updateFloatingIconVisibility(isRecording) {
    isRecordingActive = isRecording;
   
    
    if (floatingIcon) {
      floatingIcon.style.display = isRecording ? 'flex' : 'none';
    }
  }

  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Content script received message:', request);
    
    if (request.action === 'toggleDOMPopup') {
      togglePopup();
      sendResponse({ success: true });
    } else if (request.action === 'showDOMPopup') {
      showPopup();
      sendResponse({ success: true });
    } else if (request.action === 'hideDOMPopup') {
      hidePopup();
      sendResponse({ success: true });
    } else if (request.action === 'recordingStateChanged') {
      updateFloatingIconVisibility(request.isRecording);
      // Forward timer state to popup iframe if it exists
      forwardTimerStateToPopup(request);
      sendResponse({ success: true });
    } else if (request.action === 'timerUpdate') {
      // Forward real-time timer updates to popup iframe
      forwardTimerStateToPopup(request);
      sendResponse({ success: true });
    } else if (request.action === 'waveformDataUpdate') {
      // Forward waveform data from recording tab to this tab's popup
      console.log(`🎵 Received waveform data from recording tab ${request.fromTabId}`);
      
      const iframe = document.querySelector('#summarizex-popup-content iframe');
      if (iframe && iframe.contentWindow) {
        try {
          iframe.contentWindow.postMessage({
            type: 'WAVEFORM_DATA',
            data: request.data,
            timestamp: request.timestamp,
            fromRecordingTab: true
          }, '*');
          console.log('✅ Forwarded waveform data to popup in this tab');
        } catch (error) {
          console.log('Could not forward waveform data to popup iframe:', error);
        }
      }
      sendResponse({ success: true });
    }
    // Handle forwarded recording commands from other tabs
    else if (request.type === 'PAUSE_RECORDING_IN_MAIN_PAGE' && request.forwardedFrom) {
      console.log(`⏸️ Received forwarded pause command from tab ${request.forwardedFrom}`);
      
      // Execute pause directly on the MediaRecorder in this tab
      pauseRecordingInMainPage().then(result => {
        console.log('📤 Sending pause result back to background:', result);
        sendResponse(result);
      }).catch(error => {
        console.error('❌ Error executing forwarded pause:', error);
        sendResponse({ success: false, message: error.message });
      });
      
      return true; // Keep response channel open for async response
    }
    else if (request.type === 'RESUME_RECORDING_IN_MAIN_PAGE' && request.forwardedFrom) {
      console.log(`▶️ Received forwarded resume command from tab ${request.forwardedFrom}`);
      
      // Execute resume directly on the MediaRecorder in this tab
      resumeRecordingInMainPage().then(result => {
        console.log('📤 Sending resume result back to background:', result);
        sendResponse(result);
      }).catch(error => {
        console.error('❌ Error executing forwarded resume:', error);
        sendResponse({ success: false, message: error.message });
      });
      
      return true; // Keep response channel open for async response
    }
    else if (request.type === 'STOP_RECORDING_IN_MAIN_PAGE' && request.forwardedFrom) {
      console.log(`🛑 Received forwarded stop command from tab ${request.forwardedFrom}`);
      
      // Execute stop directly on the MediaRecorder in this tab
      stopRecordingInMainPage().then(result => {
        console.log('📤 Sending stop result back to background:', result);
        sendResponse(result);
      }).catch(error => {
        console.error('❌ Error executing forwarded stop:', error);
        sendResponse({ success: false, message: error.message });
      });
      
      return true; // Keep response channel open for async response
    }
  });

  // Add function to create recording snapshot
  function createRecordingSnapshot() {
    try {
      

      if (recordedChunks.length === 0) {
        console.warn('⚠️ No recorded chunks available for snapshot');
        return { success: false, error: 'No recorded data' };
      }

      console.log('📸 Creating recording snapshot:', {
        chunksCount: recordedChunks.length,
        totalSize: recordedChunks.reduce((total, chunk) => total + chunk.size, 0)
      });

      // Create blob from current chunks
      const snapshotBlob = new Blob(recordedChunks, { type: 'audio/webm' });
      
      console.log('📦 Snapshot blob created:', {
        size: snapshotBlob.size,
        type: snapshotBlob.type,
        sizeInMB: (snapshotBlob.size / 1024 / 1024).toFixed(2) + ' MB'
      });

      return {
        success: true,
        blob: snapshotBlob
      };
    } catch (error) {
      console.error('❌ Error creating recording snapshot:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Listen for messages from the popup iframe (for permission requests)
  window.addEventListener('message', async (event) => {
    console.log('🎤 Content script received window message:', {
      type: event.data?.type,
      origin: event.origin,
      source: event.source,
      timestamp: event.data?.timestamp
    });
    
    // Handle login data from web pages
    if (event.data?.type === 'EXTENSION_LOGIN_DATA') {
      console.log('📝 Received login data from web page, forwarding to background script');
      try {
        const response = await chrome.runtime.sendMessage({
          type: 'STORE_LOGIN_DATA',
          data: event.data.data
        });
        console.log('✅ Login data forwarded to background script:', response);
      } catch (error) {
        console.error('❌ Error forwarding login data to background script:', error);
      }
      return;
    }
    
    // Find the iframe
    const iframe = document.querySelector('#summarizex-popup-content iframe');
    console.log('🔍 Found iframe:', !!iframe, 'iframe.contentWindow:', !!iframe?.contentWindow);
    
    // Accept messages from our iframe OR from any source if it's our expected message types
    const isFromOurIframe = iframe && event.source === iframe.contentWindow;
    const isExpectedMessageType = event.data?.type && [
      'REQUEST_MICROPHONE_PERMISSION',
      'TEST_MESSAGE',
      'START_RECORDING_IN_MAIN_PAGE',
      'STOP_RECORDING_IN_MAIN_PAGE',
      'PAUSE_RECORDING_IN_MAIN_PAGE',
      'RESUME_RECORDING_IN_MAIN_PAGE',
      'REQUEST_RECORDING_SNAPSHOT'
    ].includes(event.data.type);
    
    console.log('📝 Message validation:', {
      isFromOurIframe,
      isExpectedMessageType,
      messageType: event.data?.type,
      hasIframe: !!iframe
    });
    
    // Handle messages from our popup or expected message types
    if (!isFromOurIframe && !isExpectedMessageType) {
      console.log('📝 Ignoring message - not from our iframe and not expected type');
      return;
    }

    console.log('✅ Content script processing message from popup:', event.data);

    if (event.data.type === 'REQUEST_MICROPHONE_PERMISSION') {
      console.log('🎤 Handling microphone permission request from popup...');
      
      const result = await requestMicrophonePermissionInMainPage();
      
      console.log('🎤 Permission result:', result);
      
      // Send result back to popup using multiple methods
      const responseMessage = {
        type: 'MICROPHONE_PERMISSION_RESULT',
        data: result,
        timestamp: Date.now()
      };
      
      console.log('📤 Sending permission result back to popup...', responseMessage);
      
      // Method 1: Try iframe communication if available
      if (iframe && iframe.contentWindow) {
        try {
          iframe.contentWindow.postMessage(responseMessage, '*');
          console.log('✅ Sent via iframe.contentWindow');
        } catch (err) {
          console.warn('❌ Failed to send via iframe:', err);
        }
      }
      
      // Method 2: Send to event source
      if (event.source && event.source !== window) {
        try {
          event.source.postMessage(responseMessage, '*');
          console.log('✅ Sent via event.source');
        } catch (err) {
          console.warn('❌ Failed to send via event.source:', err);
        }
      }
      
      // Method 3: Broadcast to all windows
      try {
        window.postMessage(responseMessage, '*');
        console.log('✅ Sent via window.postMessage');
      } catch (err) {
        console.warn('❌ Failed to send via window:', err);
      }
      
      // Method 4: Send to parent windows
      try {
        if (window.parent !== window) {
          window.parent.postMessage(responseMessage, '*');
          console.log('✅ Sent via window.parent');
        }
        if (window.top !== window) {
          window.top.postMessage(responseMessage, '*');
          console.log('✅ Sent via window.top');
        }
      } catch (err) {
        console.warn('❌ Failed to send via parent/top:', err);
      }
      
    } else if (event.data.type === 'TEST_MESSAGE') {
      console.log('🧪 Received test message from popup:', event.data.data);
      
      // Send test response back
      const testResponse = {
        type: 'TEST_RESPONSE',
        data: 'Hello from content script!',
        timestamp: Date.now()
      };
      
      // Send using same multiple methods
      if (iframe && iframe.contentWindow) {
        try {
          iframe.contentWindow.postMessage(testResponse, '*');
        } catch (err) {
          console.warn('Test response iframe send failed:', err);
        }
      }
      
      if (event.source && event.source !== window) {
        try {
          event.source.postMessage(testResponse, '*');
        } catch (err) {
          console.warn('Test response event.source send failed:', err);
        }
      }
      
    } else if (event.data.type === 'START_RECORDING_IN_MAIN_PAGE') {
      console.log('🎤 Handling start recording request from popup...');
      
      const result = await startRecordingInMainPage();
      
      console.log('🎤 Start recording result:', result);
      
      // Send result back to popup using multiple methods
      const responseMessage = {
        type: 'START_RECORDING_RESULT',
        data: result,
        timestamp: Date.now()
      };
      
      console.log('📤 Sending start recording result back to popup...', responseMessage);
      
      // Send using multiple methods (same as permission response)
      if (iframe && iframe.contentWindow) {
        try {
          iframe.contentWindow.postMessage(responseMessage, '*');
        } catch (err) {
          console.warn('❌ Failed to send start result via iframe:', err);
        }
      }
      
      if (event.source && event.source !== window) {
        try {
          event.source.postMessage(responseMessage, '*');
        } catch (err) {
          console.warn('❌ Failed to send start result via event.source:', err);
        }
      }
      
      window.postMessage(responseMessage, '*');
      
    } else if (event.data.type === 'STOP_RECORDING_IN_MAIN_PAGE') {
      console.log('🎤 Handling stop recording request from popup...');
      
      const result = await stopRecordingInMainPage();
      
      console.log('🎤 Stop recording result:', result);
      
      // Send result back to popup
      const responseMessage = {
        type: 'STOP_RECORDING_RESULT',
        data: result,
        timestamp: Date.now()
      };
      
      // Send using multiple methods
      if (iframe && iframe.contentWindow) {
        try {
          iframe.contentWindow.postMessage(responseMessage, '*');
        } catch (err) {
          console.warn('❌ Failed to send stop result via iframe:', err);
        }
      }
      
      if (event.source && event.source !== window) {
        try {
          event.source.postMessage(responseMessage, '*');
        } catch (err) {
          console.warn('❌ Failed to send stop result via event.source:', err);
        }
      }
      
      window.postMessage(responseMessage, '*');
      
    } else if (event.data.type === 'PAUSE_RECORDING_IN_MAIN_PAGE') {
      console.log('⏸️ Handling pause recording request from popup...');
      
      const result = await pauseRecordingInMainPage();
      
      console.log('⏸️ Pause recording result:', result);
      
      // Send result back to popup
      const responseMessage = {
        type: 'PAUSE_RECORDING_RESULT',
        data: result,
        timestamp: Date.now()
      };
      
      // Send using multiple methods
      if (iframe && iframe.contentWindow) {
        try {
          iframe.contentWindow.postMessage(responseMessage, '*');
        } catch (err) {
          console.warn('❌ Failed to send pause result via iframe:', err);
        }
      }
      
      if (event.source && event.source !== window) {
        try {
          event.source.postMessage(responseMessage, '*');
        } catch (err) {
          console.warn('❌ Failed to send pause result via event.source:', err);
        }
      }
      
      window.postMessage(responseMessage, '*');
      
    } else if (event.data.type === 'RESUME_RECORDING_IN_MAIN_PAGE') {
      console.log('▶️ Handling resume recording request from popup...');
      
      const result = await resumeRecordingInMainPage();
      
      console.log('▶️ Resume recording result:', result);
      
      // Send result back to popup
      const responseMessage = {
        type: 'RESUME_RECORDING_RESULT',
        data: result,
        timestamp: Date.now()
      };
      
      // Send using multiple methods
      if (iframe && iframe.contentWindow) {
        try {
          iframe.contentWindow.postMessage(responseMessage, '*');
        } catch (err) {
          console.warn('❌ Failed to send resume result via iframe:', err);
        }
      }
      
      if (event.source && event.source !== window) {
        try {
          event.source.postMessage(responseMessage, '*');
        } catch (err) {
          console.warn('❌ Failed to send resume result via event.source:', err);
        }
      }
      
      window.postMessage(responseMessage, '*');
    } else if (event.data.type === 'REQUEST_RECORDING_SNAPSHOT') {
      console.log('📸 Recording snapshot requested');
      
      const snapshotResult = createRecordingSnapshot();
      
      // Send snapshot result back to popup using multiple methods
      const responseMessage = {
        type: 'RECORDING_SNAPSHOT_RESULT',
        data: snapshotResult,
        timestamp: Date.now()
      };
      
      // Send using multiple methods (same as other handlers)
      if (iframe && iframe.contentWindow) {
        try {
          iframe.contentWindow.postMessage(responseMessage, '*');
        } catch (err) {
          console.warn('❌ Failed to send snapshot result via iframe:', err);
        }
      }
      
      if (event.source && event.source !== window) {
        try {
          event.source.postMessage(responseMessage, '*');
        } catch (err) {
          console.warn('❌ Failed to send snapshot result via event.source:', err);
        }
      }
      
      window.postMessage(responseMessage, '*');
      
      console.log('📤 Snapshot result sent to popup:', snapshotResult);
    }
  });

  // Forward timer state updates to the popup iframe
  function forwardTimerStateToPopup(stateData) {
    const iframe = document.querySelector('#summarizex-popup-content iframe');
    if (iframe && iframe.contentWindow) {
      try {
        iframe.contentWindow.postMessage({
          type: 'RECORDING_STATE_UPDATE',
          data: stateData
        }, '*');
      } catch (error) {
        console.log('Could not forward timer state to popup iframe:', error);
      }
    }
  }

  // Start audio analysis for waveform visualization
  function startAudioAnalysis(stream) {
    try {
      console.log('🎵 Starting audio analysis for waveform visualization...');
      
      // Create audio context and analyser
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      
      // Configure analyser for waveform
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.1;
      analyser.minDecibels = -100;
      analyser.maxDecibels = -10;
      
      source.connect(analyser);
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      const bars = 60; // Match the waveform bar count
      
      console.log('✅ Audio analysis setup complete:', {
        fftSize: analyser.fftSize,
        bufferLength,
        bars,
        audioContextState: audioContext.state
      });
      
      // Start sending waveform data
      waveformInterval = setInterval(() => {
        // Get frequency data
        analyser?.getByteFrequencyData(dataArray);
        
        // Process into waveform bars
        const step = Math.floor(bufferLength / bars);
        const waveformData = Array.from({ length: bars }, (_, i) => {
          const slice = dataArray.slice(i * step, (i + 1) * step);
          const avg = slice.reduce((sum, v) => sum + v, 0) / (slice.length || 1);
          
          // Apply same scaling as waveform hook
          let scaled;
          if (avg < 1) {
            scaled = 8; // Baseline
          } else {
            const normalizedInput = avg / 255;
            const exponentialScaled = Math.pow(normalizedInput, 0.5);
            scaled = Math.max(8, Math.min(60, 8 + (exponentialScaled * 52)));
          }
          
          return scaled;
        });
        
        // Send waveform data to popup
        const iframe = document.querySelector('#summarizex-popup-content iframe');
        if (iframe && iframe.contentWindow) {
          try {
            iframe.contentWindow.postMessage({
              type: 'WAVEFORM_DATA',
              data: waveformData,
              timestamp: Date.now()
            }, '*');
          } catch (error) {
            // Ignore if popup is not available
          }
        }
        
        // ALSO broadcast waveform data to ALL tabs via background script
        try {
          chrome.runtime.sendMessage({
            action: 'broadcastWaveformData',
            data: waveformData,
            timestamp: Date.now(),
            fromTabId: null // Will be filled by background script
          });
        } catch (error) {
          // Ignore if background script is not available
        }
        
        // Log occasionally for debugging
        if (Math.random() < 0.05) {
          const maxValue = Math.max(...waveformData);
          const avgValue = waveformData.reduce((a, b) => a + b, 0) / bars;
          console.log('🎵 Content script waveform data:', {
            maxAmplitude: maxValue,
            avgAmplitude: avgValue,
            rawDataMax: Math.max(...Array.from(dataArray)),
            rawDataAvg: Array.from(dataArray).reduce((a, b) => a + b, 0) / dataArray.length,
            audioActivity: avgValue > 15 ? 'ACTIVE' : 'LOW'
          });
        }
      }, 50); // Update every 50ms for smooth visualization
      
    } catch (error) {
      console.error('❌ Error starting audio analysis:', error);
    }
  }
  
  // Stop audio analysis
  function stopAudioAnalysis() {
    console.log('🛑 Stopping audio analysis...');
    
    if (waveformInterval) {
      clearInterval(waveformInterval);
      waveformInterval = null;
    }
    
    if (audioContext && audioContext.state !== 'closed') {
      try {
        audioContext.close();
      } catch (error) {
        console.log('Note: AudioContext already closed');
      }
    }
    
    audioContext = null;
    analyser = null;
  }

  // Handle microphone permission requests in main page context
  async function requestMicrophonePermissionInMainPage() {
    try {
      console.log('🎤 Requesting microphone permission in main page context...');
      
      // Check if navigator.mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Your browser doesn't support microphone access. Please use a modern browser like Chrome, Firefox, or Safari.");
      }

      // Request permission with a temporary stream in main page context
      const permissionStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
          channelCount: 1,
        }
      });
      
      console.log("✅ Microphone permission granted in main page!");
      
      // Stop the permission test stream immediately
      permissionStream.getTracks().forEach(track => track.stop());
      
      return { success: true };
    } catch (error) {
      const err = error;
      console.error("❌ Microphone permission error in main page:", err);
      
      return { 
        success: false, 
        error: err.name || 'UnknownError',
        message: err.message || 'Unknown error occurred'
      };
    }
  }

  // Start recording in content script context
  async function startRecordingInMainPage() {
    try {
      console.log('🎤 Starting recording in main page context...');
      
      // Clear any previous recording data and generate new session ID
      currentRecordingSessionId = `recording_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      recordingStartTime = Date.now();
      recordedChunks = []; // Reset chunks array
      
      // Clear previous recording data from storage
      await chrome.storage.local.remove(['lastRecordingData', 'recordingTimestamp', 'currentRecordingSessionId']);
      
      console.log('🆕 New recording session started:', {
        sessionId: currentRecordingSessionId,
        startTime: recordingStartTime,
        chunksReset: true
      });
      
      // Create MediaStream for recording
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
          channelCount: 1,
        }
      });
      
      // Create MediaRecorder
      console.log('🎙️ Creating MediaRecorder...');
      
      // Check supported MIME types
      const supportedTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg'
      ];
      
      let selectedMimeType = 'audio/webm';
      for (const type of supportedTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          selectedMimeType = type;
          console.log('✅ Selected MIME type:', type);
          break;
        }
      }
      
      mediaRecorder = new MediaRecorder(stream, {
        mimeType: selectedMimeType
      });
      
      console.log('📋 MediaRecorder created:', {
        mimeType: selectedMimeType,
        state: mediaRecorder.state,
        stream: {
          id: stream.id,
          active: stream.active,
          audioTracks: stream.getAudioTracks().length
        }
      });
      
      mediaRecorder.ondataavailable = (event) => {
        console.log('📊 Audio chunk received:', {
          chunkSize: event.data.size,
          totalChunks: recordedChunks.length + 1,
          timestamp: Date.now(),
          sessionId: currentRecordingSessionId
        });
        
        if (event.data.size > 0) {
          recordedChunks.push(event.data);
          console.log('✅ Chunk added. Total chunks:', recordedChunks.length);
        } else {
          console.warn('⚠️ Received empty audio chunk');
        }
      };
      
      mediaRecorder.onstop = () => {
        console.log('🎤 Recording stopped in main page context (original handler)');
        
        if (recordedChunks.length === 0) {
          console.warn('⚠️ No audio chunks recorded!');
          return;
        }
        
        console.log('📊 Processing recorded chunks (original handler):', {
          chunksCount: recordedChunks.length,
          totalSize: recordedChunks.reduce((total, chunk) => total + chunk.size, 0),
          sessionId: currentRecordingSessionId,
          recordingDuration: Date.now() - recordingStartTime
        });
        
        const blob = new Blob(recordedChunks, { type: 'audio/webm' });
        console.log('📦 Created blob (original handler):', {
          size: blob.size,
          type: blob.type,
          sizeInMB: (blob.size / 1024 / 1024).toFixed(2) + ' MB',
          sessionId: currentRecordingSessionId
        });
        
        // Convert to base64 and store (for backup/fallback)
        const reader = new FileReader();
        reader.onloadend = () => {
          try {
            const base64 = reader.result.split(',')[1];
            console.log('✅ Audio converted to base64 (original handler):', {
              originalBlobSize: blob.size,
              base64Length: base64.length,
              estimatedMB: (base64.length * 0.75 / 1024 / 1024).toFixed(2) + ' MB',
              sessionId: currentRecordingSessionId
            });
            
            // Store with session validation (for backup)
            chrome.storage.local.set({
              lastRecordingData: base64,
              recordingTimestamp: Date.now(),
              currentRecordingSessionId: currentRecordingSessionId,
              recordingDuration: Date.now() - recordingStartTime
            }).then(() => {
              console.log('💾 Audio data successfully stored in chrome.storage.local (backup)');
              console.log('🔑 Session ID stored:', currentRecordingSessionId);
            }).catch(error => {
              console.error('❌ Failed to store audio data:', error);
            });
          } catch (error) {
            console.error('❌ Error converting audio to base64:', error);
          }
        };
        
        reader.onerror = (error) => {
          console.error('❌ FileReader error:', error);
        };
        
        reader.readAsDataURL(blob);
        
        // Stop all tracks
        stream.getTracks().forEach(track => {
          track.stop();
          console.log('🛑 Stopped audio track:', track.kind);
        });
      };
      
      mediaRecorder.start(1000); // Collect data every 1 second
      console.log("✅ Recording started in main page context!");
      console.log('🎬 MediaRecorder started:', {
        state: mediaRecorder.state,
        mimeType: mediaRecorder.mimeType,
        timeslice: 1000,
        sessionId: currentRecordingSessionId
      });
      
      // Start audio analysis for waveform visualization
      startAudioAnalysis(stream);
      
      // Mark this tab as the recording tab
      isRecordingTab = true;
      
      // Notify background script that recording started
      console.log("📤 Sending recording start notification to background script...");
      try {
        const response = await chrome.runtime.sendMessage({
          action: 'recordingStartedInContentScript',
          timestamp: Date.now()
        });
        console.log("📥 Background script responded to recording start:", response);
      } catch (err) {
        console.error('❌ Failed to notify background of recording start:', err);
      }
      
      return { success: true };
    } catch (error) {
      const err = error;
      console.error("❌ Recording start error in main page:", err);
      
      return { 
        success: false, 
        error: err.name || 'UnknownError',
        message: err.message || 'Unknown error occurred' 
      };
    }
  }

  // Stop recording in content script context
  async function stopRecordingInMainPage() {
    try {
      console.log('🎤 Stopping recording in main page context...');
      
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        // Create a promise to wait for the blob creation
        const blobPromise = new Promise((resolve, reject) => {
          // Store the original onstop handler
          const originalOnStop = mediaRecorder.onstop;
          
          // Override onstop to capture the blob
          mediaRecorder.onstop = (event) => {
            console.log('🎤 Recording stopped in main page context');
            
            if (recordedChunks.length === 0) {
              console.warn('⚠️ No audio chunks recorded!');
              reject(new Error('No audio chunks recorded'));
              return;
            }
            
            console.log('📊 Processing recorded chunks:', {
              chunksCount: recordedChunks.length,
              totalSize: recordedChunks.reduce((total, chunk) => total + chunk.size, 0),
              sessionId: currentRecordingSessionId,
              recordingDuration: Date.now() - recordingStartTime
            });
            
            const blob = new Blob(recordedChunks, { type: 'audio/webm' });
            console.log('📦 Created blob:', {
              size: blob.size,
              type: blob.type,
              sizeInMB: (blob.size / 1024 / 1024).toFixed(2) + ' MB',
              sessionId: currentRecordingSessionId
            });
            
            // Resolve with the blob data
            resolve({
              blob: blob,
              duration: Date.now() - recordingStartTime,
              sessionId: currentRecordingSessionId
            });
            
            // Call original onstop handler if it exists
            if (originalOnStop) {
              originalOnStop.call(mediaRecorder, event);
            }
          };
        });
        
        // Stop the recording
        mediaRecorder.stop();
        
        // Stop audio analysis
        stopAudioAnalysis();
        
        // Notify background script that recording stopped
        chrome.runtime.sendMessage({
          action: 'recordingStoppedInContentScript',
          timestamp: Date.now()
        }).catch(err => console.log('Failed to notify background of recording stop:', err));
        
        // Wait for the blob to be created and return it
        const blobData = await blobPromise;
        
        return { 
          success: true, 
          blob: blobData.blob,
          duration: blobData.duration,
          sessionId: blobData.sessionId
        };
      } else {
        return { success: false, message: 'No active recording' };
      }
    } catch (error) {
      const err = error;
      console.error("❌ Recording stop error in main page:", err);
      
      return { 
        success: false, 
        error: err.name || 'UnknownError',
        message: err.message || 'Unknown error occurred'
      };
    }
  }

  // Pause recording in content script context
  async function pauseRecordingInMainPage() {
    try {
      console.log('⏸️ Pausing recording in main page context...');
      
      // Check if this tab is the recording tab
      const currentState = await chrome.storage.local.get(['recordingTabId']);
      const currentTabResponse = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: 'getCurrentTabId' }, resolve);
      });
      const currentTabId = currentTabResponse?.tabId;
      const recordingTabId = currentState?.recordingTabId;
      
      console.log('🔍 Pause request tab check:', {
        currentTabId,
        recordingTabId,
        isRecordingTab: currentTabId === recordingTabId,
        hasMediaRecorder: !!mediaRecorder,
        mediaRecorderState: mediaRecorder?.state
      });
      
      // If this is not the recording tab, forward the request via background script
      if (currentTabId !== recordingTabId) {
        console.log('📤 This is not the recording tab, forwarding pause request via background...');
        
        try {
          const response = await chrome.runtime.sendMessage({
            action: 'forwardRecordingCommand',
            command: 'pause',
            targetTabId: recordingTabId,
            fromTabId: currentTabId
          });
          
          console.log('📥 Background forwarded pause response:', response);
          return response;
        } catch (err) {
          console.error('❌ Failed to forward pause request via background:', err);
          return { success: false, message: 'Failed to communicate with recording tab' };
        }
      }
      
      // This is the recording tab - proceed with direct pause
      console.log('🎤 This is the recording tab, proceeding with direct pause...');
      console.log('🔍 MediaRecorder state check:', {
        hasMediaRecorder: !!mediaRecorder,
        state: mediaRecorder?.state,
        expectedState: 'recording'
      });
      
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.pause();
        
        console.log('✅ MediaRecorder.pause() called successfully');
        
        // Notify background script that recording paused
        console.log("📤 Sending recording pause notification to background script...");
        try {
          const response = await chrome.runtime.sendMessage({
            action: 'recordingPausedInContentScript',
            timestamp: Date.now()
          });
          console.log("📥 Background script responded to recording pause:", response);
        } catch (err) {
          console.error('❌ Failed to notify background of recording pause:', err);
        }
        
        return { success: true };
      } else if (mediaRecorder && mediaRecorder.state === 'paused') {
        console.log('⚠️ MediaRecorder is already in paused state - treating as success');
        return { success: true, message: 'Recording is already paused' };
      } else {
        console.warn('❌ Cannot pause - MediaRecorder not in recording state:', {
          hasMediaRecorder: !!mediaRecorder,
          actualState: mediaRecorder?.state,
          needsState: 'recording'
        });
        return { 
          success: false, 
          message: `Cannot pause recording. MediaRecorder state: ${mediaRecorder?.state || 'undefined'}. Expected: 'recording'` 
        };
      }
    } catch (error) {
      const err = error;
      console.error("❌ Recording pause error in main page:", err);
      
      return { 
        success: false, 
        error: err.name || 'UnknownError',
        message: err.message || 'Unknown error occurred'
      };
    }
  }

  // Resume recording in content script context
  async function resumeRecordingInMainPage() {
    try {
      console.log('▶️ Resuming recording in main page context...');
      
      // Check if this tab is the recording tab
      const currentState = await chrome.storage.local.get(['recordingTabId']);
      const currentTabResponse = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: 'getCurrentTabId' }, resolve);
      });
      const currentTabId = currentTabResponse?.tabId;
      const recordingTabId = currentState?.recordingTabId;
      
      console.log('🔍 Resume request tab check:', {
        currentTabId,
        recordingTabId,
        isRecordingTab: currentTabId === recordingTabId,
        hasMediaRecorder: !!mediaRecorder,
        mediaRecorderState: mediaRecorder?.state
      });
      
      // If this is not the recording tab, forward the request via background script
      if (currentTabId !== recordingTabId) {
        console.log('📤 This is not the recording tab, forwarding resume request via background...');
        
        try {
          const response = await chrome.runtime.sendMessage({
            action: 'forwardRecordingCommand',
            command: 'resume',
            targetTabId: recordingTabId,
            fromTabId: currentTabId
          });
          
          console.log('📥 Background forwarded resume response:', response);
          return response;
        } catch (err) {
          console.error('❌ Failed to forward resume request via background:', err);
          return { success: false, message: 'Failed to communicate with recording tab' };
        }
      }
      
      // This is the recording tab - proceed with direct resume
      console.log('🎤 This is the recording tab, proceeding with direct resume...');
      
      console.log('🔍 MediaRecorder state check before resume:', {
        hasMediaRecorder: !!mediaRecorder,
        state: mediaRecorder?.state,
        expectedState: 'paused'
      });
      
      if (mediaRecorder && mediaRecorder.state === 'paused') {
        mediaRecorder.resume();
        
        console.log('✅ MediaRecorder.resume() called successfully');
        
        // Notify background script that recording resumed
        try {
          const response = await chrome.runtime.sendMessage({
            action: 'recordingResumedInContentScript',
            timestamp: Date.now()
          });
          console.log('📥 Background script responded to recording resume:', response);
        } catch (err) {
          console.error('❌ Failed to notify background of recording resume:', err);
        }
        
        return { success: true };
      } else if (mediaRecorder && mediaRecorder.state === 'recording') {
        console.log('⚠️ MediaRecorder is already in recording state - treating as success');
        return { success: true, message: 'Recording is already active' };
      } else {
        console.warn('❌ Cannot resume - MediaRecorder not in paused state:', {
          hasMediaRecorder: !!mediaRecorder,
          actualState: mediaRecorder?.state,
          needsState: 'paused'
        });
        return { 
          success: false, 
          message: `Cannot resume recording. MediaRecorder state: ${mediaRecorder?.state || 'undefined'}. Expected: 'paused'` 
        };
      }
    } catch (error) {
      const err = error;
      console.error("❌ Recording resume error in main page:", err);
      
      return { 
        success: false, 
        error: err.name || 'UnknownError',
        message: err.message || 'Unknown error occurred'
      };
    }
  }

  // Create floating icon
  function createFloatingIcon() {
    console.log('Creating floating icon...');
    
    floatingIcon = document.createElement('div');
    floatingIcon.id = 'summarizex-floating-icon';
    floatingIcon.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M9 11H15M9 15H13M17 21H7C5.89543 21 5 20.1046 5 19V5C5 3.89543 5.89543 3 7 3H12.5858C12.851 3 13.1054 3.10536 13.2929 3.29289L19.7071 9.70711C19.8946 9.89464 20 10.149 20 10.4142V19C20 20.1046 19.1054 21 18 21H17ZM17 21V11H13V7H7V19H17Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
    
    // Styling for floating icon - initially hidden
    Object.assign(floatingIcon.style, {
      position: 'fixed',
      top: '80px',
      right: '20px',
      width: '60px',
      height: '60px',
      backgroundColor: '#3F7EF8',
      borderRadius: '50%',
      display: 'none', // Hidden by default
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      zIndex: '999999',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      transition: 'all 0.3s ease',
      border: '2px solid white',
      fontFamily: 'Arial, sans-serif'
    });

    // Add a label for clarity
    floatingIcon.title = 'SummarizeX - Click to open (Recording active)';

    // Hover effects
    floatingIcon.addEventListener('mouseenter', () => {
      floatingIcon.style.transform = 'scale(1.1)';
      floatingIcon.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.25)';
    });

    floatingIcon.addEventListener('mouseleave', () => {
      floatingIcon.style.transform = 'scale(1)';
      floatingIcon.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
    });

    // Click event to toggle popup
    floatingIcon.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('Floating icon clicked!');
      togglePopup();
    });

    document.body.appendChild(floatingIcon);
    console.log('Floating icon added to DOM');
  }

  // Create popup overlay
  function createPopupOverlay() {
    console.log('Creating popup overlay...');
    
    popupContainer = document.createElement('div');
    popupContainer.id = 'summarizex-popup-overlay';
    
    // Position the popup normally without overlay
  popupContainer.style.cssText = `
  position: fixed;
  top: 0%;
  right: 2%;
  display: none;
  z-index: 1000000;
  width:  600px;
height: min(98vh, 800px);
  box-sizing: border-box;
`;

    

    // Create popup content container
    const popupContent = document.createElement('div');
    popupContent.id = 'summarizex-popup-content';
    Object.assign(popupContent.style, {
      backgroundColor: 'white',
      borderRadius: '16px',
      overflow: 'auto',
      position: 'relative',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
      animation: 'slideIn 0.3s ease-out',
      border: 'none',
      width: '100%',
      height: '100%',
    });
    

    // Add CSS animation if not exists
    if (!document.getElementById('summarizex-styles')) {
      const style = document.createElement('style');
      style.id = 'summarizex-styles';
      style.textContent = `
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: scale(0.9) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        
        #summarizex-popup-content::-webkit-scrollbar {
          width: 6px;
        }
        
        #summarizex-popup-content::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 3px;
        }
        
        #summarizex-popup-content::-webkit-scrollbar-thumb {
          background: #888;
          border-radius: 3px;
        }
        
        #summarizex-popup-content::-webkit-scrollbar-thumb:hover {
          background: #555;
        }
      `;
      document.head.appendChild(style);
    }

    // Create iframe to load the extension popup
    const iframe = document.createElement('iframe');
    
    // Use the extension's popup HTML
    try {
      iframe.src = chrome.runtime.getURL('index.html');
    } catch (error) {
      console.error('Error setting iframe src:', error);
      // Fallback: create a simple content
      popupContent.innerHTML = `
        <div style="padding: 20px; text-align: center; color: #333;">
          <h2 style="color: #3F7EF8; margin-bottom: 20px;">SummarizeX</h2>
          <p>Extension content loaded successfully!</p>
          <button onclick="document.getElementById('summarizex-popup-overlay').style.display='none'" 
                  style="background: #3F7EF8; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; margin-top: 20px;">
            Close
          </button>
        </div>
      `;
      popupContainer.appendChild(popupContent);
      return;
    }
    
    iframe.style.width = '100%';
    iframe.style.height = '100%'; // fill container
    iframe.style.border = 'none';
    iframe.style.borderRadius = '16px';
    
  
    
    // Removed iframe microphone permissions - we handle permissions in main page context
    // iframe.setAttribute('allow', 'microphone *; camera *');
    // iframe.setAttribute('allowfullscreen', 'true');
    
    popupContent.appendChild(iframe);
    popupContainer.appendChild(popupContent);

    // Close popup when clicking outside (document click)
    document.addEventListener('click', (e) => {
      if (isPopupVisible && !popupContainer.contains(e.target) && !floatingIcon.contains(e.target)) {
        hidePopup();
      }
    });

    // Close popup on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isPopupVisible) {
        hidePopup();
      }
    });

    document.body.appendChild(popupContainer);
    console.log('Popup overlay added to DOM');
  }

  // Toggle popup visibility
  function togglePopup() {
    console.log('Toggle popup called, current state:', isPopupVisible);
    if (isPopupVisible) {
      hidePopup();
    } else {
      showPopup();
    }
  }

  // Show popup
  function showPopup() {
    console.log('Showing popup...');
    if (popupContainer) {
      popupContainer.style.display = 'block';
      isPopupVisible = true;
      console.log('Popup is now visible');
    }
  }

  // Hide popup
  function hidePopup() {
    console.log('Hiding popup...');
    if (popupContainer) {
      popupContainer.style.display = 'none';
      isPopupVisible = false;
      console.log('Popup is now hidden');
    }
  }

  // Initialize when DOM is ready
  function initialize() {
    console.log('Initializing SummarizeX overlay...');
    
    // Check if already initialized
    if (document.getElementById('summarizex-floating-icon')) {
      console.log('Already initialized, skipping...');
      return;
    }

    try {
      createFloatingIcon();
      createPopupOverlay();
      monitorRecordingState(); // Start monitoring recording state
      console.log('SummarizeX overlay initialized successfully');
    } catch (error) {
      console.error('Error initializing SummarizeX overlay:', error);
    }
  }

  // Initialize when page loads
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    // DOM is already loaded
    setTimeout(initialize, 100);
  }

  // Handle navigation in SPAs
  let currentUrl = location.href;
  const observer = new MutationObserver(() => {
    if (location.href !== currentUrl) {
      currentUrl = location.href;
      console.log('URL changed, reinitializing...');
      // Small delay for SPA navigation
      setTimeout(initialize, 500);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  console.log('SummarizeX Content Script Setup Complete');

})(); 