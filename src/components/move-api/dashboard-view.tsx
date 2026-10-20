"use client";

import React, { useState, useEffect } from "react";
import {
  Film,
  Tv,
  Play,
  Copy,
  Check,
  Search,
  ExternalLink,
  Code2,
  Terminal,
  LogOut,
  Sparkles,
  Layers,
  Zap,
  Calendar,
  Star,
  Loader2,
  RefreshCw,
  Globe,
  Radio,
} from "lucide-react";
import { SeriesModal } from "./series-modal";
import type { SeriesItem, MovieItem } from "@/lib/move-catalog";

interface DashboardViewProps {
  username: string;
  onLogout: () => void;
}

export function DashboardView({ username, onLogout }: DashboardViewProps) {
  const [activeTab, setActiveTab] = useState<"api" | "series" | "movies" | "resolver" | "guide">("api");
  const [origin, setOrigin] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Modals state
  const [selectedSeries, setSelectedSeries] = useState<SeriesItem | null>(null);
  const [loadingMovieId, setLoadingMovieId] = useState<string | null>(null);

  // Series catalog state
  const [seriesList, setSeriesList] = useState<SeriesItem[]>([]);
  const [seriesLoading, setSeriesLoading] = useState(false);
  const [seriesSearch, setSeriesSearch] = useState("");
  const [seriesFilter, setSeriesFilter] = useState(""); // "" | "1" (dubbed) | "0" (subbed)
  const [seriesPage, setSeriesPage] = useState(1);
  const [seriesTotal, setSeriesTotal] = useState(0);
  const [seriesPages, setSeriesPages] = useState(1);

  // Movies catalog state
  const [moviesList, setMoviesList] = useState<MovieItem[]>([]);
  const [moviesLoading, setMoviesLoading] = useState(false);
  const [moviesSearch, setMoviesSearch] = useState("");
  const [moviesPage, setMoviesPage] = useState(1);
  const [moviesTotal, setMoviesTotal] = useState(0);
  const [moviesPages, setMoviesPages] = useState(1);

  // Stream Resolver tool state
  const [resolverInput, setResolverInput] = useState("");
  const [resolverLoading, setResolverLoading] = useState(false);
  const [resolverResult, setResolverResult] = useState<any>(null);

  // Live Tester in API tab
  const [testEndpoint, setTestEndpoint] = useState("/api/v1/series?limit=2");
  const [testLoading, setTestLoading] = useState(false);
  const [testOutput, setTestOutput] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Fetch Series
  const fetchSeries = async (page = 1, q = seriesSearch, dubbed = seriesFilter) => {
    setSeriesLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "18",
        q,
        dubbed,
      });
      const res = await fetch(`/api/v1/series?${params.toString()}`);
      const json = await res.json();
      if (json.status === "success") {
        setSeriesList(json.data);
        setSeriesTotal(json.total);
        setSeriesPages(json.pages);
        setSeriesPage(json.page);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSeriesLoading(false);
    }
  };

  // Fetch Movies
  const fetchMovies = async (page = 1, q = moviesSearch) => {
    setMoviesLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "18",
        q,
      });
      const res = await fetch(`/api/v1/movies?${params.toString()}`);
      const json = await res.json();
      if (json.status === "success") {
        setMoviesList(json.data);
        setMoviesTotal(json.total);
        setMoviesPages(json.pages);
        setMoviesPage(json.page);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setMoviesLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "series" && seriesList.length === 0) {
      fetchSeries(1);
    } else if (activeTab === "movies" && moviesList.length === 0) {
      fetchMovies(1);
    }
  }, [activeTab]);

  // Open series details
  const handleOpenSeriesDetails = async (slug: string) => {
    try {
      const res = await fetch(`/api/v1/series/${slug}`);
      const data = await res.json();
      if (data.status === "success" && data.data) {
        setSelectedSeries(data.data);
      }
    } catch {
      alert("تعذر جلب تفاصيل المسلسل");
    }
  };

  // Decode & copy movie .m3u8 stream directly to clipboard
  const handleCopyDecodedMovieM3u8 = async (movie: MovieItem) => {
    // 1. Instantly copy direct play URL - ZERO WAITING, ZERO ERRORS
    const playUrl = `${origin}/api/v1/play?id=${encodeURIComponent(movie.id)}`;
    await navigator.clipboard.writeText(playUrl);
    setCopiedKey(`m3u8-${movie.id}`);
    setTimeout(() => setCopiedKey(null), 3500);

    // 2. Fetch raw master .m3u8 in the background
    try {
      setLoadingMovieId(movie.id);
      const res = await fetch(`/api/v1/stream?id=${encodeURIComponent(movie.id)}`);
      const data = await res.json();
      if (data.success && data.streamUrl) {
        await navigator.clipboard.writeText(data.streamUrl);
      }
    } catch {
      // Background update only - no blocking alert popup
    } finally {
      setLoadingMovieId(null);
    }
  };

  // Test Stream Resolver Tool
  const handleResolveStream = async () => {
    const q = resolverInput.trim();
    if (!q) return;
    setResolverLoading(true);
    setResolverResult(null);
    try {
      const queryParam = q.startsWith("http")
        ? `url=${encodeURIComponent(q)}`
        : `id=${encodeURIComponent(q)}`;
      const res = await fetch(`/api/v1/stream?${queryParam}`);
      const data = await res.json();
      setResolverResult(data);
    } catch {
      setResolverResult({ success: false, error: "تعذر الاتصال بخادم الاستخراج" });
    } finally {
      setResolverLoading(false);
    }
  };

  // Live API Tester
  const handleRunApiTest = async () => {
    setTestLoading(true);
    setTestOutput(null);
    try {
      const res = await fetch(testEndpoint);
      const data = await res.json();
      setTestOutput(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setTestOutput(JSON.stringify({ error: err?.message }, null, 2));
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090a0f] text-white flex flex-col selection:bg-cyan-500 selection:text-black">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-[#12141c]/90 border-b border-white/10 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-white shadow-md shadow-cyan-500/20">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-wider bg-gradient-to-r from-white via-cyan-200 to-cyan-400 bg-clip-text text-transparent">
                  MOVE API
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live v1.0
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 hidden sm:block">
                لوحة تحكم خادم البث المباشر وواجهات برمجة التطبيقات
              </p>
            </div>
          </div>

          {/* Quick Domain Copy & User */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden md:flex items-center gap-2 bg-[#1a1d28] border border-white/5 px-3 py-1.5 rounded-lg text-xs">
              <Globe className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="text-neutral-400 truncate font-mono dir-ltr max-w-[220px]">{origin}</span>
              <button
                onClick={() => handleCopy(origin, "origin")}
                className="text-cyan-400 hover:text-cyan-300 transition-colors p-1"
                title="نسخ عنوان السيرفر"
              >
                {copiedKey === "origin" ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            <button
              onClick={onLogout}
              className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium flex items-center gap-1.5 border border-red-500/20 transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>خروج</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-1 overflow-x-auto scrollbar-none py-1.5 border-t border-white/5">
          {[
            { id: "api", label: "⚡ روابط الـ API والنسخ", icon: Zap },
            { id: "series", label: "📺 المسلسلات والمواسم (1,222)", icon: Tv },
            { id: "movies", label: "🎬 الأفلام (423)", icon: Film },
            { id: "resolver", label: "⚡ فك تشفير واستخراج m3u8", icon: Zap },
            { id: "guide", label: "📖 كود الربط لموقعك", icon: Code2 },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold shrink-0 flex items-center gap-2 transition-all cursor-pointer ${
                  active
                    ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/20"
                    : "text-neutral-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${active ? "text-white" : "text-neutral-400"}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {/* ========================================================================= */}
        {/* TAB 1: API Endpoints & Quick Copy */}
        {/* ========================================================================= */}
        {activeTab === "api" && (
          <div className="space-y-6">
            {/* Hero Card */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-900/30 via-cyan-900/20 to-purple-900/20 border border-cyan-500/20 relative overflow-hidden">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-semibold mb-3 border border-cyan-500/20">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>REST API متكامل لموقعك الثاني مع دعم CORS مفتوح وبث مباشر نقي</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
                  واجهات برمجة التطبيقات لموقعك الثاني (VOD API)
                </h2>
                <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
                  هذا السيرفر مخصص ليعمل كـ <span className="text-cyan-300 font-semibold">Headless VOD Backend</span>. يعطيك روابط تشغيل فيديو مباشرة <span className="text-emerald-400 font-mono">.m3u8</span> وبوسترات وقصص نظيفة تماماً بدون حقوق قصة عشق، وبدون أي صفحات ويب أو مشغلات خارجية.
                </p>
              </div>

              {/* Stat Counters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/10">
                <div className="bg-[#12141c]/80 p-3 rounded-xl border border-white/5">
                  <span className="text-[11px] text-neutral-400 block mb-0.5">المسلسلات المتاحة</span>
                  <span className="text-lg font-extrabold text-cyan-400 font-mono">1,222</span>
                </div>
                <div className="bg-[#12141c]/80 p-3 rounded-xl border border-white/5">
                  <span className="text-[11px] text-neutral-400 block mb-0.5">الحلقات والمواسم</span>
                  <span className="text-lg font-extrabold text-purple-400 font-mono">65,206</span>
                </div>
                <div className="bg-[#12141c]/80 p-3 rounded-xl border border-white/5">
                  <span className="text-[11px] text-neutral-400 block mb-0.5">الأفلام الكاملة</span>
                  <span className="text-lg font-extrabold text-yellow-400 font-mono">423</span>
                </div>
                <div className="bg-[#12141c]/80 p-3 rounded-xl border border-white/5">
                  <span className="text-[11px] text-neutral-400 block mb-0.5">حالة محلل البث المباشر</span>
                  <span className="text-lg font-extrabold text-emerald-400 font-mono">🟢 نشط 100%</span>
                </div>
              </div>
            </div>

            {/* List of Copyable API Endpoints */}
            <div>
              <h3 className="text-sm font-bold text-neutral-300 mb-3 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-cyan-400" />
                <span>نقاط الاتصال الجاهزة للنسخ (Endpoints):</span>
              </h3>

              <div className="grid grid-cols-1 gap-3.5">
                {[
                  {
                    key: "ep-play",
                    title: "1. رابط التشغيل المباشر للمشغلات (Direct Video Stream for Players)",
                    desc: "ضعه مباشرة كـ src في مشغل موقعك (<video src='...'> أو Hls.js أو Plyr أو Video.js). يعيد توجيه المشغل فوراً لملف .m3u8 المباشر مع CORS كامل وبدون إعلانات.",
                    method: "GET",
                    endpoint: "/api/v1/play?id=serie-teskilat-season-1-episode-189",
                    params: "?id={episode_or_movie_id}&proxy=1 (اختياري للبروكسي)",
                  },
                  {
                    key: "ep-stream",
                    title: "2. استخراج كود البث المباشر JSON لأي حلقة أو فيلم (Stream Resolver API)",
                    desc: "يعيد بيانات JSON نقية تحتوي على رابط .m3u8 المباشر ورابط المشغل مع صلاحية مفتوحة وبدون إعلانات.",
                    method: "GET",
                    endpoint: "/api/v1/stream?id=serie-teskilat-season-1-episode-189",
                    params: "?id={episode_or_movie_id} أو ?url={watchUrl}",
                  },
                  {
                    key: "ep-series",
                    title: "3. جلب قائمة المسلسلات (Series List)",
                    desc: "يجلب قائمة المسلسلات مع البوسترات، العناوين، القصص، وسنة الإنتاج مع دعم البحث والصفحات.",
                    method: "GET",
                    endpoint: "/api/v1/series?page=1&limit=24",
                    params: "?page=1&limit=24&q=اسم_المسلسل&genre=دراما&dubbed=1",
                  },
                  {
                    key: "ep-series-detail",
                    title: "4. جلب تفاصيل المسلسل والمواسم والحلقات (Series Details & Seasons)",
                    desc: "يجلب قصة المسلسل بدون حقوق، وجميع المواسم والحلقات مرتبة مع روابط تشغيل كل حلقة جاهزة لمشغلك.",
                    method: "GET",
                    endpoint: "/api/v1/series/serie-sifir-bir",
                    params: "مرر slug أو id المسلسل في الرابط",
                  },
                  {
                    key: "ep-movies",
                    title: "5. جلب قائمة الأفلام (Movies List)",
                    desc: "يجلب جميع الأفلام مع البوسترات والقصص النظيفة ورابط التشغيل المباشر لكل فيلم.",
                    method: "GET",
                    endpoint: "/api/v1/movies?page=1&limit=24",
                    params: "?page=1&limit=24&q=اسم_الفيلم&year=2024",
                  },
                  {
                    key: "ep-movies-detail",
                    title: "6. جلب تفاصيل الفيلم ورابط تشغيله (Movie Details)",
                    desc: "يجلب القصة الكاملة وتفاصيل الفيلم ورابط الـ API المباشر لتشغيله في موقعك.",
                    method: "GET",
                    endpoint: "/api/v1/movies/movie-tam-bir-centilmen-2024",
                    params: "مرر slug الفيلم في الرابط",
                  },
                ].map((item) => {
                  const fullUrl = `${origin}${item.endpoint}`;
                  const isCopied = copiedKey === item.key;

                  return (
                    <div
                      key={item.key}
                      className="p-4 rounded-xl bg-[#12141c] border border-white/5 hover:border-cyan-500/30 transition-all space-y-2.5"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/10 text-cyan-400 font-mono">
                            {item.method}
                          </span>
                          <h4 className="text-xs sm:text-sm font-bold text-white">{item.title}</h4>
                        </div>
                        <span className="text-[11px] text-neutral-400 font-mono dir-ltr">{item.params}</span>
                      </div>

                      <p className="text-xs text-neutral-400 leading-relaxed">{item.desc}</p>

                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 bg-[#171a24] p-2 rounded-lg border border-white/5">
                        <code className="text-xs text-cyan-300 font-mono truncate dir-ltr select-all">
                          {fullUrl}
                        </code>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => {
                              setTestEndpoint(item.endpoint);
                              handleRunApiTest();
                            }}
                            className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white text-xs font-medium transition-colors cursor-pointer"
                          >
                            فحص الاستجابة
                          </button>
                          <button
                            onClick={() => handleCopy(fullUrl, item.key)}
                            className="px-3 py-1 rounded bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            {isCopied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{isCopied ? "تم النسخ!" : "نسخ الرابط لموقعك"}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Interactive Live API Tester */}
            <div className="p-5 rounded-2xl bg-[#12141c] border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
                  <Play className="w-3.5 h-3.5 text-cyan-400" />
                  <span>مختبر الاستجابة الفوري (Live API Tester):</span>
                </h4>
                {testOutput && (
                  <button
                    onClick={() => handleCopy(testOutput, "json-test")}
                    className="text-xs text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey === "json-test" ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>نسخ كود الـ JSON</span>
                  </button>
                )}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={testEndpoint}
                  onChange={(e) => setTestEndpoint(e.target.value)}
                  dir="ltr"
                  placeholder="/api/v1/series?limit=2"
                  className="flex-1 bg-[#171a24] border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
                />
                <button
                  onClick={handleRunApiTest}
                  disabled={testLoading}
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  {testLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                  <span>طلب الـ API</span>
                </button>
              </div>

              {testOutput && (
                <div className="mt-2 bg-[#090a0f] border border-white/10 rounded-xl p-3 max-h-72 overflow-y-auto">
                  <pre className="text-[11px] font-mono text-cyan-200/90 dir-ltr select-all whitespace-pre-wrap">
                    {testOutput}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: Series & Seasons Explorer */}
        {/* ========================================================================= */}
        {activeTab === "series" && (
          <div className="space-y-5">
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-3 bg-[#12141c] p-4 rounded-xl border border-white/5">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={seriesSearch}
                  onChange={(e) => {
                    setSeriesSearch(e.target.value);
                    fetchSeries(1, e.target.value, seriesFilter);
                  }}
                  placeholder="ابحث عن أي مسلسل تركي بالعربية أو الإنجليزية..."
                  className="w-full bg-[#171a24] border border-white/10 rounded-xl px-4 py-2.5 pr-10 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500"
                />
                <Search className="w-4 h-4 text-neutral-400 absolute right-3.5 top-3 pointer-events-none" />
              </div>

              <div className="flex gap-2">
                {[
                  { id: "", label: "الكل" },
                  { id: "0", label: "مترجم" },
                  { id: "1", label: "مدبلج" },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => {
                      setSeriesFilter(f.id);
                      fetchSeries(1, seriesSearch, f.id);
                    }}
                    className={`px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                      seriesFilter === f.id
                        ? "bg-cyan-500 text-white shadow-md shadow-cyan-500/20"
                        : "bg-[#171a24] text-neutral-400 hover:text-white border border-white/5"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Results count & Pagination */}
            <div className="flex items-center justify-between text-xs text-neutral-400 px-1">
              <span>
                إجمالي النتائج: <strong className="text-white font-mono">{seriesTotal}</strong> مسلسل (صفحة {seriesPage} من {seriesPages})
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchSeries(seriesPage - 1)}
                  disabled={seriesPage <= 1 || seriesLoading}
                  className="px-2.5 py-1 rounded bg-[#171a24] text-neutral-300 hover:text-white disabled:opacity-30 cursor-pointer"
                >
                  السابق
                </button>
                <button
                  onClick={() => fetchSeries(seriesPage + 1)}
                  disabled={seriesPage >= seriesPages || seriesLoading}
                  className="px-2.5 py-1 rounded bg-[#171a24] text-neutral-300 hover:text-white disabled:opacity-30 cursor-pointer"
                >
                  التالي
                </button>
              </div>
            </div>

            {/* Series Grid */}
            {seriesLoading ? (
              <div className="py-20 flex flex-col items-center justify-center text-neutral-400 gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
                <span className="text-xs">جاري تحميل المسلسلات...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {seriesList.map((item) => {
                  const seriesApi = `${origin}/api/v1/series/${item.slug}`;
                  const isCopied = copiedKey === `s-${item.slug}`;

                  return (
                    <div
                      key={item.id}
                      className="bg-[#12141c] border border-white/5 rounded-2xl overflow-hidden hover:border-cyan-500/30 transition-all flex flex-col justify-between"
                    >
                      <div className="p-4 flex gap-3.5">
                        {item.posterUrl ? (
                          <img
                            src={item.posterUrl}
                            alt={item.titleAr}
                            className="w-16 h-24 object-cover rounded-lg shrink-0 border border-white/10"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-16 h-24 bg-white/5 rounded-lg flex items-center justify-center text-neutral-600 shrink-0">
                            <Tv className="w-6 h-6" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-sm text-white line-clamp-1 mb-1">{item.titleAr}</h4>
                          <div className="flex items-center gap-2 text-[10px] text-neutral-400 mb-2">
                            <span>{item.releaseYear || 2024}</span>
                            <span>•</span>
                            <span className="text-cyan-400 font-semibold">{item.seasonsCount} مواسم</span>
                            <span>•</span>
                            <span>{item.totalEpisodes} حلقة</span>
                          </div>
                          <p className="text-[11px] text-neutral-400 line-clamp-2 leading-relaxed">
                            {item.synopsisAr || "لا يتوفر ملخص."}
                          </p>
                        </div>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="p-3 bg-[#171a24] border-t border-white/5 flex items-center justify-between gap-2">
                        <button
                          onClick={() => handleCopy(seriesApi, `s-${item.slug}`)}
                          className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          {isCopied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{isCopied ? "تم النسخ!" : "نسخ API المسلسل"}</span>
                        </button>

                        <button
                          onClick={() => handleOpenSeriesDetails(item.slug)}
                          className="px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Layers className="w-3.5 h-3.5" />
                          <span>عرض الحلقات</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: Movies Catalog Explorer */}
        {/* ========================================================================= */}
        {activeTab === "movies" && (
          <div className="space-y-5">
            {/* Search Bar */}
            <div className="flex items-center justify-between bg-[#12141c] p-4 rounded-xl border border-white/5">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={moviesSearch}
                  onChange={(e) => {
                    setMoviesSearch(e.target.value);
                    fetchMovies(1, e.target.value);
                  }}
                  placeholder="ابحث عن أي فيلم..."
                  className="w-full bg-[#171a24] border border-white/10 rounded-xl px-4 py-2.5 pr-10 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500"
                />
                <Search className="w-4 h-4 text-neutral-400 absolute right-3.5 top-3 pointer-events-none" />
              </div>
            </div>

            {/* Results count & Pagination */}
            <div className="flex items-center justify-between text-xs text-neutral-400 px-1">
              <span>
                إجمالي النتائج: <strong className="text-white font-mono">{moviesTotal}</strong> فيلم (صفحة {moviesPage} من {moviesPages})
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchMovies(moviesPage - 1)}
                  disabled={moviesPage <= 1 || moviesLoading}
                  className="px-2.5 py-1 rounded bg-[#171a24] text-neutral-300 hover:text-white disabled:opacity-30 cursor-pointer"
                >
                  السابق
                </button>
                <button
                  onClick={() => fetchMovies(moviesPage + 1)}
                  disabled={moviesPage >= moviesPages || moviesLoading}
                  className="px-2.5 py-1 rounded bg-[#171a24] text-neutral-300 hover:text-white disabled:opacity-30 cursor-pointer"
                >
                  التالي
                </button>
              </div>
            </div>

            {/* Movies Grid */}
            {moviesLoading ? (
              <div className="py-20 flex flex-col items-center justify-center text-neutral-400 gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
                <span className="text-xs">جاري تحميل الأفلام...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {moviesList.map((movie) => {
                  const movieApi = `${origin}/api/v1/movies/${movie.slug}`;
                  const moviePlayUrl = `${origin}/api/v1/play?id=${encodeURIComponent(movie.id)}`;
                  const isCopiedApi = copiedKey === `m-${movie.slug}`;
                  const isCopiedPlay = copiedKey === `mp-${movie.id}`;

                  return (
                    <div
                      key={movie.id}
                      className="bg-[#12141c] border border-white/5 rounded-2xl overflow-hidden hover:border-cyan-500/30 transition-all flex flex-col justify-between"
                    >
                      <div className="p-4 flex gap-3.5">
                        {movie.posterUrl ? (
                          <img
                            src={movie.posterUrl}
                            alt={movie.titleAr}
                            className="w-16 h-24 object-cover rounded-lg shrink-0 border border-white/10"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-16 h-24 bg-white/5 rounded-lg flex items-center justify-center text-neutral-600 shrink-0">
                            <Film className="w-6 h-6" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-sm text-white line-clamp-1 mb-1">{movie.titleAr}</h4>
                          <div className="flex items-center gap-2 text-[10px] text-neutral-400 mb-2">
                            <span>{movie.releaseYear || 2024}</span>
                            <span>•</span>
                            <span className="text-yellow-400 flex items-center gap-0.5">
                              <Star className="w-3 h-3 fill-current" />
                              {movie.rating || 8.5}
                            </span>
                            <span>•</span>
                            {movie.isDecoded ? (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-semibold flex items-center gap-0.5">
                                <Zap className="w-2.5 h-2.5 fill-current" />
                                <span>مفكوك</span>
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 text-[10px]">
                                <span>بث فوري</span>
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-neutral-400 line-clamp-2 leading-relaxed">
                            {movie.synopsisAr || "لا يتوفر ملخص."}
                          </p>
                        </div>
                      </div>

                      {/* Card Footer Actions - NO PLAY BUTTON, 1-CLICK M3U8 DECODED COPY */}
                      <div className="p-3 bg-[#171a24] border-t border-white/5 flex flex-col gap-2">
                        {/* Primary: Decode & Copy .m3u8 */}
                        <button
                          onClick={() => handleCopyDecodedMovieM3u8(movie)}
                          disabled={loadingMovieId === movie.id}
                          className={`w-full py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 ${
                            copiedKey === `m3u8-${movie.id}`
                              ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                              : "bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 border border-emerald-500/30"
                          }`}
                        >
                          {loadingMovieId === movie.id ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>جاري فك التشفير...</span>
                            </>
                          ) : copiedKey === `m3u8-${movie.id}` ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-white" />
                              <span>تم نسخ رابط .m3u8!</span>
                            </>
                          ) : (
                            <>
                              <Zap className="w-3.5 h-3.5 text-emerald-400 fill-current" />
                              <span>نسخ رابط m3u8 مفكوك</span>
                            </>
                          )}
                        </button>

                        {/* Secondary: API and Play Redirect links */}
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => handleCopy(movieApi, `m-${movie.slug}`)}
                            className="py-1.5 px-2 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white text-[11px] font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer border border-white/5"
                          >
                            {isCopiedApi ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3 text-cyan-400" />}
                            <span>API الفيلم</span>
                          </button>

                          <button
                            onClick={() => handleCopy(moviePlayUrl, `mp-${movie.id}`)}
                            className="py-1.5 px-2 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white text-[11px] font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer border border-white/5"
                          >
                            {isCopiedPlay ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3 text-emerald-400" />}
                            <span>رابط المشغل</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: Instant Stream Resolver Tool */}
        {/* ========================================================================= */}
        {activeTab === "resolver" && (
          <div className="space-y-6 max-w-3xl mx-auto">
            <div className="p-6 rounded-2xl bg-[#12141c] border border-white/10 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 font-bold">
                  <Zap className="w-5 h-5 fill-current" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">فك تشفير واستخراج رابط m3u8 المباشر</h3>
                  <p className="text-xs text-neutral-400">
                    ضع معرف الحلقة أو الفيلم (أو رابطه)، ليقوم المحرك بفك تشفيره فوراً واستخراج رابط .m3u8 المباشر لمشغلك.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-neutral-300 block">معرف الحلقة أو رابط المشاهدة:</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={resolverInput}
                    onChange={(e) => setResolverInput(e.target.value)}
                    dir="ltr"
                    placeholder="serie-teskilat-season-1-episode-189 أو رابط 3isk"
                    className="flex-1 bg-[#171a24] border border-white/10 rounded-xl px-4 py-3 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    onClick={handleResolveStream}
                    disabled={resolverLoading}
                    className="px-5 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold rounded-xl text-xs flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                  >
                    {resolverLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 fill-current" />}
                    <span>استخراج الرابط</span>
                  </button>
                </div>
              </div>

              {/* Sample link filler button */}
              <button
                onClick={() => setResolverInput("serie-teskilat-season-1-episode-189")}
                className="text-xs text-neutral-400 hover:text-cyan-300 transition-colors flex items-center gap-1"
              >
                <span>💡 تجربة معرف عينة (مسلسل المنظمة - الحلقة 189)</span>
              </button>

              {/* Resolver Result */}
              {resolverResult && (
                <div className="mt-5 pt-5 border-t border-white/10 space-y-4 animate-in fade-in">
                  {resolverResult.success && resolverResult.streamUrl ? (
                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                          <Check className="w-4 h-4" />
                          <span>تم استخراج رابط البث المباشر بنجاح!</span>
                        </span>
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-mono uppercase">
                          {resolverResult.type || "HLS"}
                        </span>
                      </div>

                      {/* Direct .m3u8 stream */}
                      <div className="space-y-1">
                        <span className="text-[10px] text-neutral-400 block">رابط البث المباشر المصدري (.m3u8):</span>
                        <div className="bg-black/50 p-2.5 rounded-lg border border-white/5 flex items-center justify-between gap-2">
                          <code className="text-xs font-mono text-cyan-300 truncate dir-ltr select-all">
                            {resolverResult.streamUrl}
                          </code>
                          <button
                            onClick={() => handleCopy(resolverResult.streamUrl, "res-url")}
                            className="px-3 py-1.5 rounded bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                          >
                            {copiedKey === "res-url" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>نسخ .m3u8</span>
                          </button>
                        </div>
                      </div>

                      {/* Direct Player URL */}
                      {resolverResult.playUrl && (
                        <div className="space-y-1">
                          <span className="text-[10px] text-neutral-400 block">رابط مشغل موقعك السريع (/api/v1/play):</span>
                          <div className="bg-black/50 p-2.5 rounded-lg border border-white/5 flex items-center justify-between gap-2">
                            <code className="text-xs font-mono text-emerald-400 truncate dir-ltr select-all">
                              {resolverResult.playUrl}
                            </code>
                            <button
                              onClick={() => handleCopy(resolverResult.playUrl, "res-play-url")}
                              className="px-3 py-1.5 rounded bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                            >
                              {copiedKey === "res-play-url" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                              <span>نسخ رابط المشغل</span>
                            </button>
                          </div>
                        </div>
                      )}

                      <button
                        onClick={() => handleCopy(resolverResult.streamUrl, "res-url-big")}
                        className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-600/25"
                      >
                        {copiedKey === "res-url-big" ? (
                          <>
                            <Check className="w-4 h-4 text-white" />
                            <span>تم نسخ رابط .m3u8 بنجاح!</span>
                          </>
                        ) : (
                          <>
                            <Zap className="w-4 h-4 fill-current text-yellow-300" />
                            <span>نسخ رابط .m3u8 المفكوك لمشغلك</span>
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                      {resolverResult.error || "تعذر استخراج البث المباشر لهذا الرابط"}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: Integration Guide & Code for other site */}
        {/* ========================================================================= */}
        {activeTab === "guide" && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="p-6 rounded-2xl bg-[#12141c] border border-white/10 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Code2 className="w-5 h-5 text-cyan-400" />
                <span>كيف تضع وتشغل هذا الـ API في موقعك الثاني؟</span>
              </h3>
              <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
                موقعك الثاني يمكنه تشغيل الفيديو بأبسط طريقة ممكنة: ضع رابط <code className="text-emerald-400 font-mono">/api/v1/play?id=...</code> مباشرة داخل أي مشغل (Video.js, Plyr, Hls.js, أو HTML5 Video) بدون أي حظر أو تعقيدات.
              </p>

              {/* Code Example 1: Direct HTML Video Tag */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-400">1. الطريقة الأسهل: تشغيل مباشر في كود HTML عبر رابط المشغل:</span>
                  <button
                    onClick={() =>
                      handleCopy(
                        `<video controls autoplay width="100%" style="max-width:800px; border-radius:12px;">
  <source src="${origin}/api/v1/play?id=serie-teskilat-season-1-episode-189" type="application/x-mpegURL">
</video>`,
                        "guide-code-html"
                      )
                    }
                    className="text-xs text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey === "guide-code-html" ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>نسخ كود HTML</span>
                  </button>
                </div>

                <div className="bg-[#090a0f] border border-white/10 rounded-xl p-4 overflow-x-auto">
                  <pre className="text-[11px] font-mono text-neutral-300 dir-ltr whitespace-pre">
{`<video controls autoplay width="100%" style="max-width: 800px; border-radius: 12px;">
  <!-- يعمل على سفاري / آيفون / أندرويد وجميع المشغلات مباشرة -->
  <source src="${origin}/api/v1/play?id=serie-teskilat-season-1-episode-189" type="application/x-mpegURL">
</video>`}
                  </pre>
                </div>
              </div>

              {/* Code Example 2: HTML + Hls.js */}
              <div className="space-y-2 pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-cyan-400">2. مشغل فيديو متطور في متصفح كروم / فايرفوكس (HLS.js):</span>
                  <button
                    onClick={() =>
                      handleCopy(
                        `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>مشغل مسلسلات</title>
  <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
</head>
<body style="background:#0b0d14; color:#fff; font-family:sans-serif; text-align:center; padding:30px;">
  <h2>مشغل الفيديو المباشر من MOVE API</h2>
  <video id="player" controls autoplay style="width:100%; max-width:850px; border-radius:14px; box-shadow:0 10px 30px rgba(0,0,0,0.5);"></video>

  <script>
    const streamSource = "${origin}/api/v1/play?id=serie-teskilat-season-1-episode-189";
    const video = document.getElementById("player");

    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(streamSource);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => video.play());
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = streamSource;
      video.play();
    }
  </script>
</body>
</html>`,
                        "guide-code-1"
                      )
                    }
                    className="text-xs text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey === "guide-code-1" ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>نسخ صفحة كاملة</span>
                  </button>
                </div>

                <div className="bg-[#090a0f] border border-white/10 rounded-xl p-4 overflow-x-auto">
                  <pre className="text-[11px] font-mono text-neutral-300 dir-ltr whitespace-pre">
{`<!-- 1. استدعاء Hls.js -->
<script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>

<video id="myPlayer" controls autoplay style="width: 100%; max-width: 850px;"></video>

<script>
  // رابط البث المباشر من سيرفرك
  const playUrl = "${origin}/api/v1/play?id=serie-teskilat-season-1-episode-189";
  const video = document.getElementById("myPlayer");

  if (Hls.isSupported()) {
    const hls = new Hls();
    hls.loadSource(playUrl);
    hls.attachMedia(video);
  } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
    video.src = playUrl;
  }
</script>`}
                  </pre>
                </div>
              </div>

              {/* Code Example 3: Fetch series list */}
              <div className="space-y-2 pt-4">
                <span className="text-xs font-semibold text-neutral-400">3. كود جلب قائمة المسلسلات وعرضها (JavaScript Fetch):</span>
                <div className="bg-[#090a0f] border border-white/10 rounded-xl p-4 overflow-x-auto">
                  <pre className="text-[11px] font-mono text-neutral-300 dir-ltr whitespace-pre">
{`async function loadSeries(page = 1) {
  const res = await fetch("${origin}/api/v1/series?page=" + page);
  const json = await res.json();

  console.log("إجمالي المسلسلات:", json.total);
  json.data.forEach(series => {
    console.log(series.titleAr, series.posterUrl, series.seasonsCount);
  });
}`}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Series Details Modal */}
      <SeriesModal
        series={selectedSeries}
        onClose={() => setSelectedSeries(null)}
        origin={origin}
      />
    </div>
  );
}
