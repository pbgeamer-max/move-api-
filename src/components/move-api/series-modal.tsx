"use client";

import React, { useState } from "react";
import { X, Copy, Check, Play, Film, Calendar, Star, Sparkles, Loader2 } from "lucide-react";
import type { SeriesItem, EpisodeItem } from "@/lib/move-catalog";

interface SeriesModalProps {
  series: SeriesItem | null;
  onClose: () => void;
  onPlayStream: (title: string, streamUrl: string) => void;
  origin: string;
}

export function SeriesModal({ series, onClose, onPlayStream, origin }: SeriesModalProps) {
  const [activeSeason, setActiveSeason] = useState(1);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [resolvingEpId, setResolvingEpId] = useState<string | null>(null);

  if (!series) return null;

  const seasons = series.seasons || [];
  const currentSeason = seasons.find((s) => s.number === activeSeason) || seasons[0] || { episodes: [] };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleTestEpisode = async (ep: EpisodeItem) => {
    if (!ep.playbackUrl) return;
    setResolvingEpId(ep.id);
    try {
      const res = await fetch(`/api/v1/stream?url=${encodeURIComponent(ep.playbackUrl)}`);
      const data = await res.json();
      if (data.success && data.streamUrl) {
        onPlayStream(`${series.titleAr} - ${ep.titleAr}`, data.streamUrl);
      } else {
        alert(data.error || "تعذر استخراج البث المباشر لهذه الحلقة حالياً");
      }
    } catch {
      alert("حدث خطأ أثناء الاتصال بالخادم");
    } finally {
      setResolvingEpId(null);
    }
  };

  const seriesApiUrl = `${origin}/api/v1/series/${series.slug}`;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-[#12141c] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl relative">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 font-bold">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white line-clamp-1">{series.titleAr}</h2>
              <p className="text-xs text-neutral-400">{series.titleEn || series.slug}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Top Info Banner */}
          <div className="flex flex-col sm:flex-row gap-5 bg-[#171a24] p-4 sm:p-5 rounded-xl border border-white/5">
            {series.posterUrl && (
              <img
                src={series.posterUrl}
                alt={series.titleAr}
                className="w-24 sm:w-28 h-36 sm:h-40 object-cover rounded-lg shrink-0 border border-white/10 mx-auto sm:mx-0 shadow-md"
              />
            )}
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded-md bg-white/10 text-neutral-300 text-xs flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-cyan-400" />
                    <span>{series.releaseYear || 2024}</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-yellow-500/10 text-yellow-400 text-xs flex items-center gap-1">
                    <Star className="w-3 h-3 fill-current" />
                    <span>{series.rating || 8.8}</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 text-xs font-medium">
                    {series.seasonsCount} مواسم
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-300 text-xs">
                    {series.totalEpisodes} حلقة
                  </span>
                </div>

                <h3 className="text-xs font-semibold text-neutral-300 mb-1">قصة المسلسل:</h3>
                <p className="text-xs text-neutral-300/90 leading-relaxed line-clamp-4">
                  {series.synopsisAr || "لا يتوفر ملخص لهذا المسلسل حالياً."}
                </p>
              </div>

              {/* API Copy Box for this series */}
              <div className="mt-4 pt-3 border-t border-white/5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 bg-black/40 p-2.5 rounded-lg">
                <div className="text-xs truncate text-cyan-300 font-mono dir-ltr">
                  {seriesApiUrl}
                </div>
                <button
                  onClick={() => handleCopy(seriesApiUrl, "series-api")}
                  className="px-3 py-1.5 rounded-md bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 text-xs font-medium flex items-center justify-center gap-1 shrink-0 transition-colors cursor-pointer"
                >
                  {copiedId === "series-api" ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedId === "series-api" ? "تم نسخ الـ API!" : "نسخ API المسلسل لموقعك"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Season Selector Tabs */}
          {seasons.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">المواسم:</h4>
              <div className="flex flex-wrap gap-2">
                {seasons.map((s) => (
                  <button
                    key={s.number}
                    onClick={() => setActiveSeason(s.number)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                      activeSeason === s.number
                        ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/25"
                        : "bg-[#1a1d28] text-neutral-300 hover:bg-[#222634] border border-white/5"
                    }`}
                  >
                    <span>{s.titleAr || `الموسم ${s.number}`}</span>
                    <span className="text-[10px] opacity-75">({s.episodesCount})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Episodes List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                حلقات الموسم {activeSeason} ({currentSeason.episodes.length} حلقة):
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {currentSeason.episodes.map((ep) => {
                const epStreamApi = `${origin}/api/v1/stream?url=${encodeURIComponent(ep.playbackUrl || "")}`;
                const isResolving = resolvingEpId === ep.id;

                return (
                  <div
                    key={ep.id}
                    className="p-3 rounded-xl bg-[#171a24] border border-white/5 hover:border-white/10 transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-6 h-6 rounded-md bg-white/5 flex items-center justify-center text-xs font-bold text-neutral-400 shrink-0">
                        {ep.number}
                      </span>
                      <div className="truncate">
                        <span className="text-xs font-medium text-white block truncate">
                          {ep.titleAr || `الحلقة ${ep.number}`}
                        </span>
                        <span className="text-[10px] text-neutral-500 block truncate font-mono dir-ltr">
                          ep-{ep.number}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Copy Stream API button */}
                      <button
                        onClick={() => handleCopy(epStreamApi, ep.id)}
                        title="نسخ رابط API تشغيل الحلقة"
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                      >
                        {copiedId === ep.id ? (
                          <Check className="w-3.5 h-3.5 text-green-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {/* Test Stream Button */}
                      <button
                        onClick={() => handleTestEpisode(ep)}
                        disabled={isResolving}
                        className="px-2.5 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {isResolving ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Play className="w-3 h-3 fill-current" />
                        )}
                        <span>تشغيل</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
