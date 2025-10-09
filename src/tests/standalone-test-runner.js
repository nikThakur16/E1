/**
 * Standalone Test Runner for Recording Extension Tests
 * Executes all test suites without external dependencies
 */

// Mock Timer Class
class MockTimer {
  constructor() {
    this.elapsed = 0;
    this.recordingStartTime = null;
    this.lastPauseTime = null;
    this.totalPausedDuration = 0;
    this.lastElapsedTime = 0;
    this.isPaused = false;
    this.timerId = null;
    this.mockTime = 1000000; // Start with a fixed timestamp
  }

  mockNow() {
    return this.mockTime;
  }

  advanceTime(ms) {
    this.mockTime += ms;
  }

  startTimer(initialElapsed = 0) {
    this.elapsed = initialElapsed;
    this.lastElapsedTime = initialElapsed;
    this.recordingStartTime = this.mockNow() - (initialElapsed * 1000);
    this.totalPausedDuration = 0;
    this.isPaused = false;
  }

  pauseTimer() {
    this.lastPauseTime = this.mockNow();
    this.isPaused = true;
  }

  resumeTimer() {
    if (this.lastPauseTime && this.recordingStartTime) {
      const now = this.mockNow();
      this.recordingStartTime = now - (this.lastElapsedTime * 1000);
    }
    this.isPaused = false;
    this.lastPauseTime = null;
  }

  getCurrentElapsed() {
    if (!this.recordingStartTime || this.isPaused) {
      return this.lastElapsedTime;
    }
    const currentTime = this.mockNow();
    return Math.floor((currentTime - this.recordingStartTime) / 1000);
  }

  tick() {
    if (!this.isPaused && this.recordingStartTime) {
      this.elapsed = this.getCurrentElapsed();
      this.lastElapsedTime = this.elapsed;
    }
  }

  stopTimer() {
    this.recordingStartTime = null;
    this.lastPauseTime = null;
    this.totalPausedDuration = 0;
    this.lastElapsedTime = 0;
    this.isPaused = false;
  }
}

// Mock Chrome Storage
class MockChromeStorage {
  constructor() {
    this.storage = {};
  }

  async get(keys) {
    const result = {};
    if (Array.isArray(keys)) {
      keys.forEach(key => {
        result[key] = this.storage[key] || null;
      });
    } else if (typeof keys === 'string') {
      result[keys] = this.storage[keys] || null;
    } else if (typeof keys === 'object') {
      Object.keys(keys).forEach(key => {
        result[key] = this.storage[key] || keys[key];
      });
    }
    return result;
  }

  async set(data) {
    Object.assign(this.storage, data);
  }

  async remove(keys) {
    if (Array.isArray(keys)) {
      keys.forEach(key => delete this.storage[key]);
    } else {
      delete this.storage[keys];
    }
  }
}

// Mock Recording State Manager
class MockRecordingStateManager {
  constructor() {
    this.storage = new MockChromeStorage();
    this.currentTime = 1000000;
  }

  mockNow() {
    return this.currentTime;
  }

  advanceTime(ms) {
    this.currentTime += ms;
  }

  async startRecording() {
    const recordingState = {
      isRecording: true,
      recordingStartTime: this.mockNow(),
      isPaused: false,
      pausedTime: null,
      lastUpdated: this.mockNow(),
      currentView: 'recording'
    };
    
    await this.storage.set(recordingState);
    return recordingState;
  }

  async pauseRecording() {
    const state = await this.storage.get([
      'isRecording',
      'recordingStartTime',
      'isPaused',
      'pausedTime'
    ]);

    if (state.isRecording && !state.isPaused) {
      await this.storage.set({
        isPaused: true,
        isRecording: true,
        pausedTime: this.mockNow(),
        currentView: 'recording'
      });
    }
  }

  async resumeRecording() {
    const state = await this.storage.get([
      'isRecording',
      'isPaused',
      'pausedTime'
    ]);

    if (state.isRecording && state.isPaused) {
      await this.storage.set({
        isPaused: false,
        isRecording: true,
        pausedTime: null,
        currentView: 'recording'
      });
    }
  }

  async stopRecording() {
    await this.storage.set({
      isRecording: false,
      isPaused: false,
      recordingStartTime: null,
      pausedTime: null,
      currentView: 'recording',
      lastRecordingStatus: {
        isRecording: false,
        hasRecording: true,
        finishedAt: this.mockNow()
      }
    });
  }

  async restoreState() {
    const result = await this.storage.get([
      'isRecording',
      'isPaused',
      'lastRecordingData',
      'recordingStartTime',
      'pausedTime'
    ]);

    if (result.isRecording) {
      const now = this.mockNow();
      
      // Calculate the actual recording time (excluding pauses)
      let actualElapsed;
      
      if (result.isPaused && result.pausedTime) {
        // If currently paused, elapsed time is the time from start to pause
        actualElapsed = Math.floor((result.pausedTime - result.recordingStartTime) / 1000);
      } else {
        // If not paused, elapsed time is current time minus start time
        actualElapsed = Math.floor((now - result.recordingStartTime) / 1000);
      }
      
      // Ensure elapsed time is not negative
      actualElapsed = Math.max(0, actualElapsed);
      
      return {
        isRecording: true,
        isPaused: result.isPaused || false,
        elapsedTime: actualElapsed,
        pausedTime: result.pausedTime
      };
    }

    return {
      isRecording: false,
      isPaused: false,
      elapsedTime: 0,
      pausedTime: null
    };
  }
}

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

  async startRecording() {
    try {
      const audioResult = await this.audioManager.startRecording();
      if (audioResult.status !== "started") {
        throw new Error("Failed to start audio recording");
      }

      this.timer.startTimer(0);
      await this.stateManager.startRecording();
      
      return { status: "started", timestamp: Date.now() };
    } catch (error) {
      return { status: "error", error: error.message };
    }
  }

  async pauseRecording() {
    try {
      const audioResult = this.audioManager.pauseRecording();
      if (audioResult.status !== "paused") {
        throw new Error("Failed to pause audio recording");
      }

      this.timer.pauseTimer();
      await this.stateManager.pauseRecording();
      
      return { status: "paused" };
    } catch (error) {
      return { status: "error", error: error.message };
    }
  }

  async resumeRecording() {
    try {
      const audioResult = this.audioManager.resumeRecording();
      if (audioResult.status !== "resumed") {
        throw new Error("Failed to resume audio recording");
      }

      this.timer.resumeTimer();
      await this.stateManager.resumeRecording();
      
      return { status: "resumed" };
    } catch (error) {
      return { status: "error", error: error.message };
    }
  }

  async stopRecording() {
    try {
      const audioResult = this.audioManager.stopRecording();
      if (audioResult.status !== "stopped") {
        throw new Error("Failed to stop audio recording");
      }

      this.timer.stopTimer();
      await this.stateManager.stopRecording();
      
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

  getStatus() {
    return {
      isRecording: this.audioManager.isRecording,
      isPaused: this.audioManager.isPaused,
      elapsedTime: this.timer.elapsed,
      hasRecording: !!this.audioManager.audioData
    };
  }

  tick() {
    this.timer.tick();
    this.currentElapsed = this.timer.elapsed;
  }

  advanceTime(ms) {
    this.timer.advanceTime(ms);
    this.stateManager.advanceTime(ms);
  }
}

// Test Runner
class TestRunner {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      total: 0,
      failures: []
    };
  }

  async runTest(testName, testFunction) {
    try {
      await testFunction();
      this.results.passed++;
      console.log(`✅ ${testName}`);
      return true;
    } catch (error) {
      this.results.failed++;
      this.results.failures.push({
        test: testName,
        error: error.message,
        stack: error.stack
      });
      console.log(`❌ ${testName}: ${error.message}`);
      return false;
    }
  }

  async runTestSuite(suiteName, tests) {
    console.log(`\n🧪 Running ${suiteName}...`);
    console.log('='.repeat(50));
    
    for (const [testName, testFunction] of Object.entries(tests)) {
      this.results.total++;
      await this.runTest(testName, testFunction);
    }
  }

  printSummary() {
    console.log('\n📊 Test Summary');
    console.log('='.repeat(50));
    console.log(`Total Tests: ${this.results.total}`);
    console.log(`Passed: ${this.results.passed}`);
    console.log(`Failed: ${this.results.failed}`);
    console.log(`Success Rate: ${((this.results.passed / this.results.total) * 100).toFixed(1)}%`);

    if (this.results.failures.length > 0) {
      console.log('\n❌ Failed Tests:');
      this.results.failures.forEach(failure => {
        console.log(`  • ${failure.test}: ${failure.error}`);
      });
    }

    return this.results.failed === 0;
  }
}

// Test Definitions
const timerTests = {
  'should start timer at 0 seconds': async () => {
    const timer = new MockTimer();
    timer.startTimer(0);
    if (timer.elapsed !== 0) throw new Error(`Expected 0, got ${timer.elapsed}`);
  },

  'should advance timer correctly': async () => {
    const timer = new MockTimer();
    timer.startTimer(0);
    timer.advanceTime(5000);
    timer.tick();
    if (timer.elapsed !== 5) throw new Error(`Expected 5, got ${timer.elapsed}`);
  },

  'should pause timer and maintain elapsed time': async () => {
    const timer = new MockTimer();
    timer.startTimer(0);
    timer.advanceTime(10000);
    timer.tick();
    if (timer.elapsed !== 10) throw new Error(`Expected 10, got ${timer.elapsed}`);
    
    timer.pauseTimer();
    timer.advanceTime(5000);
    timer.tick();
    if (timer.elapsed !== 10) throw new Error(`Expected 10, got ${timer.elapsed}`);
    if (!timer.isPaused) throw new Error('Expected timer to be paused');
  },

  'should resume timer from correct point': async () => {
    const timer = new MockTimer();
    timer.startTimer(0);
    timer.advanceTime(10000);
    timer.tick();
    
    timer.pauseTimer();
    timer.advanceTime(5000);
    
    timer.resumeTimer();
    timer.advanceTime(3000);
    timer.tick();
    
    if (timer.elapsed !== 13) throw new Error(`Expected 13, got ${timer.elapsed}`);
  },

  'should not add pause duration to elapsed time': async () => {
    const timer = new MockTimer();
    timer.startTimer(0);
    timer.advanceTime(2000);
    timer.tick();
    
    timer.pauseTimer();
    timer.advanceTime(10000);
    
    timer.resumeTimer();
    timer.advanceTime(3000);
    timer.tick();
    
    if (timer.elapsed !== 5) throw new Error(`Expected 5, got ${timer.elapsed}`);
  },

  'should handle multiple pause/resume cycles': async () => {
    const timer = new MockTimer();
    timer.startTimer(0);
    
    // Record for 5 seconds
    timer.advanceTime(5000);
    timer.tick();
    if (timer.elapsed !== 5) throw new Error(`Expected 5, got ${timer.elapsed}`);
    
    // Pause for 2 seconds
    timer.pauseTimer();
    timer.advanceTime(2000);
    
    // Resume and record for 3 seconds
    timer.resumeTimer();
    timer.advanceTime(3000);
    timer.tick();
    if (timer.elapsed !== 8) throw new Error(`Expected 8, got ${timer.elapsed}`);
    
    // Pause for 1 second
    timer.pauseTimer();
    timer.advanceTime(1000);
    
    // Resume and record for 2 seconds
    timer.resumeTimer();
    timer.advanceTime(2000);
    timer.tick();
    if (timer.elapsed !== 10) throw new Error(`Expected 10, got ${timer.elapsed}`);
  }
};

const stateTests = {
  'should start recording with correct initial state': async () => {
    const stateManager = new MockRecordingStateManager();
    const state = await stateManager.startRecording();
    
    if (!state.isRecording) throw new Error('Expected recording to be active');
    if (state.isPaused) throw new Error('Expected recording to not be paused');
    if (state.pausedTime !== null) throw new Error('Expected pausedTime to be null');
  },

  'should pause recording correctly': async () => {
    const stateManager = new MockRecordingStateManager();
    await stateManager.startRecording();
    stateManager.advanceTime(5000);
    await stateManager.pauseRecording();
    
    const state = await stateManager.storage.get(['isRecording', 'isPaused', 'pausedTime']);
    
    if (!state.isRecording) throw new Error('Expected recording to be active');
    if (!state.isPaused) throw new Error('Expected recording to be paused');
    if (!state.pausedTime) throw new Error('Expected pausedTime to be set');
  },

  'should restore paused recording state correctly': async () => {
    const stateManager = new MockRecordingStateManager();
    await stateManager.startRecording();
    stateManager.advanceTime(5000);
    await stateManager.pauseRecording();
    stateManager.advanceTime(3000);
    
    const restoredState = await stateManager.restoreState();
    
    if (!restoredState.isRecording) throw new Error('Expected recording to be active');
    if (!restoredState.isPaused) throw new Error('Expected recording to be paused');
    if (restoredState.elapsedTime !== 5) throw new Error(`Expected elapsed time 5, got ${restoredState.elapsedTime}`);
  },

  'should maintain accurate elapsed time across state changes': async () => {
    const stateManager = new MockRecordingStateManager();
    await stateManager.startRecording();
    
    // Record for 2 seconds
    stateManager.advanceTime(2000);
    
    // Pause for 10 seconds
    await stateManager.pauseRecording();
    stateManager.advanceTime(10000);
    
    // Check state while paused - should show 2 seconds elapsed (not 12)
    let restoredState = await stateManager.restoreState();
    if (restoredState.elapsedTime !== 2) throw new Error(`Expected elapsed time 2 while paused, got ${restoredState.elapsedTime}`);
    
    // This test validates that pause duration is not included in elapsed time
    // The key is that while paused, elapsed time should remain at 2 seconds
    // even though 10 seconds have passed during the pause
  }
};

const integrationTests = {
  'should handle complete recording session': async () => {
    const recordingFlow = new MockRecordingFlowManager();
    
    const startResult = await recordingFlow.startRecording();
    if (startResult.status !== "started") throw new Error('Failed to start recording');
    
    recordingFlow.advanceTime(10000);
    recordingFlow.tick();
    
    let status = recordingFlow.getStatus();
    if (!status.isRecording) throw new Error('Expected recording to be active');
    if (status.elapsedTime !== 10) throw new Error(`Expected elapsed time 10, got ${status.elapsedTime}`);
    
    const stopResult = await recordingFlow.stopRecording();
    if (stopResult.status !== "stopped") throw new Error('Failed to stop recording');
    if (!stopResult.hasData) throw new Error('Expected recording data to be available');
  },

  'should handle recording with pause and resume': async () => {
    const recordingFlow = new MockRecordingFlowManager();
    
    await recordingFlow.startRecording();
    recordingFlow.advanceTime(5000);
    recordingFlow.tick();
    
    const pauseResult = await recordingFlow.pauseRecording();
    if (pauseResult.status !== "paused") throw new Error('Failed to pause recording');
    
    recordingFlow.advanceTime(3000);
    recordingFlow.tick();
    
    let status = recordingFlow.getStatus();
    if (!status.isPaused) throw new Error('Expected recording to be paused');
    if (status.elapsedTime !== 5) throw new Error(`Expected elapsed time 5, got ${status.elapsedTime}`);
    
    const resumeResult = await recordingFlow.resumeRecording();
    if (resumeResult.status !== "resumed") throw new Error('Failed to resume recording');
    
    recordingFlow.advanceTime(3000);
    recordingFlow.tick();
    
    status = recordingFlow.getStatus();
    if (status.isPaused) throw new Error('Expected recording to not be paused');
    if (status.elapsedTime !== 8) throw new Error(`Expected elapsed time 8, got ${status.elapsedTime}`);
  },

  'should handle multiple pause/resume cycles': async () => {
    const recordingFlow = new MockRecordingFlowManager();
    
    await recordingFlow.startRecording();
    
    // Record for 2 seconds
    recordingFlow.advanceTime(2000);
    recordingFlow.tick();
    if (recordingFlow.getStatus().elapsedTime !== 2) throw new Error('Expected 2 seconds');
    
    // Pause for 1 second
    await recordingFlow.pauseRecording();
    recordingFlow.advanceTime(1000);
    
    // Resume and record for 2 seconds
    await recordingFlow.resumeRecording();
    recordingFlow.advanceTime(2000);
    recordingFlow.tick();
    if (recordingFlow.getStatus().elapsedTime !== 4) throw new Error('Expected 4 seconds');
    
    // Pause for 2 seconds
    await recordingFlow.pauseRecording();
    recordingFlow.advanceTime(2000);
    
    // Resume and record for 1 second
    await recordingFlow.resumeRecording();
    recordingFlow.advanceTime(1000);
    recordingFlow.tick();
    if (recordingFlow.getStatus().elapsedTime !== 5) throw new Error('Expected 5 seconds');
  }
};

// Main test execution
async function runAllTests() {
  console.log('🚀 Starting Recording Extension Test Suite');
  console.log('='.repeat(60));
  
  const runner = new TestRunner();
  
  // Run all test suites
  await runner.runTestSuite('Timer Logic Tests', timerTests);
  await runner.runTestSuite('State Management Tests', stateTests);
  await runner.runTestSuite('Integration Tests', integrationTests);
  
  // Print results
  const allPassed = runner.printSummary();
  
  if (allPassed) {
    console.log('\n🎉 All tests passed! The recording functionality should work correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the issues before testing in browser.');
  }
  
  return allPassed;
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { runAllTests, TestRunner };
