// State Recovery Utility for Chrome Extension
// Handles DOMExceptions and state synchronization issues

interface ExtensionState {
  isRecording: boolean;
  isPaused: boolean;
  recordingStartTime: number | null;
  pausedTime: number | null;
  totalPaused: number;
  currentView: string | null;
}

interface StateRecoveryResult {
  success: boolean;
  state?: ExtensionState;
  error?: string;
  recovered?: boolean;
}

class StateRecoveryManager {
  private static instance: StateRecoveryManager;
  private defaultState: ExtensionState = {
    isRecording: false,
    isPaused: false,
    recordingStartTime: null,
    pausedTime: null,
    totalPaused: 0,
    currentView: null
  };

  static getInstance(): StateRecoveryManager {
    if (!StateRecoveryManager.instance) {
      StateRecoveryManager.instance = new StateRecoveryManager();
    }
    return StateRecoveryManager.instance;
  }

  // Safely get state with DOMException handling
  async getStateWithRecovery(): Promise<StateRecoveryResult> {
    try {
      // Try to get state from chrome storage
      const data = await chrome?.storage?.local?.get([
        'isRecording',
        'isPaused', 
        'recordingStartTime',
        'pausedTime',
        'totalPaused',
        'currentView'
      ]);

      const state: ExtensionState = {
        isRecording: !!data.isRecording,
        isPaused: !!data.isPaused,
        recordingStartTime: data.recordingStartTime ?? null,
        pausedTime: data.pausedTime ?? null,
        totalPaused: typeof data.totalPaused === 'number' ? data.totalPaused : 0,
        currentView: data.currentView ?? null
      };

      return {
        success: true,
        state,
        recovered: false
      };

    } catch (error) {
      console.error('Error getting state, attempting recovery:', error);
      
      // Check if it's a DOMException
      if (error instanceof DOMException) {
        return this.handleDOMException(error);
      }

      // For other errors, return default state
      return {
        success: false,
        state: { ...this.defaultState },
        error: error instanceof Error ? error.message : String(error),
        recovered: true
      };
    }
  }

  // Handle specific DOMException cases
  private async handleDOMException(error: DOMException): Promise<StateRecoveryResult> {
    console.warn('DOMException encountered:', error.name, error.message);

    let recoveryAction = '';
    
    switch (error.name) {
      case 'QuotaExceededError':
        recoveryAction = 'clearing old data';
        await this.clearOldData();
        break;
        
      case 'InvalidStateError':
        recoveryAction = 'resetting state';
        await this.resetToDefaultState();
        break;
        
      case 'NotAllowedError':
        recoveryAction = 'retrying with fallback';
        // Use session storage as fallback
        return this.trySessionStorageFallback();
        
      default:
        recoveryAction = 'using default state';
        break;
    }

    console.log(`State recovery: ${recoveryAction}`);
    
    return {
      success: false,
      state: { ...this.defaultState },
      error: `DOMException: ${error.message}. Recovery: ${recoveryAction}`,
      recovered: true
    };
  }

  // Try session storage as fallback
  private async trySessionStorageFallback(): Promise<StateRecoveryResult> {
    try {
      if (typeof sessionStorage !== 'undefined') {
        const sessionData = sessionStorage.getItem('extensionState');
        if (sessionData) {
          const state = JSON.parse(sessionData) as ExtensionState;
          return {
            success: true,
            state,
            recovered: true
          };
        }
      }
    } catch (e) {
      console.warn('Session storage fallback failed:', e);
    }

    return {
      success: false,
      state: { ...this.defaultState },
      error: 'All storage methods failed',
      recovered: true
    };
  }

  // Clear old data to free up quota
  private async clearOldData(): Promise<void> {
    try {
      // Remove old debug logs and temporary data
      const keysToRemove = [
        'mediaDebugLogs',
        'offscreenDebugLogs', 
        'backgroundDebugLogs',
        'tempRecordingData',
        'oldRecordingChunks'
      ];
      
      await chrome?.storage?.local?.remove(keysToRemove);
      console.log('Cleared old data to free up storage quota');
    } catch (e) {
      console.warn('Failed to clear old data:', e);
    }
  }

  // Reset to default state
  private async resetToDefaultState(): Promise<void> {
    try {
      await chrome?.storage?.local?.set({
        ...this.defaultState,
        lastUpdated: Date.now(),
        stateReset: true
      });
      console.log('State reset to default values');
    } catch (e) {
      console.warn('Failed to reset state:', e);
    }
  }

  // Safely set state with error handling
  async setStateWithRecovery(newState: Partial<ExtensionState>): Promise<StateRecoveryResult> {
    try {
      const stateToSet = {
        ...newState,
        lastUpdated: Date.now()
      };

      await chrome?.storage?.local?.set(stateToSet);
      
      // Also backup to session storage
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('extensionState', JSON.stringify(stateToSet));
      }

      return {
        success: true,
        state: stateToSet as ExtensionState
      };

    } catch (error) {
      console.error('Error setting state:', error);
      
      if (error instanceof DOMException) {
        return this.handleDOMException(error);
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  // Validate state consistency
  validateState(state: ExtensionState): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    // Check for logical inconsistencies
    if (state.isPaused && !state.isRecording) {
      issues.push('Cannot be paused without recording');
    }

    if (state.pausedTime && !state.isPaused) {
      issues.push('Has pause time but not marked as paused');
    }

    if (state.isRecording && !state.recordingStartTime) {
      issues.push('Recording without start time');
    }

    if (state.totalPaused < 0) {
      issues.push('Negative total paused time');
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  // Attempt to sync states between components
  async syncStates(): Promise<{ synced: boolean; conflicts: string[] }> {
    const conflicts: string[] = [];
    
    try {
      // Get state from storage
      const storageResult = await this.getStateWithRecovery();
      if (!storageResult.success || !storageResult.state) {
        return { synced: false, conflicts: ['Failed to get storage state'] };
      }

      // Validate the state
      const validation = this.validateState(storageResult.state);
      if (!validation.valid) {
        conflicts.push(...validation.issues);
        
        // Try to fix common issues
        const fixedState = await this.fixStateIssues(storageResult.state);
        await this.setStateWithRecovery(fixedState);
      }

      return { synced: true, conflicts };

    } catch (error) {
      conflicts.push(`Sync error: ${error instanceof Error ? error.message : String(error)}`);
      return { synced: false, conflicts };
    }
  }

  // Fix common state issues
  private async fixStateIssues(state: ExtensionState): Promise<ExtensionState> {
    const fixed = { ...state };

    // Fix: paused without recording
    if (fixed.isPaused && !fixed.isRecording) {
      fixed.isPaused = false;
      fixed.pausedTime = null;
    }

    // Fix: negative total paused
    if (fixed.totalPaused < 0) {
      fixed.totalPaused = 0;
    }

    // Fix: recording without start time
    if (fixed.isRecording && !fixed.recordingStartTime) {
      fixed.recordingStartTime = Date.now();
    }

    return fixed;
  }
}

export default StateRecoveryManager.getInstance();
export type { ExtensionState, StateRecoveryResult }; 