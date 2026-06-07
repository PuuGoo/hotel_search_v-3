"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { HiPlay, HiPause } from "react-icons/hi2";
import clsx from "clsx";

interface VoiceMessageProps {
  audioUrl: string;
  duration?: number;
  isOwn?: boolean;
}

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const VoiceMessage: React.FC<VoiceMessageProps> = ({
  audioUrl,
  duration: propDuration,
  isOwn = false,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(propDuration || 0);
  const [seeking, setSeeking] = useState(false);
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    const handleLoadedMetadata = () => {
      if (!propDuration) {
        setDuration(audio.duration);
      }
    };

    const handleTimeUpdate = () => {
      if (!seeking) {
        setCurrentTime(audio.currentTime);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.pause();
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [audioUrl, propDuration, seeking]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().catch(() => {});
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const handleSeek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const bar = progressRef.current;
      if (!bar || !audioRef.current) return;
      const rect = bar.getBoundingClientRect();
      const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const newTime = percent * duration;
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    },
    [duration]
  );

  const handleSeekStart = useCallback(() => {
    setSeeking(true);
  }, []);

  const handleSeekEnd = useCallback(() => {
    setSeeking(false);
  }, []);

  useEffect(() => {
    const handleMouseUp = () => {
      if (seeking) {
        setSeeking(false);
      }
    };
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, [seeking]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const displayDuration = duration || propDuration || 0;

  return (
    <div className="flex items-center gap-3 min-w-[240px]">
      <button
        onClick={togglePlay}
        className={clsx(
          "p-2 rounded-full flex-shrink-0 transition-colors",
          isOwn
            ? "bg-white/20 hover:bg-white/30"
            : "bg-sky-500 hover:bg-sky-600"
        )}
      >
        {isPlaying ? (
          <HiPause size={18} className="text-white" />
        ) : (
          <HiPlay size={18} className="text-white ml-0.5" />
        )}
      </button>

      <div className="flex-1 flex flex-col gap-1">
        <div
          ref={progressRef}
          className="relative h-2 rounded-full cursor-pointer group"
          style={{
            backgroundColor: isOwn
              ? "rgba(255,255,255,0.2)"
              : "rgb(229 231 235)",
          }}
          onClick={handleSeek}
          onMouseDown={handleSeekStart}
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all"
            style={{
              width: `${progress}%`,
              backgroundColor: isOwn ? "white" : "rgb(14 165 233)",
            }}
          />
          <div
            className={clsx(
              "absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity",
              isOwn ? "bg-white" : "bg-sky-500"
            )}
            style={{ left: `calc(${progress}% - 6px)` }}
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[11px] text-ink-soft">
            {formatTime(currentTime)}
          </span>
          <span className="text-[11px] text-ink-soft">
            {formatTime(displayDuration)}
          </span>
        </div>
      </div>

      <div className="flex items-end gap-[2px] h-4 flex-shrink-0">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="w-[2px] rounded-full"
            style={{
              height: `${Math.random() * 12 + 4}px`,
              backgroundColor: isOwn
                ? "rgba(255,255,255,0.4)"
                : "rgb(148 163 184)",
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default VoiceMessage;
