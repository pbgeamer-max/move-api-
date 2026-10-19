/**
 * TVORA Firebase Firestore Seeder
 * Seeds the complete catalog (movies, series, episodes, live TV channels, users, site settings)
 * into your Firebase Firestore project.
 *
 * Usage:
 *   node scripts/seed-firebase.mjs
 */
import admin from "firebase-admin";
import crypto from "crypto";
import fs from "fs";
import path from "path";

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

// 1. Initialize Firebase Admin
if (admin.apps.length === 0) {
  const localKeyPath = path.join(process.cwd(), "serviceAccountKey.json");
  if (fs.existsSync(localKeyPath)) {
    try {
      const sa = JSON.parse(fs.readFileSync(localKeyPath, "utf-8"));
      admin.initializeApp({
        credential: admin.credential.cert(sa),
        projectId: sa.project_id,
      });
      console.log(`Loaded serviceAccountKey.json for project: ${sa.project_id}`);
    } catch (e) {
      console.error("Error reading serviceAccountKey.json:", e);
    }
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      admin.initializeApp({
        credential: admin.credential.cert(sa),
        projectId: sa.project_id || process.env.FIREBASE_PROJECT_ID,
      });
    } catch (e) {
      console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:", e);
    }
  } else if (
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  ) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      }),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
  } else if (process.env.FIREBASE_PROJECT_ID) {
    admin.initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID });
  } else {
    console.error("❌ Firebase credentials not found!");
    console.log("Please set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in your environment.");
    process.exit(1);
  }
}

const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });

async function main() {
  console.log("🚀 Starting TVORA Firebase Firestore seeding...");

  // ── 1. Users ─────────────────────────────────────────────────────────────
  console.log("Creating users...");
  const users = [
    { id: "usr_admin", email: "admin@tvora.tv", name: "TVORA Admin", passwordHash: hashPassword("tvora-admin-2025"), role: "admin", preferredLanguage: "ar", plan: "premium" },
  ];
  for (const u of users) {
    await db.collection("users").doc(u.id).set({ ...u, createdAt: new Date(), updatedAt: new Date() });
  }

  // ── 2. Movies ────────────────────────────────────────────────────────────
  console.log("Creating movies...");
  const movies = [
    {
      id: "mov_horizon", slug: "the-last-horizon", type: "movie", titleAr: "الأفق الأخير", titleEn: "The Last Horizon",
      originalTitle: "The Last Horizon", synopsisAr: "عندما يستيقظ هيكل فضائي عملاق أمام سواحل الأرض بعد قرون من الصمت، تُرسَل عالمة جيولوجيا في مهمة اكتشاف أخيرة لتكتشف أن الكائنات القديمة لم تكن تنام… بل كانت تنتظر. ملحمة خيال علمي عن آخر حدود يعرفها البشر.",
      synopsisEn: "When a colossal alien structure awakens off Earth's coast after centuries of silence, a geologist is sent on a final expedition — and discovers the ancient beings were never asleep, only waiting. An epic sci-fi journey to the last horizon humanity will ever know.",
      posterUrl: "/images/poster-horizon.jpg", backdropUrl: "/images/hero-horizon.jpg",
      releaseYear: 2025, releaseDate: "2025-09-12", genres: ["Science Fiction", "Adventure", "Mystery"],
      runtime: 142, rating: 8.6, ratingSource: "TVORA Editorial", ageRating: "+13", featured: true, trending: true, isNew: true, premium: false, visible: true,
      director: "Layla Mansour", cast: ["Omar Nasser", "Sara Haddad", "Elias Vogt", "Nadia Kassem"],
      country: "International", contentLang: "en", playbackType: "demo", playbackUrl: "/media/demo-film.mp4", sortOrder: 1,
    },
    {
      id: "mov_shadows", slug: "city-of-shadows", type: "movie", titleAr: "مدينة الظلال", titleEn: "City of Shadows",
      synopsisAr: "في مدينة لا تشرق فيها الشمس قط، يتبع محققٌ قاتلاً متسلسلاً يترك خلفه صوراً فوتوغرافية لضحايا لم يموتوا بعد. فيلم نوار نفسٍ يطمس الخط بين الحقيقة والهلوسة.",
      synopsisEn: "In a city where the sun never rises, a detective hunts a serial killer who leaves photographs of victims who haven't died yet. A psychological noir that blurs the line between truth and hallucination.",
      posterUrl: "/images/poster-shadows.jpg", backdropUrl: "/images/poster-shadows.jpg",
      releaseYear: 2024, releaseDate: "2024-10-31", genres: ["Thriller", "Crime", "Mystery"],
      runtime: 118, rating: 8.1, ratingSource: "TVORA Editorial", ageRating: "+16", featured: true, trending: true, isNew: false, premium: false, visible: true,
      director: "Viktor Hall", cast: ["Idris Malen", "Clara Bosan", "Yusuf Amin"],
      country: "International", contentLang: "en", playbackType: "demo", playbackUrl: "/media/demo-film.mp4", sortOrder: 2,
    },
    {
      id: "mov_frequency", slug: "the-silent-frequency", type: "movie", titleAr: "التردد الصامت", titleEn: "The Silent Frequency",
      synopsisAr: "مشغّل إذاعة ليلي في بلدة جبلية معزولة يتلقى بثاً غريباً يحمل أصواتاً لمقيمين اختفوا قبل أربعين عاماً. كل ليلة، تأتي الإشارة أقرب… وتكشف شيئاً واحداً إضافياً عن الليلة التي لم يعد منها أحد.",
      synopsisEn: "A late-night radio operator in an isolated mountain town receives a strange broadcast carrying the voices of residents who vanished forty years ago. Each night the signal gets closer — and reveals one more detail about the night no one returned from.",
      posterUrl: "/images/poster-frequency.jpg", backdropUrl: "/images/poster-frequency.jpg",
      releaseYear: 2025, releaseDate: "2025-06-20", genres: ["Science Fiction", "Mystery", "Thriller"],
      runtime: 126, rating: 8.2, ratingSource: "TVORA Editorial", ageRating: "+13", featured: true, trending: true, isNew: true, premium: false, visible: true,
      director: "Ana Reyes", cast: ["Tom Karlsen", "Mira Sadek", "Paul Wenner"],
      country: "International", contentLang: "en", playbackType: "demo", playbackUrl: "/media/demo-film.mp4", sortOrder: 3,
    },
    {
      id: "mov_desert", slug: "desert-whisper", type: "movie", titleAr: "همس الصحراء", titleEn: "Desert Whisper",
      synopsisAr: "في أهوار جنوب العراق، يعود صيادٌ شاب إلى قريته التي أُفرغت من سكانها ليجد والده المفقود يرسل له رسائل عبر أغاني المستنقعات. دراما إنسانية شاعرية عن الذاكرة والوطن.",
      synopsisEn: "In the marshes of southern Iraq, a young fisherman returns to his emptied village to find his missing father sending messages through the songs of the wetlands. A poetic human drama about memory and belonging.",
      posterUrl: "/images/poster-desert.jpg", backdropUrl: "/images/poster-desert.jpg",
      releaseYear: 2024, releaseDate: "2024-11-05", genres: ["Drama", "Arabic Movies"],
      runtime: 109, rating: 8.4, ratingSource: "TVORA Editorial", ageRating: "+13", featured: false, trending: true, isNew: false, premium: false, visible: true,
      director: "Hussein Al-Ali", cast: ["Ammar Zaidan", "Rana Al-Obeidi", "Sajad Kareem"],
      country: "Iraq", contentLang: "ar", playbackType: "demo", playbackUrl: "/media/demo-film.mp4", sortOrder: 4,
    },
    {
      id: "mov_dawn", slug: "dawn-pursuit", type: "movie", titleAr: "مطاردة الفجر", titleEn: "Dawn Pursuit",
      synopsisAr: "سائقة سيارات إسعاف سابقة تجبر على قيادة آخر رحلة عبر مدينة محاصرة قبل شروق الشمس، مقابل أن تستعيد ابنتها. سباق مشوق من باب إلى باب لا يتوقف للتنفس.",
      synopsisEn: "A former ambulance driver is forced to run one last gauntlet across a locked-down city before sunrise — the price: getting her daughter back. A relentless door-to-door chase thriller.",
      releaseYear: 2024, releaseDate: "2024-03-15", genres: ["Action", "Thriller"],
      runtime: 98, rating: 7.4, ratingSource: "TVORA Editorial", ageRating: "+16", featured: false, trending: false, isNew: true, premium: false, visible: true,
      director: "Marc Delon", cast: ["Lina Petrov", "Adam Khoury", "Sofia Renn"],
      country: "International", contentLang: "en", playbackType: "demo", playbackUrl: "/media/demo-film.mp4", sortOrder: 5,
    },
    {
      id: "mov_midnight", slug: "midnight-terminal", type: "movie", titleAr: "محطة منتصف الليل", titleEn: "Midnight Terminal",
      synopsisAr: "آخر قطار ليلي، راكب واحد بتذكرة إلى محطة لا تظهر على أي خريطة. كلما اقترب القطار من وجهته، اختفى عشرون دقيقة من ذاكرة الجميع على المتنه.",
      synopsisEn: "The last night train. One passenger, holding a ticket to a station that appears on no map. The closer the train gets, the more twenty minutes vanish from everyone's memory aboard.",
      posterUrl: "/images/poster-midnight.jpg", backdropUrl: "/images/poster-midnight.jpg",
      releaseYear: 2025, releaseDate: "2025-01-30", genres: ["Thriller", "Horror"],
      runtime: 104, rating: 7.7, ratingSource: "TVORA Editorial", ageRating: "+16", featured: false, trending: false, isNew: false, premium: false, visible: true,
      director: "Kim Do-hyun", cast: ["Lee Seo-yun", "Rami Fadel", "Jun Park"],
      country: "International", contentLang: "ko", playbackType: "demo", playbackUrl: "/media/demo-film.mp4", sortOrder: 6,
    },
    {
      id: "mov_paper", slug: "paper-boats", type: "movie", titleAr: "قوارب ورقية", titleEn: "Paper Boats",
      synopsisAr: "فيلم رسوم متحركة دافئ عن فتاة تصنع قوارباً ورقية من رسائل جدتها القديمة وتطلقها في النهر، لتكتشف أن كل قارب يعود إليها حاملاً قصة لم تحدث بعد.",
      synopsisEn: "A warm animated feature about a girl who folds paper boats from her grandmother's old letters and sets them down the river — only to find each boat returning with a story that hasn't happened yet.",
      releaseYear: 2024, releaseDate: "2024-07-18", genres: ["Animation", "Family", "Drama"],
      runtime: 92, rating: 8.0, ratingSource: "TVORA Editorial", ageRating: "PG", featured: false, trending: false, isNew: false, premium: false, visible: true,
      director: "Yuki Tanabe", cast: ["Mai Hoshino", "Kareem Nader", "Elle Tran"],
      country: "International", contentLang: "en", playbackType: "demo", playbackUrl: "/media/demo-film.mp4", sortOrder: 7,
    },
  ];

  for (const m of movies) {
    await db.collection("titles").doc(m.id).set({ ...m, createdAt: new Date(), updatedAt: new Date() });
  }

  // ── 3. Series ────────────────────────────────────────────────────────────
  console.log("Creating series & episodes...");
  const series = [
    {
      id: "ser_sands", slug: "blood-of-the-sands", type: "series", titleAr: "سلالة الرمال", titleEn: "Blood of the Sands",
      synopsisAr: "في إمارة صحراوية على شفير التاريخ، تتشابك مصائر عائلتي نفط وتوابل في صراع يمتد ثلاثة عقود: سلطة، حب ممنوع، وبئر واحد يعرف سرّ القبيلة. ملحمة عربية متعددة المواسم.",
      synopsisEn: "In a desert emirate on the edge of history, the fates of an oil dynasty and a spice merchant family entangle across three decades — power, forbidden love, and one well that knows the tribe's secret. A multi-season Arabic epic.",
      posterUrl: "/images/poster-sands.jpg", backdropUrl: "/images/hero-sands.jpg",
      releaseYear: 2023, releaseDate: "2023-10-01", genres: ["Drama", "Arabic Series", "History"],
      rating: 8.8, ratingSource: "TVORA Editorial", ageRating: "+16", featured: true, trending: true, isNew: false, premium: false, visible: true,
      director: "Mahmoud Al-Rashed", cast: ["Basem Farah", "Aisha Al-Mansouri", "Kareem Nader", "Widad Ammar"],
      country: "Arab Region", contentLang: "ar", playbackType: "demo", playbackUrl: "/media/demo-film.mp4", sortOrder: 1,
      seasons: 3, epsPerSeason: [8, 8, 6],
    },
    {
      id: "ser_station9", slug: "station-nine", type: "series", titleAr: "المحطة التاسعة", titleEn: "Station Nine",
      synopsisAr: "طاقم محطة مدارية مهجورة جزئياً يستقبل طلب إرساء من مركبة أُلغيت قبل عشرين عاماً. كل موسم يكشف طابقاً آخر من المحطة… وطاقماً آخر نسوا أنهم على متنها.",
      synopsisEn: "The crew of a partially abandoned orbital station receives a docking request from a ship decommissioned twenty years ago. Each season reveals another deck of the station — and another crew that forgot they were aboard.",
      posterUrl: "/images/poster-station9.jpg", backdropUrl: "/images/poster-station9.jpg",
      releaseYear: 2024, releaseDate: "2024-09-15", genres: ["Science Fiction", "Thriller"],
      rating: 8.4, ratingSource: "TVORA Editorial", ageRating: "+16", featured: true, trending: true, isNew: true, premium: false, visible: true,
      director: "Priya Chandran", cast: ["Mira Sadek", "Alex Duval", "Sara Haddad"],
      country: "International", contentLang: "en", playbackType: "demo", playbackUrl: "/media/demo-film.mp4", sortOrder: 2,
      seasons: 2, epsPerSeason: [8, 6],
    },
    {
      id: "ser_bosphorus", slug: "bosphorus-nights", type: "series", titleAr: "ليالي البوسفور", titleEn: "Bosphorus Nights",
      synopsisAr: "على ضفاف إسطنبول، تدير طبيبة مخابز صغيرة شجرتها العائلية في صمت، حتى يعود شاب يحمل الاسم نفسه لجدها المفقود. دراما رومانسية تركية ببطءِ مدٍّ وجزر.",
      synopsisEn: "On the shores of Istanbul, a baker quietly runs her family's legacy — until a young man arrives carrying the same name as her long-lost grandfather. A Turkish romantic drama moving at the pace of tides.",
      posterUrl: "/images/poster-bosphorus.jpg", backdropUrl: "/images/poster-bosphorus.jpg",
      releaseYear: 2023, releaseDate: "2023-11-10", genres: ["Drama", "Turkish Series", "Romance"],
      rating: 8.1, ratingSource: "TVORA Editorial", ageRating: "+13", featured: false, trending: true, isNew: false, premium: false, visible: true,
      director: "Emre Yalçın", cast: ["Deniz Arslan", "Kerem Aydın", "Leyla Demir"],
      country: "Türkiye", contentLang: "tr", playbackType: "demo", playbackUrl: "/media/demo-film.mp4", sortOrder: 3,
      seasons: 2, epsPerSeason: [10, 8],
    },
    {
      id: "ser_andalus", slug: "andalus", type: "series", titleAr: "الأندلس", titleEn: "Andalus",
      synopsisAr: "قرطبة، سنة ٩٩٩: فتيان من ثلاث ديانات يدرسون في المدرسة العليا نفسها، وتاريخٌ يعرف أن أياً منهم لن يكون هنا بعد خمسين عاماً. ملحمة تاريخية عن آخر قرن ذهبي.",
      synopsisEn: "Cordoba, 999 AD: three boys of three faiths study in the same great school, and history already knows none of them will be here in fifty years. A historical epic about the last golden century.",
      posterUrl: "/images/poster-andalus.jpg", backdropUrl: "/images/poster-andalus.jpg",
      releaseYear: 2024, releaseDate: "2024-02-20", genres: ["History", "Drama", "Arabic Series"],
      rating: 8.6, ratingSource: "TVORA Editorial", ageRating: "+16", featured: false, trending: true, isNew: false, premium: false, visible: true,
      director: "Mahmoud Al-Rashed", cast: ["Firas Doumani", "Hala Sabri", "Ahmed Benali"],
      country: "Arab Region", contentLang: "ar", playbackType: "demo", playbackUrl: "/media/demo-film.mp4", sortOrder: 4,
      seasons: 2, epsPerSeason: [8, 8],
    },
  ];

  for (const s of series) {
    const { seasons, epsPerSeason, ...titleData } = s;
    await db.collection("titles").doc(s.id).set({ ...titleData, createdAt: new Date(), updatedAt: new Date() });

    for (let seasonNum = 1; seasonNum <= seasons; seasonNum++) {
      const seasonId = `${s.id}_s${seasonNum}`;
      await db.collection("seasons").doc(seasonId).set({
        id: seasonId,
        titleId: s.id,
        number: seasonNum,
        titleAr: `الموسم ${seasonNum}`,
        titleEn: `Season ${seasonNum}`,
      });

      const epCount = epsPerSeason[seasonNum - 1] || 6;
      for (let epNum = 1; epNum <= epCount; epNum++) {
        const epId = `${seasonId}_e${epNum}`;
        await db.collection("episodes").doc(epId).set({
          id: epId,
          seasonId,
          titleId: s.id,
          number: epNum,
          titleAr: `الحلقة ${epNum}`,
          titleEn: `Episode ${epNum}`,
          synopsisAr: `الحلقة ${epNum} من الموسم ${seasonNum} من ${s.titleAr}.`,
          synopsisEn: `Episode ${epNum} of Season ${seasonNum} of ${s.titleEn}.`,
          runtime: 45,
          playbackType: "demo",
          playbackUrl: "/media/demo-film.mp4",
          stillSeed: `${s.slug}-s${seasonNum}e${epNum}`,
        });
      }
    }
  }

  // ── 4. Live TV Channels ──────────────────────────────────────────────────
  console.log("Creating Live TV channels...");
  const channels = [
    { id: "ch_sports1", code: "TVORA-SPORTS-1", nameAr: "تڤورا سبورت 1", nameEn: "TVORA Sports 1", category: "sports", colorA: "#C8A24B", colorB: "#151310", quality: "4K",
      descriptionAr: "القناة الرياضية الأولى — أبرز المباريات والبطولات على مدار الساعة.", descriptionEn: "The flagship sports channel — top matches and tournaments around the clock.",
      nowPlayingAr: "ملخص الجولة الكبرى — تحليل واستوديو", nowPlayingEn: "Round of the week — highlights & studio analysis", streamType: "demo", streamUrl: "/media/demo-match.mp4", visible: true, sortOrder: 1 },
    { id: "ch_sports2", code: "TVORA-SPORTS-2", nameAr: "تڤورا سبورت 2", nameEn: "TVORA Sports 2", category: "sports", colorA: "#D97742", colorB: "#171009", quality: "HD",
      descriptionAr: "البطولات القارية والاستوديوهات التحليلية الليلية.", descriptionEn: "Continental tournaments and late-night analysis studios.",
      nowPlayingAr: "استوديو ما قبل المباراة", nowPlayingEn: "Pre-match studio", streamType: "demo", streamUrl: "/media/demo-match.mp4", visible: true, sortOrder: 2 },
    { id: "ch_sportsiq", code: "TVORA-SPORTS-IQ", nameAr: "تڤورا سبورت العراق", nameEn: "TVORA Sports Iraq", category: "sports", colorA: "#4E9B6F", colorB: "#0B120E", quality: "HD",
      descriptionAr: "الكرة العراقية أولاً — الدوري المحلي والمنتخب.", descriptionEn: "Iraqi football first — the local league and the national team.",
      nowPlayingAr: "أهداف الدوري العراقي — الموسم الحالي", nowPlayingEn: "Iraq Stars League goals — current season", streamType: "demo", streamUrl: "/media/demo-match.mp4", visible: true, sortOrder: 3 },
    { id: "ch_cinema", code: "TVORA-CINEMA", nameAr: "تڤورا سينما", nameEn: "TVORA Cinema", category: "movies", colorA: "#9A8FC2", colorB: "#0F0E14", quality: "4K",
      descriptionAr: "أفلام العالم الأولى — عروض أولى كل ليلة.", descriptionEn: "World cinema premieres — a new first-run film every night.",
      nowPlayingAr: "فيلم الليلة: ملحمة الصحراء", nowPlayingEn: "Tonight: Sands of the Epic", streamType: "demo", streamUrl: "/media/demo-film.mp4", visible: true, sortOrder: 4 },
    { id: "ch_action", code: "TVORA-ACTION", nameAr: "تڤورا أكشن", nameEn: "TVORA Action", category: "movies", colorA: "#C25B5B", colorB: "#150C0C", quality: "HD",
      descriptionAr: "أكشن لا يتوقف — مطاردات وانفجارات وقصص انتقام.", descriptionEn: "Non-stop action — chases, explosions and revenge stories.",
      nowPlayingAr: "ماراثون الأكشن — أربع أفلام متتالية", nowPlayingEn: "Action marathon — four films back to back", streamType: "demo", streamUrl: "/media/demo-film.mp4", visible: true, sortOrder: 5 },
    { id: "ch_classics", code: "TVORA-CLASSICS", nameAr: "تڤورا كلاسيك", nameEn: "TVORA Classics", category: "movies", colorA: "#B08A50", colorB: "#131009", quality: "HD",
      descriptionAr: "الكنوز السينمائية من كل العصور، مُرممة بجودة عالية.", descriptionEn: "Cinematic treasures from every era, remastered in high quality.",
      nowPlayingAr: "كلاسيكيات الأربعينيات", nowPlayingEn: "Forties classics", streamType: "demo", streamUrl: "/media/demo-film.mp4", visible: true, sortOrder: 6 },
    { id: "ch_drama", code: "TVORA-DRAMA", nameAr: "تڤورا دراما", nameEn: "TVORA Drama", category: "series", colorA: "#8FB8D8", colorB: "#0C1014", quality: "HD",
      descriptionAr: "مسلسلات درامية عالمية بترجمة احترافية وحلقات أولاً بأول.", descriptionEn: "Global drama series with professional subtitles and weekly episodes.",
      nowPlayingAr: "الموسم الجديد: أزقة الأندلس", nowPlayingEn: "New season: Alleys of Andalus", streamType: "demo", streamUrl: "/media/demo-film.mp4", visible: true, sortOrder: 7 },
    { id: "ch_turkish", code: "TVORA-TURKISH", nameAr: "تڤورا تركي", nameEn: "TVORA Turkish", category: "series", colorA: "#B04A4A", colorB: "#140B0B", quality: "HD",
      descriptionAr: "أشهر المسلسلات التركية المدبلجة والمترجمة.", descriptionEn: "The most beloved Turkish series, dubbed and subtitled.",
      nowPlayingAr: "حكاية البوسفور — الحلقة 14", nowPlayingEn: "Bosphorus Tale — Episode 14", streamType: "demo", streamUrl: "/media/demo-film.mp4", visible: true, sortOrder: 8 },
    { id: "ch_kids", code: "TVORA-KIDS", nameAr: "تڤورا كيدز", nameEn: "TVORA Kids", category: "kids", colorA: "#D8A24B", colorB: "#151007", quality: "HD",
      descriptionAr: "رسوم متحركة وبرامج آمنة ومرحة لكل الأعمار.", descriptionEn: "Safe, joyful animation and shows for every age.",
      nowPlayingAr: "سلسلة مغامرات الفضاء", nowPlayingEn: "Space adventures series", streamType: "demo", streamUrl: "/media/demo-film.mp4", visible: true, sortOrder: 9 },
    { id: "ch_docu", code: "TVORA-DOCU", nameAr: "تڤورا وثائقي", nameEn: "TVORA Docu", category: "documentary", colorA: "#9FB7CB", colorB: "#0C0F12", quality: "4K",
      descriptionAr: "وثائقيات تاريخ وعلوم وحضارات بجودة فائقة.", descriptionEn: "History, science and civilizations documentaries in ultra HD.",
      nowPlayingAr: "أسرار المحيط العميق", nowPlayingEn: "Secrets of the deep ocean", streamType: "demo", streamUrl: "/media/demo-film.mp4", visible: true, sortOrder: 10 },
    { id: "ch_news", code: "TVORA-NEWS", nameAr: "تڤورا نيوز", nameEn: "TVORA News", category: "news", colorA: "#B8B8BE", colorB: "#101012", quality: "HD",
      descriptionAr: "أخبار العالم والعربية كل ساعة، بلا توقف.", descriptionEn: "World and Arab news every hour, around the clock.",
      nowPlayingAr: "نشرة الأخبار الرئيسية", nowPlayingEn: "Main evening bulletin", streamType: "demo", streamUrl: "/media/demo-film.mp4", visible: true, sortOrder: 11 },
  ];

  for (const c of channels) {
    await db.collection("channels").doc(c.id).set({ ...c, createdAt: new Date(), updatedAt: new Date() });
  }

  // ── 5. Site Settings ─────────────────────────────────────────────────────
  console.log("Setting site configurations...");
  const settings = [
    { key: "branding", value: JSON.stringify({ name: "TVORA", tagline: "Cinema. Series. Live TV Channels." }) },
    { key: "demoMode", value: JSON.stringify({ enabled: true, reason: "Firebase Firestore mode enabled.", tmdbConfigured: false }) },
    { key: "homepageSections", value: JSON.stringify(["hero", "trending", "featured", "new", "arabic", "channels", "topRated"]) },
    { key: "maintenanceMode", value: JSON.stringify({ enabled: false }) },
  ];
  for (const s of settings) {
    await db.collection("site_settings").doc(s.key).set(s);
  }

  console.log("✅ Seeding completed successfully in Firebase Firestore!");
}

main().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
