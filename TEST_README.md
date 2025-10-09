# SummarizeX Chrome Extension - Test Suite

This test suite validates the recording functionality of the SummarizeX Chrome Extension before testing in the browser.

## 🧪 Test Coverage

### 1. Timer Logic Tests (`timer.test.js`)
- ✅ Basic timer functionality
- ✅ Pause/resume accuracy
- ✅ Multiple pause/resume cycles
- ✅ State restoration
- ✅ Edge cases (short pauses, rapid cycles)

### 2. State Management Tests (`state.test.js`)
- ✅ Recording lifecycle (start, pause, resume, stop)
- ✅ State persistence and restoration
- ✅ Complex scenarios with multiple state changes
- ✅ Edge cases (negative time, long pauses)

### 3. Integration Tests (`integration.test.js`)
- ✅ Complete recording workflow
- ✅ Audio recording coordination
- ✅ State and timer synchronization
- ✅ Error handling
- ✅ Edge cases and rapid operations

## 🚀 Running Tests

### Prerequisites
- Node.js 14.0.0 or higher
- No additional dependencies required (uses built-in Node.js modules)

### Quick Start

1. **Run all tests:**
   ```bash
   npm test
   ```

2. **Run individual test suites:**
   ```bash
   # Test timer logic
   npm run test:timer
   
   # Test state management
   npm run test:state
   
   # Test integration
   npm run test:integration
   ```

3. **Run tests directly with Node.js:**
   ```bash
   node src/tests/test-runner.js
   ```

### Expected Output

When all tests pass, you should see:
```
🚀 Starting Recording Extension Test Suite
============================================================

🧪 Running Timer Logic Tests...
==================================================
✅ should start timer at 0 seconds
✅ should advance timer correctly
✅ should pause timer and maintain elapsed time
✅ should resume timer from correct point
✅ should not add pause duration to elapsed time
✅ should handle multiple pause/resume cycles

🧪 Running State Management Tests...
==================================================
✅ should start recording with correct initial state
✅ should pause recording correctly
✅ should restore paused recording state correctly
✅ should maintain accurate elapsed time across state changes

🧪 Running Integration Tests...
==================================================
✅ should handle complete recording session
✅ should handle recording with pause and resume
✅ should handle multiple pause/resume cycles

📊 Test Summary
==================================================
Total Tests: 15
Passed: 15
Failed: 0
Success Rate: 100.0%

🎉 All tests passed! The recording functionality should work correctly.
```

## 🔍 What the Tests Validate

### Timer Accuracy
- **Pause Duration Exclusion**: When you pause for 5 seconds, those 5 seconds are NOT added to the recording time
- **Resume Continuity**: Timer continues from the exact point where it was paused
- **Multiple Cycles**: Handles multiple pause/resume operations correctly

### State Persistence
- **Recording State**: Properly saves and restores recording status
- **Pause State**: Correctly maintains pause state across popup opens/closes
- **Elapsed Time**: Accurately calculates elapsed time excluding pause duration

### Integration Flow
- **Audio Coordination**: Audio recording properly coordinates with timer
- **State Synchronization**: All components work together seamlessly
- **Error Handling**: Gracefully handles edge cases and errors

## 🐛 Troubleshooting

### If Tests Fail

1. **Check the error messages** - They will indicate exactly what's wrong
2. **Review the timer logic** - Most issues are in the pause/resume calculation
3. **Verify state management** - Ensure state is properly saved and restored
4. **Check integration points** - Make sure all components communicate correctly

### Common Issues

- **Timer adding pause duration**: The timer is incorrectly including pause time in elapsed calculation
- **State restoration errors**: The state restoration logic isn't properly calculating elapsed time
- **Integration failures**: Components aren't properly coordinating their state

## 📝 Test Scenarios Covered

### Basic Recording
- Start recording → Timer shows 00:00:00
- Record for 10 seconds → Timer shows 00:00:10
- Stop recording → Recording data is saved

### Pause/Resume
- Start recording → Timer shows 00:00:00
- Record for 5 seconds → Timer shows 00:00:05
- Pause for 3 seconds → Timer stays at 00:00:05
- Resume and record for 2 seconds → Timer shows 00:00:07 (not 00:00:10)

### Multiple Cycles
- Record for 2 seconds → Pause for 1 second → Resume for 2 seconds → Pause for 2 seconds → Resume for 1 second
- Final timer: 00:00:05 (2+2+1 = 5 seconds of actual recording)

### State Restoration
- Start recording → Close popup → Reopen popup
- Timer should continue from where it left off
- Pause state should be maintained correctly

## ✅ Success Criteria

All tests must pass before testing in the browser. The tests validate:

1. **Accurate Timing**: Timer shows only actual recording time
2. **Proper Pause Handling**: Pause duration is completely ignored
3. **State Consistency**: State is properly maintained across operations
4. **Integration Reliability**: All components work together correctly

If all tests pass, the recording functionality should work correctly in the browser!
