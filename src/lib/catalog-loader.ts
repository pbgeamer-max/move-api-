// TVORA Shared Catalog Loader & Defaults
// Loads the 1,222 Turkish series, 423 movies, and 65,158 episodes from local gzip/json
import * as fs from "fs";
import * as path from "path";
import * as zlib from "zlib";

type Dict = Record<string, any>;

export const DEFAULT_CHANNELS: Dict[] = [
  {
    "id": "bein-vip-bein-sports-news",
    "code": "BEIN-VIP-BEIN-SPORTS-NEWS",
    "nameAr": "بي إن سبورت الإخبارية",
    "nameEn": "beIN Sports News",
    "category": "sports",
    "descriptionAr": "beIN SPORTS VIP (ملفاتك الخاصة)",
    "descriptionEn": "https://aspreen-tv-production.up.railway.app/logos/bein-sports.png",
    "nowPlayingAr": "بث مباشر 24/7",
    "nowPlayingEn": "[{\"id\": \"server-1\", \"name\": \"سيرفر 1 - فائق الثبات وسلس (عالي الوضوح (HD 720p 60fps))\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-news.m3u8?server=1\", \"quality\": \"HD\", \"resolution\": \"1280x720\", \"isDefault\": true, \"status\": \"live\"}, {\"id\": \"server-2\", \"name\": \"سيرفر 2 - فائق الدقة (4K / 1080p 60fps)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-news.m3u8?server=2\", \"quality\": \"4K\", \"resolution\": \"1920x1080\", \"isDefault\": false, \"status\": \"live\"}, {\"id\": \"server-3\", \"name\": \"سيرفر 3 - المصدر المباشر (RAW Satellite)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-news.m3u8?server=3\", \"quality\": \"1080p\", \"resolution\": \"1920x1080\", \"isDefault\": false, \"status\": \"live\"}, {\"id\": \"server-4\", \"name\": \"سيرفر 4 - للإنترنت الضعيف (SD 576p)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-news.m3u8?server=4\", \"quality\": \"SD\", \"resolution\": \"720x576\", \"isDefault\": false, \"status\": \"live\"}, {\"id\": \"server-5\", \"name\": \"سيرفر 5 - فائق الدقة احتياطي (4K S2)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-news.m3u8?server=5\", \"quality\": \"4K\", \"resolution\": \"1920x1080\", \"isDefault\": false, \"status\": \"live\"}]",
    "colorA": "#601977",
    "colorB": "#14041b",
    "quality": "HD",
    "streamType": "hls",
    "streamUrl": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-news.m3u8",
    "logoUrl": "https://aspreen-tv-production.up.railway.app/logos/bein-sports.png",
    "servers": [
      {
        "id": "server-1",
        "name": "سيرفر 1 - فائق الثبات وسلس (عالي الوضوح (HD 720p 60fps))",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-news.m3u8?server=1",
        "quality": "HD",
        "resolution": "1280x720",
        "isDefault": true,
        "status": "live"
      },
      {
        "id": "server-2",
        "name": "سيرفر 2 - فائق الدقة (4K / 1080p 60fps)",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-news.m3u8?server=2",
        "quality": "4K",
        "resolution": "1920x1080",
        "isDefault": false,
        "status": "live"
      },
      {
        "id": "server-3",
        "name": "سيرفر 3 - المصدر المباشر (RAW Satellite)",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-news.m3u8?server=3",
        "quality": "1080p",
        "resolution": "1920x1080",
        "isDefault": false,
        "status": "live"
      },
      {
        "id": "server-4",
        "name": "سيرفر 4 - للإنترنت الضعيف (SD 576p)",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-news.m3u8?server=4",
        "quality": "SD",
        "resolution": "720x576",
        "isDefault": false,
        "status": "live"
      },
      {
        "id": "server-5",
        "name": "سيرفر 5 - فائق الدقة احتياطي (4K S2)",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-news.m3u8?server=5",
        "quality": "4K",
        "resolution": "1920x1080",
        "isDefault": false,
        "status": "live"
      }
    ],
    "visible": true,
    "sortOrder": 1
  },
  {
    "id": "bein-vip-bein-sports-global",
    "code": "BEIN-VIP-BEIN-SPORTS-GLOBAL",
    "nameAr": "بي إن سبورت المفتوحة",
    "nameEn": "beIN Sports Global",
    "category": "sports",
    "descriptionAr": "beIN SPORTS VIP (ملفاتك الخاصة)",
    "descriptionEn": "https://aspreen-tv-production.up.railway.app/logos/bein-sports.png",
    "nowPlayingAr": "بث مباشر 24/7",
    "nowPlayingEn": "[{\"id\": \"server-1\", \"name\": \"سيرفر 1 - فائق الثبات وسلس (عالي الوضوح (HD 720p 60fps))\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-global.m3u8?server=1\", \"quality\": \"HD\", \"resolution\": \"1280x720\", \"isDefault\": true, \"status\": \"live\"}, {\"id\": \"server-2\", \"name\": \"سيرفر 2 - فائق الدقة (4K / 1080p 60fps)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-global.m3u8?server=2\", \"quality\": \"4K\", \"resolution\": \"1920x1080\", \"isDefault\": false, \"status\": \"live\"}, {\"id\": \"server-3\", \"name\": \"سيرفر 3 - المصدر المباشر (RAW Satellite)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-global.m3u8?server=3\", \"quality\": \"1080p\", \"resolution\": \"1920x1080\", \"isDefault\": false, \"status\": \"live\"}, {\"id\": \"server-4\", \"name\": \"سيرفر 4 - للإنترنت الضعيف (SD 576p)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-global.m3u8?server=4\", \"quality\": \"SD\", \"resolution\": \"720x576\", \"isDefault\": false, \"status\": \"live\"}, {\"id\": \"server-5\", \"name\": \"سيرفر 5 - فائق الدقة احتياطي (4K S2)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-global.m3u8?server=5\", \"quality\": \"4K\", \"resolution\": \"1920x1080\", \"isDefault\": false, \"status\": \"live\"}]",
    "colorA": "#601977",
    "colorB": "#14041b",
    "quality": "HD",
    "streamType": "hls",
    "streamUrl": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-global.m3u8",
    "logoUrl": "https://aspreen-tv-production.up.railway.app/logos/bein-sports.png",
    "servers": [
      {
        "id": "server-1",
        "name": "سيرفر 1 - فائق الثبات وسلس (عالي الوضوح (HD 720p 60fps))",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-global.m3u8?server=1",
        "quality": "HD",
        "resolution": "1280x720",
        "isDefault": true,
        "status": "live"
      },
      {
        "id": "server-2",
        "name": "سيرفر 2 - فائق الدقة (4K / 1080p 60fps)",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-global.m3u8?server=2",
        "quality": "4K",
        "resolution": "1920x1080",
        "isDefault": false,
        "status": "live"
      },
      {
        "id": "server-3",
        "name": "سيرفر 3 - المصدر المباشر (RAW Satellite)",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-global.m3u8?server=3",
        "quality": "1080p",
        "resolution": "1920x1080",
        "isDefault": false,
        "status": "live"
      },
      {
        "id": "server-4",
        "name": "سيرفر 4 - للإنترنت الضعيف (SD 576p)",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-global.m3u8?server=4",
        "quality": "SD",
        "resolution": "720x576",
        "isDefault": false,
        "status": "live"
      },
      {
        "id": "server-5",
        "name": "سيرفر 5 - فائق الدقة احتياطي (4K S2)",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-global.m3u8?server=5",
        "quality": "4K",
        "resolution": "1920x1080",
        "isDefault": false,
        "status": "live"
      }
    ],
    "visible": true,
    "sortOrder": 2
  },
  {
    "id": "bein-vip-bein-sports-1",
    "code": "BEIN-VIP-BEIN-SPORTS-1",
    "nameAr": "بي إن سبورت 1",
    "nameEn": "beIN Sports 1",
    "category": "sports",
    "descriptionAr": "beIN SPORTS VIP (ملفاتك الخاصة)",
    "descriptionEn": "https://aspreen-tv-production.up.railway.app/logos/bein-sports.png",
    "nowPlayingAr": "بث مباشر 24/7",
    "nowPlayingEn": "[{\"id\": \"server-1\", \"name\": \"سيرفر 1 - فائق الثبات وسلس (عالي الوضوح (HD 720p 60fps))\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-1.m3u8?server=1\", \"quality\": \"HD\", \"resolution\": \"1280x720\", \"isDefault\": true, \"status\": \"live\"}, {\"id\": \"server-2\", \"name\": \"سيرفر 2 - فائق الثبات وسلس (البث الفضائي (UHD / HEVC 50fps))\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-1.m3u8?server=2\", \"quality\": \"UHD\", \"resolution\": \"1920x1080\", \"isDefault\": false, \"status\": \"live\"}, {\"id\": \"server-3\", \"name\": \"سيرفر 3 - فائق الدقة (4K / 1080p 60fps)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-1.m3u8?server=3\", \"quality\": \"4K\", \"resolution\": \"1920x1080\", \"isDefault\": false, \"status\": \"live\"}, {\"id\": \"server-4\", \"name\": \"سيرفر 4 - المصدر المباشر (RAW Satellite)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-1.m3u8?server=4\", \"quality\": \"1080p\", \"resolution\": \"1920x1080\", \"isDefault\": false, \"status\": \"live\"}, {\"id\": \"server-5\", \"name\": \"سيرفر 5 - موفر للبيانات (HEVC / FHD)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-1.m3u8?server=5\", \"quality\": \"HEVC\", \"resolution\": \"1920x1080\", \"isDefault\": false, \"status\": \"live\"}, {\"id\": \"server-6\", \"name\": \"سيرفر 6 - للإنترنت الضعيف (SD 576p)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-1.m3u8?server=6\", \"quality\": \"SD\", \"resolution\": \"720x576\", \"isDefault\": false, \"status\": \"live\"}, {\"id\": \"server-7\", \"name\": \"سيرفر 7 - فائق الدقة احتياطي (4K S2)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-1.m3u8?server=7\", \"quality\": \"4K\", \"resolution\": \"1920x1080\", \"isDefault\": false, \"status\": \"live\"}, {\"id\": \"server-8\", \"name\": \"سيرفر 8 - عالي الوضوح احتياطي (HD S2)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-1.m3u8?server=8\", \"quality\": \"HD\", \"resolution\": \"1280x720\", \"isDefault\": false, \"status\": \"live\"}]",
    "colorA": "#601977",
    "colorB": "#14041b",
    "quality": "HD",
    "streamType": "hls",
    "streamUrl": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-1.m3u8",
    "logoUrl": "https://aspreen-tv-production.up.railway.app/logos/bein-sports.png",
    "servers": [
      {
        "id": "server-1",
        "name": "سيرفر 1 - فائق الثبات وسلس (عالي الوضوح (HD 720p 60fps))",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-1.m3u8?server=1",
        "quality": "HD",
        "resolution": "1280x720",
        "isDefault": true,
        "status": "live"
      },
      {
        "id": "server-2",
        "name": "سيرفر 2 - فائق الثبات وسلس (البث الفضائي (UHD / HEVC 50fps))",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-1.m3u8?server=2",
        "quality": "UHD",
        "resolution": "1920x1080",
        "isDefault": false,
        "status": "live"
      },
      {
        "id": "server-3",
        "name": "سيرفر 3 - فائق الدقة (4K / 1080p 60fps)",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-1.m3u8?server=3",
        "quality": "4K",
        "resolution": "1920x1080",
        "isDefault": false,
        "status": "live"
      },
      {
        "id": "server-4",
        "name": "سيرفر 4 - المصدر المباشر (RAW Satellite)",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-1.m3u8?server=4",
        "quality": "1080p",
        "resolution": "1920x1080",
        "isDefault": false,
        "status": "live"
      },
      {
        "id": "server-5",
        "name": "سيرفر 5 - موفر للبيانات (HEVC / FHD)",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-1.m3u8?server=5",
        "quality": "HEVC",
        "resolution": "1920x1080",
        "isDefault": false,
        "status": "live"
      },
      {
        "id": "server-6",
        "name": "سيرفر 6 - للإنترنت الضعيف (SD 576p)",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-1.m3u8?server=6",
        "quality": "SD",
        "resolution": "720x576",
        "isDefault": false,
        "status": "live"
      },
      {
        "id": "server-7",
        "name": "سيرفر 7 - فائق الدقة احتياطي (4K S2)",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-1.m3u8?server=7",
        "quality": "4K",
        "resolution": "1920x1080",
        "isDefault": false,
        "status": "live"
      },
      {
        "id": "server-8",
        "name": "سيرفر 8 - عالي الوضوح احتياطي (HD S2)",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-1.m3u8?server=8",
        "quality": "HD",
        "resolution": "1280x720",
        "isDefault": false,
        "status": "live"
      }
    ],
    "visible": true,
    "sortOrder": 3
  },
  {
    "id": "bein-vip-bein-sports-2",
    "code": "BEIN-VIP-BEIN-SPORTS-2",
    "nameAr": "بي إن سبورت 2",
    "nameEn": "beIN Sports 2",
    "category": "sports",
    "descriptionAr": "beIN SPORTS VIP (ملفاتك الخاصة)",
    "descriptionEn": "https://aspreen-tv-production.up.railway.app/logos/bein-sports.png",
    "nowPlayingAr": "بث مباشر 24/7",
    "nowPlayingEn": "[{\"id\": \"server-1\", \"name\": \"سيرفر 1 - فائق الثبات وسلس (عالي الوضوح (HD 720p 60fps))\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-2.m3u8?server=1\", \"quality\": \"HD\", \"resolution\": \"1280x720\", \"isDefault\": true, \"status\": \"live\"}, {\"id\": \"server-2\", \"name\": \"سيرفر 2 - فائق الثبات وسلس (البث الفضائي (UHD / HEVC 50fps))\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-2.m3u8?server=2\", \"quality\": \"UHD\", \"resolution\": \"1920x1080\", \"isDefault\": false, \"status\": \"live\"}, {\"id\": \"server-3\", \"name\": \"سيرفر 3 - فائق الدقة (4K / 1080p 60fps)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-2.m3u8?server=3\", \"quality\": \"4K\", \"resolution\": \"1920x1080\", \"isDefault\": false, \"status\": \"live\"}, {\"id\": \"server-4\", \"name\": \"سيرفر 4 - المصدر المباشر (RAW Satellite)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-2.m3u8?server=4\", \"quality\": \"1080p\", \"resolution\": \"1920x1080\", \"isDefault\": false, \"status\": \"live\"}, {\"id\": \"server-5\", \"name\": \"سيرفر 5 - موفر للبيانات (HEVC / FHD)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-2.m3u8?server=5\", \"quality\": \"HEVC\", \"resolution\": \"1920x1080\", \"isDefault\": false, \"status\": \"live\"}, {\"id\": \"server-6\", \"name\": \"سيرفر 6 - للإنترنت الضعيف (SD 576p)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-2.m3u8?server=6\", \"quality\": \"SD\", \"resolution\": \"720x576\", \"isDefault\": false, \"status\": \"live\"}, {\"id\": \"server-7\", \"name\": \"سيرفر 7 - فائق الدقة احتياطي (4K S2)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-2.m3u8?server=7\", \"quality\": \"4K\", \"resolution\": \"1920x1080\", \"isDefault\": false, \"status\": \"live\"}, {\"id\": \"server-8\", \"name\": \"سيرفر 8 - عالي الوضوح احتياطي (HD S2)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-2.m3u8?server=8\", \"quality\": \"HD\", \"resolution\": \"1280x720\", \"isDefault\": false, \"status\": \"live\"}]",
    "colorA": "#601977",
    "colorB": "#14041b",
    "quality": "HD",
    "streamType": "hls",
    "streamUrl": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-2.m3u8",
    "logoUrl": "https://aspreen-tv-production.up.railway.app/logos/bein-sports.png",
    "servers": [
      {
        "id": "server-1",
        "name": "سيرفر 1 - فائق الثبات وسلس (عالي الوضوح (HD 720p 60fps))",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-2.m3u8?server=1",
        "quality": "HD",
        "resolution": "1280x720",
        "isDefault": true,
        "status": "live"
      },
      {
        "id": "server-2",
        "name": "سيرفر 2 - فائق الثبات وسلس (البث الفضائي (UHD / HEVC 50fps))",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-2.m3u8?server=2",
        "quality": "UHD",
        "resolution": "1920x1080",
        "isDefault": false,
        "status": "live"
      },
      {
        "id": "server-3",
        "name": "سيرفر 3 - فائق الدقة (4K / 1080p 60fps)",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-2.m3u8?server=3",
        "quality": "4K",
        "resolution": "1920x1080",
        "isDefault": false,
        "status": "live"
      },
      {
        "id": "server-4",
        "name": "سيرفر 4 - المصدر المباشر (RAW Satellite)",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-2.m3u8?server=4",
        "quality": "1080p",
        "resolution": "1920x1080",
        "isDefault": false,
        "status": "live"
      },
      {
        "id": "server-5",
        "name": "سيرفر 5 - موفر للبيانات (HEVC / FHD)",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-2.m3u8?server=5",
        "quality": "HEVC",
        "resolution": "1920x1080",
        "isDefault": false,
        "status": "live"
      },
      {
        "id": "server-6",
        "name": "سيرفر 6 - للإنترنت الضعيف (SD 576p)",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-2.m3u8?server=6",
        "quality": "SD",
        "resolution": "720x576",
        "isDefault": false,
        "status": "live"
      },
      {
        "id": "server-7",
        "name": "سيرفر 7 - فائق الدقة احتياطي (4K S2)",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-2.m3u8?server=7",
        "quality": "4K",
        "resolution": "1920x1080",
        "isDefault": false,
        "status": "live"
      },
      {
        "id": "server-8",
        "name": "سيرفر 8 - عالي الوضوح احتياطي (HD S2)",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-2.m3u8?server=8",
        "quality": "HD",
        "resolution": "1280x720",
        "isDefault": false,
        "status": "live"
      }
    ],
    "visible": true,
    "sortOrder": 4
  },
  {
    "id": "bein-vip-bein-sports-3",
    "code": "BEIN-VIP-BEIN-SPORTS-3",
    "nameAr": "بي إن سبورت 3",
    "nameEn": "beIN Sports 3",
    "category": "sports",
    "descriptionAr": "beIN SPORTS VIP (ملفاتك الخاصة)",
    "descriptionEn": "https://aspreen-tv-production.up.railway.app/logos/bein-sports.png",
    "nowPlayingAr": "بث مباشر 24/7",
    "nowPlayingEn": "[{\"id\": \"server-1\", \"name\": \"سيرفر 1 - فائق الثبات وسلس (عالي الوضوح (HD 720p 60fps))\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-3.m3u8?server=1\", \"quality\": \"HD\", \"resolution\": \"1280x720\", \"isDefault\": true, \"status\": \"live\"}, {\"id\": \"server-2\", \"name\": \"سيرفر 2 - فائق الثبات وسلس (البث الفضائي (UHD / HEVC 50fps))\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-3.m3u8?server=2\", \"quality\": \"UHD\", \"resolution\": \"1920x1080\", \"isDefault\": false, \"status\": \"live\"}, {\"id\": \"server-3\", \"name\": \"سيرفر 3 - فائق الدقة (4K / 1080p 60fps)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-3.m3u8?server=3\", \"quality\": \"4K\", \"resolution\": \"1920x1080\", \"isDefault\": false, \"status\": \"live\"}, {\"id\": \"server-4\", \"name\": \"سيرفر 4 - المصدر المباشر (RAW Satellite)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-3.m3u8?server=4\", \"quality\": \"1080p\", \"resolution\": \"1920x1080\", \"isDefault\": false, \"status\": \"live\"}, {\"id\": \"server-5\", \"name\": \"سيرفر 5 - موفر للبيانات (HEVC / FHD)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-3.m3u8?server=5\", \"quality\": \"HEVC\", \"resolution\": \"1920x1080\", \"isDefault\": false, \"status\": \"live\"}, {\"id\": \"server-6\", \"name\": \"سيرفر 6 - للإنترنت الضعيف (SD 576p)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-3.m3u8?server=6\", \"quality\": \"SD\", \"resolution\": \"720x576\", \"isDefault\": false, \"status\": \"live\"}, {\"id\": \"server-7\", \"name\": \"سيرفر 7 - فائق الدقة احتياطي (4K S2)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-3.m3u8?server=7\", \"quality\": \"4K\", \"resolution\": \"1920x1080\", \"isDefault\": false, \"status\": \"live\"}, {\"id\": \"server-8\", \"name\": \"سيرفر 8 - عالي الوضوح احتياطي (HD S2)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-3.m3u8?server=8\", \"quality\": \"HD\", \"resolution\": \"1280x720\", \"isDefault\": false, \"status\": \"live\"}]",
    "colorA": "#601977",
    "colorB": "#14041b",
    "quality": "HD",
    "streamType": "hls",
    "streamUrl": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-3.m3u8",
    "logoUrl": "https://aspreen-tv-production.up.railway.app/logos/bein-sports.png",
    "servers": [
      {
        "id": "server-1",
        "name": "سيرفر 1 - فائق الثبات وسلس (عالي الوضوح (HD 720p 60fps))",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-3.m3u8?server=1",
        "quality": "HD",
        "resolution": "1280x720",
        "isDefault": true,
        "status": "live"
      },
      {
        "id": "server-2",
        "name": "سيرفر 2 - فائق الثبات وسلس (البث الفضائي (UHD / HEVC 50fps))",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-3.m3u8?server=2",
        "quality": "UHD",
        "resolution": "1920x1080",
        "isDefault": false,
        "status": "live"
      },
      {
        "id": "server-3",
        "name": "سيرفر 3 - فائق الدقة (4K / 1080p 60fps)",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-3.m3u8?server=3",
        "quality": "4K",
        "resolution": "1920x1080",
        "isDefault": false,
        "status": "live"
      },
      {
        "id": "server-4",
        "name": "سيرفر 4 - المصدر المباشر (RAW Satellite)",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-3.m3u8?server=4",
        "quality": "1080p",
        "resolution": "1920x1080",
        "isDefault": false,
        "status": "live"
      },
      {
        "id": "server-5",
        "name": "سيرفر 5 - موفر للبيانات (HEVC / FHD)",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-3.m3u8?server=5",
        "quality": "HEVC",
        "resolution": "1920x1080",
        "isDefault": false,
        "status": "live"
      },
      {
        "id": "server-6",
        "name": "سيرفر 6 - للإنترنت الضعيف (SD 576p)",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-3.m3u8?server=6",
        "quality": "SD",
        "resolution": "720x576",
        "isDefault": false,
        "status": "live"
      },
      {
        "id": "server-7",
        "name": "سيرفر 7 - فائق الدقة احتياطي (4K S2)",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-3.m3u8?server=7",
        "quality": "4K",
        "resolution": "1920x1080",
        "isDefault": false,
        "status": "live"
      },
      {
        "id": "server-8",
        "name": "سيرفر 8 - عالي الوضوح احتياطي (HD S2)",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-3.m3u8?server=8",
        "quality": "HD",
        "resolution": "1280x720",
        "isDefault": false,
        "status": "live"
      }
    ],
    "visible": true,
    "sortOrder": 5
  },
  {
    "id": "bein-vip-bein-sports-4",
    "code": "BEIN-VIP-BEIN-SPORTS-4",
    "nameAr": "بي إن سبورت 4",
    "nameEn": "beIN Sports 4",
    "category": "sports",
    "descriptionAr": "beIN SPORTS VIP (ملفاتك الخاصة)",
    "descriptionEn": "https://aspreen-tv-production.up.railway.app/logos/bein-sports.png",
    "nowPlayingAr": "بث مباشر 24/7",
    "nowPlayingEn": "[{\"id\": \"server-1\", \"name\": \"سيرفر 1 - فائق الثبات وسلس (عالي الوضوح (HD 720p 60fps))\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-4.m3u8?server=1\", \"quality\": \"HD\", \"resolution\": \"1280x720\", \"isDefault\": true, \"status\": \"live\"}, {\"id\": \"server-2\", \"name\": \"سيرفر 2 - فائق الثبات وسلس (البث الفضائي (UHD / HEVC 50fps))\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-4.m3u8?server=2\", \"quality\": \"UHD\", \"resolution\": \"1920x1080\", \"isDefault\": false, \"status\": \"live\"}, {\"id\": \"server-3\", \"name\": \"سيرفر 3 - فائق الدقة (4K / 1080p 60fps)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-4.m3u8?server=3\", \"quality\": \"4K\", \"resolution\": \"1920x1080\", \"isDefault\": false, \"status\": \"live\"}, {\"id\": \"server-4\", \"name\": \"سيرفر 4 - المصدر المباشر (RAW Satellite)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-4.m3u8?server=4\", \"quality\": \"1080p\", \"resolution\": \"1920x1080\", \"isDefault\": false, \"status\": \"live\"}, {\"id\": \"server-5\", \"name\": \"سيرفر 5 - موفر للبيانات (HEVC / FHD)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-4.m3u8?server=5\", \"quality\": \"HEVC\", \"resolution\": \"1920x1080\", \"isDefault\": false, \"status\": \"live\"}, {\"id\": \"server-6\", \"name\": \"سيرفر 6 - للإنترنت الضعيف (SD 576p)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-4.m3u8?server=6\", \"quality\": \"SD\", \"resolution\": \"720x576\", \"isDefault\": false, \"status\": \"live\"}, {\"id\": \"server-7\", \"name\": \"سيرفر 7 - فائق الدقة احتياطي (4K S2)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-4.m3u8?server=7\", \"quality\": \"4K\", \"resolution\": \"1920x1080\", \"isDefault\": false, \"status\": \"live\"}, {\"id\": \"server-8\", \"name\": \"سيرفر 8 - عالي الوضوح احتياطي (HD S2)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-4.m3u8?server=8\", \"quality\": \"HD\", \"resolution\": \"1280x720\", \"isDefault\": false, \"status\": \"live\"}]",
    "colorA": "#601977",
    "colorB": "#14041b",
    "quality": "HD",
    "streamType": "hls",
    "streamUrl": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-4.m3u8",
    "logoUrl": "https://aspreen-tv-production.up.railway.app/logos/bein-sports.png",
    "servers": [
      {
        "id": "server-1",
        "name": "سيرفر 1 - فائق الثبات وسلس (عالي الوضوح (HD 720p 60fps))",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-4.m3u8?server=1",
        "quality": "HD",
        "resolution": "1280x720",
        "isDefault": true,
        "status": "live"
      },
      {
        "id": "server-2",
        "name": "سيرفر 2 - فائق الثبات وسلس (البث الفضائي (UHD / HEVC 50fps))",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-4.m3u8?server=2",
        "quality": "UHD",
        "resolution": "1920x1080",
        "isDefault": false,
        "status": "live"
      },
      {
        "id": "server-3",
        "name": "سيرفر 3 - فائق الدقة (4K / 1080p 60fps)",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-4.m3u8?server=3",
        "quality": "4K",
        "resolution": "1920x1080",
        "isDefault": false,
        "status": "live"
      },
      {
        "id": "server-4",
        "name": "سيرفر 4 - المصدر المباشر (RAW Satellite)",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-4.m3u8?server=4",
        "quality": "1080p",
        "resolution": "1920x1080",
        "isDefault": false,
        "status": "live"
      },
      {
        "id": "server-5",
        "name": "سيرفر 5 - موفر للبيانات (HEVC / FHD)",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-4.m3u8?server=5",
        "quality": "HEVC",
        "resolution": "1920x1080",
        "isDefault": false,
        "status": "live"
      },
      {
        "id": "server-6",
        "name": "سيرفر 6 - للإنترنت الضعيف (SD 576p)",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-4.m3u8?server=6",
        "quality": "SD",
        "resolution": "720x576",
        "isDefault": false,
        "status": "live"
      },
      {
        "id": "server-7",
        "name": "سيرفر 7 - فائق الدقة احتياطي (4K S2)",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-4.m3u8?server=7",
        "quality": "4K",
        "resolution": "1920x1080",
        "isDefault": false,
        "status": "live"
      },
      {
        "id": "server-8",
        "name": "سيرفر 8 - عالي الوضوح احتياطي (HD S2)",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-4.m3u8?server=8",
        "quality": "HD",
        "resolution": "1280x720",
        "isDefault": false,
        "status": "live"
      }
    ],
    "visible": true,
    "sortOrder": 6
  },
  {
    "id": "bein-vip-bein-sports-5",
    "code": "BEIN-VIP-BEIN-SPORTS-5",
    "nameAr": "بي إن سبورت 5",
    "nameEn": "beIN Sports 5",
    "category": "sports",
    "descriptionAr": "beIN SPORTS VIP (ملفاتك الخاصة)",
    "descriptionEn": "https://aspreen-tv-production.up.railway.app/logos/bein-sports.png",
    "nowPlayingAr": "بث مباشر 24/7",
    "nowPlayingEn": "[{\"id\": \"server-1\", \"name\": \"سيرفر 1 - فائق الثبات وسلس (عالي الوضوح (HD 720p 60fps))\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-5.m3u8?server=1\", \"quality\": \"HD\", \"resolution\": \"1280x720\", \"isDefault\": true, \"status\": \"live\"}, {\"id\": \"server-2\", \"name\": \"سيرفر 2 - فائق الثبات وسلس (البث الفضائي (UHD / HEVC 50fps))\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-5.m3u8?server=2\", \"quality\": \"UHD\", \"resolution\": \"1920x1080\", \"isDefault\": false, \"status\": \"live\"}, {\"id\": \"server-3\", \"name\": \"سيرفر 3 - فائق الدقة (4K / 1080p 60fps)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-5.m3u8?server=3\", \"quality\": \"4K\", \"resolution\": \"1920x1080\", \"isDefault\": false, \"status\": \"live\"}, {\"id\": \"server-4\", \"name\": \"سيرفر 4 - المصدر المباشر (RAW Satellite)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-5.m3u8?server=4\", \"quality\": \"1080p\", \"resolution\": \"1920x1080\", \"isDefault\": false, \"status\": \"live\"}, {\"id\": \"server-5\", \"name\": \"سيرفر 5 - موفر للبيانات (HEVC / FHD)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-5.m3u8?server=5\", \"quality\": \"HEVC\", \"resolution\": \"1920x1080\", \"isDefault\": false, \"status\": \"live\"}, {\"id\": \"server-6\", \"name\": \"سيرفر 6 - للإنترنت الضعيف (SD 576p)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-5.m3u8?server=6\", \"quality\": \"SD\", \"resolution\": \"720x576\", \"isDefault\": false, \"status\": \"live\"}, {\"id\": \"server-7\", \"name\": \"سيرفر 7 - فائق الدقة احتياطي (4K S2)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-5.m3u8?server=7\", \"quality\": \"4K\", \"resolution\": \"1920x1080\", \"isDefault\": false, \"status\": \"live\"}, {\"id\": \"server-8\", \"name\": \"سيرفر 8 - عالي الوضوح احتياطي (HD S2)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-5.m3u8?server=8\", \"quality\": \"HD\", \"resolution\": \"1280x720\", \"isDefault\": false, \"status\": \"live\"}]",
    "colorA": "#601977",
    "colorB": "#14041b",
    "quality": "HD",
    "streamType": "hls",
    "streamUrl": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-5.m3u8",
    "logoUrl": "https://aspreen-tv-production.up.railway.app/logos/bein-sports.png",
    "servers": [
      {
        "id": "server-1",
        "name": "سيرفر 1 - فائق الثبات وسلس (عالي الوضوح (HD 720p 60fps))",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-5.m3u8?server=1",
        "quality": "HD",
        "resolution": "1280x720",
        "isDefault": true,
        "status": "live"
      },
      {
        "id": "server-2",
        "name": "سيرفر 2 - فائق الثبات وسلس (البث الفضائي (UHD / HEVC 50fps))",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-5.m3u8?server=2",
        "quality": "UHD",
        "resolution": "1920x1080",
        "isDefault": false,
        "status": "live"
      },
      {
        "id": "server-3",
        "name": "سيرفر 3 - فائق الدقة (4K / 1080p 60fps)",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-5.m3u8?server=3",
        "quality": "4K",
        "resolution": "1920x1080",
        "isDefault": false,
        "status": "live"
      },
      {
        "id": "server-4",
        "name": "سيرفر 4 - المصدر المباشر (RAW Satellite)",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-5.m3u8?server=4",
        "quality": "1080p",
        "resolution": "1920x1080",
        "isDefault": false,
        "status": "live"
      },
      {
        "id": "server-5",
        "name": "سيرفر 5 - موفر للبيانات (HEVC / FHD)",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-5.m3u8?server=5",
        "quality": "HEVC",
        "resolution": "1920x1080",
        "isDefault": false,
        "status": "live"
      },
      {
        "id": "server-6",
        "name": "سيرفر 6 - للإنترنت الضعيف (SD 576p)",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-5.m3u8?server=6",
        "quality": "SD",
        "resolution": "720x576",
        "isDefault": false,
        "status": "live"
      },
      {
        "id": "server-7",
        "name": "سيرفر 7 - فائق الدقة احتياطي (4K S2)",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-5.m3u8?server=7",
        "quality": "4K",
        "resolution": "1920x1080",
        "isDefault": false,
        "status": "live"
      },
      {
        "id": "server-8",
        "name": "سيرفر 8 - عالي الوضوح احتياطي (HD S2)",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-5.m3u8?server=8",
        "quality": "HD",
        "resolution": "1280x720",
        "isDefault": false,
        "status": "live"
      }
    ],
    "visible": true,
    "sortOrder": 7
  },
  {
    "id": "bein-vip-bein-sports-6",
    "code": "BEIN-VIP-BEIN-SPORTS-6",
    "nameAr": "بي إن سبورت 6",
    "nameEn": "beIN Sports 6",
    "category": "sports",
    "descriptionAr": "beIN SPORTS VIP (ملفاتك الخاصة)",
    "descriptionEn": "https://aspreen-tv-production.up.railway.app/logos/bein-sports.png",
    "nowPlayingAr": "بث مباشر 24/7",
    "nowPlayingEn": "[{\"id\": \"server-1\", \"name\": \"سيرفر 1 - فائق الثبات وسلس (عالي الوضوح (HD 720p 60fps))\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-6.m3u8?server=1\", \"quality\": \"HD\", \"resolution\": \"1280x720\", \"isDefault\": true, \"status\": \"live\"}, {\"id\": \"server-2\", \"name\": \"سيرفر 2 - فائق الثبات وسلس (البث الفضائي (UHD / HEVC 50fps))\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-6.m3u8?server=2\", \"quality\": \"UHD\", \"resolution\": \"1920x1080\", \"isDefault\": false, \"status\": \"live\"}, {\"id\": \"server-3\", \"name\": \"سيرفر 3 - فائق الدقة (4K / 1080p 60fps)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-6.m3u8?server=3\", \"quality\": \"4K\", \"resolution\": \"1920x1080\", \"isDefault\": false, \"status\": \"live\"}, {\"id\": \"server-4\", \"name\": \"سيرفر 4 - المصدر المباشر (RAW Satellite)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-6.m3u8?server=4\", \"quality\": \"1080p\", \"resolution\": \"1920x1080\", \"isDefault\": false, \"status\": \"live\"}, {\"id\": \"server-5\", \"name\": \"سيرفر 5 - موفر للبيانات (HEVC / FHD)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-6.m3u8?server=5\", \"quality\": \"HEVC\", \"resolution\": \"1920x1080\", \"isDefault\": false, \"status\": \"live\"}, {\"id\": \"server-6\", \"name\": \"سيرفر 6 - للإنترنت الضعيف (SD 576p)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-6.m3u8?server=6\", \"quality\": \"SD\", \"resolution\": \"720x576\", \"isDefault\": false, \"status\": \"live\"}, {\"id\": \"server-7\", \"name\": \"سيرفر 7 - فائق الدقة احتياطي (4K S2)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-6.m3u8?server=7\", \"quality\": \"4K\", \"resolution\": \"1920x1080\", \"isDefault\": false, \"status\": \"live\"}, {\"id\": \"server-8\", \"name\": \"سيرفر 8 - عالي الوضوح احتياطي (HD S2)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-6.m3u8?server=8\", \"quality\": \"HD\", \"resolution\": \"1280x720\", \"isDefault\": false, \"status\": \"live\"}]",
    "colorA": "#601977",
    "colorB": "#14041b",
    "quality": "HD",
    "streamType": "hls",
    "streamUrl": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-6.m3u8",
    "logoUrl": "https://aspreen-tv-production.up.railway.app/logos/bein-sports.png",
    "servers": [
      {
        "id": "server-1",
        "name": "سيرفر 1 - فائق الثبات وسلس (عالي الوضوح (HD 720p 60fps))",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-6.m3u8?server=1",
        "quality": "HD",
        "resolution": "1280x720",
        "isDefault": true,
        "status": "live"
      },
      {
        "id": "server-2",
        "name": "سيرفر 2 - فائق الثبات وسلس (البث الفضائي (UHD / HEVC 50fps))",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-6.m3u8?server=2",
        "quality": "UHD",
        "resolution": "1920x1080",
        "isDefault": false,
        "status": "live"
      },
      {
        "id": "server-3",
        "name": "سيرفر 3 - فائق الدقة (4K / 1080p 60fps)",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-6.m3u8?server=3",
        "quality": "4K",
        "resolution": "1920x1080",
        "isDefault": false,
        "status": "live"
      },
      {
        "id": "server-4",
        "name": "سيرفر 4 - المصدر المباشر (RAW Satellite)",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-6.m3u8?server=4",
        "quality": "1080p",
        "resolution": "1920x1080",
        "isDefault": false,
        "status": "live"
      },
      {
        "id": "server-5",
        "name": "سيرفر 5 - موفر للبيانات (HEVC / FHD)",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-6.m3u8?server=5",
        "quality": "HEVC",
        "resolution": "1920x1080",
        "isDefault": false,
        "status": "live"
      },
      {
        "id": "server-6",
        "name": "سيرفر 6 - للإنترنت الضعيف (SD 576p)",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-6.m3u8?server=6",
        "quality": "SD",
        "resolution": "720x576",
        "isDefault": false,
        "status": "live"
      },
      {
        "id": "server-7",
        "name": "سيرفر 7 - فائق الدقة احتياطي (4K S2)",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-6.m3u8?server=7",
        "quality": "4K",
        "resolution": "1920x1080",
        "isDefault": false,
        "status": "live"
      },
      {
        "id": "server-8",
        "name": "سيرفر 8 - عالي الوضوح احتياطي (HD S2)",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-6.m3u8?server=8",
        "quality": "HD",
        "resolution": "1280x720",
        "isDefault": false,
        "status": "live"
      }
    ],
    "visible": true,
    "sortOrder": 8
  },
  {
    "id": "bein-vip-bein-sports-7",
    "code": "BEIN-VIP-BEIN-SPORTS-7",
    "nameAr": "بي إن سبورت 7",
    "nameEn": "beIN Sports 7",
    "category": "sports",
    "descriptionAr": "beIN SPORTS VIP (ملفاتك الخاصة)",
    "descriptionEn": "https://aspreen-tv-production.up.railway.app/logos/bein-sports.png",
    "nowPlayingAr": "بث مباشر 24/7",
    "nowPlayingEn": "[{\"id\": \"server-1\", \"name\": \"سيرفر 1 - فائق الثبات وسلس (عالي الوضوح (HD 720p 60fps))\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-7.m3u8?server=1\", \"quality\": \"HD\", \"resolution\": \"1280x720\", \"isDefault\": true, \"status\": \"live\"}, {\"id\": \"server-2\", \"name\": \"سيرفر 2 - فائق الثبات وسلس (البث الفضائي (UHD / HEVC 50fps))\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-7.m3u8?server=2\", \"quality\": \"UHD\", \"resolution\": \"1920x1080\", \"isDefault\": false, \"status\": \"live\"}, {\"id\": \"server-3\", \"name\": \"سيرفر 3 - فائق الدقة (4K / 1080p 60fps)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-7.m3u8?server=3\", \"quality\": \"4K\", \"resolution\": \"1920x1080\", \"isDefault\": false, \"status\": \"live\"}, {\"id\": \"server-4\", \"name\": \"سيرفر 4 - المصدر المباشر (RAW Satellite)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-7.m3u8?server=4\", \"quality\": \"1080p\", \"resolution\": \"1920x1080\", \"isDefault\": false, \"status\": \"live\"}, {\"id\": \"server-5\", \"name\": \"سيرفر 5 - موفر للبيانات (HEVC / FHD)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-7.m3u8?server=5\", \"quality\": \"HEVC\", \"resolution\": \"1920x1080\", \"isDefault\": false, \"status\": \"live\"}, {\"id\": \"server-6\", \"name\": \"سيرفر 6 - للإنترنت الضعيف (SD 576p)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-7.m3u8?server=6\", \"quality\": \"SD\", \"resolution\": \"720x576\", \"isDefault\": false, \"status\": \"live\"}, {\"id\": \"server-7\", \"name\": \"سيرفر 7 - فائق الدقة احتياطي (4K S2)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-7.m3u8?server=7\", \"quality\": \"4K\", \"resolution\": \"1920x1080\", \"isDefault\": false, \"status\": \"live\"}, {\"id\": \"server-8\", \"name\": \"سيرفر 8 - عالي الوضوح احتياطي (HD S2)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-7.m3u8?server=8\", \"quality\": \"HD\", \"resolution\": \"1280x720\", \"isDefault\": false, \"status\": \"live\"}]",
    "colorA": "#601977",
    "colorB": "#14041b",
    "quality": "HD",
    "streamType": "hls",
    "streamUrl": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-7.m3u8",
    "logoUrl": "https://aspreen-tv-production.up.railway.app/logos/bein-sports.png",
    "servers": [
      {
        "id": "server-1",
        "name": "سيرفر 1 - فائق الثبات وسلس (عالي الوضوح (HD 720p 60fps))",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-7.m3u8?server=1",
        "quality": "HD",
        "resolution": "1280x720",
        "isDefault": true,
        "status": "live"
      },
      {
        "id": "server-2",
        "name": "سيرفر 2 - فائق الثبات وسلس (البث الفضائي (UHD / HEVC 50fps))",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-7.m3u8?server=2",
        "quality": "UHD",
        "resolution": "1920x1080",
        "isDefault": false,
        "status": "live"
      },
      {
        "id": "server-3",
        "name": "سيرفر 3 - فائق الدقة (4K / 1080p 60fps)",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-7.m3u8?server=3",
        "quality": "4K",
        "resolution": "1920x1080",
        "isDefault": false,
        "status": "live"
      },
      {
        "id": "server-4",
        "name": "سيرفر 4 - المصدر المباشر (RAW Satellite)",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-7.m3u8?server=4",
        "quality": "1080p",
        "resolution": "1920x1080",
        "isDefault": false,
        "status": "live"
      },
      {
        "id": "server-5",
        "name": "سيرفر 5 - موفر للبيانات (HEVC / FHD)",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-7.m3u8?server=5",
        "quality": "HEVC",
        "resolution": "1920x1080",
        "isDefault": false,
        "status": "live"
      },
      {
        "id": "server-6",
        "name": "سيرفر 6 - للإنترنت الضعيف (SD 576p)",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-7.m3u8?server=6",
        "quality": "SD",
        "resolution": "720x576",
        "isDefault": false,
        "status": "live"
      },
      {
        "id": "server-7",
        "name": "سيرفر 7 - فائق الدقة احتياطي (4K S2)",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-7.m3u8?server=7",
        "quality": "4K",
        "resolution": "1920x1080",
        "isDefault": false,
        "status": "live"
      },
      {
        "id": "server-8",
        "name": "سيرفر 8 - عالي الوضوح احتياطي (HD S2)",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-7.m3u8?server=8",
        "quality": "HD",
        "resolution": "1280x720",
        "isDefault": false,
        "status": "live"
      }
    ],
    "visible": true,
    "sortOrder": 9
  },
  {
    "id": "bein-vip-bein-sports-8",
    "code": "BEIN-VIP-BEIN-SPORTS-8",
    "nameAr": "بي إن سبورت 8",
    "nameEn": "beIN Sports 8",
    "category": "sports",
    "descriptionAr": "beIN SPORTS VIP (ملفاتك الخاصة)",
    "descriptionEn": "https://aspreen-tv-production.up.railway.app/logos/bein-sports.png",
    "nowPlayingAr": "بث مباشر 24/7",
    "nowPlayingEn": "[{\"id\": \"server-1\", \"name\": \"سيرفر 1 - فائق الثبات وسلس (عالي الوضوح (HD 720p 60fps))\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-8.m3u8?server=1\", \"quality\": \"HD\", \"resolution\": \"1280x720\", \"isDefault\": true, \"status\": \"live\"}, {\"id\": \"server-2\", \"name\": \"سيرفر 2 - فائق الثبات وسلس (البث الفضائي (UHD / HEVC 50fps))\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-8.m3u8?server=2\", \"quality\": \"UHD\", \"resolution\": \"1920x1080\", \"isDefault\": false, \"status\": \"live\"}, {\"id\": \"server-3\", \"name\": \"سيرفر 3 - فائق الدقة (4K / 1080p 60fps)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-8.m3u8?server=3\", \"quality\": \"4K\", \"resolution\": \"1920x1080\", \"isDefault\": false, \"status\": \"live\"}, {\"id\": \"server-4\", \"name\": \"سيرفر 4 - المصدر المباشر (RAW Satellite)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-8.m3u8?server=4\", \"quality\": \"1080p\", \"resolution\": \"1920x1080\", \"isDefault\": false, \"status\": \"live\"}, {\"id\": \"server-5\", \"name\": \"سيرفر 5 - موفر للبيانات (HEVC / FHD)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-8.m3u8?server=5\", \"quality\": \"HEVC\", \"resolution\": \"1920x1080\", \"isDefault\": false, \"status\": \"live\"}, {\"id\": \"server-6\", \"name\": \"سيرفر 6 - للإنترنت الضعيف (SD 576p)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-8.m3u8?server=6\", \"quality\": \"SD\", \"resolution\": \"720x576\", \"isDefault\": false, \"status\": \"live\"}, {\"id\": \"server-7\", \"name\": \"سيرفر 7 - فائق الدقة احتياطي (4K S2)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-8.m3u8?server=7\", \"quality\": \"4K\", \"resolution\": \"1920x1080\", \"isDefault\": false, \"status\": \"live\"}, {\"id\": \"server-8\", \"name\": \"سيرفر 8 - عالي الوضوح احتياطي (HD S2)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-8.m3u8?server=8\", \"quality\": \"HD\", \"resolution\": \"1280x720\", \"isDefault\": false, \"status\": \"live\"}]",
    "colorA": "#601977",
    "colorB": "#14041b",
    "quality": "HD",
    "streamType": "hls",
    "streamUrl": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-8.m3u8",
    "logoUrl": "https://aspreen-tv-production.up.railway.app/logos/bein-sports.png",
    "servers": [
      {
        "id": "server-1",
        "name": "سيرفر 1 - فائق الثبات وسلس (عالي الوضوح (HD 720p 60fps))",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-8.m3u8?server=1",
        "quality": "HD",
        "resolution": "1280x720",
        "isDefault": true,
        "status": "live"
      },
      {
        "id": "server-2",
        "name": "سيرفر 2 - فائق الثبات وسلس (البث الفضائي (UHD / HEVC 50fps))",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-8.m3u8?server=2",
        "quality": "UHD",
        "resolution": "1920x1080",
        "isDefault": false,
        "status": "live"
      },
      {
        "id": "server-3",
        "name": "سيرفر 3 - فائق الدقة (4K / 1080p 60fps)",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-8.m3u8?server=3",
        "quality": "4K",
        "resolution": "1920x1080",
        "isDefault": false,
        "status": "live"
      },
      {
        "id": "server-4",
        "name": "سيرفر 4 - المصدر المباشر (RAW Satellite)",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-8.m3u8?server=4",
        "quality": "1080p",
        "resolution": "1920x1080",
        "isDefault": false,
        "status": "live"
      },
      {
        "id": "server-5",
        "name": "سيرفر 5 - موفر للبيانات (HEVC / FHD)",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-8.m3u8?server=5",
        "quality": "HEVC",
        "resolution": "1920x1080",
        "isDefault": false,
        "status": "live"
      },
      {
        "id": "server-6",
        "name": "سيرفر 6 - للإنترنت الضعيف (SD 576p)",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-8.m3u8?server=6",
        "quality": "SD",
        "resolution": "720x576",
        "isDefault": false,
        "status": "live"
      },
      {
        "id": "server-7",
        "name": "سيرفر 7 - فائق الدقة احتياطي (4K S2)",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-8.m3u8?server=7",
        "quality": "4K",
        "resolution": "1920x1080",
        "isDefault": false,
        "status": "live"
      },
      {
        "id": "server-8",
        "name": "سيرفر 8 - عالي الوضوح احتياطي (HD S2)",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-8.m3u8?server=8",
        "quality": "HD",
        "resolution": "1280x720",
        "isDefault": false,
        "status": "live"
      }
    ],
    "visible": true,
    "sortOrder": 10
  },
  {
    "id": "bein-vip-bein-sports-9",
    "code": "BEIN-VIP-BEIN-SPORTS-9",
    "nameAr": "بي إن سبورت 9",
    "nameEn": "beIN Sports 9",
    "category": "sports",
    "descriptionAr": "beIN SPORTS VIP (ملفاتك الخاصة)",
    "descriptionEn": "https://aspreen-tv-production.up.railway.app/logos/bein-sports.png",
    "nowPlayingAr": "بث مباشر 24/7",
    "nowPlayingEn": "[{\"id\": \"server-1\", \"name\": \"سيرفر 1 - فائق الثبات وسلس (عالي الوضوح (HD 720p 60fps))\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-9.m3u8?server=1\", \"quality\": \"HD\", \"resolution\": \"1280x720\", \"isDefault\": true, \"status\": \"live\"}, {\"id\": \"server-2\", \"name\": \"سيرفر 2 - فائق الثبات وسلس (البث الفضائي (UHD / HEVC 50fps))\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-9.m3u8?server=2\", \"quality\": \"UHD\", \"resolution\": \"1920x1080\", \"isDefault\": false, \"status\": \"live\"}, {\"id\": \"server-3\", \"name\": \"سيرفر 3 - فائق الدقة (4K / 1080p 60fps)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-9.m3u8?server=3\", \"quality\": \"4K\", \"resolution\": \"1920x1080\", \"isDefault\": false, \"status\": \"live\"}, {\"id\": \"server-4\", \"name\": \"سيرفر 4 - المصدر المباشر (RAW Satellite)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-9.m3u8?server=4\", \"quality\": \"1080p\", \"resolution\": \"1920x1080\", \"isDefault\": false, \"status\": \"live\"}, {\"id\": \"server-5\", \"name\": \"سيرفر 5 - موفر للبيانات (HEVC / FHD)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-9.m3u8?server=5\", \"quality\": \"HEVC\", \"resolution\": \"1920x1080\", \"isDefault\": false, \"status\": \"live\"}, {\"id\": \"server-6\", \"name\": \"سيرفر 6 - للإنترنت الضعيف (SD 576p)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-9.m3u8?server=6\", \"quality\": \"SD\", \"resolution\": \"720x576\", \"isDefault\": false, \"status\": \"live\"}, {\"id\": \"server-7\", \"name\": \"سيرفر 7 - فائق الدقة احتياطي (4K S2)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-9.m3u8?server=7\", \"quality\": \"4K\", \"resolution\": \"1920x1080\", \"isDefault\": false, \"status\": \"live\"}, {\"id\": \"server-8\", \"name\": \"سيرفر 8 - عالي الوضوح احتياطي (HD S2)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-9.m3u8?server=8\", \"quality\": \"HD\", \"resolution\": \"1280x720\", \"isDefault\": false, \"status\": \"live\"}]",
    "colorA": "#601977",
    "colorB": "#14041b",
    "quality": "HD",
    "streamType": "hls",
    "streamUrl": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-9.m3u8",
    "logoUrl": "https://aspreen-tv-production.up.railway.app/logos/bein-sports.png",
    "servers": [
      {
        "id": "server-1",
        "name": "سيرفر 1 - فائق الثبات وسلس (عالي الوضوح (HD 720p 60fps))",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-9.m3u8?server=1",
        "quality": "HD",
        "resolution": "1280x720",
        "isDefault": true,
        "status": "live"
      },
      {
        "id": "server-2",
        "name": "سيرفر 2 - فائق الثبات وسلس (البث الفضائي (UHD / HEVC 50fps))",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-9.m3u8?server=2",
        "quality": "UHD",
        "resolution": "1920x1080",
        "isDefault": false,
        "status": "live"
      },
      {
        "id": "server-3",
        "name": "سيرفر 3 - فائق الدقة (4K / 1080p 60fps)",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-9.m3u8?server=3",
        "quality": "4K",
        "resolution": "1920x1080",
        "isDefault": false,
        "status": "live"
      },
      {
        "id": "server-4",
        "name": "سيرفر 4 - المصدر المباشر (RAW Satellite)",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-9.m3u8?server=4",
        "quality": "1080p",
        "resolution": "1920x1080",
        "isDefault": false,
        "status": "live"
      },
      {
        "id": "server-5",
        "name": "سيرفر 5 - موفر للبيانات (HEVC / FHD)",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-9.m3u8?server=5",
        "quality": "HEVC",
        "resolution": "1920x1080",
        "isDefault": false,
        "status": "live"
      },
      {
        "id": "server-6",
        "name": "سيرفر 6 - للإنترنت الضعيف (SD 576p)",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-9.m3u8?server=6",
        "quality": "SD",
        "resolution": "720x576",
        "isDefault": false,
        "status": "live"
      },
      {
        "id": "server-7",
        "name": "سيرفر 7 - فائق الدقة احتياطي (4K S2)",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-9.m3u8?server=7",
        "quality": "4K",
        "resolution": "1920x1080",
        "isDefault": false,
        "status": "live"
      },
      {
        "id": "server-8",
        "name": "سيرفر 8 - عالي الوضوح احتياطي (HD S2)",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-9.m3u8?server=8",
        "quality": "HD",
        "resolution": "1280x720",
        "isDefault": false,
        "status": "live"
      }
    ],
    "visible": true,
    "sortOrder": 11
  },
  {
    "id": "bein-vip-bein-sports-afc",
    "code": "BEIN-VIP-BEIN-SPORTS-AFC",
    "nameAr": "بي إن سبورت آسيا",
    "nameEn": "beIN Sports AFC",
    "category": "sports",
    "descriptionAr": "beIN SPORTS VIP (ملفاتك الخاصة)",
    "descriptionEn": "https://aspreen-tv-production.up.railway.app/logos/bein-sports.png",
    "nowPlayingAr": "بث مباشر 24/7",
    "nowPlayingEn": "[{\"id\": \"server-1\", \"name\": \"سيرفر 1 - فائق الثبات وسلس (BEIN SPORTS AFC HD)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-afc.m3u8?server=1\", \"quality\": \"HD\", \"resolution\": \"1280x720\", \"isDefault\": true, \"status\": \"live\"}, {\"id\": \"server-2\", \"name\": \"سيرفر 2 - BEIN SPORTS AFC 4K\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-afc.m3u8?server=2\", \"quality\": \"4K\", \"resolution\": \"1920x1080\", \"isDefault\": false, \"status\": \"live\"}, {\"id\": \"server-3\", \"name\": \"سيرفر 3 - BEIN SPORTS AFC\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-afc.m3u8?server=3\", \"quality\": \"SD\", \"resolution\": \"720x576\", \"isDefault\": false, \"status\": \"live\"}]",
    "colorA": "#601977",
    "colorB": "#14041b",
    "quality": "HD",
    "streamType": "hls",
    "streamUrl": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-afc.m3u8",
    "logoUrl": "https://aspreen-tv-production.up.railway.app/logos/bein-sports.png",
    "servers": [
      {
        "id": "server-1",
        "name": "سيرفر 1 - فائق الثبات وسلس (BEIN SPORTS AFC HD)",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-afc.m3u8?server=1",
        "quality": "HD",
        "resolution": "1280x720",
        "isDefault": true,
        "status": "live"
      },
      {
        "id": "server-2",
        "name": "سيرفر 2 - BEIN SPORTS AFC 4K",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-afc.m3u8?server=2",
        "quality": "4K",
        "resolution": "1920x1080",
        "isDefault": false,
        "status": "live"
      },
      {
        "id": "server-3",
        "name": "سيرفر 3 - BEIN SPORTS AFC",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-afc.m3u8?server=3",
        "quality": "SD",
        "resolution": "720x576",
        "isDefault": false,
        "status": "live"
      }
    ],
    "visible": true,
    "sortOrder": 12
  },
  {
    "id": "bein-vip-bein-sports-afc-1",
    "code": "BEIN-VIP-BEIN-SPORTS-AFC-1",
    "nameAr": "بي إن سبورت آسيا 1",
    "nameEn": "beIN Sports AFC 1",
    "category": "sports",
    "descriptionAr": "beIN SPORTS VIP (ملفاتك الخاصة)",
    "descriptionEn": "https://aspreen-tv-production.up.railway.app/logos/bein-sports.png",
    "nowPlayingAr": "بث مباشر 24/7",
    "nowPlayingEn": "[{\"id\": \"server-1\", \"name\": \"سيرفر 1 - فائق الثبات وسلس (BEIN SPORTS AFC 1 HD)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-afc-1.m3u8?server=1\", \"quality\": \"HD\", \"resolution\": \"1280x720\", \"isDefault\": true, \"status\": \"live\"}, {\"id\": \"server-2\", \"name\": \"سيرفر 2 - BEIN SPORTS AFC 1 4K\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-afc-1.m3u8?server=2\", \"quality\": \"4K\", \"resolution\": \"1920x1080\", \"isDefault\": false, \"status\": \"live\"}]",
    "colorA": "#601977",
    "colorB": "#14041b",
    "quality": "HD",
    "streamType": "hls",
    "streamUrl": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-afc-1.m3u8",
    "logoUrl": "https://aspreen-tv-production.up.railway.app/logos/bein-sports.png",
    "servers": [
      {
        "id": "server-1",
        "name": "سيرفر 1 - فائق الثبات وسلس (BEIN SPORTS AFC 1 HD)",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-afc-1.m3u8?server=1",
        "quality": "HD",
        "resolution": "1280x720",
        "isDefault": true,
        "status": "live"
      },
      {
        "id": "server-2",
        "name": "سيرفر 2 - BEIN SPORTS AFC 1 4K",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-afc-1.m3u8?server=2",
        "quality": "4K",
        "resolution": "1920x1080",
        "isDefault": false,
        "status": "live"
      }
    ],
    "visible": true,
    "sortOrder": 13
  },
  {
    "id": "bein-vip-bein-sports-1-afc",
    "code": "BEIN-VIP-BEIN-SPORTS-1-AFC",
    "nameAr": "بي إن سبورت آسيا 1",
    "nameEn": "beIN Sports AFC 1",
    "category": "sports",
    "descriptionAr": "beIN SPORTS VIP (ملفاتك الخاصة)",
    "descriptionEn": "https://aspreen-tv-production.up.railway.app/logos/bein-sports.png",
    "nowPlayingAr": "بث مباشر 24/7",
    "nowPlayingEn": "[{\"id\": \"server-1\", \"name\": \"سيرفر 1 - فائق الثبات وسلس (BEIN SPORTS AFC 1 HD)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-1-afc.m3u8?server=1\", \"quality\": \"HD\", \"resolution\": \"1280x720\", \"isDefault\": true, \"status\": \"live\"}, {\"id\": \"server-2\", \"name\": \"سيرفر 2 - BEIN SPORTS AFC 1 4K\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-1-afc.m3u8?server=2\", \"quality\": \"4K\", \"resolution\": \"1920x1080\", \"isDefault\": false, \"status\": \"live\"}, {\"id\": \"server-3\", \"name\": \"سيرفر 3 - BEIN SPORTS 1 AFC\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-1-afc.m3u8?server=3\", \"quality\": \"SD\", \"resolution\": \"720x576\", \"isDefault\": false, \"status\": \"live\"}]",
    "colorA": "#601977",
    "colorB": "#14041b",
    "quality": "HD",
    "streamType": "hls",
    "streamUrl": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-1-afc.m3u8",
    "logoUrl": "https://aspreen-tv-production.up.railway.app/logos/bein-sports.png",
    "servers": [
      {
        "id": "server-1",
        "name": "سيرفر 1 - فائق الثبات وسلس (BEIN SPORTS AFC 1 HD)",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-1-afc.m3u8?server=1",
        "quality": "HD",
        "resolution": "1280x720",
        "isDefault": true,
        "status": "live"
      },
      {
        "id": "server-2",
        "name": "سيرفر 2 - BEIN SPORTS AFC 1 4K",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-1-afc.m3u8?server=2",
        "quality": "4K",
        "resolution": "1920x1080",
        "isDefault": false,
        "status": "live"
      },
      {
        "id": "server-3",
        "name": "سيرفر 3 - BEIN SPORTS 1 AFC",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-1-afc.m3u8?server=3",
        "quality": "SD",
        "resolution": "720x576",
        "isDefault": false,
        "status": "live"
      }
    ],
    "visible": true,
    "sortOrder": 14
  },
  {
    "id": "bein-vip-bein-sports-2-afc",
    "code": "BEIN-VIP-BEIN-SPORTS-2-AFC",
    "nameAr": "بي إن سبورت آسيا 2",
    "nameEn": "beIN Sports AFC 2",
    "category": "sports",
    "descriptionAr": "beIN SPORTS VIP (ملفاتك الخاصة)",
    "descriptionEn": "https://aspreen-tv-production.up.railway.app/logos/bein-sports.png",
    "nowPlayingAr": "بث مباشر 24/7",
    "nowPlayingEn": "[{\"id\": \"server-1\", \"name\": \"سيرفر 1 - فائق الثبات وسلس (BEIN SPORTS 2 AFC HD)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-2-afc.m3u8?server=1\", \"quality\": \"HD\", \"resolution\": \"1280x720\", \"isDefault\": true, \"status\": \"live\"}, {\"id\": \"server-2\", \"name\": \"سيرفر 2 - BEIN SPORTS 2 AFC 4K\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-2-afc.m3u8?server=2\", \"quality\": \"4K\", \"resolution\": \"1920x1080\", \"isDefault\": false, \"status\": \"live\"}, {\"id\": \"server-3\", \"name\": \"سيرفر 3 - BEIN SPORTS 2 AFC\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-2-afc.m3u8?server=3\", \"quality\": \"SD\", \"resolution\": \"720x576\", \"isDefault\": false, \"status\": \"live\"}]",
    "colorA": "#601977",
    "colorB": "#14041b",
    "quality": "HD",
    "streamType": "hls",
    "streamUrl": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-2-afc.m3u8",
    "logoUrl": "https://aspreen-tv-production.up.railway.app/logos/bein-sports.png",
    "servers": [
      {
        "id": "server-1",
        "name": "سيرفر 1 - فائق الثبات وسلس (BEIN SPORTS 2 AFC HD)",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-2-afc.m3u8?server=1",
        "quality": "HD",
        "resolution": "1280x720",
        "isDefault": true,
        "status": "live"
      },
      {
        "id": "server-2",
        "name": "سيرفر 2 - BEIN SPORTS 2 AFC 4K",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-2-afc.m3u8?server=2",
        "quality": "4K",
        "resolution": "1920x1080",
        "isDefault": false,
        "status": "live"
      },
      {
        "id": "server-3",
        "name": "سيرفر 3 - BEIN SPORTS 2 AFC",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-2-afc.m3u8?server=3",
        "quality": "SD",
        "resolution": "720x576",
        "isDefault": false,
        "status": "live"
      }
    ],
    "visible": true,
    "sortOrder": 15
  },
  {
    "id": "bein-vip-bein-sports-3-afc",
    "code": "BEIN-VIP-BEIN-SPORTS-3-AFC",
    "nameAr": "بي إن سبورت آسيا 3",
    "nameEn": "beIN Sports AFC 3",
    "category": "sports",
    "descriptionAr": "beIN SPORTS VIP (ملفاتك الخاصة)",
    "descriptionEn": "https://aspreen-tv-production.up.railway.app/logos/bein-sports.png",
    "nowPlayingAr": "بث مباشر 24/7",
    "nowPlayingEn": "[{\"id\": \"server-1\", \"name\": \"سيرفر 1 - فائق الثبات وسلس (BEIN SPORTS 3 AFC HD)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-3-afc.m3u8?server=1\", \"quality\": \"HD\", \"resolution\": \"1280x720\", \"isDefault\": true, \"status\": \"live\"}, {\"id\": \"server-2\", \"name\": \"سيرفر 2 - BEIN SPORTS 3 AFC 4K\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-3-afc.m3u8?server=2\", \"quality\": \"4K\", \"resolution\": \"1920x1080\", \"isDefault\": false, \"status\": \"live\"}, {\"id\": \"server-3\", \"name\": \"سيرفر 3 - BEIN SPORTS 3 AFC\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-3-afc.m3u8?server=3\", \"quality\": \"SD\", \"resolution\": \"720x576\", \"isDefault\": false, \"status\": \"live\"}]",
    "colorA": "#601977",
    "colorB": "#14041b",
    "quality": "HD",
    "streamType": "hls",
    "streamUrl": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-3-afc.m3u8",
    "logoUrl": "https://aspreen-tv-production.up.railway.app/logos/bein-sports.png",
    "servers": [
      {
        "id": "server-1",
        "name": "سيرفر 1 - فائق الثبات وسلس (BEIN SPORTS 3 AFC HD)",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-3-afc.m3u8?server=1",
        "quality": "HD",
        "resolution": "1280x720",
        "isDefault": true,
        "status": "live"
      },
      {
        "id": "server-2",
        "name": "سيرفر 2 - BEIN SPORTS 3 AFC 4K",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-3-afc.m3u8?server=2",
        "quality": "4K",
        "resolution": "1920x1080",
        "isDefault": false,
        "status": "live"
      },
      {
        "id": "server-3",
        "name": "سيرفر 3 - BEIN SPORTS 3 AFC",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-3-afc.m3u8?server=3",
        "quality": "SD",
        "resolution": "720x576",
        "isDefault": false,
        "status": "live"
      }
    ],
    "visible": true,
    "sortOrder": 16
  },
  {
    "id": "bein-vip-bein-sports-afc-4",
    "code": "BEIN-VIP-BEIN-SPORTS-AFC-4",
    "nameAr": "بي إن سبورت آسيا 4",
    "nameEn": "beIN Sports AFC 4",
    "category": "sports",
    "descriptionAr": "beIN SPORTS VIP (ملفاتك الخاصة)",
    "descriptionEn": "https://aspreen-tv-production.up.railway.app/logos/bein-sports.png",
    "nowPlayingAr": "بث مباشر 24/7",
    "nowPlayingEn": "[{\"id\": \"server-1\", \"name\": \"سيرفر 1 - فائق الثبات وسلس (BEIN SPORTS AFC 4 HD)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-afc-4.m3u8?server=1\", \"quality\": \"HD\", \"resolution\": \"1280x720\", \"isDefault\": true, \"status\": \"live\"}, {\"id\": \"server-2\", \"name\": \"سيرفر 2 - BEIN SPORTS AFC 4 4K\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-afc-4.m3u8?server=2\", \"quality\": \"4K\", \"resolution\": \"1920x1080\", \"isDefault\": false, \"status\": \"live\"}, {\"id\": \"server-3\", \"name\": \"سيرفر 3 - BEIN SPORTS AFC 4\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-afc-4.m3u8?server=3\", \"quality\": \"SD\", \"resolution\": \"720x576\", \"isDefault\": false, \"status\": \"live\"}]",
    "colorA": "#601977",
    "colorB": "#14041b",
    "quality": "HD",
    "streamType": "hls",
    "streamUrl": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-afc-4.m3u8",
    "logoUrl": "https://aspreen-tv-production.up.railway.app/logos/bein-sports.png",
    "servers": [
      {
        "id": "server-1",
        "name": "سيرفر 1 - فائق الثبات وسلس (BEIN SPORTS AFC 4 HD)",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-afc-4.m3u8?server=1",
        "quality": "HD",
        "resolution": "1280x720",
        "isDefault": true,
        "status": "live"
      },
      {
        "id": "server-2",
        "name": "سيرفر 2 - BEIN SPORTS AFC 4 4K",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-afc-4.m3u8?server=2",
        "quality": "4K",
        "resolution": "1920x1080",
        "isDefault": false,
        "status": "live"
      },
      {
        "id": "server-3",
        "name": "سيرفر 3 - BEIN SPORTS AFC 4",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-afc-4.m3u8?server=3",
        "quality": "SD",
        "resolution": "720x576",
        "isDefault": false,
        "status": "live"
      }
    ],
    "visible": true,
    "sortOrder": 17
  },
  {
    "id": "bein-vip-bein-sports-afc-5",
    "code": "BEIN-VIP-BEIN-SPORTS-AFC-5",
    "nameAr": "بي إن سبورت آسيا 5",
    "nameEn": "beIN Sports AFC 5",
    "category": "sports",
    "descriptionAr": "beIN SPORTS VIP (ملفاتك الخاصة)",
    "descriptionEn": "https://aspreen-tv-production.up.railway.app/logos/bein-sports.png",
    "nowPlayingAr": "بث مباشر 24/7",
    "nowPlayingEn": "[{\"id\": \"server-1\", \"name\": \"سيرفر 1 - فائق الثبات وسلس (BEIN SPORTS AFC 5 HD)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-afc-5.m3u8?server=1\", \"quality\": \"HD\", \"resolution\": \"1280x720\", \"isDefault\": true, \"status\": \"live\"}, {\"id\": \"server-2\", \"name\": \"سيرفر 2 - BEIN SPORTS AFC 5 4K\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-afc-5.m3u8?server=2\", \"quality\": \"4K\", \"resolution\": \"1920x1080\", \"isDefault\": false, \"status\": \"live\"}, {\"id\": \"server-3\", \"name\": \"سيرفر 3 - BEIN SPORTS AFC 5\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-afc-5.m3u8?server=3\", \"quality\": \"SD\", \"resolution\": \"720x576\", \"isDefault\": false, \"status\": \"live\"}]",
    "colorA": "#601977",
    "colorB": "#14041b",
    "quality": "HD",
    "streamType": "hls",
    "streamUrl": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-afc-5.m3u8",
    "logoUrl": "https://aspreen-tv-production.up.railway.app/logos/bein-sports.png",
    "servers": [
      {
        "id": "server-1",
        "name": "سيرفر 1 - فائق الثبات وسلس (BEIN SPORTS AFC 5 HD)",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-afc-5.m3u8?server=1",
        "quality": "HD",
        "resolution": "1280x720",
        "isDefault": true,
        "status": "live"
      },
      {
        "id": "server-2",
        "name": "سيرفر 2 - BEIN SPORTS AFC 5 4K",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-afc-5.m3u8?server=2",
        "quality": "4K",
        "resolution": "1920x1080",
        "isDefault": false,
        "status": "live"
      },
      {
        "id": "server-3",
        "name": "سيرفر 3 - BEIN SPORTS AFC 5",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-afc-5.m3u8?server=3",
        "quality": "SD",
        "resolution": "720x576",
        "isDefault": false,
        "status": "live"
      }
    ],
    "visible": true,
    "sortOrder": 18
  },
  {
    "id": "bein-vip-bein-sports-1-english",
    "code": "BEIN-VIP-BEIN-SPORTS-1-ENGLISH",
    "nameAr": "بي إن سبورت الإنجليزية 1",
    "nameEn": "beIN Sports 1 English",
    "category": "sports",
    "descriptionAr": "beIN SPORTS VIP (ملفاتك الخاصة)",
    "descriptionEn": "https://aspreen-tv-production.up.railway.app/logos/bein-sports.png",
    "nowPlayingAr": "بث مباشر 24/7",
    "nowPlayingEn": "[{\"id\": \"server-1\", \"name\": \"سيرفر 1 - المصدر المباشر بدون ضغط (RAW)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-1-english.m3u8?server=1\", \"quality\": \"1080p\", \"resolution\": \"1920x1080\", \"isDefault\": true, \"status\": \"live\"}]",
    "colorA": "#601977",
    "colorB": "#14041b",
    "quality": "1080p",
    "streamType": "hls",
    "streamUrl": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-1-english.m3u8",
    "logoUrl": "https://aspreen-tv-production.up.railway.app/logos/bein-sports.png",
    "servers": [
      {
        "id": "server-1",
        "name": "سيرفر 1 - المصدر المباشر بدون ضغط (RAW)",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-1-english.m3u8?server=1",
        "quality": "1080p",
        "resolution": "1920x1080",
        "isDefault": true,
        "status": "live"
      }
    ],
    "visible": true,
    "sortOrder": 19
  },
  {
    "id": "bein-vip-bein-sports-2-english",
    "code": "BEIN-VIP-BEIN-SPORTS-2-ENGLISH",
    "nameAr": "بي إن سبورت الإنجليزية 2",
    "nameEn": "beIN Sports 2 English",
    "category": "sports",
    "descriptionAr": "beIN SPORTS VIP (ملفاتك الخاصة)",
    "descriptionEn": "https://aspreen-tv-production.up.railway.app/logos/bein-sports.png",
    "nowPlayingAr": "بث مباشر 24/7",
    "nowPlayingEn": "[{\"id\": \"server-1\", \"name\": \"سيرفر 1 - المصدر المباشر بدون ضغط (RAW)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-2-english.m3u8?server=1\", \"quality\": \"1080p\", \"resolution\": \"1920x1080\", \"isDefault\": true, \"status\": \"live\"}]",
    "colorA": "#601977",
    "colorB": "#14041b",
    "quality": "1080p",
    "streamType": "hls",
    "streamUrl": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-2-english.m3u8",
    "logoUrl": "https://aspreen-tv-production.up.railway.app/logos/bein-sports.png",
    "servers": [
      {
        "id": "server-1",
        "name": "سيرفر 1 - المصدر المباشر بدون ضغط (RAW)",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-2-english.m3u8?server=1",
        "quality": "1080p",
        "resolution": "1920x1080",
        "isDefault": true,
        "status": "live"
      }
    ],
    "visible": true,
    "sortOrder": 20
  },
  {
    "id": "bein-vip-bein-sports-1-france",
    "code": "BEIN-VIP-BEIN-SPORTS-1-FRANCE",
    "nameAr": "بي إن سبورت الفرنسية 1",
    "nameEn": "beIN Sports 1 France",
    "category": "sports",
    "descriptionAr": "beIN SPORTS VIP (ملفاتك الخاصة)",
    "descriptionEn": "https://aspreen-tv-production.up.railway.app/logos/bein-sports.png",
    "nowPlayingAr": "بث مباشر 24/7",
    "nowPlayingEn": "[{\"id\": \"server-1\", \"name\": \"سيرفر 1 - المصدر المباشر بدون ضغط (RAW)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-1-france.m3u8?server=1\", \"quality\": \"1080p\", \"resolution\": \"1920x1080\", \"isDefault\": true, \"status\": \"live\"}]",
    "colorA": "#601977",
    "colorB": "#14041b",
    "quality": "1080p",
    "streamType": "hls",
    "streamUrl": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-1-france.m3u8",
    "logoUrl": "https://aspreen-tv-production.up.railway.app/logos/bein-sports.png",
    "servers": [
      {
        "id": "server-1",
        "name": "سيرفر 1 - المصدر المباشر بدون ضغط (RAW)",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-1-france.m3u8?server=1",
        "quality": "1080p",
        "resolution": "1920x1080",
        "isDefault": true,
        "status": "live"
      }
    ],
    "visible": true,
    "sortOrder": 21
  },
  {
    "id": "bein-vip-bein-sports-2-france",
    "code": "BEIN-VIP-BEIN-SPORTS-2-FRANCE",
    "nameAr": "بي إن سبورت الفرنسية 2",
    "nameEn": "beIN Sports 2 France",
    "category": "sports",
    "descriptionAr": "beIN SPORTS VIP (ملفاتك الخاصة)",
    "descriptionEn": "https://aspreen-tv-production.up.railway.app/logos/bein-sports.png",
    "nowPlayingAr": "بث مباشر 24/7",
    "nowPlayingEn": "[{\"id\": \"server-1\", \"name\": \"سيرفر 1 - المصدر المباشر بدون ضغط (RAW)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-2-france.m3u8?server=1\", \"quality\": \"1080p\", \"resolution\": \"1920x1080\", \"isDefault\": true, \"status\": \"live\"}]",
    "colorA": "#601977",
    "colorB": "#14041b",
    "quality": "1080p",
    "streamType": "hls",
    "streamUrl": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-2-france.m3u8",
    "logoUrl": "https://aspreen-tv-production.up.railway.app/logos/bein-sports.png",
    "servers": [
      {
        "id": "server-1",
        "name": "سيرفر 1 - المصدر المباشر بدون ضغط (RAW)",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-2-france.m3u8?server=1",
        "quality": "1080p",
        "resolution": "1920x1080",
        "isDefault": true,
        "status": "live"
      }
    ],
    "visible": true,
    "sortOrder": 22
  },
  {
    "id": "bein-vip-bein-sports-3-france",
    "code": "BEIN-VIP-BEIN-SPORTS-3-FRANCE",
    "nameAr": "بي إن سبورت الفرنسية 3",
    "nameEn": "beIN Sports 3 France",
    "category": "sports",
    "descriptionAr": "beIN SPORTS VIP (ملفاتك الخاصة)",
    "descriptionEn": "https://aspreen-tv-production.up.railway.app/logos/bein-sports.png",
    "nowPlayingAr": "بث مباشر 24/7",
    "nowPlayingEn": "[{\"id\": \"server-1\", \"name\": \"سيرفر 1 - المصدر المباشر بدون ضغط (RAW)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-3-france.m3u8?server=1\", \"quality\": \"1080p\", \"resolution\": \"1920x1080\", \"isDefault\": true, \"status\": \"live\"}]",
    "colorA": "#601977",
    "colorB": "#14041b",
    "quality": "1080p",
    "streamType": "hls",
    "streamUrl": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-3-france.m3u8",
    "logoUrl": "https://aspreen-tv-production.up.railway.app/logos/bein-sports.png",
    "servers": [
      {
        "id": "server-1",
        "name": "سيرفر 1 - المصدر المباشر بدون ضغط (RAW)",
        "url": "https://aspreen-tv-production.up.railway.app/live/bein-vip-bein-sports-3-france.m3u8?server=1",
        "quality": "1080p",
        "resolution": "1920x1080",
        "isDefault": true,
        "status": "live"
      }
    ],
    "visible": true,
    "sortOrder": 23
  },
  {
    "id": "tlfaz-asharq-documentary",
    "code": "TLFAZ-ASHARQ-DOCUMENTARY",
    "nameAr": "قناة الشرق الوثائقية",
    "nameEn": "قناة الشرق الوثائقية",
    "category": "documentary",
    "descriptionAr": "قنوات وثائقية",
    "descriptionEn": "https://aspreen-tv-production.up.railway.app/api/app/image-proxy?url=https%3A%2F%2Ftlfaz.com%2Fwp-content%2Fuploads%2F2023%2F03%2FAsharq-Documentary.png",
    "nowPlayingAr": "بث مباشر 24/7",
    "nowPlayingEn": "[{\"id\": \"server-1\", \"name\": \"سيرفر 1 (HLS فائق الثبات 24/7)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/tlfaz-asharq-documentary.m3u8?server=1\", \"quality\": \"1080p\", \"isDefault\": true, \"status\": \"live\"}]",
    "colorA": "#1d8a70",
    "colorB": "#041712",
    "quality": "1080p",
    "streamType": "hls",
    "streamUrl": "https://aspreen-tv-production.up.railway.app/live/tlfaz-asharq-documentary.m3u8",
    "logoUrl": "https://aspreen-tv-production.up.railway.app/api/app/image-proxy?url=https%3A%2F%2Ftlfaz.com%2Fwp-content%2Fuploads%2F2023%2F03%2FAsharq-Documentary.png",
    "servers": [
      {
        "id": "server-1",
        "name": "سيرفر 1 (HLS فائق الثبات 24/7)",
        "url": "https://aspreen-tv-production.up.railway.app/live/tlfaz-asharq-documentary.m3u8?server=1",
        "quality": "1080p",
        "isDefault": true,
        "status": "live"
      }
    ],
    "visible": true,
    "sortOrder": 24
  },
  {
    "id": "tlfaz-asharq-discovery",
    "code": "TLFAZ-ASHARQ-DISCOVERY",
    "nameAr": "قناة الشرق ديسكفري",
    "nameEn": "قناة الشرق ديسكفري",
    "category": "documentary",
    "descriptionAr": "قنوات وثائقية",
    "descriptionEn": "https://aspreen-tv-production.up.railway.app/api/app/image-proxy?url=https%3A%2F%2Ftlfaz.com%2Fwp-content%2Fuploads%2F2024%2F03%2FAsharq-Discovery.png",
    "nowPlayingAr": "بث مباشر 24/7",
    "nowPlayingEn": "[{\"id\": \"server-1\", \"name\": \"سيرفر 1 (HLS فائق الثبات 24/7)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/tlfaz-asharq-discovery.m3u8?server=1\", \"quality\": \"1080p\", \"isDefault\": true, \"status\": \"live\"}]",
    "colorA": "#1d8a70",
    "colorB": "#041712",
    "quality": "1080p",
    "streamType": "hls",
    "streamUrl": "https://aspreen-tv-production.up.railway.app/live/tlfaz-asharq-discovery.m3u8",
    "logoUrl": "https://aspreen-tv-production.up.railway.app/api/app/image-proxy?url=https%3A%2F%2Ftlfaz.com%2Fwp-content%2Fuploads%2F2024%2F03%2FAsharq-Discovery.png",
    "servers": [
      {
        "id": "server-1",
        "name": "سيرفر 1 (HLS فائق الثبات 24/7)",
        "url": "https://aspreen-tv-production.up.railway.app/live/tlfaz-asharq-discovery.m3u8?server=1",
        "quality": "1080p",
        "isDefault": true,
        "status": "live"
      }
    ],
    "visible": true,
    "sortOrder": 25
  },
  {
    "id": "tlfaz-huda-tv",
    "code": "TLFAZ-HUDA-TV",
    "nameAr": "قناة الهدى",
    "nameEn": "قناة الهدى",
    "category": "general",
    "descriptionAr": "قنوات إسلامية ودينية",
    "descriptionEn": "https://aspreen-tv-production.up.railway.app/api/app/image-proxy?url=https%3A%2F%2Ftlfaz.com%2Fwp-content%2Fuploads%2F2023%2F10%2Ficon_channel.png",
    "nowPlayingAr": "بث مباشر 24/7",
    "nowPlayingEn": "[{\"id\": \"server-1\", \"name\": \"سيرفر 1 (البث المباشر)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/tlfaz-huda-tv.m3u8?server=1\", \"quality\": \"HD\", \"isDefault\": true, \"status\": \"live\"}, {\"id\": \"server-2\", \"name\": \"سيرفر 2 (مباشر CDN)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/tlfaz-huda-tv.m3u8?server=2\", \"quality\": \"HD\", \"status\": \"live\"}]",
    "colorA": "#2b823e",
    "colorB": "#07190b",
    "quality": "HD",
    "streamType": "hls",
    "streamUrl": "https://aspreen-tv-production.up.railway.app/live/tlfaz-huda-tv.m3u8",
    "logoUrl": "https://aspreen-tv-production.up.railway.app/api/app/image-proxy?url=https%3A%2F%2Ftlfaz.com%2Fwp-content%2Fuploads%2F2023%2F10%2Ficon_channel.png",
    "servers": [
      {
        "id": "server-1",
        "name": "سيرفر 1 (البث المباشر)",
        "url": "https://aspreen-tv-production.up.railway.app/live/tlfaz-huda-tv.m3u8?server=1",
        "quality": "HD",
        "isDefault": true,
        "status": "live"
      },
      {
        "id": "server-2",
        "name": "سيرفر 2 (مباشر CDN)",
        "url": "https://aspreen-tv-production.up.railway.app/live/tlfaz-huda-tv.m3u8?server=2",
        "quality": "HD",
        "status": "live"
      }
    ],
    "visible": true,
    "sortOrder": 26
  },
  {
    "id": "tlfaz-mbc-masr-2",
    "code": "TLFAZ-MBC-MASR-2",
    "nameAr": "قناة ام بي سي مصر 2",
    "nameEn": "قناة ام بي سي مصر 2",
    "category": "general",
    "descriptionAr": "باقة قنوات MBC",
    "descriptionEn": "https://aspreen-tv-production.up.railway.app/api/app/image-proxy?url=https%3A%2F%2Ftlfaz.com%2Fwp-content%2Fuploads%2F2024%2F02%2Fmbc-masr-2.png",
    "nowPlayingAr": "بث مباشر 24/7",
    "nowPlayingEn": "[{\"id\": \"server-1\", \"name\": \"سيرفر 1 (HLS فائق الثبات 24/7)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/tlfaz-mbc-masr-2.m3u8?server=1\", \"quality\": \"1080p\", \"isDefault\": true, \"status\": \"live\"}]",
    "colorA": "#0b72be",
    "colorB": "#041424",
    "quality": "1080p",
    "streamType": "hls",
    "streamUrl": "https://aspreen-tv-production.up.railway.app/live/tlfaz-mbc-masr-2.m3u8",
    "logoUrl": "https://aspreen-tv-production.up.railway.app/api/app/image-proxy?url=https%3A%2F%2Ftlfaz.com%2Fwp-content%2Fuploads%2F2024%2F02%2Fmbc-masr-2.png",
    "servers": [
      {
        "id": "server-1",
        "name": "سيرفر 1 (HLS فائق الثبات 24/7)",
        "url": "https://aspreen-tv-production.up.railway.app/live/tlfaz-mbc-masr-2.m3u8?server=1",
        "quality": "1080p",
        "isDefault": true,
        "status": "live"
      }
    ],
    "visible": true,
    "sortOrder": 27
  },
  {
    "id": "tlfaz-mbc-iraq",
    "code": "TLFAZ-MBC-IRAQ",
    "nameAr": "قناة ام بي سي العراق",
    "nameEn": "قناة ام بي سي العراق",
    "category": "general",
    "descriptionAr": "باقة قنوات MBC",
    "descriptionEn": "https://aspreen-tv-production.up.railway.app/api/app/image-proxy?url=https%3A%2F%2Ftlfaz.com%2Fwp-content%2Fuploads%2F2023%2F03%2FMbc-IraQ.png",
    "nowPlayingAr": "بث مباشر 24/7",
    "nowPlayingEn": "[{\"id\": \"server-1\", \"name\": \"سيرفر 1 (HLS فائق الثبات 24/7)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/tlfaz-mbc-iraq.m3u8?server=1\", \"quality\": \"1080p\", \"isDefault\": true, \"status\": \"live\"}]",
    "colorA": "#0b72be",
    "colorB": "#041424",
    "quality": "1080p",
    "streamType": "hls",
    "streamUrl": "https://aspreen-tv-production.up.railway.app/live/tlfaz-mbc-iraq.m3u8",
    "logoUrl": "https://aspreen-tv-production.up.railway.app/api/app/image-proxy?url=https%3A%2F%2Ftlfaz.com%2Fwp-content%2Fuploads%2F2023%2F03%2FMbc-IraQ.png",
    "servers": [
      {
        "id": "server-1",
        "name": "سيرفر 1 (HLS فائق الثبات 24/7)",
        "url": "https://aspreen-tv-production.up.railway.app/live/tlfaz-mbc-iraq.m3u8?server=1",
        "quality": "1080p",
        "isDefault": true,
        "status": "live"
      }
    ],
    "visible": true,
    "sortOrder": 28
  },
  {
    "id": "tlfaz-mbc-masr",
    "code": "TLFAZ-MBC-MASR",
    "nameAr": "قناة ام بي سي مصر",
    "nameEn": "قناة ام بي سي مصر",
    "category": "general",
    "descriptionAr": "باقة قنوات MBC",
    "descriptionEn": "https://aspreen-tv-production.up.railway.app/api/app/image-proxy?url=https%3A%2F%2Ftlfaz.com%2Fwp-content%2Fuploads%2F2024%2F02%2Fmbc-masr.png",
    "nowPlayingAr": "بث مباشر 24/7",
    "nowPlayingEn": "[{\"id\": \"server-1\", \"name\": \"سيرفر 1 (البث المباشر)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/tlfaz-mbc-masr.m3u8?server=1\", \"quality\": \"HD\", \"isDefault\": true, \"status\": \"live\"}, {\"id\": \"server-2\", \"name\": \"سيرفر 2 (مباشر CDN)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/tlfaz-mbc-masr.m3u8?server=2\", \"quality\": \"HD\", \"status\": \"live\"}]",
    "colorA": "#0b72be",
    "colorB": "#041424",
    "quality": "HD",
    "streamType": "hls",
    "streamUrl": "https://aspreen-tv-production.up.railway.app/live/tlfaz-mbc-masr.m3u8",
    "logoUrl": "https://aspreen-tv-production.up.railway.app/api/app/image-proxy?url=https%3A%2F%2Ftlfaz.com%2Fwp-content%2Fuploads%2F2024%2F02%2Fmbc-masr.png",
    "servers": [
      {
        "id": "server-1",
        "name": "سيرفر 1 (البث المباشر)",
        "url": "https://aspreen-tv-production.up.railway.app/live/tlfaz-mbc-masr.m3u8?server=1",
        "quality": "HD",
        "isDefault": true,
        "status": "live"
      },
      {
        "id": "server-2",
        "name": "سيرفر 2 (مباشر CDN)",
        "url": "https://aspreen-tv-production.up.railway.app/live/tlfaz-mbc-masr.m3u8?server=2",
        "quality": "HD",
        "status": "live"
      }
    ],
    "visible": true,
    "sortOrder": 29
  },
  {
    "id": "tlfaz-mbc5",
    "code": "TLFAZ-MBC5",
    "nameAr": "قناة إم بي سي 5 (Mbc5)",
    "nameEn": "قناة إم بي سي 5 (Mbc5)",
    "category": "general",
    "descriptionAr": "باقة قنوات MBC",
    "descriptionEn": "https://aspreen-tv-production.up.railway.app/api/app/image-proxy?url=https%3A%2F%2Ftlfaz.com%2Fwp-content%2Fuploads%2F2022%2F02%2Fmbc5-tv.png",
    "nowPlayingAr": "بث مباشر 24/7",
    "nowPlayingEn": "[{\"id\": \"server-1\", \"name\": \"سيرفر 1 (HLS فائق الثبات 24/7)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/tlfaz-mbc5.m3u8?server=1\", \"quality\": \"1080p\", \"isDefault\": true, \"status\": \"live\"}]",
    "colorA": "#0b72be",
    "colorB": "#041424",
    "quality": "1080p",
    "streamType": "hls",
    "streamUrl": "https://aspreen-tv-production.up.railway.app/live/tlfaz-mbc5.m3u8",
    "logoUrl": "https://aspreen-tv-production.up.railway.app/api/app/image-proxy?url=https%3A%2F%2Ftlfaz.com%2Fwp-content%2Fuploads%2F2022%2F02%2Fmbc5-tv.png",
    "servers": [
      {
        "id": "server-1",
        "name": "سيرفر 1 (HLS فائق الثبات 24/7)",
        "url": "https://aspreen-tv-production.up.railway.app/live/tlfaz-mbc5.m3u8?server=1",
        "quality": "1080p",
        "isDefault": true,
        "status": "live"
      }
    ],
    "visible": true,
    "sortOrder": 30
  },
  {
    "id": "tlfaz-spacetoon",
    "code": "TLFAZ-SPACETOON",
    "nameAr": "قناة سبيستون",
    "nameEn": "قناة سبيستون",
    "category": "kids",
    "descriptionAr": "قنوات أطفال",
    "descriptionEn": "https://aspreen-tv-production.up.railway.app/api/app/image-proxy?url=https%3A%2F%2Ftlfaz.com%2Fwp-content%2Fuploads%2F2023%2F02%2Fspace-toon.png",
    "nowPlayingAr": "بث مباشر 24/7",
    "nowPlayingEn": "[{\"id\": \"server-1\", \"name\": \"سيرفر 1 (HLS فائق الثبات 24/7)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/tlfaz-spacetoon.m3u8?server=1\", \"quality\": \"1080p\", \"isDefault\": true, \"status\": \"live\"}]",
    "colorA": "#e04116",
    "colorB": "#1b0701",
    "quality": "1080p",
    "streamType": "hls",
    "streamUrl": "https://aspreen-tv-production.up.railway.app/live/tlfaz-spacetoon.m3u8",
    "logoUrl": "https://aspreen-tv-production.up.railway.app/api/app/image-proxy?url=https%3A%2F%2Ftlfaz.com%2Fwp-content%2Fuploads%2F2023%2F02%2Fspace-toon.png",
    "servers": [
      {
        "id": "server-1",
        "name": "سيرفر 1 (HLS فائق الثبات 24/7)",
        "url": "https://aspreen-tv-production.up.railway.app/live/tlfaz-spacetoon.m3u8?server=1",
        "quality": "1080p",
        "isDefault": true,
        "status": "live"
      }
    ],
    "visible": true,
    "sortOrder": 31
  },
  {
    "id": "tlfaz-al-aoula",
    "code": "TLFAZ-AL-AOULA",
    "nameAr": "القناة الأولى المغربية",
    "nameEn": "القناة الأولى المغربية",
    "category": "general",
    "descriptionAr": "قنوات عربية منوعة",
    "descriptionEn": "https://aspreen-tv-production.up.railway.app/api/app/image-proxy?url=https%3A%2F%2Ftlfaz.com%2Fwp-content%2Fuploads%2F2022%2F02%2Fal-aoula-tv.png",
    "nowPlayingAr": "بث مباشر 24/7",
    "nowPlayingEn": "[{\"id\": \"server-1\", \"name\": \"سيرفر 1 (البث المباشر)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/tlfaz-al-aoula.m3u8?server=1\", \"quality\": \"HD\", \"isDefault\": true, \"status\": \"live\"}, {\"id\": \"server-2\", \"name\": \"سيرفر 2 (مباشر CDN)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/tlfaz-al-aoula.m3u8?server=2\", \"quality\": \"HD\", \"status\": \"live\"}]",
    "colorA": "#2c4c78",
    "colorB": "#0a111a",
    "quality": "HD",
    "streamType": "hls",
    "streamUrl": "https://aspreen-tv-production.up.railway.app/live/tlfaz-al-aoula.m3u8",
    "logoUrl": "https://aspreen-tv-production.up.railway.app/api/app/image-proxy?url=https%3A%2F%2Ftlfaz.com%2Fwp-content%2Fuploads%2F2022%2F02%2Fal-aoula-tv.png",
    "servers": [
      {
        "id": "server-1",
        "name": "سيرفر 1 (البث المباشر)",
        "url": "https://aspreen-tv-production.up.railway.app/live/tlfaz-al-aoula.m3u8?server=1",
        "quality": "HD",
        "isDefault": true,
        "status": "live"
      },
      {
        "id": "server-2",
        "name": "سيرفر 2 (مباشر CDN)",
        "url": "https://aspreen-tv-production.up.railway.app/live/tlfaz-al-aoula.m3u8?server=2",
        "quality": "HD",
        "status": "live"
      }
    ],
    "visible": true,
    "sortOrder": 32
  },
  {
    "id": "tlfaz-bahia-tv",
    "code": "TLFAZ-BAHIA-TV",
    "nameAr": "قناة الباهية تيفي",
    "nameEn": "قناة الباهية تيفي",
    "category": "general",
    "descriptionAr": "قنوات عربية منوعة",
    "descriptionEn": "https://aspreen-tv-production.up.railway.app/api/app/image-proxy?url=https%3A%2F%2Ftlfaz.com%2Fwp-content%2Fuploads%2F2022%2F03%2Fbahia_tv.png",
    "nowPlayingAr": "بث مباشر 24/7",
    "nowPlayingEn": "[{\"id\": \"server-1\", \"name\": \"سيرفر 1 (البث المباشر)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/tlfaz-bahia-tv.m3u8?server=1\", \"quality\": \"HD\", \"isDefault\": true, \"status\": \"live\"}, {\"id\": \"server-2\", \"name\": \"سيرفر 2 (مباشر CDN)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/tlfaz-bahia-tv.m3u8?server=2\", \"quality\": \"HD\", \"status\": \"live\"}]",
    "colorA": "#2c4c78",
    "colorB": "#0a111a",
    "quality": "HD",
    "streamType": "hls",
    "streamUrl": "https://aspreen-tv-production.up.railway.app/live/tlfaz-bahia-tv.m3u8",
    "logoUrl": "https://aspreen-tv-production.up.railway.app/api/app/image-proxy?url=https%3A%2F%2Ftlfaz.com%2Fwp-content%2Fuploads%2F2022%2F03%2Fbahia_tv.png",
    "servers": [
      {
        "id": "server-1",
        "name": "سيرفر 1 (البث المباشر)",
        "url": "https://aspreen-tv-production.up.railway.app/live/tlfaz-bahia-tv.m3u8?server=1",
        "quality": "HD",
        "isDefault": true,
        "status": "live"
      },
      {
        "id": "server-2",
        "name": "سيرفر 2 (مباشر CDN)",
        "url": "https://aspreen-tv-production.up.railway.app/live/tlfaz-bahia-tv.m3u8?server=2",
        "quality": "HD",
        "status": "live"
      }
    ],
    "visible": true,
    "sortOrder": 33
  },
  {
    "id": "tlfaz-oman-tv",
    "code": "TLFAZ-OMAN-TV",
    "nameAr": "قناة عمان تي في",
    "nameEn": "قناة عمان تي في",
    "category": "general",
    "descriptionAr": "قنوات عربية منوعة",
    "descriptionEn": "",
    "nowPlayingAr": "بث مباشر 24/7",
    "nowPlayingEn": "[{\"id\": \"server-1\", \"name\": \"سيرفر 1 (البث المباشر)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/tlfaz-oman-tv.m3u8?server=1\", \"quality\": \"HD\", \"isDefault\": true, \"status\": \"live\"}, {\"id\": \"server-2\", \"name\": \"سيرفر 2 (مباشر CDN)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/tlfaz-oman-tv.m3u8?server=2\", \"quality\": \"HD\", \"status\": \"live\"}]",
    "colorA": "#2c4c78",
    "colorB": "#0a111a",
    "quality": "HD",
    "streamType": "hls",
    "streamUrl": "https://aspreen-tv-production.up.railway.app/live/tlfaz-oman-tv.m3u8",
    "logoUrl": null,
    "servers": [
      {
        "id": "server-1",
        "name": "سيرفر 1 (البث المباشر)",
        "url": "https://aspreen-tv-production.up.railway.app/live/tlfaz-oman-tv.m3u8?server=1",
        "quality": "HD",
        "isDefault": true,
        "status": "live"
      },
      {
        "id": "server-2",
        "name": "سيرفر 2 (مباشر CDN)",
        "url": "https://aspreen-tv-production.up.railway.app/live/tlfaz-oman-tv.m3u8?server=2",
        "quality": "HD",
        "status": "live"
      }
    ],
    "visible": true,
    "sortOrder": 34
  },
  {
    "id": "tlfaz-el-medina-mr-tv",
    "code": "TLFAZ-EL-MEDINA-MR-TV",
    "nameAr": "قناة المدينة الموريتانية",
    "nameEn": "قناة المدينة الموريتانية",
    "category": "general",
    "descriptionAr": "قنوات عربية منوعة",
    "descriptionEn": "https://aspreen-tv-production.up.railway.app/api/app/image-proxy?url=https%3A%2F%2Ftlfaz.com%2Fwp-content%2Fuploads%2F2023%2F03%2FEl-Medina-Tv.png",
    "nowPlayingAr": "بث مباشر 24/7",
    "nowPlayingEn": "[{\"id\": \"server-1\", \"name\": \"سيرفر 1 (البث المباشر)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/tlfaz-el-medina-mr-tv.m3u8?server=1\", \"quality\": \"HD\", \"isDefault\": true, \"status\": \"live\"}, {\"id\": \"server-2\", \"name\": \"سيرفر 2 (مباشر CDN)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/tlfaz-el-medina-mr-tv.m3u8?server=2\", \"quality\": \"HD\", \"status\": \"live\"}]",
    "colorA": "#2b823e",
    "colorB": "#07190b",
    "quality": "HD",
    "streamType": "hls",
    "streamUrl": "https://aspreen-tv-production.up.railway.app/live/tlfaz-el-medina-mr-tv.m3u8",
    "logoUrl": "https://aspreen-tv-production.up.railway.app/api/app/image-proxy?url=https%3A%2F%2Ftlfaz.com%2Fwp-content%2Fuploads%2F2023%2F03%2FEl-Medina-Tv.png",
    "servers": [
      {
        "id": "server-1",
        "name": "سيرفر 1 (البث المباشر)",
        "url": "https://aspreen-tv-production.up.railway.app/live/tlfaz-el-medina-mr-tv.m3u8?server=1",
        "quality": "HD",
        "isDefault": true,
        "status": "live"
      },
      {
        "id": "server-2",
        "name": "سيرفر 2 (مباشر CDN)",
        "url": "https://aspreen-tv-production.up.railway.app/live/tlfaz-el-medina-mr-tv.m3u8?server=2",
        "quality": "HD",
        "status": "live"
      }
    ],
    "visible": true,
    "sortOrder": 35
  },
  {
    "id": "tlfaz-zad-tv",
    "code": "TLFAZ-ZAD-TV",
    "nameAr": "قناة زاد الفضائية",
    "nameEn": "قناة زاد الفضائية",
    "category": "general",
    "descriptionAr": "قنوات إسلامية ودينية",
    "descriptionEn": "https://aspreen-tv-production.up.railway.app/api/app/image-proxy?url=https%3A%2F%2Ftlfaz.com%2Fwp-content%2Fuploads%2F2023%2F03%2Fzad-tv.png",
    "nowPlayingAr": "بث مباشر 24/7",
    "nowPlayingEn": "[{\"id\": \"server-1\", \"name\": \"سيرفر 1 (البث المباشر)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/tlfaz-zad-tv.m3u8?server=1\", \"quality\": \"HD\", \"isDefault\": true, \"status\": \"live\"}, {\"id\": \"server-2\", \"name\": \"سيرفر 2 (مباشر CDN)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/tlfaz-zad-tv.m3u8?server=2\", \"quality\": \"HD\", \"status\": \"live\"}]",
    "colorA": "#2b823e",
    "colorB": "#07190b",
    "quality": "HD",
    "streamType": "hls",
    "streamUrl": "https://aspreen-tv-production.up.railway.app/live/tlfaz-zad-tv.m3u8",
    "logoUrl": "https://aspreen-tv-production.up.railway.app/api/app/image-proxy?url=https%3A%2F%2Ftlfaz.com%2Fwp-content%2Fuploads%2F2023%2F03%2Fzad-tv.png",
    "servers": [
      {
        "id": "server-1",
        "name": "سيرفر 1 (البث المباشر)",
        "url": "https://aspreen-tv-production.up.railway.app/live/tlfaz-zad-tv.m3u8?server=1",
        "quality": "HD",
        "isDefault": true,
        "status": "live"
      },
      {
        "id": "server-2",
        "name": "سيرفر 2 (مباشر CDN)",
        "url": "https://aspreen-tv-production.up.railway.app/live/tlfaz-zad-tv.m3u8?server=2",
        "quality": "HD",
        "status": "live"
      }
    ],
    "visible": true,
    "sortOrder": 36
  },
  {
    "id": "tlfaz-ktv-arabe",
    "code": "TLFAZ-KTV-ARABE",
    "nameAr": "قناة العربي الكويتية الوثائقية",
    "nameEn": "قناة العربي الكويتية الوثائقية",
    "category": "documentary",
    "descriptionAr": "قنوات وثائقية",
    "descriptionEn": "https://aspreen-tv-production.up.railway.app/api/app/image-proxy?url=https%3A%2F%2Ftlfaz.com%2Fwp-content%2Fuploads%2F2024%2F06%2FKTV-Arabe.png",
    "nowPlayingAr": "بث مباشر 24/7",
    "nowPlayingEn": "[{\"id\": \"server-1\", \"name\": \"سيرفر 1 (البث المباشر)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/tlfaz-ktv-arabe.m3u8?server=1\", \"quality\": \"HD\", \"isDefault\": true, \"status\": \"live\"}, {\"id\": \"server-2\", \"name\": \"سيرفر 2 (مباشر CDN)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/tlfaz-ktv-arabe.m3u8?server=2\", \"quality\": \"HD\", \"status\": \"live\"}]",
    "colorA": "#1d8a70",
    "colorB": "#041712",
    "quality": "HD",
    "streamType": "hls",
    "streamUrl": "https://aspreen-tv-production.up.railway.app/live/tlfaz-ktv-arabe.m3u8",
    "logoUrl": "https://aspreen-tv-production.up.railway.app/api/app/image-proxy?url=https%3A%2F%2Ftlfaz.com%2Fwp-content%2Fuploads%2F2024%2F06%2FKTV-Arabe.png",
    "servers": [
      {
        "id": "server-1",
        "name": "سيرفر 1 (البث المباشر)",
        "url": "https://aspreen-tv-production.up.railway.app/live/tlfaz-ktv-arabe.m3u8?server=1",
        "quality": "HD",
        "isDefault": true,
        "status": "live"
      },
      {
        "id": "server-2",
        "name": "سيرفر 2 (مباشر CDN)",
        "url": "https://aspreen-tv-production.up.railway.app/live/tlfaz-ktv-arabe.m3u8?server=2",
        "quality": "HD",
        "status": "live"
      }
    ],
    "visible": true,
    "sortOrder": 37
  },
  {
    "id": "tlfaz-al-jazeera",
    "code": "TLFAZ-AL-JAZEERA",
    "nameAr": "قناة الجزيرة الاخبارية",
    "nameEn": "قناة الجزيرة الاخبارية",
    "category": "news",
    "descriptionAr": "قنوات إخبارية وسياسية",
    "descriptionEn": "https://aspreen-tv-production.up.railway.app/api/app/image-proxy?url=https%3A%2F%2Ftlfaz.com%2Fwp-content%2Fuploads%2F2024%2F05%2Faljazeera.png",
    "nowPlayingAr": "بث مباشر 24/7",
    "nowPlayingEn": "[{\"id\": \"server-1\", \"name\": \"سيرفر 1 (البث المباشر)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/tlfaz-al-jazeera.m3u8?server=1\", \"quality\": \"HD\", \"isDefault\": true, \"status\": \"live\"}, {\"id\": \"server-2\", \"name\": \"سيرفر 2 (مباشر CDN)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/tlfaz-al-jazeera.m3u8?server=2\", \"quality\": \"HD\", \"status\": \"live\"}]",
    "colorA": "#d48208",
    "colorB": "#180f01",
    "quality": "HD",
    "streamType": "hls",
    "streamUrl": "https://aspreen-tv-production.up.railway.app/live/tlfaz-al-jazeera.m3u8",
    "logoUrl": "https://aspreen-tv-production.up.railway.app/api/app/image-proxy?url=https%3A%2F%2Ftlfaz.com%2Fwp-content%2Fuploads%2F2024%2F05%2Faljazeera.png",
    "servers": [
      {
        "id": "server-1",
        "name": "سيرفر 1 (البث المباشر)",
        "url": "https://aspreen-tv-production.up.railway.app/live/tlfaz-al-jazeera.m3u8?server=1",
        "quality": "HD",
        "isDefault": true,
        "status": "live"
      },
      {
        "id": "server-2",
        "name": "سيرفر 2 (مباشر CDN)",
        "url": "https://aspreen-tv-production.up.railway.app/live/tlfaz-al-jazeera.m3u8?server=2",
        "quality": "HD",
        "status": "live"
      }
    ],
    "visible": true,
    "sortOrder": 38
  },
  {
    "id": "tlfaz-yemen-tv",
    "code": "TLFAZ-YEMEN-TV",
    "nameAr": "قناة اليمن الفضائية البث المباشر",
    "nameEn": "قناة اليمن الفضائية البث المباشر",
    "category": "news",
    "descriptionAr": "قنوات إخبارية وسياسية",
    "descriptionEn": "https://aspreen-tv-production.up.railway.app/api/app/image-proxy?url=https%3A%2F%2Ftlfaz.com%2Fwp-content%2Fuploads%2F2023%2F03%2FYemen-Tv.png",
    "nowPlayingAr": "بث مباشر 24/7",
    "nowPlayingEn": "[{\"id\": \"server-1\", \"name\": \"سيرفر 1 (البث المباشر)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/tlfaz-yemen-tv.m3u8?server=1\", \"quality\": \"HD\", \"isDefault\": true, \"status\": \"live\"}, {\"id\": \"server-2\", \"name\": \"سيرفر 2 (مباشر CDN)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/tlfaz-yemen-tv.m3u8?server=2\", \"quality\": \"HD\", \"status\": \"live\"}]",
    "colorA": "#9c2626",
    "colorB": "#1a0404",
    "quality": "HD",
    "streamType": "hls",
    "streamUrl": "https://aspreen-tv-production.up.railway.app/live/tlfaz-yemen-tv.m3u8",
    "logoUrl": "https://aspreen-tv-production.up.railway.app/api/app/image-proxy?url=https%3A%2F%2Ftlfaz.com%2Fwp-content%2Fuploads%2F2023%2F03%2FYemen-Tv.png",
    "servers": [
      {
        "id": "server-1",
        "name": "سيرفر 1 (البث المباشر)",
        "url": "https://aspreen-tv-production.up.railway.app/live/tlfaz-yemen-tv.m3u8?server=1",
        "quality": "HD",
        "isDefault": true,
        "status": "live"
      },
      {
        "id": "server-2",
        "name": "سيرفر 2 (مباشر CDN)",
        "url": "https://aspreen-tv-production.up.railway.app/live/tlfaz-yemen-tv.m3u8?server=2",
        "quality": "HD",
        "status": "live"
      }
    ],
    "visible": true,
    "sortOrder": 39
  },
  {
    "id": "tlfaz-alwasat-wtv",
    "code": "TLFAZ-ALWASAT-WTV",
    "nameAr": "قناة الوسط الليبية wtv",
    "nameEn": "قناة الوسط الليبية wtv",
    "category": "news",
    "descriptionAr": "قنوات إخبارية وسياسية",
    "descriptionEn": "https://aspreen-tv-production.up.railway.app/api/app/image-proxy?url=https%3A%2F%2Ftlfaz.com%2Fwp-content%2Fuploads%2F2023%2F03%2FAlwasat-TV.png",
    "nowPlayingAr": "بث مباشر 24/7",
    "nowPlayingEn": "[{\"id\": \"server-1\", \"name\": \"سيرفر 1 (البث المباشر)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/tlfaz-alwasat-wtv.m3u8?server=1\", \"quality\": \"HD\", \"isDefault\": true, \"status\": \"live\"}, {\"id\": \"server-2\", \"name\": \"سيرفر 2 (مباشر CDN)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/tlfaz-alwasat-wtv.m3u8?server=2\", \"quality\": \"HD\", \"status\": \"live\"}]",
    "colorA": "#9c2626",
    "colorB": "#1a0404",
    "quality": "HD",
    "streamType": "hls",
    "streamUrl": "https://aspreen-tv-production.up.railway.app/live/tlfaz-alwasat-wtv.m3u8",
    "logoUrl": "https://aspreen-tv-production.up.railway.app/api/app/image-proxy?url=https%3A%2F%2Ftlfaz.com%2Fwp-content%2Fuploads%2F2023%2F03%2FAlwasat-TV.png",
    "servers": [
      {
        "id": "server-1",
        "name": "سيرفر 1 (البث المباشر)",
        "url": "https://aspreen-tv-production.up.railway.app/live/tlfaz-alwasat-wtv.m3u8?server=1",
        "quality": "HD",
        "isDefault": true,
        "status": "live"
      },
      {
        "id": "server-2",
        "name": "سيرفر 2 (مباشر CDN)",
        "url": "https://aspreen-tv-production.up.railway.app/live/tlfaz-alwasat-wtv.m3u8?server=2",
        "quality": "HD",
        "status": "live"
      }
    ],
    "visible": true,
    "sortOrder": 40
  },
  {
    "id": "tlfaz-elmourabiton-tv",
    "code": "TLFAZ-ELMOURABITON-TV",
    "nameAr": "قناة المرابطون الموريتانية",
    "nameEn": "قناة المرابطون الموريتانية",
    "category": "general",
    "descriptionAr": "قنوات عربية منوعة",
    "descriptionEn": "https://aspreen-tv-production.up.railway.app/api/app/image-proxy?url=https%3A%2F%2Ftlfaz.com%2Fwp-content%2Fuploads%2F2023%2F03%2FelmourabitonTv.png",
    "nowPlayingAr": "بث مباشر 24/7",
    "nowPlayingEn": "[{\"id\": \"server-1\", \"name\": \"سيرفر 1 (البث المباشر)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/tlfaz-elmourabiton-tv.m3u8?server=1\", \"quality\": \"HD\", \"isDefault\": true, \"status\": \"live\"}, {\"id\": \"server-2\", \"name\": \"سيرفر 2 (مباشر CDN)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/tlfaz-elmourabiton-tv.m3u8?server=2\", \"quality\": \"HD\", \"status\": \"live\"}]",
    "colorA": "#2c4c78",
    "colorB": "#0a111a",
    "quality": "HD",
    "streamType": "hls",
    "streamUrl": "https://aspreen-tv-production.up.railway.app/live/tlfaz-elmourabiton-tv.m3u8",
    "logoUrl": "https://aspreen-tv-production.up.railway.app/api/app/image-proxy?url=https%3A%2F%2Ftlfaz.com%2Fwp-content%2Fuploads%2F2023%2F03%2FelmourabitonTv.png",
    "servers": [
      {
        "id": "server-1",
        "name": "سيرفر 1 (البث المباشر)",
        "url": "https://aspreen-tv-production.up.railway.app/live/tlfaz-elmourabiton-tv.m3u8?server=1",
        "quality": "HD",
        "isDefault": true,
        "status": "live"
      },
      {
        "id": "server-2",
        "name": "سيرفر 2 (مباشر CDN)",
        "url": "https://aspreen-tv-production.up.railway.app/live/tlfaz-elmourabiton-tv.m3u8?server=2",
        "quality": "HD",
        "status": "live"
      }
    ],
    "visible": true,
    "sortOrder": 41
  },
  {
    "id": "tlfaz-al-fallujah",
    "code": "TLFAZ-AL-FALLUJAH",
    "nameAr": "قناة الفلوجة",
    "nameEn": "قناة الفلوجة",
    "category": "news",
    "descriptionAr": "قنوات إخبارية وسياسية",
    "descriptionEn": "https://aspreen-tv-production.up.railway.app/api/app/image-proxy?url=https%3A%2F%2Ftlfaz.com%2Fwp-content%2Fuploads%2F2023%2F03%2Ffallujah-tv.png",
    "nowPlayingAr": "بث مباشر 24/7",
    "nowPlayingEn": "[{\"id\": \"server-1\", \"name\": \"سيرفر 1 (البث المباشر)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/tlfaz-al-fallujah.m3u8?server=1\", \"quality\": \"HD\", \"isDefault\": true, \"status\": \"live\"}, {\"id\": \"server-2\", \"name\": \"سيرفر 2 (مباشر CDN)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/tlfaz-al-fallujah.m3u8?server=2\", \"quality\": \"HD\", \"status\": \"live\"}]",
    "colorA": "#9c2626",
    "colorB": "#1a0404",
    "quality": "HD",
    "streamType": "hls",
    "streamUrl": "https://aspreen-tv-production.up.railway.app/live/tlfaz-al-fallujah.m3u8",
    "logoUrl": "https://aspreen-tv-production.up.railway.app/api/app/image-proxy?url=https%3A%2F%2Ftlfaz.com%2Fwp-content%2Fuploads%2F2023%2F03%2Ffallujah-tv.png",
    "servers": [
      {
        "id": "server-1",
        "name": "سيرفر 1 (البث المباشر)",
        "url": "https://aspreen-tv-production.up.railway.app/live/tlfaz-al-fallujah.m3u8?server=1",
        "quality": "HD",
        "isDefault": true,
        "status": "live"
      },
      {
        "id": "server-2",
        "name": "سيرفر 2 (مباشر CDN)",
        "url": "https://aspreen-tv-production.up.railway.app/live/tlfaz-al-fallujah.m3u8?server=2",
        "quality": "HD",
        "status": "live"
      }
    ],
    "visible": true,
    "sortOrder": 42
  },
  {
    "id": "tlfaz-al-rassoul",
    "code": "TLFAZ-AL-RASSOUL",
    "nameAr": "قناة الرسول",
    "nameEn": "قناة الرسول",
    "category": "general",
    "descriptionAr": "قنوات إسلامية ودينية",
    "descriptionEn": "https://aspreen-tv-production.up.railway.app/api/app/image-proxy?url=https%3A%2F%2Ftlfaz.com%2Fwp-content%2Fuploads%2F2024%2F05%2FAl-Rassoul-TV.png",
    "nowPlayingAr": "بث مباشر 24/7",
    "nowPlayingEn": "[{\"id\": \"server-1\", \"name\": \"سيرفر 1 (البث المباشر)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/tlfaz-al-rassoul.m3u8?server=1\", \"quality\": \"HD\", \"isDefault\": true, \"status\": \"live\"}, {\"id\": \"server-2\", \"name\": \"سيرفر 2 (مباشر CDN)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/tlfaz-al-rassoul.m3u8?server=2\", \"quality\": \"HD\", \"status\": \"live\"}]",
    "colorA": "#2b823e",
    "colorB": "#07190b",
    "quality": "HD",
    "streamType": "hls",
    "streamUrl": "https://aspreen-tv-production.up.railway.app/live/tlfaz-al-rassoul.m3u8",
    "logoUrl": "https://aspreen-tv-production.up.railway.app/api/app/image-proxy?url=https%3A%2F%2Ftlfaz.com%2Fwp-content%2Fuploads%2F2024%2F05%2FAl-Rassoul-TV.png",
    "servers": [
      {
        "id": "server-1",
        "name": "سيرفر 1 (البث المباشر)",
        "url": "https://aspreen-tv-production.up.railway.app/live/tlfaz-al-rassoul.m3u8?server=1",
        "quality": "HD",
        "isDefault": true,
        "status": "live"
      },
      {
        "id": "server-2",
        "name": "سيرفر 2 (مباشر CDN)",
        "url": "https://aspreen-tv-production.up.railway.app/live/tlfaz-al-rassoul.m3u8?server=2",
        "quality": "HD",
        "status": "live"
      }
    ],
    "visible": true,
    "sortOrder": 43
  },
  {
    "id": "tlfaz-bin-othaimeen",
    "code": "TLFAZ-BIN-OTHAIMEEN",
    "nameAr": "قناة ابن عثيمين",
    "nameEn": "قناة ابن عثيمين",
    "category": "general",
    "descriptionAr": "قنوات إسلامية ودينية",
    "descriptionEn": "https://aspreen-tv-production.up.railway.app/api/app/image-proxy?url=https%3A%2F%2Ftlfaz.com%2Fwp-content%2Fuploads%2F2024%2F03%2FBin-Othaimeen.png",
    "nowPlayingAr": "بث مباشر 24/7",
    "nowPlayingEn": "[{\"id\": \"server-1\", \"name\": \"سيرفر 1 (البث المباشر)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/tlfaz-bin-othaimeen.m3u8?server=1\", \"quality\": \"HD\", \"isDefault\": true, \"status\": \"live\"}, {\"id\": \"server-2\", \"name\": \"سيرفر 2 (مباشر CDN)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/tlfaz-bin-othaimeen.m3u8?server=2\", \"quality\": \"HD\", \"status\": \"live\"}]",
    "colorA": "#2b823e",
    "colorB": "#07190b",
    "quality": "HD",
    "streamType": "hls",
    "streamUrl": "https://aspreen-tv-production.up.railway.app/live/tlfaz-bin-othaimeen.m3u8",
    "logoUrl": "https://aspreen-tv-production.up.railway.app/api/app/image-proxy?url=https%3A%2F%2Ftlfaz.com%2Fwp-content%2Fuploads%2F2024%2F03%2FBin-Othaimeen.png",
    "servers": [
      {
        "id": "server-1",
        "name": "سيرفر 1 (البث المباشر)",
        "url": "https://aspreen-tv-production.up.railway.app/live/tlfaz-bin-othaimeen.m3u8?server=1",
        "quality": "HD",
        "isDefault": true,
        "status": "live"
      },
      {
        "id": "server-2",
        "name": "سيرفر 2 (مباشر CDN)",
        "url": "https://aspreen-tv-production.up.railway.app/live/tlfaz-bin-othaimeen.m3u8?server=2",
        "quality": "HD",
        "status": "live"
      }
    ],
    "visible": true,
    "sortOrder": 44
  },
  {
    "id": "tlfaz-saudi24",
    "code": "TLFAZ-SAUDI24",
    "nameAr": "قناة سعودي 24",
    "nameEn": "قناة سعودي 24",
    "category": "sports",
    "descriptionAr": "قنوات عربية منوعة",
    "descriptionEn": "https://aspreen-tv-production.up.railway.app/api/app/image-proxy?url=https%3A%2F%2Ftlfaz.com%2Fwp-content%2Fuploads%2F2024%2F03%2Fs24-sport.png",
    "nowPlayingAr": "بث مباشر 24/7",
    "nowPlayingEn": "[{\"id\": \"server-1\", \"name\": \"سيرفر 1 (البث المباشر)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/tlfaz-saudi24.m3u8?server=1\", \"quality\": \"HD\", \"isDefault\": true, \"status\": \"live\"}, {\"id\": \"server-2\", \"name\": \"سيرفر 2 (مباشر CDN)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/tlfaz-saudi24.m3u8?server=2\", \"quality\": \"HD\", \"status\": \"live\"}]",
    "colorA": "#2c4c78",
    "colorB": "#0a111a",
    "quality": "HD",
    "streamType": "hls",
    "streamUrl": "https://aspreen-tv-production.up.railway.app/live/tlfaz-saudi24.m3u8",
    "logoUrl": "https://aspreen-tv-production.up.railway.app/api/app/image-proxy?url=https%3A%2F%2Ftlfaz.com%2Fwp-content%2Fuploads%2F2024%2F03%2Fs24-sport.png",
    "servers": [
      {
        "id": "server-1",
        "name": "سيرفر 1 (البث المباشر)",
        "url": "https://aspreen-tv-production.up.railway.app/live/tlfaz-saudi24.m3u8?server=1",
        "quality": "HD",
        "isDefault": true,
        "status": "live"
      },
      {
        "id": "server-2",
        "name": "سيرفر 2 (مباشر CDN)",
        "url": "https://aspreen-tv-production.up.railway.app/live/tlfaz-saudi24.m3u8?server=2",
        "quality": "HD",
        "status": "live"
      }
    ],
    "visible": true,
    "sortOrder": 45
  },
  {
    "id": "tlfaz-mauritanie-2-tv",
    "code": "TLFAZ-MAURITANIE-2-TV",
    "nameAr": "القناة الموريتانية الثانية",
    "nameEn": "القناة الموريتانية الثانية",
    "category": "general",
    "descriptionAr": "قنوات عربية منوعة",
    "descriptionEn": "https://aspreen-tv-production.up.railway.app/api/app/image-proxy?url=https%3A%2F%2Ftlfaz.com%2Fwp-content%2Fuploads%2F2023%2F03%2FMauritanie-2-Tv.png",
    "nowPlayingAr": "بث مباشر 24/7",
    "nowPlayingEn": "[{\"id\": \"server-1\", \"name\": \"سيرفر 1 (البث المباشر)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/tlfaz-mauritanie-2-tv.m3u8?server=1\", \"quality\": \"HD\", \"isDefault\": true, \"status\": \"live\"}, {\"id\": \"server-2\", \"name\": \"سيرفر 2 (مباشر CDN)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/tlfaz-mauritanie-2-tv.m3u8?server=2\", \"quality\": \"HD\", \"status\": \"live\"}]",
    "colorA": "#2c4c78",
    "colorB": "#0a111a",
    "quality": "HD",
    "streamType": "hls",
    "streamUrl": "https://aspreen-tv-production.up.railway.app/live/tlfaz-mauritanie-2-tv.m3u8",
    "logoUrl": "https://aspreen-tv-production.up.railway.app/api/app/image-proxy?url=https%3A%2F%2Ftlfaz.com%2Fwp-content%2Fuploads%2F2023%2F03%2FMauritanie-2-Tv.png",
    "servers": [
      {
        "id": "server-1",
        "name": "سيرفر 1 (البث المباشر)",
        "url": "https://aspreen-tv-production.up.railway.app/live/tlfaz-mauritanie-2-tv.m3u8?server=1",
        "quality": "HD",
        "isDefault": true,
        "status": "live"
      },
      {
        "id": "server-2",
        "name": "سيرفر 2 (مباشر CDN)",
        "url": "https://aspreen-tv-production.up.railway.app/live/tlfaz-mauritanie-2-tv.m3u8?server=2",
        "quality": "HD",
        "status": "live"
      }
    ],
    "visible": true,
    "sortOrder": 46
  },
  {
    "id": "tlfaz-aden-tv",
    "code": "TLFAZ-ADEN-TV",
    "nameAr": "قناة عدن",
    "nameEn": "قناة عدن",
    "category": "news",
    "descriptionAr": "قنوات إخبارية وسياسية",
    "descriptionEn": "https://aspreen-tv-production.up.railway.app/api/app/image-proxy?url=https%3A%2F%2Ftlfaz.com%2Fwp-content%2Fuploads%2F2023%2F03%2FAden-TV.png",
    "nowPlayingAr": "بث مباشر 24/7",
    "nowPlayingEn": "[{\"id\": \"server-1\", \"name\": \"سيرفر 1 (البث المباشر)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/tlfaz-aden-tv.m3u8?server=1\", \"quality\": \"HD\", \"isDefault\": true, \"status\": \"live\"}, {\"id\": \"server-2\", \"name\": \"سيرفر 2 (مباشر CDN)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/tlfaz-aden-tv.m3u8?server=2\", \"quality\": \"HD\", \"status\": \"live\"}]",
    "colorA": "#9c2626",
    "colorB": "#1a0404",
    "quality": "HD",
    "streamType": "hls",
    "streamUrl": "https://aspreen-tv-production.up.railway.app/live/tlfaz-aden-tv.m3u8",
    "logoUrl": "https://aspreen-tv-production.up.railway.app/api/app/image-proxy?url=https%3A%2F%2Ftlfaz.com%2Fwp-content%2Fuploads%2F2023%2F03%2FAden-TV.png",
    "servers": [
      {
        "id": "server-1",
        "name": "سيرفر 1 (البث المباشر)",
        "url": "https://aspreen-tv-production.up.railway.app/live/tlfaz-aden-tv.m3u8?server=1",
        "quality": "HD",
        "isDefault": true,
        "status": "live"
      },
      {
        "id": "server-2",
        "name": "سيرفر 2 (مباشر CDN)",
        "url": "https://aspreen-tv-production.up.railway.app/live/tlfaz-aden-tv.m3u8?server=2",
        "quality": "HD",
        "status": "live"
      }
    ],
    "visible": true,
    "sortOrder": 47
  },
  {
    "id": "tlfaz-al-magharibia-2",
    "code": "TLFAZ-AL-MAGHARIBIA-2",
    "nameAr": "قناة المغاربية 2",
    "nameEn": "قناة المغاربية 2",
    "category": "general",
    "descriptionAr": "قنوات عربية منوعة",
    "descriptionEn": "https://aspreen-tv-production.up.railway.app/api/app/image-proxy?url=https%3A%2F%2Ftlfaz.com%2Fwp-content%2Fuploads%2F2022%2F03%2Fal-magharibia-2-tv.png",
    "nowPlayingAr": "بث مباشر 24/7",
    "nowPlayingEn": "[{\"id\": \"server-1\", \"name\": \"سيرفر 1 (البث المباشر)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/tlfaz-al-magharibia-2.m3u8?server=1\", \"quality\": \"HD\", \"isDefault\": true, \"status\": \"live\"}, {\"id\": \"server-2\", \"name\": \"سيرفر 2 (مباشر CDN)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/tlfaz-al-magharibia-2.m3u8?server=2\", \"quality\": \"HD\", \"status\": \"live\"}]",
    "colorA": "#2c4c78",
    "colorB": "#0a111a",
    "quality": "HD",
    "streamType": "hls",
    "streamUrl": "https://aspreen-tv-production.up.railway.app/live/tlfaz-al-magharibia-2.m3u8",
    "logoUrl": "https://aspreen-tv-production.up.railway.app/api/app/image-proxy?url=https%3A%2F%2Ftlfaz.com%2Fwp-content%2Fuploads%2F2022%2F03%2Fal-magharibia-2-tv.png",
    "servers": [
      {
        "id": "server-1",
        "name": "سيرفر 1 (البث المباشر)",
        "url": "https://aspreen-tv-production.up.railway.app/live/tlfaz-al-magharibia-2.m3u8?server=1",
        "quality": "HD",
        "isDefault": true,
        "status": "live"
      },
      {
        "id": "server-2",
        "name": "سيرفر 2 (مباشر CDN)",
        "url": "https://aspreen-tv-production.up.railway.app/live/tlfaz-al-magharibia-2.m3u8?server=2",
        "quality": "HD",
        "status": "live"
      }
    ],
    "visible": true,
    "sortOrder": 48
  },
  {
    "id": "tlfaz-halab-today-tv",
    "code": "TLFAZ-HALAB-TODAY-TV",
    "nameAr": "قناة حلب اليوم",
    "nameEn": "قناة حلب اليوم",
    "category": "news",
    "descriptionAr": "قنوات إخبارية وسياسية",
    "descriptionEn": "https://aspreen-tv-production.up.railway.app/api/app/image-proxy?url=https%3A%2F%2Ftlfaz.com%2Fwp-content%2Fuploads%2F2023%2F03%2Fhalab-today-tv.png",
    "nowPlayingAr": "بث مباشر 24/7",
    "nowPlayingEn": "[{\"id\": \"server-1\", \"name\": \"سيرفر 1 (البث المباشر)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/tlfaz-halab-today-tv.m3u8?server=1\", \"quality\": \"HD\", \"isDefault\": true, \"status\": \"live\"}, {\"id\": \"server-2\", \"name\": \"سيرفر 2 (مباشر CDN)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/tlfaz-halab-today-tv.m3u8?server=2\", \"quality\": \"HD\", \"status\": \"live\"}]",
    "colorA": "#9c2626",
    "colorB": "#1a0404",
    "quality": "HD",
    "streamType": "hls",
    "streamUrl": "https://aspreen-tv-production.up.railway.app/live/tlfaz-halab-today-tv.m3u8",
    "logoUrl": "https://aspreen-tv-production.up.railway.app/api/app/image-proxy?url=https%3A%2F%2Ftlfaz.com%2Fwp-content%2Fuploads%2F2023%2F03%2Fhalab-today-tv.png",
    "servers": [
      {
        "id": "server-1",
        "name": "سيرفر 1 (البث المباشر)",
        "url": "https://aspreen-tv-production.up.railway.app/live/tlfaz-halab-today-tv.m3u8?server=1",
        "quality": "HD",
        "isDefault": true,
        "status": "live"
      },
      {
        "id": "server-2",
        "name": "سيرفر 2 (مباشر CDN)",
        "url": "https://aspreen-tv-production.up.railway.app/live/tlfaz-halab-today-tv.m3u8?server=2",
        "quality": "HD",
        "status": "live"
      }
    ],
    "visible": true,
    "sortOrder": 49
  },
  {
    "id": "tlfaz-pnc-yom",
    "code": "TLFAZ-PNC-YOM",
    "nameAr": "قناة بانوراما يوم",
    "nameEn": "قناة بانوراما يوم",
    "category": "movies",
    "descriptionAr": "قنوات أفلام ومسلسلات",
    "descriptionEn": "https://aspreen-tv-production.up.railway.app/api/app/image-proxy?url=https%3A%2F%2Ftlfaz.com%2Fwp-content%2Fuploads%2F2023%2F09%2FSada-El-Balad.png",
    "nowPlayingAr": "بث مباشر 24/7",
    "nowPlayingEn": "[{\"id\": \"server-1\", \"name\": \"سيرفر 1 (البث المباشر)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/tlfaz-pnc-yom.m3u8?server=1\", \"quality\": \"HD\", \"isDefault\": true, \"status\": \"live\"}, {\"id\": \"server-2\", \"name\": \"سيرفر 2 (مباشر CDN)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/tlfaz-pnc-yom.m3u8?server=2\", \"quality\": \"HD\", \"status\": \"live\"}]",
    "colorA": "#b02545",
    "colorB": "#1b040a",
    "quality": "HD",
    "streamType": "hls",
    "streamUrl": "https://aspreen-tv-production.up.railway.app/live/tlfaz-pnc-yom.m3u8",
    "logoUrl": "https://aspreen-tv-production.up.railway.app/api/app/image-proxy?url=https%3A%2F%2Ftlfaz.com%2Fwp-content%2Fuploads%2F2023%2F09%2FSada-El-Balad.png",
    "servers": [
      {
        "id": "server-1",
        "name": "سيرفر 1 (البث المباشر)",
        "url": "https://aspreen-tv-production.up.railway.app/live/tlfaz-pnc-yom.m3u8?server=1",
        "quality": "HD",
        "isDefault": true,
        "status": "live"
      },
      {
        "id": "server-2",
        "name": "سيرفر 2 (مباشر CDN)",
        "url": "https://aspreen-tv-production.up.railway.app/live/tlfaz-pnc-yom.m3u8?server=2",
        "quality": "HD",
        "status": "live"
      }
    ],
    "visible": true,
    "sortOrder": 50
  },
  {
    "id": "tlfaz-hadhramaut-tv",
    "code": "TLFAZ-HADHRAMAUT-TV",
    "nameAr": "قناة حضرموت",
    "nameEn": "قناة حضرموت",
    "category": "general",
    "descriptionAr": "قنوات عربية منوعة",
    "descriptionEn": "https://aspreen-tv-production.up.railway.app/api/app/image-proxy?url=https%3A%2F%2Ftlfaz.com%2Fwp-content%2Fuploads%2F2023%2F03%2Fhadhramaut-tv.png",
    "nowPlayingAr": "بث مباشر 24/7",
    "nowPlayingEn": "[{\"id\": \"server-1\", \"name\": \"سيرفر 1 (البث المباشر)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/tlfaz-hadhramaut-tv.m3u8?server=1\", \"quality\": \"HD\", \"isDefault\": true, \"status\": \"live\"}, {\"id\": \"server-2\", \"name\": \"سيرفر 2 (مباشر CDN)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/tlfaz-hadhramaut-tv.m3u8?server=2\", \"quality\": \"HD\", \"status\": \"live\"}]",
    "colorA": "#2c4c78",
    "colorB": "#0a111a",
    "quality": "HD",
    "streamType": "hls",
    "streamUrl": "https://aspreen-tv-production.up.railway.app/live/tlfaz-hadhramaut-tv.m3u8",
    "logoUrl": "https://aspreen-tv-production.up.railway.app/api/app/image-proxy?url=https%3A%2F%2Ftlfaz.com%2Fwp-content%2Fuploads%2F2023%2F03%2Fhadhramaut-tv.png",
    "servers": [
      {
        "id": "server-1",
        "name": "سيرفر 1 (البث المباشر)",
        "url": "https://aspreen-tv-production.up.railway.app/live/tlfaz-hadhramaut-tv.m3u8?server=1",
        "quality": "HD",
        "isDefault": true,
        "status": "live"
      },
      {
        "id": "server-2",
        "name": "سيرفر 2 (مباشر CDN)",
        "url": "https://aspreen-tv-production.up.railway.app/live/tlfaz-hadhramaut-tv.m3u8?server=2",
        "quality": "HD",
        "status": "live"
      }
    ],
    "visible": true,
    "sortOrder": 51
  },
  {
    "id": "tlfaz-pnc-drama",
    "code": "TLFAZ-PNC-DRAMA",
    "nameAr": "قناة بانوراما دراما",
    "nameEn": "قناة بانوراما دراما",
    "category": "movies",
    "descriptionAr": "قنوات أفلام ومسلسلات",
    "descriptionEn": "https://aspreen-tv-production.up.railway.app/api/app/image-proxy?url=https%3A%2F%2Ftlfaz.com%2Fwp-content%2Fuploads%2F2023%2F09%2FPNC-Drama.png",
    "nowPlayingAr": "بث مباشر 24/7",
    "nowPlayingEn": "[{\"id\": \"server-1\", \"name\": \"سيرفر 1 (البث المباشر)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/tlfaz-pnc-drama.m3u8?server=1\", \"quality\": \"HD\", \"isDefault\": true, \"status\": \"live\"}, {\"id\": \"server-2\", \"name\": \"سيرفر 2 (مباشر CDN)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/tlfaz-pnc-drama.m3u8?server=2\", \"quality\": \"HD\", \"status\": \"live\"}]",
    "colorA": "#b02545",
    "colorB": "#1b040a",
    "quality": "HD",
    "streamType": "hls",
    "streamUrl": "https://aspreen-tv-production.up.railway.app/live/tlfaz-pnc-drama.m3u8",
    "logoUrl": "https://aspreen-tv-production.up.railway.app/api/app/image-proxy?url=https%3A%2F%2Ftlfaz.com%2Fwp-content%2Fuploads%2F2023%2F09%2FPNC-Drama.png",
    "servers": [
      {
        "id": "server-1",
        "name": "سيرفر 1 (البث المباشر)",
        "url": "https://aspreen-tv-production.up.railway.app/live/tlfaz-pnc-drama.m3u8?server=1",
        "quality": "HD",
        "isDefault": true,
        "status": "live"
      },
      {
        "id": "server-2",
        "name": "سيرفر 2 (مباشر CDN)",
        "url": "https://aspreen-tv-production.up.railway.app/live/tlfaz-pnc-drama.m3u8?server=2",
        "quality": "HD",
        "status": "live"
      }
    ],
    "visible": true,
    "sortOrder": 52
  },
  {
    "id": "tlfaz-pnc-film",
    "code": "TLFAZ-PNC-FILM",
    "nameAr": "قناة بانوراما فيلم",
    "nameEn": "قناة بانوراما فيلم",
    "category": "movies",
    "descriptionAr": "قنوات أفلام ومسلسلات",
    "descriptionEn": "https://aspreen-tv-production.up.railway.app/api/app/image-proxy?url=https%3A%2F%2Ftlfaz.com%2Fwp-content%2Fuploads%2F2023%2F09%2FSada-El-Balad.png",
    "nowPlayingAr": "بث مباشر 24/7",
    "nowPlayingEn": "[{\"id\": \"server-1\", \"name\": \"سيرفر 1 (البث المباشر)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/tlfaz-pnc-film.m3u8?server=1\", \"quality\": \"HD\", \"isDefault\": true, \"status\": \"live\"}, {\"id\": \"server-2\", \"name\": \"سيرفر 2 (مباشر CDN)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/tlfaz-pnc-film.m3u8?server=2\", \"quality\": \"HD\", \"status\": \"live\"}]",
    "colorA": "#b02545",
    "colorB": "#1b040a",
    "quality": "HD",
    "streamType": "hls",
    "streamUrl": "https://aspreen-tv-production.up.railway.app/live/tlfaz-pnc-film.m3u8",
    "logoUrl": "https://aspreen-tv-production.up.railway.app/api/app/image-proxy?url=https%3A%2F%2Ftlfaz.com%2Fwp-content%2Fuploads%2F2023%2F09%2FSada-El-Balad.png",
    "servers": [
      {
        "id": "server-1",
        "name": "سيرفر 1 (البث المباشر)",
        "url": "https://aspreen-tv-production.up.railway.app/live/tlfaz-pnc-film.m3u8?server=1",
        "quality": "HD",
        "isDefault": true,
        "status": "live"
      },
      {
        "id": "server-2",
        "name": "سيرفر 2 (مباشر CDN)",
        "url": "https://aspreen-tv-production.up.railway.app/live/tlfaz-pnc-film.m3u8?server=2",
        "quality": "HD",
        "status": "live"
      }
    ],
    "visible": true,
    "sortOrder": 53
  },
  {
    "id": "tlfaz-sada-elbalad-drama",
    "code": "TLFAZ-SADA-ELBALAD-DRAMA",
    "nameAr": "قناة صدى البلد دراما",
    "nameEn": "قناة صدى البلد دراما",
    "category": "movies",
    "descriptionAr": "قنوات أفلام ومسلسلات",
    "descriptionEn": "https://aspreen-tv-production.up.railway.app/api/app/image-proxy?url=https%3A%2F%2Ftlfaz.com%2Fwp-content%2Fuploads%2F2023%2F09%2FSada-El-Balad.png",
    "nowPlayingAr": "بث مباشر 24/7",
    "nowPlayingEn": "[{\"id\": \"server-1\", \"name\": \"سيرفر 1 (البث المباشر)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/tlfaz-sada-elbalad-drama.m3u8?server=1\", \"quality\": \"HD\", \"isDefault\": true, \"status\": \"live\"}, {\"id\": \"server-2\", \"name\": \"سيرفر 2 (مباشر CDN)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/tlfaz-sada-elbalad-drama.m3u8?server=2\", \"quality\": \"HD\", \"status\": \"live\"}]",
    "colorA": "#b02545",
    "colorB": "#1b040a",
    "quality": "HD",
    "streamType": "hls",
    "streamUrl": "https://aspreen-tv-production.up.railway.app/live/tlfaz-sada-elbalad-drama.m3u8",
    "logoUrl": "https://aspreen-tv-production.up.railway.app/api/app/image-proxy?url=https%3A%2F%2Ftlfaz.com%2Fwp-content%2Fuploads%2F2023%2F09%2FSada-El-Balad.png",
    "servers": [
      {
        "id": "server-1",
        "name": "سيرفر 1 (البث المباشر)",
        "url": "https://aspreen-tv-production.up.railway.app/live/tlfaz-sada-elbalad-drama.m3u8?server=1",
        "quality": "HD",
        "isDefault": true,
        "status": "live"
      },
      {
        "id": "server-2",
        "name": "سيرفر 2 (مباشر CDN)",
        "url": "https://aspreen-tv-production.up.railway.app/live/tlfaz-sada-elbalad-drama.m3u8?server=2",
        "quality": "HD",
        "status": "live"
      }
    ],
    "visible": true,
    "sortOrder": 54
  },
  {
    "id": "tlfaz-sada-elbalad-2",
    "code": "TLFAZ-SADA-ELBALAD-2",
    "nameAr": "قناة صدى 2 البلد",
    "nameEn": "قناة صدى 2 البلد",
    "category": "general",
    "descriptionAr": "قنوات عربية منوعة",
    "descriptionEn": "https://aspreen-tv-production.up.railway.app/api/app/image-proxy?url=https%3A%2F%2Ftlfaz.com%2Fwp-content%2Fuploads%2F2023%2F09%2FSada-El-Balad.png",
    "nowPlayingAr": "بث مباشر 24/7",
    "nowPlayingEn": "[{\"id\": \"server-1\", \"name\": \"سيرفر 1 (البث المباشر)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/tlfaz-sada-elbalad-2.m3u8?server=1\", \"quality\": \"HD\", \"isDefault\": true, \"status\": \"live\"}, {\"id\": \"server-2\", \"name\": \"سيرفر 2 (مباشر CDN)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/tlfaz-sada-elbalad-2.m3u8?server=2\", \"quality\": \"HD\", \"status\": \"live\"}]",
    "colorA": "#2c4c78",
    "colorB": "#0a111a",
    "quality": "HD",
    "streamType": "hls",
    "streamUrl": "https://aspreen-tv-production.up.railway.app/live/tlfaz-sada-elbalad-2.m3u8",
    "logoUrl": "https://aspreen-tv-production.up.railway.app/api/app/image-proxy?url=https%3A%2F%2Ftlfaz.com%2Fwp-content%2Fuploads%2F2023%2F09%2FSada-El-Balad.png",
    "servers": [
      {
        "id": "server-1",
        "name": "سيرفر 1 (البث المباشر)",
        "url": "https://aspreen-tv-production.up.railway.app/live/tlfaz-sada-elbalad-2.m3u8?server=1",
        "quality": "HD",
        "isDefault": true,
        "status": "live"
      },
      {
        "id": "server-2",
        "name": "سيرفر 2 (مباشر CDN)",
        "url": "https://aspreen-tv-production.up.railway.app/live/tlfaz-sada-elbalad-2.m3u8?server=2",
        "quality": "HD",
        "status": "live"
      }
    ],
    "visible": true,
    "sortOrder": 55
  },
  {
    "id": "tlfaz-sada-elbalad",
    "code": "TLFAZ-SADA-ELBALAD",
    "nameAr": "قناة صدى البلد",
    "nameEn": "قناة صدى البلد",
    "category": "movies",
    "descriptionAr": "قنوات أفلام ومسلسلات",
    "descriptionEn": "https://aspreen-tv-production.up.railway.app/api/app/image-proxy?url=https%3A%2F%2Ftlfaz.com%2Fwp-content%2Fuploads%2F2023%2F09%2FSada-El-Balad.png",
    "nowPlayingAr": "بث مباشر 24/7",
    "nowPlayingEn": "[{\"id\": \"server-1\", \"name\": \"سيرفر 1 (البث المباشر)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/tlfaz-sada-elbalad.m3u8?server=1\", \"quality\": \"HD\", \"isDefault\": true, \"status\": \"live\"}, {\"id\": \"server-2\", \"name\": \"سيرفر 2 (مباشر CDN)\", \"url\": \"https://aspreen-tv-production.up.railway.app/live/tlfaz-sada-elbalad.m3u8?server=2\", \"quality\": \"HD\", \"status\": \"live\"}]",
    "colorA": "#b02545",
    "colorB": "#1b040a",
    "quality": "HD",
    "streamType": "hls",
    "streamUrl": "https://aspreen-tv-production.up.railway.app/live/tlfaz-sada-elbalad.m3u8",
    "logoUrl": "https://aspreen-tv-production.up.railway.app/api/app/image-proxy?url=https%3A%2F%2Ftlfaz.com%2Fwp-content%2Fuploads%2F2023%2F09%2FSada-El-Balad.png",
    "servers": [
      {
        "id": "server-1",
        "name": "سيرفر 1 (البث المباشر)",
        "url": "https://aspreen-tv-production.up.railway.app/live/tlfaz-sada-elbalad.m3u8?server=1",
        "quality": "HD",
        "isDefault": true,
        "status": "live"
      },
      {
        "id": "server-2",
        "name": "سيرفر 2 (مباشر CDN)",
        "url": "https://aspreen-tv-production.up.railway.app/live/tlfaz-sada-elbalad.m3u8?server=2",
        "quality": "HD",
        "status": "live"
      }
    ],
    "visible": true,
    "sortOrder": 56
  }
];

export const DEFAULT_SETTINGS: Record<string, string> = {
  branding: JSON.stringify({ name: "TVORA", tagline: "Cinema. Series. Live TV Channels." }),
  demoMode: JSON.stringify({ enabled: false, reason: "", tmdbConfigured: true }),
  homepageSections: JSON.stringify(["hero", "trending", "featured", "new", "arabic", "channels", "topRated"]),
  maintenanceMode: JSON.stringify({ enabled: false }),
};

let _catalogCache: Dict[] | null = null;

export function getLocalCatalog(): Dict[] {
  if (_catalogCache) return _catalogCache;
  try {
    const rawPath = path.join(process.cwd(), "data", "3isk_catalog.json");
    const gzPath = path.join(process.cwd(), "data", "3isk_catalog.json.gz");
    let jsonStr = "";
    if (fs.existsSync(rawPath)) {
      jsonStr = fs.readFileSync(rawPath, "utf-8");
    } else if (fs.existsSync(gzPath)) {
      const buffer = fs.readFileSync(gzPath);
      jsonStr = zlib.gunzipSync(buffer).toString("utf-8");
    }

    if (jsonStr) {
      const raw = JSON.parse(jsonStr);
      const list: Dict[] = [];

      const cleanGenreList = (rawGenres: any, isMovie: boolean, titleText: string): string => {
        let arr: string[] = [];
        if (Array.isArray(rawGenres)) {
          arr = rawGenres.map((g) => String(g).replace(/&amp;/g, "&").trim());
        } else if (typeof rawGenres === "string") {
          try {
            const parsed = JSON.parse(rawGenres);
            if (Array.isArray(parsed)) {
              arr = parsed.map((g) => String(g).replace(/&amp;/g, "&").trim());
            } else {
              arr = [rawGenres.replace(/&amp;/g, "&").trim()];
            }
          } catch {
            arr = [rawGenres.replace(/&amp;/g, "&").trim()];
          }
        }

        // Add standard TVORA categorization
        if (isMovie) {
          if (!arr.includes("Turkish Movies")) arr.push("Turkish Movies");
          if (!arr.includes("أفلام تركية")) arr.push("أفلام تركية");
          if (titleText.includes("مدبلج")) {
            if (!arr.includes("Arabic Movies")) arr.push("Arabic Movies");
            if (!arr.includes("أفلام عربية")) arr.push("أفلام عربية");
          }
        } else {
          if (!arr.includes("Turkish Series")) arr.push("Turkish Series");
          if (!arr.includes("مسلسلات تركية")) arr.push("مسلسلات تركية");
          if (titleText.includes("مدبلج")) {
            if (!arr.includes("Arabic Series")) arr.push("Arabic Series");
            if (!arr.includes("مسلسلات عربية")) arr.push("مسلسلات عربية");
          }
        }

        // Auto-detect and populate rich genres (Action, Crime, Comedy, Romance, Horror, etc.)
        const lowerText = titleText.toLowerCase();
        const GENRE_RULES: Array<{ genre: string; ar: string; keywords: string[] }> = [
          { genre: "Action", ar: "أكشن", keywords: ["اكشن", "أكشن", "قتال", "مواجهة", "عصابات", "صراع", "معارك", "انتقام", "سلاح", "مطاردة", "action"] },
          { genre: "Crime", ar: "جريمة", keywords: ["جريمة", "عصابة", "عصابات", "مافيا", "مخدرات", "شرطة", "تحقيق", "سجن", "قتل", "crime", "gang"] },
          { genre: "Comedy", ar: "كوميديا", keywords: ["كوميد", "مضحك", "فكاه", "مرح", "سخرية", "طريف", "ضحك", "comedy"] },
          { genre: "Romance", ar: "رومانسي", keywords: ["رومانس", "حب", "عاطف", "عشق", "غرام", "حبيب", "زواج", "romance", "love"] },
          { genre: "Horror", ar: "رعب", keywords: ["رعب", "جن", "سحر", "شيطان", "لعنة", "مخيف", "ارواح", "أرواح", "siccin", "horror"] },
          { genre: "Mystery", ar: "غموض", keywords: ["غموض", "سر", "اسرار", "أسرار", "لغز", "مجهول", "اختفاء", "مريب", "تحري", "mystery", "thriller"] },
          { genre: "History", ar: "تاريخي", keywords: ["تاريخ", "عثمان", "ارطغرل", "أرطغرل", "سلطان", "دولة", "قرن", "قديم", "تاريخي", "history", "historical"] },
          { genre: "Family", ar: "عائلي", keywords: ["عائل", "اسر", "أسري", "اطفال", "أطفال", "ابناء", "أبناء", "ام", "أم", "اب", "أب", "اخوة", "أخوة", "family"] },
          { genre: "Adventure", ar: "مغامرة", keywords: ["مغامر", "رحلة", "استكشاف", "خطر", "سفر", "adventure"] },
          { genre: "Animation", ar: "رسوم متحركة", keywords: ["رسوم", "كرتون", "انيميشن", "انمي", "تحريك", "animation"] },
          { genre: "Fantasy", ar: "فانتازيا", keywords: ["فانتازيا", "خيال", "اسطورة", "أسطورة", "قوى", "سحر", "fantasy"] },
          { genre: "War", ar: "حرب", keywords: ["حرب", "معركة", "جيش", "جنود", "قتال", "دفاع", "وطن", "شهيد", "war"] },
          { genre: "Drama", ar: "دراما", keywords: ["دراما", "صدمة", "حزن", "معاناة", "مأساة", "حياة", "قصة", "drama"] },
        ];

        let matchedAny = false;
        for (const rule of GENRE_RULES) {
          if (rule.keywords.some((kw) => lowerText.includes(kw))) {
            arr.push(rule.genre);
            arr.push(rule.ar);
            matchedAny = true;
          }
        }
        if (!matchedAny) {
          arr.push("Drama", "دراما");
        }

        return JSON.stringify(Array.from(new Set(arr)));
      };

      for (const m of Object.values(raw.movies || {})) {
        const movie = m as Dict;
        const text = `${movie.titleAr || ""} ${movie.originalTitle || ""} ${movie.synopsisAr || ""}`;
        const rating = typeof movie.rating === "number" ? movie.rating : 8.5;
        list.push({
          ...movie,
          genres: cleanGenreList(movie.genres, true, text),
          country: movie.country || "تركيا",
          visible: true,
          featured: rating >= 8.9 || movie.slug?.includes("centilmen") || movie.slug?.includes("siccin"),
          trending: rating >= 8.0,
          isNew: (movie.releaseYear || 0) >= 2023,
        });
      }

      for (const s of Object.values(raw.series || {})) {
        const ser = s as Dict;
        const text = `${ser.titleAr || ""} ${ser.originalTitle || ""} ${ser.synopsisAr || ""}`;
        const rating = typeof ser.rating === "number" ? ser.rating : 8.8;
        list.push({
          ...ser,
          genres: cleanGenreList(ser.genres, false, text),
          country: ser.country || "تركيا",
          visible: true,
          featured: rating >= 9.1 || ser.slug?.includes("kurulus") || ser.slug?.includes("ertugrul") || ser.slug?.includes("cukur"),
          trending: rating >= 8.0,
          isNew: (ser.releaseYear || 0) >= 2023,
        });
      }

      _catalogCache = list;
      return list;
    }
  } catch (err) {
    console.error("[TVORA Catalog] Error loading local catalog fallback:", err);
  }
  return [];
}
