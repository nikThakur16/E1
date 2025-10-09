/**
 * Test Runner for Recording Extension Tests
 * Executes all test suites and provides detailed results
 */

// Import mock classes
const { MockTimer } = require('./timer.test.js');
const { MockChromeStorage, MockRecordingStateManager } = require('./state.test.js');
const { MockAudioRecordingManager, MockRecordingFlowManager } = require('./integration.test.js');

// Simple test runner implementation
class TestRunner {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      total: 0,
      failures: []
    };
  }

  // Run a single test
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

  // Run a test suite
  async runTestSuite(suiteName, tests) {
    console.log(`\n🧪 Running ${suiteName}...`);
    console.log('='.repeat(50));
    
    for (const [testName, testFunction] of Object.entries(tests)) {
      this.results.total++;
      await this.runTest(testName, testFunction);
    }
  }

  // Print summary
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

// Timer Logic Tests
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

// State Management Tests
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
    stateManager.advanceTime(2000);
    await stateManager.pauseRecording();
    stateManager.advanceTime(10000);
    await stateManager.resumeRecording();
    stateManager.advanceTime(3000);
    
    const restoredState = await stateManager.restoreState();
    
    if (restoredState.elapsedTime !== 5) throw new Error(`Expected elapsed time 5, got ${restoredState.elapsedTime}`);
  }
};

// Integration Tests
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

// Export for use in Node.js or browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runAllTests, TestRunner };
} else if (typeof window !== 'undefined') {
  window.runAllTests = runAllTests;
}

// Auto-run if this file is executed directly
if (typeof require !== 'undefined' && require.main === module) {
  runAllTests().then(success => {
    process.exit(success ? 0 : 1);
  });
}
