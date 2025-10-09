export interface Recording {
  id: string;
  data: string;
  timestamp: number;
  duration: number;
}

export interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  startTime: number | null;
  pausedTime: number | null;
  totalPausedDuration: number;
}