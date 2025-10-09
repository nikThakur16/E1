import { parseBlob } from 'music-metadata';

/**
 * Extract audio duration using music-metadata library
 * This is more reliable than the HTML Audio element for WebM files
 */
export async function getAudioDurationFromMetadata(file: File): Promise<number> {
  try {
    console.log('🎵 Music Metadata: Starting duration extraction for:', {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size
    });

    const metadata = await parseBlob(file);
    const duration = metadata.format.duration;
    
    console.log('🎵 Music Metadata: Duration extracted:', {
      fileName: file.name,
      duration: duration,
      isFinite: isFinite(duration || 0),
      isNaN: isNaN(duration || 0),
      format: metadata.format,
      codec: (metadata.format as any).codecName || 'unknown',
      bitrate: metadata.format.bitrate
    });

    // Return duration in seconds, or 0 if invalid
    if (duration && isFinite(duration) && !isNaN(duration) && duration > 0) {
      return duration;
    } else {
      console.warn('🎵 Music Metadata: Invalid duration extracted:', duration);
      return 0;
    }
  } catch (error) {
    console.error('🎵 Music Metadata: Error extracting duration:', {
      fileName: file.name,
      fileType: file.type,
      error: error
    });
    return 0;
  }
}

/**
 * Fallback method using HTML Audio element
 * Used when music-metadata fails
 */
export async function getAudioDurationFromAudioElement(file: File): Promise<number> {
  return new Promise((resolve) => {
    const audio = new Audio();
    const url = URL.createObjectURL(file);
    
    const cleanup = () => {
      URL.revokeObjectURL(url);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('error', handleError);
    };
    
    const handleDurationChange = () => {
      const duration = audio.duration;
      if (isFinite(duration) && !isNaN(duration) && duration > 0) {
        cleanup();
        resolve(duration);
      }
    };
    
    const handleLoadedMetadata = () => {
      const duration = audio.duration;
      if (isFinite(duration) && !isNaN(duration) && duration > 0) {
        cleanup();
        resolve(duration);
      } else if (file.type.includes('webm')) {
        // For WebM files, try to seek to end
        try {
          audio.currentTime = Number.MAX_SAFE_INTEGER;
        } catch (seekError) {
          console.warn('Seek to end failed:', seekError);
          audio.currentTime = 999999;
        }
      } else {
        cleanup();
        resolve(0);
      }
    };
    
    const handleError = () => {
      console.warn('Audio element failed to load:', file.name);
      cleanup();
      resolve(0);
    };
    
    audio.preload = 'metadata';
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('error', handleError);
    audio.src = url;
    
    // Timeout after 8 seconds
    setTimeout(() => {
      cleanup();
      resolve(0);
    }, 8000);
  });
}

/**
 * Smart duration extraction that tries music-metadata first, then falls back to Audio element
 */
export async function getAudioDuration(file: File): Promise<number> {
  console.log('🎵 Smart Duration: Starting extraction for:', {
    fileName: file.name,
    fileType: file.type,
    isWebM: file.type.includes('webm'),
    isMP3: file.type.includes('mp3')
  });

  try {
    // Try music-metadata first (better for WebM)
    const metadataDuration = await getAudioDurationFromMetadata(file);
    if (metadataDuration > 0) {
      console.log('🎵 Smart Duration: Success with music-metadata:', metadataDuration);
      return metadataDuration;
    }
  } catch (error) {
    console.warn('🎵 Smart Duration: music-metadata failed, trying Audio element:', error);
  }

  // Fallback to Audio element
  try {
    const audioDuration = await getAudioDurationFromAudioElement(file);
    console.log('🎵 Smart Duration: Fallback result from Audio element:', audioDuration);
    return audioDuration;
  } catch (error) {
    console.error('🎵 Smart Duration: Both methods failed:', error);
    return 0;
  }
}
