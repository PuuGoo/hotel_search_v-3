"use client";

import { useState } from "react";
import { HiStop, HiMicrophone, HiXMark, HiPaperAirplane } from "react-icons/hi2";
import useVoiceRecorder from "../../../hooks/useVoiceRecorder";

interface VoiceRecorderProps {
  onSend: (blob: Blob) => void;
  onCancel: () => void;
}

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onSend, onCancel }) => {
  const {
    isRecording,
    duration,
    startRecording,
    stopRecording,
    cancelRecording,
    audioBlob,
    audioUrl,
    reset,
  } = useVoiceRecorder();

  const [sending, setSending] = useState(false);

  const handleStart = async () => {
    try {
      await startRecording();
    } catch {
      alert("Không thể truy cập microphone. Vui lòng kiểm tra quyền truy cập.");
    }
  };

  const handleStop = () => {
    stopRecording();
  };

  const handleCancel = () => {
    cancelRecording();
    onCancel();
  };

  const handleSend = async () => {
    if (!audioBlob) return;
    const confirmed = window.confirm("Gửi tin nhắn thoại?");
    if (!confirmed) return;
    setSending(true);
    try {
      onSend(audioBlob);
      reset();
    } finally {
      setSending(false);
    }
  };

  const handleNewRecording = () => {
    reset();
  };

  return (
    <div className="bg-gray-800 border-t border-lightgray px-4 py-3">
      {!audioBlob ? (
        <div className="flex items-center gap-3">
          {isRecording ? (
            <>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-sm text-white font-medium">
                  {formatDuration(duration)}
                </span>
              </div>
              <div className="flex-1 flex items-center justify-center gap-1 h-8">
                {Array.from({ length: 20 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-1 bg-sky-500 rounded-full animate-pulse"
                    style={{
                      height: `${Math.random() * 20 + 8}px`,
                      animationDelay: `${i * 0.1}s`,
                      animationDuration: `${0.3 + Math.random() * 0.5}s`,
                    }}
                  />
                ))}
              </div>
              <button
                onClick={handleStop}
                className="p-2 rounded-full bg-red-500 hover:bg-red-600 transition-colors"
                title="Dừng ghi âm"
              >
                <HiStop size={20} className="text-white" />
              </button>
            </>
          ) : (
            <>
              <span className="text-sm text-gray-400">Bắt đầu ghi âm</span>
              <div className="flex-1" />
              <button
                onClick={handleCancel}
                className="p-2 rounded-full hover:bg-gray-700 transition-colors"
                title="Hủy"
              >
                <HiXMark size={20} className="text-gray-400" />
              </button>
              <button
                onClick={handleStart}
                className="p-3 rounded-full bg-sky-500 hover:bg-sky-600 transition-colors"
                title="Bắt đầu ghi âm"
              >
                <HiMicrophone size={22} className="text-white" />
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-sky-500" />
            <span className="text-sm text-white font-medium">
              {formatDuration(duration)}
            </span>
          </div>
          <audio src={audioUrl || undefined} className="hidden" controls />
          <div className="flex-1 flex items-center justify-center gap-1 h-8">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className="w-1 bg-sky-400 rounded-full"
                style={{ height: `${Math.random() * 16 + 6}px` }}
              />
            ))}
          </div>
          <button
            onClick={handleNewRecording}
            className="p-2 rounded-full hover:bg-gray-700 transition-colors"
            title="Ghi lại"
          >
            <HiMicrophone size={18} className="text-gray-400" />
          </button>
          <button
            onClick={handleCancel}
            className="p-2 rounded-full hover:bg-gray-700 transition-colors"
            title="Hủy"
          >
            <HiXMark size={20} className="text-gray-400" />
          </button>
          <button
            onClick={handleSend}
            disabled={sending}
            className="p-2 rounded-full bg-sky-500 hover:bg-sky-600 transition-colors disabled:opacity-50"
            title="Gửi"
          >
            <HiPaperAirplane size={18} className="text-white" />
          </button>
        </div>
      )}
    </div>
  );
};

export default VoiceRecorder;
