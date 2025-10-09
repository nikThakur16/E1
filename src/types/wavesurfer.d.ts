declare module 'wavesurfer.js' {
  export interface WaveSurferOptions {
    container: HTMLElement | string;
    height?: number;
    waveColor?: string | CanvasGradient | CanvasPattern;
    progressColor?: string | CanvasGradient | CanvasPattern;
    cursorColor?: string;
    barWidth?: number;
    barGap?: number;
    barRadius?: number;
    normalize?: boolean;
    interact?: boolean;
    responsive?: boolean | number;
    plugins?: any[];
  }

  export default class WaveSurfer {
    static create(options: WaveSurferOptions): WaveSurfer;
    load(url: string): void;
    destroy(): void;
    play(): void;
    pause(): void;
    getDuration(): number;
    getCurrentTime(): number;
    on(event: string, handler: (...args: any[]) => void): void;
    getActivePlugins(): Record<string, any>;
  }
}

declare module 'wavesurfer.js/dist/plugins/microphone.js' {
  const MicrophonePlugin: { create: (options?: any) => any };
  export default MicrophonePlugin;
} 