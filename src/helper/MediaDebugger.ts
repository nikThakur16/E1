interface DebugInfo {
  timestamp: number;
  action: string;
  component: string;
  details: any;
  performance?: {
    startTime: number;
    endTime?: number;
    duration?: number;
  };
  error?: any;
}

interface MediaState {
  isPlaying: boolean;
  isPaused: boolean;
  isRecording: boolean;
  currentTime: number;
  duration: number;
  volume: number;
}

class MediaDebugger {
  private debugLogs: DebugInfo[] = [];
  private maxLogs: number = 100; // Keep last 100 logs
  private performanceMarkers: Map<string, number> = new Map();

  // Helper method to validate duration values
  private validateDuration(duration: number): number {
    return isFinite(duration) && !isNaN(duration) && duration >= 0 ? duration : 0;
  }

  // Colors for console output
  private colors = {
    play: '#4CAF50',      // Green
    pause: '#FF9800',     // Orange  
    stop: '#F44336',      // Red
    start: '#2196F3',     // Blue
    resume: '#9C27B0',    // Purple
    error: '#FF1744',     // Dark Red
    info: '#607D8B',      // Blue Gray
    warning: '#FFC107'    // Amber
  };

  private getActionColor(action: string): string {
    const actionLower = action.toLowerCase();
    if (actionLower.includes('play')) return this.colors.play;
    if (actionLower.includes('pause')) return this.colors.pause;
    if (actionLower.includes('stop')) return this.colors.stop;
    if (actionLower.includes('start')) return this.colors.start;
    if (actionLower.includes('resume')) return this.colors.resume;
    if (actionLower.includes('error')) return this.colors.error;
    if (actionLower.includes('warn')) return this.colors.warning;
    return this.colors.info;
  }

  // Start performance tracking for an action
  startPerformanceTrack(markerId: string): void {
    this.performanceMarkers.set(markerId, performance.now());
  }

  // End performance tracking and return duration
  endPerformanceTrack(markerId: string): number {
    const startTime = this.performanceMarkers.get(markerId);
    if (!startTime) return 0;
    
    const duration = performance.now() - startTime;
    this.performanceMarkers.delete(markerId);
    return duration;
  }

  // Main debug logging method
  log(action: string, component: string, details: any = {}, error?: any): void {
    const timestamp = Date.now();
    const debugInfo: DebugInfo = {
      timestamp,
      action,
      component,
      details,
      error
    };

    // Add performance info if available
    const performanceId = `${component}-${action}`;
    if (this.performanceMarkers.has(performanceId)) {
      const duration = this.endPerformanceTrack(performanceId);
      debugInfo.performance = {
        startTime: this.performanceMarkers.get(performanceId) || 0,
        endTime: performance.now(),
        duration
      };
    }

    this.debugLogs.push(debugInfo);

    // Trim logs if exceeding maxLogs
    if (this.debugLogs.length > this.maxLogs) {
      this.debugLogs = this.debugLogs.slice(-this.maxLogs);
    }

    // Console output with styling
    this.outputToConsole(debugInfo);

    // Store in chrome storage for persistence (if available)
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({
        mediaDebugLogs: this.debugLogs.slice(-50) // Store last 50 logs
      }).catch(() => {}); // Silently fail if storage not available
    }
  }

  private outputToConsole(debugInfo: DebugInfo): void {
    const { timestamp, action, component, details, performance, error } = debugInfo;
    const time = new Date(timestamp).toLocaleTimeString();
    const color = this.getActionColor(action);
    
    const actionIcon = this.getActionIcon(action);
    const performanceText = performance ? ` (${performance.duration?.toFixed(2)}ms)` : '';
    
    const baseMessage = `${actionIcon} [${time}] ${component} → ${action}${performanceText}`;
    
    if (error) {
      console.group(`%c${baseMessage}`, `color: ${this.colors.error}; font-weight: bold;`);
      console.error('Error Details:', error);
      console.log('Context:', details);
      console.groupEnd();
    } else {
      console.group(`%c${baseMessage}`, `color: ${color}; font-weight: bold;`);
      if (Object.keys(details).length > 0) {
        console.log('Details:', details);
      }
      if (performance) {
        console.log(`Performance: ${performance.duration?.toFixed(2)}ms`);
      }
      console.groupEnd();
    }
  }

  private getActionIcon(action: string): string {
    const actionLower = action.toLowerCase();
    if (actionLower.includes('play')) return '▶️';
    if (actionLower.includes('pause')) return '⏸️';
    if (actionLower.includes('stop')) return '⏹️';
    if (actionLower.includes('start')) return '🎬';
    if (actionLower.includes('resume')) return '▶️';
    if (actionLower.includes('record')) return '🔴';
    if (actionLower.includes('error')) return '❌';
    if (actionLower.includes('success')) return '✅';
    if (actionLower.includes('warn')) return '⚠️';
    return '📝';
  }

  // Specific logging methods for different media actions
  logPlayAction(component: string, mediaState: Partial<MediaState>, fileUrl?: string): void {
    this.log('PLAY', component, {
      fileUrl,
      currentTime: mediaState.currentTime,
      duration: this.validateDuration(mediaState.duration || 0),
      volume: mediaState.volume,
      previousState: { isPlaying: false }
    });
  }

  logPauseAction(component: string, mediaState: Partial<MediaState>): void {
    this.log('PAUSE', component, {
      currentTime: mediaState.currentTime,
      duration: this.validateDuration(mediaState.duration || 0),
      previousState: { isPlaying: true }
    });
  }

  logStopAction(component: string, mediaState: Partial<MediaState>): void {
    this.log('STOP', component, {
      finalTime: mediaState.currentTime,
      duration: this.validateDuration(mediaState.duration || 0),
      wasPlaying: mediaState.isPlaying
    });
  }

  logStartRecording(component: string, config: any): void {
    this.startPerformanceTrack(`${component}-START_RECORDING`);
    this.log('START_RECORDING', component, {
      config,
      timestamp: Date.now(),
      userAgent: navigator.userAgent
    });
  }

  logStopRecording(component: string, recordingData: any): void {
    this.log('STOP_RECORDING', component, {
      recordingData,
      timestamp: Date.now(),
      duration: recordingData?.duration || 'unknown'
    });
  }

  logResumeRecording(component: string, resumeData: any): void {
    this.log('RESUME_RECORDING', component, {
      resumeData,
      timestamp: Date.now(),
      totalPausedTime: resumeData?.totalPausedTime || 0
    });
  }

  logPauseRecording(component: string, pauseData: any): void {
    this.log('PAUSE_RECORDING', component, {
      pauseData,
      timestamp: Date.now(),
      currentDuration: pauseData?.currentDuration || 0
    });
  }

  logError(component: string, action: string, error: any, context: any = {}): void {
    this.log(`ERROR_${action}`, component, context, error);
  }

  logWarning(component: string, action: string, warning: string, context: any = {}): void {
    this.log(`WARNING_${action}`, component, { warning, ...context });
  }

  logSuccess(component: string, action: string, result: any = {}): void {
    this.log(`SUCCESS_${action}`, component, result);
  }

  // Utility methods
  getLogs(): DebugInfo[] {
    return [...this.debugLogs];
  }

  getLogsForComponent(component: string): DebugInfo[] {
    return this.debugLogs.filter(log => log.component === component);
  }

  getLogsForAction(action: string): DebugInfo[] {
    return this.debugLogs.filter(log => log.action.includes(action));
  }

  clearLogs(): void {
    this.debugLogs = [];
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.remove('mediaDebugLogs').catch(() => {});
    }
  }

  // Export logs as JSON
  exportLogs(): string {
    return JSON.stringify(this.debugLogs, null, 2);
  }

  // Generate debug report
  generateReport(): string {
    const report = {
      timestamp: new Date().toISOString(),
      totalLogs: this.debugLogs.length,
      components: [...new Set(this.debugLogs.map(log => log.component))],
      actions: [...new Set(this.debugLogs.map(log => log.action))],
      errors: this.debugLogs.filter(log => log.error).length,
      recentLogs: this.debugLogs.slice(-10),
      performanceStats: this.getPerformanceStats()
    };
    return JSON.stringify(report, null, 2);
  }

  private getPerformanceStats(): any {
    const logsWithPerformance = this.debugLogs.filter(log => log.performance);
    if (logsWithPerformance.length === 0) return null;

    const durations = logsWithPerformance.map(log => log.performance!.duration!);
    return {
      count: durations.length,
      average: durations.reduce((a, b) => a + b, 0) / durations.length,
      min: Math.min(...durations),
      max: Math.max(...durations)
    };
  }

  // Add context-aware debugging
  logStateChange(component: string, action: string, before: any, after: any): void {
    this.log(`STATE_CHANGE_${action}`, component, {
      before,
      after,
      changes: this.getStateChanges(before, after)
    });
  }

  private getStateChanges(before: any, after: any): any {
    const changes: any = {};
    const allKeys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
    
    allKeys.forEach(key => {
      if (before?.[key] !== after?.[key]) {
        changes[key] = { from: before?.[key], to: after?.[key] };
      }
    });
    
    return changes;
  }
}

// Create singleton instance
const mediaDebugger = new MediaDebugger();

export default mediaDebugger;
export type { DebugInfo, MediaState }; 