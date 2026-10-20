"use client";

import React, { useEffect, useRef, useState } from "react";
import { X, Play, AlertCircle, ExternalLink, Copy, Check } from "lucide-react";
import Hls from "hls.js";

interface PlayerModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  streamUrl: string;
}

export function PlayerModal({ open, onClose, title, streamUrl }: PlayerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open || !streamUrl || !videoRef.current) return;
    setError(null);

    const video = videoRef.current;
    let hls: Hls | null = null;

    if (Hls.isSupported() && (streamUrl.includes(".m3u8") || streamUrl.includes("/api/stream/vod"))) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });

      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              setError("خطأ في شبكة البث: تعذر تحميل مقاطع الفيديو من المصدر");
              hls?.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              setError("خطأ وسائط: جاري محاولة الاستعادة...");
              hls?.recoverMediaError();
              break;
            default:
              setError("تعذر تشغيل هذا التدفّق في المتصفح حالياً");
              hls?.destroy();
              break;
          }
        }
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl") || streamUrl.includes(".mp4")) {
      video.src = streamUrl;
      video.play().catch(() => {});
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [open, streamUrl]);

  if (!open) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(streamUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-[#12141c] border border-white/10 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl relative">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400">
              <Play className="w-4 h-4 fill-current" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm sm:text-base line-clamp-1">{title}</h3>
              <p className="text-xs text-neutral-400">مشغل تجريبي مباشر للتأكد من عمل الرابط</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Area */}
        <div className="relative aspect-video bg-black flex items-center justify-center">
          <video
            ref={videoRef}
            controls
            playsInline
            className="w-full h-full object-contain"
          />

          {error && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-6 text-center text-red-400">
              <AlertCircle className="w-10 h-10 mb-2 opacity-80" />
              <p className="text-sm font-medium">{error}</p>
              <a
                href={streamUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 text-xs text-cyan-400 hover:underline flex items-center gap-1"
              >
                <span>فتح الرابط مباشرة في نافذة جديدة</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </div>

        {/* Stream URL Bar with Copy Button */}
        <div className="p-4 bg-[#161822] border-t border-white/5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="text-neutral-400 shrink-0 font-medium">رابط البث:</span>
            <code className="text-cyan-300 font-mono bg-black/40 px-2 py-1 rounded truncate dir-ltr select-all">
              {streamUrl}
            </code>
          </div>
          <button
            onClick={handleCopy}
            className="px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 font-medium flex items-center justify-center gap-1.5 shrink-0 transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "تم النسخ بنجاح!" : "نسخ رابط البث"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
