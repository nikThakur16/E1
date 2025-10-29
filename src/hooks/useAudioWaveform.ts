import { useEffect, useRef, useState } from "react";

export function useAudioWaveform(stream?: any, bars = 60, isPaused = false) {
  const [waveform, setWaveform] = useState<number[]>(Array(bars).fill(10));
  const animationRef = useRef<number>(0);
  const pausedWaveformRef = useRef<number[]>([]);
  const wasPausedRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  useEffect(() => {
    // Type guard functions with null checks
    const isSimulatedStream = (s: any): s is { simulate: boolean } => {
      return s !== null && s !== undefined && typeof s === 'object' && 'simulate' in s;
    };
    
    const isRealStream = (s: any): s is MediaStream => {
      return s !== null && s !== undefined && typeof s === 'object' && !('simulate' in s) && 'active' in s && typeof s.getTracks === 'function';
    };

    // Additional safety check for any object that might have getTracks method
    const hasGetTracksMethod = (s: any): boolean => {
      return s !== null && s !== undefined && typeof s === 'object' && typeof s.getTracks === 'function';
    };



    if (!stream) {
      // console.log('❌ No stream provided to waveform hook');
      setWaveform(Array(bars).fill(10));
      return;
    }

    // Safety check: if stream is not null but also not an object, reset to default
    if (typeof stream !== 'object') {
      console.warn('⚠️ Invalid stream type provided to waveform hook:', typeof stream, stream);
      setWaveform(Array(bars).fill(10));
      return;
    }

    // Check if this is a simulated stream (to avoid mic permission issues)
    if (isSimulatedStream(stream)) {
      
      function animateSimulatedWaveform() {
        if (isPaused) {
          // When paused, show a gentle pulsing static pattern
          const time = Date.now() / 1000;
          const pulseWaveform = Array.from({ length: bars }, (_, i) => {
            const pulse = Math.sin(time * 2 + i * 0.1) * 3;
            return Math.max(8, 20 + pulse); // Gentle pulsing around baseline
          });
          setWaveform(pulseWaveform);
        } else {
          // When recording, show animated bars that simulate voice activity
          const time = Date.now() / 100; // Faster animation
          // const simulatedWaveform = Array.from({ length: bars }, (_, i) => {
          //   // Create wave-like motion with some randomness to simulate voice
          //   const wave1 = Math.sin(time * 0.02 + i * 0.3) * 15;
          //   const wave2 = Math.sin(time * 0.03 + i * 0.2) * 10;
          //   const noise = (Math.random() - 0.5) * 8; // Random variation
          //   const base = 25 + wave1 + wave2 + noise;
            
          //   // Add occasional "speech" spikes
          //   const speechSpike = Math.random() < 0.1 ? Math.random() * 20 : 0;
            
          //   return Math.max(8, Math.min(60, base + speechSpike));
          // });
          // setWaveform(simulatedWaveform);
        }
        
        animationRef.current = requestAnimationFrame(animateSimulatedWaveform);
      }
      
      // Start simulated animation
      animateSimulatedWaveform();
      
      
      // Cleanup function for simulated stream
      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }

    // Real MediaStream handling (for when user explicitly tests microphone)
    if (!isRealStream(stream)) {
      return;
    }

    // Check if stream is active
    if (!stream.active) {
      // console.log('❌ Stream is not active');
      setWaveform(Array(bars).fill(10));
      return;
    }

    // Check if stream has audio tracks
    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
      // console.log('❌ No audio tracks in stream');
      setWaveform(Array(bars).fill(10));
      return;
    }

   

    try {
      // Create or resume AudioContext
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;


      // Resume AudioContext if suspended
      if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
          console.log('✅ AudioContext resumed, new state:', audioContext.state);
        }).catch(err => {
          console.error('❌ Failed to resume AudioContext:', err);
        });
      }

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      
      sourceRef.current = source;
      analyserRef.current = analyser;

      // Configure analyser for better visualization and debugging
      analyser.fftSize = 1024; // Higher resolution for better visualization
      analyser.smoothingTimeConstant = 0.1; // Much less smoothing for more responsive visualization
      analyser.minDecibels = -100; // Lower threshold to capture quieter sounds
      analyser.maxDecibels = -10;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      source.connect(analyser);

      console.log('✅ Audio analysis chain created:', {
        fftSize: analyser.fftSize,
        bufferLength,
        audioContextState: audioContext.state,
        smoothingTimeConstant: analyser.smoothingTimeConstant,
        minDecibels: analyser.minDecibels,
        maxDecibels: analyser.maxDecibels
      });

      function tick() {
        try {
          if (isPaused) {
            // When paused, show a gentle pulsing static pattern
            if (!wasPausedRef.current) {
              // Just paused - store the current waveform
              wasPausedRef.current = true;
              pausedWaveformRef.current = [...waveform];
            }
            
            // Create a gentle pulsing effect for paused state
            const time = Date.now() / 1000;
            const baseWaveform = pausedWaveformRef.current.length > 0 
              ? pausedWaveformRef.current 
              : Array(bars).fill(20);
              
            const pulseWaveform = baseWaveform.map((height, i) => {
              const pulse = Math.sin(time * 2 + i * 0.1) * 3; // gentle pulse
              return Math.max(8, height * 0.7 + pulse); // reduce height and add pulse
            });
            
            setWaveform(pulseWaveform);
          } else {
            // Normal active recording - analyze real audio
            wasPausedRef.current = false;
            pausedWaveformRef.current = []; // Clear paused data when resuming
            
            // Get frequency data
            analyser?.getByteFrequencyData(dataArray);

            // Check if we're getting any audio data
            const hasAudioData = dataArray.some(value => value > 0);
            const maxRawValue = Math.max(...Array.from(dataArray));
            const avgRawValue = Array.from(dataArray).reduce((a, b) => a + b, 0) / dataArray.length;
            
            // Debug logging every 30 frames (~0.5 seconds)
            if (Math.random() < 0.05) { // Increased frequency for better debugging
              console.log('🎵 Audio Analysis Debug:', {
                hasAudioData,
                maxRawValue,
                avgRawValue,
                sampleValues: Array.from(dataArray.slice(0, 10)), // First 10 values
                streamActive: stream.active,
                tracksEnabled: stream.getAudioTracks().map((t: MediaStreamTrack) => ({ 
                  enabled: t.enabled, 
                  readyState: t.readyState,
                  muted: t.muted
                })),
                audioContextState: audioContextRef.current?.state,
                analyserConfig: {
                  fftSize: analyser.fftSize,
                  smoothingTimeConstant: analyser.smoothingTimeConstant,
                  minDecibels: analyser.minDecibels,
                  maxDecibels: analyser.maxDecibels
                }
              });
            }
            
            if (!hasAudioData) {
              console.log('⚠️ No audio data detected from analyser - checking stream status');
              console.log('Stream details:', {
                active: stream.active,
                tracks: stream.getAudioTracks().length,
                trackStates: stream.getAudioTracks().map((t: MediaStreamTrack) => ({
                  enabled: t.enabled,
                  readyState: t.readyState,
                  muted: t.muted
                }))
              });
              // Show a minimal baseline waveform
                  setWaveform(Array(bars).fill(0));
            } else {
              // Split frequency data into "bars"
              const step = Math.floor(bufferLength / bars);
              const newWaveform = Array.from({ length: bars }, (_, i) => {
                const slice = dataArray.slice(i * step, (i + 1) * step);
                const avg = slice.reduce((sum, v) => sum + v, 0) / (slice.length || 1);
                
                // Much more aggressive scaling for better sensitivity
                // Map 0-255 input to 8-60 output with exponential scaling for better visibility
                let scaled;
                if (avg < 1) {
                  scaled = 8; // Baseline
                } else {
                  // Exponential scaling to make small sounds more visible
                  // Even more aggressive scaling for better microphone sensitivity
                  const normalizedInput = avg / 255; // Normalize to 0-1
                  const exponentialScaled = Math.pow(normalizedInput, 0.5); // Square root for better sensitivity
                  scaled = Math.max(8, Math.min(60, 8 + (exponentialScaled * 52))); // Map to 8-60 range
                }
                
                return scaled;
              });

              setWaveform(newWaveform);
              
              // Log audio activity occasionally for debugging
              const maxValue = Math.max(...newWaveform);
              const avgValue = newWaveform.reduce((a, b) => a + b, 0) / bars;
              if (Math.random() < 0.03) { // Log ~3% of the time for better visibility
                console.log('🎵 Audio waveform data:', {
                  maxAmplitude: maxValue,
                  avgAmplitude: avgValue,
                  rawDataMax: maxRawValue,
                  rawDataAvg: avgRawValue,
                  waveformSample: newWaveform.slice(0, 5),
                  scalingApplied: 'Square root scaling for better microphone sensitivity',
                  audioActivity: avgValue > 15 ? 'ACTIVE' : 'LOW'
                });
              }
            }
          }
          
          animationRef.current = requestAnimationFrame(tick);
        } catch (error) {
          console.error('❌ Error in waveform tick function:', error);
          // Continue with fallback waveform
          setWaveform(Array(bars).fill(15));
          animationRef.current = requestAnimationFrame(tick);
        }
      }

      // Start the animation loop
      tick();

      console.log('✅ Waveform animation started');

    } catch (error) {
      console.error('❌ Failed to create audio analysis chain:', error);
      // Fallback to static waveform
      setWaveform(Array(bars).fill(15));
    }

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up waveform audio context');
      
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      
      if (sourceRef.current) {
        try {
          sourceRef.current.disconnect();
        } catch (e) {
          console.log('Note: Source already disconnected');
        }
      }
      
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try {
          audioContextRef.current.close();
        } catch (e) {
          console.log('Note: AudioContext already closed');
        }
      }
      
      // Reset refs
      sourceRef.current = null;
      analyserRef.current = null;
      audioContextRef.current = null;
    };
  }, [stream, bars, isPaused]);

  // Update the stored waveform when not paused
  useEffect(() => {
    if (!isPaused && waveform.some(h => h > 10)) {
      // Only store meaningful waveforms (not the default fill)
      pausedWaveformRef.current = [...waveform];
    }
  }, [waveform, isPaused]);

  return waveform;
}
