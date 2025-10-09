import React, { useEffect, useRef, useState } from "react";
import mediaDebugger from "./MediaDebugger";
import { getAudioDuration } from "./musicMetadata";

interface AudioWaveProps {
  fileUrl: string;
  duration?: number; // Optional duration from UploadContext
}

const AudioWave: React.FC<AudioWaveProps> = ({ fileUrl, duration: propDuration }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(propDuration || 0);
  const [waveformData, setWaveformData] = useState<number[]>([]);

  // console.log('🎵 AudioWave R&D: Component rendered with:', {
  //   fileUrl: fileUrl?.substring(0, 50) + '...',
  //   propDuration: propDuration,
  //   fileName: fileUrl?.split('/').pop() || 'unknown'
  // });

  // Update duration when propDuration changes
  useEffect(() => {
    if (propDuration && propDuration > 0) {
      console.log('Setting duration from props:', propDuration);
      setDuration(propDuration);
    } else if (propDuration === 0) {
      // Explicitly handle 0 duration
      setDuration(0);
    }
  }, [propDuration]); 

  // Debug logging
  console.log('🎵 AudioWave Debug:', {
    propDuration,
    duration,
    hasPropDuration: !!propDuration,
    propDurationValue: propDuration,
    displayValue: propDuration || duration || 0
  });

  // Extract duration from file if not provided as prop
  useEffect(() => {
    // Only extract duration if propDuration is not provided or is 0
    if ((!propDuration || propDuration === 0) && fileUrl) {
      console.log('🎵 AudioWave: No prop duration, attempting to extract from file');
      
      // Convert blob URL to File object for music-metadata
      fetch(fileUrl)
        .then(response => response.blob())
        .then(blob => {
          const file = new File([blob], 'audio.webm', { type: blob.type });
          return getAudioDuration(file);
        })
        .then(duration => {
          if (duration > 0) {
            console.log('🎵 AudioWave: Duration extracted from file:', duration);
            setDuration(duration);
          }
        })
        .catch(error => {
          console.warn('🎵 AudioWave: Failed to extract duration from file:', error);
        });
    }
  }, [fileUrl, propDuration]);

  // Helper function to validate duration values
  const validateDuration = (duration: number): number => {
    return isFinite(duration) && !isNaN(duration) && duration >= 0 ? duration : 0;
  };

  // Generate waveform data from audio
  const generateWaveformData = async (audioUrl: string, canvasWidth: number) => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass();
      const response = await fetch(audioUrl);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      const rawData = audioBuffer.getChannelData(0);
      // Calculate number of bars based on canvas width (2px per bar + 1px gap)
      const samples = Math.floor(canvasWidth / 3); // Adjust this ratio as needed
      const blockSize = Math.floor(rawData.length / samples);
      const filteredData = [];
      
      for (let i = 0; i < samples; i++) {
        let blockStart = blockSize * i;
        let sum = 0;
        for (let j = 0; j < blockSize; j++) {
          sum += Math.abs(rawData[blockStart + j]);
        }
        let avg = sum / blockSize;
        // Normalize and add some randomness for visual appeal
        filteredData.push(Math.min(Math.max(avg * 2 + Math.random() * 0.3, 0.1), 1));
      }
      
      console.log('Waveform data generated:', {
        samples: filteredData.length,
        canvasWidth,
        firstFewValues: filteredData.slice(0, 5)
      });
      setWaveformData(filteredData);
    } catch (error) {
      console.error("Error generating waveform:", error);
      // Fallback: generate random data based on canvas width
      const samples = Math.floor(canvasWidth / 3);
      const fallbackData = Array.from({ length: samples }, () => Math.random() * 0.8 + 0.2);
      console.log('Using fallback waveform data:', {
        samples: fallbackData.length,
        canvasWidth,
        firstFewValues: fallbackData.slice(0, 5)
      });
      setWaveformData(fallbackData);
    }
  };

  // Draw waveform on canvas
  const drawWaveform = () => {
    const canvas = canvasRef.current;
    if (!canvas || waveformData.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    const totalBars = waveformData.length;
    const barWidth = 2; // Fixed bar width
    const barGap = 1; // Small gap between bars
    const startX = 0; // Start from the beginning
    
    const effectiveDuration = propDuration || duration || 0;
    const progress = effectiveDuration > 0 ? currentTime / effectiveDuration : 0;
    const progressBars = Math.floor(progress * totalBars);
    
    

    waveformData.forEach((amplitude, index) => {
      const x = startX + index * (barWidth + barGap);
      const barHeight = Math.max(amplitude * height * 0.8, 2);
      const y = (height - barHeight) / 2;

      // Choose color based on progress
      ctx.fillStyle = index < progressBars ? "#5B9AFF" : "#D1D5DB";
      
      // Draw rounded rectangle manually
      const radius = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + barWidth - radius, y);
      ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + radius);
      ctx.lineTo(x + barWidth, y + barHeight - radius);
      ctx.quadraticCurveTo(x + barWidth, y + barHeight, x + barWidth - radius, y + barHeight);
      ctx.lineTo(x + radius, y + barHeight);
      ctx.quadraticCurveTo(x, y + barHeight, x, y + barHeight - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
      ctx.fill();
    });
  };

  // Animation loop
  const animate = () => {
    if (audioRef.current && !audioRef.current.paused) {
      const currentAudioTime = audioRef.current.currentTime;
      // Validate currentTime before setting it
      if (isFinite(currentAudioTime) && !isNaN(currentAudioTime) && currentAudioTime >= 0) {
        setCurrentTime(currentAudioTime);
        
      }
      drawWaveform();
      animationRef.current = requestAnimationFrame(animate);
    } else {
      drawWaveform(); // Ensure final frame is drawn when paused
    }
  };

  // Handle play/pause
  const togglePlayPause = () => {
    if (!audioRef.current) {
      mediaDebugger.logError('AudioWave', 'TOGGLE_PLAY_PAUSE', 'Audio element not found', {
        fileUrl,
        currentState: { isPlaying, currentTime, duration }
      });
      return;
    }

    const previousState = {
      isPlaying,
      currentTime,
      duration,
      volume: audioRef.current.volume
    };

    try {
    if (isPlaying) {
        mediaDebugger.startPerformanceTrack('AudioWave-PAUSE');
      audioRef.current.pause();
      setIsPlaying(false);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
        
        mediaDebugger.logPauseAction('AudioWave', {
          currentTime: audioRef.current.currentTime,
          duration: validateDuration(audioRef.current.duration),
          volume: audioRef.current.volume
        });
        
        mediaDebugger.logStateChange('AudioWave', 'PAUSE', previousState, {
          isPlaying: false,
          currentTime: audioRef.current.currentTime,
          duration: validateDuration(audioRef.current.duration)
        });
    } else {
        mediaDebugger.startPerformanceTrack('AudioWave-PLAY');
        const playPromise = audioRef.current.play();
        
        if (playPromise !== undefined) {
          playPromise.then(() => {
            mediaDebugger.logSuccess('AudioWave', 'PLAY', {
              currentTime: audioRef.current?.currentTime,
              duration: audioRef.current?.duration
            });
          }).catch((error) => {
            mediaDebugger.logError('AudioWave', 'PLAY', error, {
              fileUrl,
              currentTime: audioRef.current?.currentTime,
              readyState: audioRef.current?.readyState
            });
            setIsPlaying(false);
          });
        }
        
      setIsPlaying(true);
      animate();
        
        mediaDebugger.logPlayAction('AudioWave', {
          currentTime: audioRef.current.currentTime,
          duration: validateDuration(audioRef.current.duration),
          volume: audioRef.current.volume
        }, fileUrl);
        
        mediaDebugger.logStateChange('AudioWave', 'PLAY', previousState, {
          isPlaying: true,
          currentTime: audioRef.current.currentTime,
          duration: validateDuration(audioRef.current.duration)
        });
      }
    } catch (error) {
      mediaDebugger.logError('AudioWave', 'TOGGLE_PLAY_PAUSE', error, {
        fileUrl,
        previousState,
        audioElementState: {
          readyState: audioRef.current?.readyState,
          networkState: audioRef.current?.networkState,
          error: audioRef.current?.error
        }
      });
    }
  };

  // Setup audio element
  useEffect(() => {
    console.log('AudioWave useEffect triggered with fileUrl:', fileUrl);
    
    if (!fileUrl) {
      console.warn('No fileUrl provided to AudioWave component');
      return;
    }
    
    mediaDebugger.log('AUDIO_SETUP_START', 'AudioWave', { fileUrl });
    
    try {
    const audio = new Audio(fileUrl);
    audioRef.current = audio;
    
    // Set preload to metadata for better WebM support
    audio.preload = 'metadata';
    
    console.log('Audio element created successfully');

    const handleDurationChange = () => {
      const audioDuration = audio.duration;
      console.log('🎵 AudioWave R&D: durationchange event:', { 
        fileName: fileUrl?.split('/').pop() || 'unknown',
        fileType: audio.src?.split('.').pop() || 'unknown',
        duration: audioDuration, 
        isFinite: isFinite(audioDuration), 
        isNaN: isNaN(audioDuration),
        readyState: audio.readyState
      });
      
      if (isFinite(audioDuration) && !isNaN(audioDuration) && audioDuration > 0) {
        setDuration(audioDuration);
        console.log('🎵 AudioWave R&D: Duration set from durationchange:', audioDuration);
      }
    };

    const handleLoadedMetadata = () => {
      // Validate duration before setting it
      const audioDuration = audio.duration;
      console.log('🎵 AudioWave R&D: loadedmetadata event:', { 
        fileName: fileUrl?.split('/').pop() || 'unknown',
        fileType: audio.src?.split('.').pop() || 'unknown',
        duration: audioDuration, 
        isFinite: isFinite(audioDuration), 
        isNaN: isNaN(audioDuration),
        readyState: audio.readyState,
        networkState: audio.networkState,
        error: audio.error,
        src: audio.src?.substring(0, 50) + '...'
      });
      
      if (isFinite(audioDuration) && !isNaN(audioDuration) && audioDuration > 0) {
        setDuration(audioDuration);
        console.log('🎵 AudioWave R&D: Duration set to:', audioDuration);
      } else if (fileUrl?.includes('.webm') || audio.src?.includes('.webm')) {
        // For WebM files, try to seek to end to trigger duration calculation
        console.log('🎵 AudioWave R&D: WebM file detected, attempting seek to end for duration calculation');
        try {
          audio.currentTime = Number.MAX_SAFE_INTEGER;
        } catch (seekError) {
          console.warn('🎵 AudioWave R&D: Seek to end failed:', seekError);
          // Fallback: try a large but safe number
          audio.currentTime = 999999;
        }
      } else {
        console.warn('🎵 AudioWave R&D: Invalid audio duration:', audioDuration, 'Setting to 0');
        setDuration(0);
      }
      
        mediaDebugger.log('AUDIO_METADATA_LOADED', 'AudioWave', {
          duration: audioDuration,
          readyState: audio.readyState,
          fileUrl
        });
    };

    const handleEnded = () => {
        const previousState = { isPlaying, currentTime, duration };
      setIsPlaying(false);
      setCurrentTime(0);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
        
        mediaDebugger.logStopAction('AudioWave', {
          currentTime: currentTime,
          duration: validateDuration(audio.duration),
          isPlaying: false
        });
        
        mediaDebugger.logStateChange('AudioWave', 'ENDED', previousState, {
          isPlaying: false,
          currentTime: 0,
          duration: validateDuration(audio.duration)
        });
    };

    const handleTimeUpdate = () => {
      const currentAudioTime = audio.currentTime;
      // Validate currentTime before setting it
      if (isFinite(currentAudioTime) && !isNaN(currentAudioTime) && currentAudioTime >= 0) {
        setCurrentTime(currentAudioTime);
      }
    };

      const handleError = (error: Event) => {
        console.error('🎵 AudioWave R&D: Audio error occurred:', {
          fileName: fileUrl?.split('/').pop() || 'unknown',
          fileType: audio.src?.split('.').pop() || 'unknown',
          error: error,
          fileUrl: fileUrl?.substring(0, 50) + '...',
          currentTime: audio.currentTime,
          readyState: audio.readyState,
          networkState: audio.networkState,
          audioError: audio.error,
          errorCode: audio.error?.code,
          errorMessage: audio.error?.message
        });
        mediaDebugger.logError('AudioWave', 'AUDIO_ERROR', error, {
          fileUrl,
          currentTime: audio.currentTime,
          readyState: audio.readyState,
          networkState: audio.networkState,
          error: audio.error
        });
      };

      const handleLoadStart = () => {
        mediaDebugger.log('AUDIO_LOAD_START', 'AudioWave', { fileUrl });
      };

      const handleCanPlay = () => {
        // Try to get duration again when audio can play
        const audioDuration = audio.duration;
        console.log('Audio can play:', { 
          duration: audioDuration, 
          isFinite: isFinite(audioDuration), 
          isNaN: isNaN(audioDuration),
          readyState: audio.readyState 
        });
        
        if (isFinite(audioDuration) && !isNaN(audioDuration) && audioDuration >= 0 && duration === 0) {
          setDuration(audioDuration);
          console.log('Duration set on canplay:', audioDuration);
        }
        
        mediaDebugger.log('AUDIO_CAN_PLAY', 'AudioWave', {
          fileUrl,
          duration: audioDuration,
          readyState: audio.readyState
        });
      };

      const handleLoadedData = () => {
        // Try to get duration when data is loaded
        const audioDuration = audio.duration;
        console.log('Audio data loaded:', { 
          duration: audioDuration, 
          isFinite: isFinite(audioDuration), 
          isNaN: isNaN(audioDuration),
          readyState: audio.readyState 
        });
        
        if (isFinite(audioDuration) && !isNaN(audioDuration) && audioDuration >= 0 && duration === 0) {
          setDuration(audioDuration);
          console.log('Duration set on loadeddata:', audioDuration);
        }
      };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("durationchange", handleDurationChange);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("timeupdate", handleTimeUpdate);
      audio.addEventListener("error", handleError);
      audio.addEventListener("loadstart", handleLoadStart);
      audio.addEventListener("canplay", handleCanPlay);
      audio.addEventListener("loadeddata", handleLoadedData);

    // Generate waveform data after canvas is ready
    const canvas = canvasRef.current;
    if (canvas) {
      // Use a small delay to ensure canvas is properly sized
      setTimeout(() => {
        const rect = canvas.getBoundingClientRect();
        console.log('Canvas rect for waveform generation:', rect);
        if (rect.width > 0) {
          generateWaveformData(fileUrl, rect.width);
        } else {
          console.warn('Canvas width is 0, retrying in 100ms');
          setTimeout(() => {
            const retryRect = canvas.getBoundingClientRect();
            console.log('Canvas retry rect:', retryRect);
            generateWaveformData(fileUrl, retryRect.width);
          }, 100);
        }
      }, 50);
    }

    // Fallback: Try to get duration after a short delay
    const durationFallback = setTimeout(() => {
      if (audio.duration && isFinite(audio.duration) && !isNaN(audio.duration) && audio.duration > 0) {
        console.log('Duration fallback triggered:', audio.duration);
        setDuration(audio.duration);
      }
    }, 1000);

    return () => {
      clearTimeout(durationFallback);
      audio.pause();
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("durationchange", handleDurationChange);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
        audio.removeEventListener("error", handleError);
        audio.removeEventListener("loadstart", handleLoadStart);
        audio.removeEventListener("canplay", handleCanPlay);
        audio.removeEventListener("loadeddata", handleLoadedData);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
        
        mediaDebugger.log('AUDIO_CLEANUP', 'AudioWave', { fileUrl });
    };
    } catch (error) {
      mediaDebugger.logError('AudioWave', 'AUDIO_SETUP', error, { fileUrl });
    }
  }, [fileUrl]);

  // Draw initial waveform and setup animation
  useEffect(() => {
    drawWaveform();
    
    // Start animation if playing
    if (isPlaying && audioRef.current && !audioRef.current.paused) {
      animate();
    }
  }, [waveformData, currentTime, duration, isPlaying]);

  // Resize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = 40 * window.devicePixelRatio;
      canvas.style.width = rect.width + "px";
      canvas.style.height = "40px";
      
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      }
      
      // Regenerate waveform data for new canvas width
      generateWaveformData(fileUrl, rect.width);
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [fileUrl]); // Fixed: Remove waveformData from dependency array

  // Helper to format seconds into seconds, minutes, or hours display
  const formatTime = (seconds: number) => {
    // Handle invalid values (NaN, Infinity, negative)
    if (!isFinite(seconds) || isNaN(seconds) || seconds < 0) {
      return "0 s";
    }
    
    const totalSeconds = Math.floor(seconds);
    
    // If less than 60 seconds, show in seconds
    if (totalSeconds < 60) {
      return `${totalSeconds} s`;
    }
    
    // If less than 3600 seconds (1 hour), show in minutes
    if (totalSeconds < 3600) {
      const minutes = Math.floor(totalSeconds / 60);
      const remainingSeconds = totalSeconds % 60;
      
      if (remainingSeconds === 0) {
        return `${minutes} m${minutes > 1 ? 's' : ''}`;
      } else {
        return `${minutes} m${minutes > 1 ? 's' : ''} ${remainingSeconds} s`;
      }
    }
    
    // If 3600 seconds or more, show in hours
    const hours = Math.floor(totalSeconds / 3600);
    const remainingMinutes = Math.floor((totalSeconds % 3600) / 60);
    const remainingSeconds = totalSeconds % 60;
    
    if (remainingMinutes === 0 && remainingSeconds === 0) {
      return `${hours} h${hours > 1 ? 's' : ''}`;
    } else if (remainingSeconds === 0) {
      return `${hours} h${hours > 1 ? 's' : ''} ${remainingMinutes} m${remainingMinutes > 1 ? 's' : ''}`;
    } else {
      return `${hours} h${hours > 1 ? 's' : ''} ${remainingMinutes} m${remainingMinutes > 1 ? 's' : ''} ${remainingSeconds} s`;
    }
    };

  return (
    <div className="flex items-center w-full gap-2 mt-4 ">
      <svg
        onClick={togglePlayPause}
        width="40"
        height="40"
        viewBox="0 0 29 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="cursor-pointer"
      >
        <circle
          cx="14.3584"
          cy="14.0039"
          r="13.3"
          stroke="#4B5563"
          strokeWidth="1.4"
        />
        {isPlaying ? (
          // Pause icon
          <g>
            <rect x="11" y="9" width="2" height="10" fill="#4B5563" />
            <rect x="15" y="9" width="2" height="10" fill="#4B5563" />
          </g>
        ) : (
          // Play icon
          <path
            d="M19.546 14.3097L11.1723 9.32574C11.07 9.26559 10.9647 9.22949 10.8444 9.22949C10.5166 9.22949 10.2489 9.5002 10.2489 9.83105H10.2458V20.1779H10.2489C10.2489 20.5088 10.5166 20.7795 10.8444 20.7795C10.9677 20.7795 11.07 20.7374 11.1813 20.6772L19.546 15.6993C19.7445 15.5339 19.8708 15.2842 19.8708 15.0045C19.8708 14.7248 19.7445 14.4781 19.546 14.3097Z"
            fill="#4B5563"
          />
        )}
      </svg>

      <canvas 
        ref={canvasRef} 
        className="w-[60%] h-10 cursor-pointer"
        onClick={(e) => {
          const effectiveDuration = propDuration || duration || 0;
          if (!audioRef.current || !canvasRef.current || !isFinite(effectiveDuration) || effectiveDuration <= 0) return;
          const rect = canvasRef.current.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const progress = x / rect.width;
          const newTime = progress * effectiveDuration;
          
          // Validate newTime before setting it
          if (isFinite(newTime) && !isNaN(newTime) && newTime >= 0 && newTime <= effectiveDuration) {
            audioRef.current.currentTime = newTime;
            setCurrentTime(newTime);
          }
        }}
      />

      <p className="text-lg text-gray-700">
        {formatTime(propDuration || duration || 0)}
      </p>
    </div>
  );
};

export default AudioWave;
