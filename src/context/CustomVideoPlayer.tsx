import React, { useRef, useState, useEffect } from "react";
import ProgressBar from "../components/popup/ProgressBar";

interface CustomVideoPlayerProps {
  fileUrl: string;
  name?: string;
}

const CustomVideoPlayer: React.FC<CustomVideoPlayerProps> = ({
  fileUrl,
  name,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [thumbnail, setThumbnail] = useState<string | null>(null);

  // Extract filename from URL

  // Extract thumbnail from video
  useEffect(() => {
    const video = document.createElement("video");
    video.src = fileUrl;
    video.preload = "metadata";

    video.onloadeddata = () => {
      video.currentTime = 1; // capture at 1s
    };

    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        setThumbnail(canvas.toDataURL("image/jpeg"));
      }
    };
  }, [fileUrl]);

  // Track duration & progress
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => setDuration(video.duration);
    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleEnded = () => setIsPlaying(false);

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("ended", handleEnded);

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("ended", handleEnded);
    };
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

//   const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const video = videoRef.current;
//     if (!video) return;

//     const newTime = parseFloat(e.target.value);
//     video.currentTime = newTime;
//     setCurrentTime(newTime);
//   };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div className="flex items-center gap-4 p-3 w-full ">
      {/* Thumbnail with play button */}
      <div className="relative w-22 h-16 rounded overflow-hidden bg-gray-200">
        {thumbnail && (
          <img
            src={thumbnail}
            alt="Video thumbnail"
            className="w-full h-full object-cover"
          />
        )}
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 text-white text-xl cursor-pointer"
        >
          {isPlaying ? "❚❚" : "▶"}
        </button>
      </div>

      {/* File name & controls */}
      <div className="flex flex-col  gap-2">
        <p className="text-[#4B5563] text-[18px] font-semibold">{name}</p>
        <div className="flex items-center gap-2">
          <div className="flex flex-col gap-3">
            <ProgressBar
              value={currentTime}
              max={duration}
              onChange={(newTime) => {
                if (videoRef.current) videoRef.current.currentTime = newTime;
                setCurrentTime(newTime);
              }}
            />

            <div className="flex items-center justify-between">
              <span className="text-[14px] text-[#4B5563] font-[400]">
                {formatTime(currentTime)}
              </span>
              <span className="text-[14px] text-[#4B5563] font-[400]">
                {formatTime(duration)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden video element */}
      <video
        ref={videoRef}
        src={fileUrl}
        className="absolute opacity-0 w-0 h-0"
        playsInline
      />
    </div>
  );
};

export default CustomVideoPlayer;
