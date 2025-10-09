document.addEventListener('DOMContentLoaded', function() {
    const allowBtn = document.getElementById('allowBtn');
    const denyBtn = document.getElementById('denyBtn');
    const loading = document.getElementById('loading');
    const status = document.getElementById('status');
    
    function showLoading(show = true) {
        loading.style.display = show ? 'flex' : 'none';
        allowBtn.disabled = show;
        denyBtn.disabled = show;
    }
    
    function showStatus(message, isError = false) {
        status.textContent = message;
        status.className = `status ${isError ? 'error' : 'success'}`;
        status.style.display = 'block';
    }
    
    function hideStatus() {
        status.style.display = 'none';
    }
    
    function closeTab() {
        setTimeout(() => {
            window.close();
            // Fallback for if window.close() doesn't work
            chrome.runtime.sendMessage({ action: 'closePermissionTab' });
        }, 2000);
    }
    
    // Handle allow button click
    allowBtn.addEventListener('click', async function() {
        try {
            showLoading(true);
            hideStatus();
            
            console.log('🎤 Requesting microphone permission...');
            
            // Request microphone permission
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });
            
            // Stop the stream immediately after getting permission
            stream.getTracks().forEach(track => track.stop());
            
            console.log('✅ Microphone permission granted');
            showLoading(false);
            showStatus('✅ Permission granted! You can now record audio.', false);
            
            // Notify background script
            chrome.runtime.sendMessage({
                action: 'permissionGranted',
                result: { granted: true, error: null }
            });
            
            closeTab();
            
        } catch (error) {
            console.error('❌ Permission denied:', error);
            showLoading(false);
            
            let errorMessage = 'Permission denied';
            
            if (error.name === 'NotAllowedError') {
                errorMessage = 'Microphone permission was denied. Please click "Allow" when prompted by your browser.';
            } else if (error.name === 'NotFoundError') {
                errorMessage = 'No microphone device found. Please connect a microphone and try again.';
            } else if (error.name === 'NotReadableError') {
                errorMessage = 'Microphone is being used by another application. Please close other apps and try again.';
            } else if (error.name === 'OverconstrainedError') {
                errorMessage = 'Your microphone doesn\'t support the required audio settings.';
            } else if (error.name === 'SecurityError') {
                errorMessage = 'Microphone access is blocked by your browser\'s security settings.';
            }
            
            showStatus(errorMessage, true);
            
            // Notify background script
            chrome.runtime.sendMessage({
                action: 'permissionDenied',
                result: { granted: false, error: errorMessage }
            });
            
            closeTab();
        }
    });
    
    // Handle deny button click
    denyBtn.addEventListener('click', function() {
        console.log('❌ User denied permission request');
        
        showStatus('Permission denied. Recording features will not be available.', true);
        
        // Notify background script
        chrome.runtime.sendMessage({
            action: 'permissionDenied',
            result: { granted: false, error: 'User denied permission request' }
        });
        
        closeTab();
    });
    
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'requestMicrophonePermission') {
            // This page was opened to request permission
            // The UI is already ready for user interaction
            sendResponse({ status: 'ready' });
        }
    });
    
    // Auto-focus the allow button for better UX
    setTimeout(() => {
        allowBtn.focus();
    }, 500);
});

// Handle page visibility changes
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        // Page is hidden, user might have switched tabs
        console.log('Permission page hidden');
    } else {
        // Page is visible again
        console.log('Permission page visible');
        document.getElementById('allowBtn').focus();
    }
});

// Handle beforeunload to clean up
window.addEventListener('beforeunload', function() {
    chrome.runtime.sendMessage({
        action: 'permissionPageClosed',
        result: { granted: false, error: 'Permission page was closed' }
    });
}); 