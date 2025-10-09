/**
 * Integration Tests for Recording Flow
 * Tests the complete recording workflow including timer, state, and audio handling
 */

const { MockTimer } = require('./timer.test.js');
const { MockChromeStorage, MockRecordingStateManager } = require('./state.test.js');

// Mock Audio Recording Manager
class MockAudioRecordingManager {
  constructor() {
    this.isRecording = false;
    this.isPaused = false;
    this.audioData = null;
    this.startTime = null;
  }

  async startRecording() {
    this.isRecording = true;
    this.isPaused = false;
    this.startTime = Date.now();
    return { status: "started" };
  }

  pauseRecording() {
    if (this.isRecording && !this.isPaused) {
      this.isPaused = true;
      return { status: "paused" };
    }
    return { status: "error", error: "Cannot pause" };
  }

  resumeRecording() {
    if (this.isRecording && this.isPaused) {
      this.isPaused = false;
      return { status: "resumed" };
    }
    return { status: "error", error: "Cannot resume" };
  }

  stopRecording() {
    if (this.isRecording) {
      this.isRecording = false;
      this.isPaused = false;
      // Simulate creating audio data
      this.audioData = "mock_audio_data_" + Date.now();
      return { status: "stopped" };
    }
    return { status: "error", error: "Not recording" };
  }

  getRecordingData() {
    return {
      hasData: !!this.audioData,
      data: this.audioData,
      timestamp: Date.now()
    };
  }
}

// Complete Recording Flow Manager
class MockRecordingFlowManager {
  constructor() {
    this.timer = new MockTimer();
    this.stateManager = new MockRecordingStateManager();
    this.audioManager = new MockAudioRecordingManager();
    this.currentElapsed = 0;
  }

  // Start recording workflow
  async startRecording() {
    try {
      // Start audio recording
      const audioResult = await this.audioManager.startRecording();
      if (audioResult.status !== "started") {
        throw new Error("Failed to start audio recording");
      }

      // Start timer
      this.timer.startTimer(0);
      
      // Save state
      await this.stateManager.startRecording();
      
      return { status: "started", timestamp: Date.now() };
    } catch (error) {
      return { status: "error", error: error.message };
    }
  }

  // Pause recording workflow
  async pauseRecording() {
    try {
      // Pause audio recording
      const audioResult = this.audioManager.pauseRecording();
      if (audioResult.status !== "paused") {
        throw new Error("Failed to pause audio recording");
      }

      // Pause timer
      this.timer.pauseTimer();
      
      // Save state
      await this.stateManager.pauseRecording();
      
      return { status: "paused" };
    } catch (error) {
      return { status: "error", error: error.message };
    }
  }

  // Resume recording workflow
  async resumeRecording() {
    try {
      // Resume audio recording
      const audioResult = this.audioManager.resumeRecording();
      if (audioResult.status !== "resumed") {
        throw new Error("Failed to resume audio recording");
      }

      // Resume timer
      this.timer.resumeTimer();
      
      // Save state
      await this.stateManager.resumeRecording();
      
      return { status: "resumed" };
    } catch (error) {
      return { status: "error", error: error.message };
    }
  }

  // Stop recording workflow
  async stopRecording() {
    try {
      // Stop audio recording
      const audioResult = this.audioManager.stopRecording();
      if (audioResult.status !== "stopped") {
        throw new Error("Failed to stop audio recording");
      }

      // Stop timer
      this.timer.stopTimer();
      
      // Save state
      await this.stateManager.stopRecording();
      
      // Get recording data
      const recordingData = this.audioManager.getRecordingData();
      
      return { 
        status: "stopped", 
        hasData: recordingData.hasData,
        data: recordingData.data 
      };
    } catch (error) {
      return { status: "error", error: error.message };
    }
  }

  // Get current recording status
  getStatus() {
    return {
      isRecording: this.audioManager.isRecording,
      isPaused: this.audioManager.isPaused,
      elapsedTime: this.timer.elapsed,
      hasRecording: !!this.audioManager.audioData
    };
  }

  // Simulate timer tick
  tick() {
    this.timer.tick();
    this.currentElapsed = this.timer.elapsed;
  }

  // Advance time for testing
  advanceTime(ms) {
    this.timer.advanceTime(ms);
    this.stateManager.advanceTime(ms);
  }
}

// Integration Test Suite
describe('Recording Flow Integration Tests', () => {
  let recordingFlow;

  beforeEach(() => {
    recordingFlow = new MockRecordingFlowManager();
  });

  describe('Complete Recording Workflow', () => {
    test('should handle complete recording session', async () => {
      // Start recording
      const startResult = await recordingFlow.startRecording();
      expect(startResult.status).toBe("started");

      // Record for 10 seconds
      recordingFlow.advanceTime(10000);
      recordingFlow.tick();
      
      let status = recordingFlow.getStatus();
      expect(status.isRecording).toBe(true);
      expect(status.elapsedTime).toBe(10);

      // Stop recording
      const stopResult = await recordingFlow.stopRecording();
      expect(stopResult.status).toBe("stopped");
      expect(stopResult.hasData).toBe(true);

      status = recordingFlow.getStatus();
      expect(status.isRecording).toBe(false);
      expect(status.hasRecording).toBe(true);
    });

    test('should handle recording with pause and resume', async () => {
      // Start recording
      await recordingFlow.startRecording();

      // Record for 5 seconds
      recordingFlow.advanceTime(5000);
      recordingFlow.tick();
      
      let status = recordingFlow.getStatus();
      expect(status.elapsedTime).toBe(5);

      // Pause for 3 seconds
      const pauseResult = await recordingFlow.pauseRecording();
      expect(pauseResult.status).toBe("paused");
      
      recordingFlow.advanceTime(3000);
      recordingFlow.tick();
      
      status = recordingFlow.getStatus();
      expect(status.isPaused).toBe(true);
      expect(status.elapsedTime).toBe(5); // Should not advance during pause

      // Resume and record for 3 more seconds
      const resumeResult = await recordingFlow.resumeRecording();
      expect(resumeResult.status).toBe("resumed");
      
      recordingFlow.advanceTime(3000);
      recordingFlow.tick();
      
      status = recordingFlow.getStatus();
      expect(status.isPaused).toBe(false);
      expect(status.elapsedTime).toBe(8); // 5 + 3 = 8, not 11

      // Stop recording
      await recordingFlow.stopRecording();
      status = recordingFlow.getStatus();
      expect(status.hasRecording).toBe(true);
    });

    test('should handle multiple pause/resume cycles', async () => {
      await recordingFlow.startRecording();

      // Record for 2 seconds
      recordingFlow.advanceTime(2000);
      recordingFlow.tick();
      expect(recordingFlow.getStatus().elapsedTime).toBe(2);

      // Pause for 1 second
      await recordingFlow.pauseRecording();
      recordingFlow.advanceTime(1000);

      // Resume and record for 2 seconds
      await recordingFlow.resumeRecording();
      recordingFlow.advanceTime(2000);
      recordingFlow.tick();
      expect(recordingFlow.getStatus().elapsedTime).toBe(4); // 2 + 2 = 4

      // Pause for 2 seconds
      await recordingFlow.pauseRecording();
      recordingFlow.advanceTime(2000);

      // Resume and record for 1 second
      await recordingFlow.resumeRecording();
      recordingFlow.advanceTime(1000);
      recordingFlow.tick();
      expect(recordingFlow.getStatus().elapsedTime).toBe(5); // 4 + 1 = 5

      await recordingFlow.stopRecording();
    });
  });

  describe('State Persistence and Restoration', () => {
    test('should restore recording state correctly', async () => {
      await recordingFlow.startRecording();
      
      // Record for 7 seconds
      recordingFlow.advanceTime(7000);
      recordingFlow.tick();
      
      // Pause
      await recordingFlow.pauseRecording();
      recordingFlow.advanceTime(5000); // Pause for 5 seconds
      
      // Simulate popup close/reopen by creating new flow manager
      const newFlow = new MockRecordingFlowManager();
      
      // Restore state
      const restoredState = await newFlow.stateManager.restoreState();
      
      expect(restoredState.isRecording).toBe(true);
      expect(restoredState.isPaused).toBe(true);
      expect(restoredState.elapsedTime).toBe(7); // Should be 7, not 12
    });

    test('should handle state restoration during active recording', async () => {
      await recordingFlow.startRecording();
      
      // Record for 15 seconds
      recordingFlow.advanceTime(15000);
      recordingFlow.tick();
      
      // Simulate state restoration
      const restoredState = await recordingFlow.stateManager.restoreState();
      
      expect(restoredState.isRecording).toBe(true);
      expect(restoredState.isPaused).toBe(false);
      expect(restoredState.elapsedTime).toBe(15);
    });
  });

  describe('Error Handling', () => {
    test('should handle pause when not recording', async () => {
      const pauseResult = await recordingFlow.pauseRecording();
      expect(pauseResult.status).toBe("error");
    });

    test('should handle resume when not paused', async () => {
      await recordingFlow.startRecording();
      
      const resumeResult = await recordingFlow.resumeRecording();
      expect(resumeResult.status).toBe("error");
    });

    test('should handle stop when not recording', async () => {
      const stopResult = await recordingFlow.stopRecording();
      expect(stopResult.status).toBe("error");
    });
  });

  describe('Edge Cases', () => {
    test('should handle very short recording sessions', async () => {
      await recordingFlow.startRecording();
      
      // Record for 100ms
      recordingFlow.advanceTime(100);
      recordingFlow.tick();
      
      await recordingFlow.stopRecording();
      
      const status = recordingFlow.getStatus();
      expect(status.hasRecording).toBe(true);
    });

    test('should handle rapid pause/resume cycles', async () => {
      await recordingFlow.startRecording();
      
      // Rapid cycles
      for (let i = 0; i < 10; i++) {
        await recordingFlow.pauseRecording();
        recordingFlow.advanceTime(50);
        await recordingFlow.resumeRecording();
        recordingFlow.advanceTime(50);
        recordingFlow.tick();
      }
      
      // Should have recorded for 1 second total (10 * 100ms)
      expect(recordingFlow.getStatus().elapsedTime).toBe(1);
    });

    test('should handle long pause duration', async () => {
      await recordingFlow.startRecording();
      
      // Record for 1 second
      recordingFlow.advanceTime(1000);
      recordingFlow.tick();
      
      // Pause for 1 hour
      await recordingFlow.pauseRecording();
      recordingFlow.advanceTime(3600000);
      
      // Resume and record for 1 second
      await recordingFlow.resumeRecording();
      recordingFlow.advanceTime(1000);
      recordingFlow.tick();
      
      expect(recordingFlow.getStatus().elapsedTime).toBe(2); // 1 + 1 = 2
    });
  });
});

// Export for use in other test files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MockAudioRecordingManager, MockRecordingFlowManager };
}
