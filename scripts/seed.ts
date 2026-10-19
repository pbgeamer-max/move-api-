/**
 * TVORA seed — rich demo catalog (movies, series, episodes, football).
 * All content is original demo data, clearly labeled via site settings demoMode=true.
 */
import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

async function main() {
  console.log('Seeding TVORA…');

  await prisma.watchProgress.deleteMany();
  await prisma.userList.deleteMany();
  await prisma.episode.deleteMany();
  await prisma.season.deleteMany();
  await prisma.channel.deleteMany();
  await prisma.title.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  await prisma.siteSetting.deleteMany();

  // ── Users ────────────────────────────────────────────────────────────────
  await prisma.user.createMany({
    data: [
      { email: 'admin@tvora.tv', name: 'TVORA Admin', passwordHash: hashPassword('tvora-admin-2025'), role: 'admin', preferredLanguage: 'ar' },
    ],
  });

  // ── Movies ───────────────────────────────────────────────────────────────
  const movies: Array<Record<string, unknown>> = [
    {
      slug: 'the-last-horizon', type: 'movie', titleAr: 'الأفق الأخير', titleEn: 'The Last Horizon',
      originalTitle: 'The Last Horizon', synopsisAr: 'عندما يستيقظ هيكل فضائي عملاق أمام سواحل الأرض بعد قرون من الصمت، تُرسَل عالمة جيولوجيا في مهمة اكتشاف أخيرة لتكتشف أن الكائنات القديمة لم تكن تنام… بل كانت تنتظر. ملحمة خيال علمي عن آخر حدود يعرفها البشر.',
      synopsisEn: 'When a colossal alien structure awakens off Earth\'s coast after centuries of silence, a geologist is sent on a final expedition — and discovers the ancient beings were never asleep, only waiting. An epic sci-fi journey to the last horizon humanity will ever know.',
      posterUrl: '/images/poster-horizon.jpg', backdropUrl: '/images/hero-horizon.jpg',
      releaseYear: 2025, releaseDate: '2025-09-12', genres: JSON.stringify(['Science Fiction', 'Adventure', 'Mystery']),
      runtime: 142, rating: 8.6, ageRating: '+13', featured: true, trending: true, isNew: true,
      director: 'Layla Mansour', cast: JSON.stringify(['Omar Nasser', 'Sara Haddad', 'Elias Vogt', 'Nadia Kassem']),
      country: 'International', contentLang: 'en', playbackType: 'demo', playbackUrl: '/media/demo-film.mp4', sortOrder: 1,
    },
    {
      slug: 'city-of-shadows', type: 'movie', titleAr: 'مدينة الظلال', titleEn: 'City of Shadows',
      synopsisAr: 'في مدينة لا تشرق فيها الشمس قط، يتبع محققٌ قاتلاً متسلسلاً يترك خلفه صوراً فوتوغرافية لضحايا لم يموتوا بعد. فيلم نوار نفسٍ يطمس الخط بين الحقيقة والهلوسة.',
      synopsisEn: 'In a city where the sun never rises, a detective hunts a serial killer who leaves photographs of victims who haven\'t died yet. A psychological noir that blurs the line between truth and hallucination.',
      posterUrl: '/images/poster-shadows.jpg', backdropUrl: '/images/poster-shadows.jpg',
      releaseYear: 2024, releaseDate: '2024-10-31', genres: JSON.stringify(['Thriller', 'Crime', 'Mystery']),
      runtime: 118, rating: 8.1, ageRating: '+16', featured: true, trending: true,
      director: 'Viktor Hall', cast: JSON.stringify(['Idris Malen', 'Clara Bosan', 'Yusuf Amin']),
      country: 'International', contentLang: 'en', playbackType: 'demo', playbackUrl: '/media/demo-film.mp4', sortOrder: 2,
    },
    {
      slug: 'the-silent-frequency', type: 'movie', titleAr: 'التردد الصامت', titleEn: 'The Silent Frequency',
      synopsisAr: 'مشغّل إذاعة ليلي في بلدة جبلية معزولة يتلقى بثاً غريباً يحمل أصواتاً لمقيمين اختفوا قبل أربعين عاماً. كل ليلة، تأتي الإشارة أقرب… وتكشف شيئاً واحداً إضافياً عن الليلة التي لم يعد منها أحد.',
      synopsisEn: 'A late-night radio operator in an isolated mountain town receives a strange broadcast carrying the voices of residents who vanished forty years ago. Each night the signal gets closer — and reveals one more detail about the night no one returned from.',
      posterUrl: '/images/poster-frequency.jpg', backdropUrl: '/images/poster-frequency.jpg',
      releaseYear: 2025, releaseDate: '2025-06-20', genres: JSON.stringify(['Science Fiction', 'Mystery', 'Thriller']),
      runtime: 126, rating: 8.2, ageRating: '+13', featured: true, trending: true, isNew: true,
      director: 'Ana Reyes', cast: JSON.stringify(['Tom Karlsen', 'Mira Sadek', 'Paul Wenner']),
      country: 'International', contentLang: 'en', playbackType: 'demo', playbackUrl: '/media/demo-film.mp4', sortOrder: 3,
    },
    {
      slug: 'desert-whisper', type: 'movie', titleAr: 'همس الصحراء', titleEn: 'Desert Whisper',
      synopsisAr: 'في أهوار جنوب العراق، يعود صيادٌ شاب إلى قريته التي أُفرغت من سكانها ليجد والده المفقود يرسل له رسائل عبر أغاني المستنقعات. دراما إنسانية شاعرية عن الذاكرة والوطن.',
      synopsisEn: 'In the marshes of southern Iraq, a young fisherman returns to his emptied village to find his missing father sending messages through the songs of the wetlands. A poetic human drama about memory and belonging.',
      posterUrl: '/images/poster-desert.jpg', backdropUrl: '/images/poster-desert.jpg',
      releaseYear: 2024, releaseDate: '2024-11-05', genres: JSON.stringify(['Drama', 'Arabic Movies']),
      runtime: 109, rating: 8.4, ageRating: '+13', trending: true,
      director: 'Hussein Al-Ali', cast: JSON.stringify(['Ammar Zaidan', 'Rana Al-Obeidi', 'Sajad Kareem']),
      country: 'Iraq', contentLang: 'ar', playbackType: 'demo', playbackUrl: '/media/demo-film.mp4', sortOrder: 4,
    },
    {
      slug: 'dawn-pursuit', type: 'movie', titleAr: 'مطاردة الفجر', titleEn: 'Dawn Pursuit',
      synopsisAr: 'سائقة سيارات إسعاف سابقة تجبر على قيادة آخر رحلة عبر مدينة محاصرة قبل شروق الشمس، مقابل أن تستعيد ابنتها. سباق مشوق من باب إلى باب لا يتوقف للتنفس.',
      synopsisEn: 'A former ambulance driver is forced to run one last gauntlet across a locked-down city before sunrise — the price: getting her daughter back. A relentless door-to-door chase thriller.',
      releaseYear: 2024, releaseDate: '2024-03-15', genres: JSON.stringify(['Action', 'Thriller']),
      runtime: 98, rating: 7.4, ageRating: '+16', isNew: true,
      director: 'Marc Delon', cast: JSON.stringify(['Lina Petrov', 'Adam Khoury', 'Sofia Renn']),
      country: 'International', contentLang: 'en', playbackType: 'demo', playbackUrl: '/media/demo-film.mp4', sortOrder: 5,
    },
    {
      slug: 'midnight-terminal', type: 'movie', titleAr: 'محطة منتصف الليل', titleEn: 'Midnight Terminal',
      synopsisAr: 'آخر قطار ليلي، راكب واحد بتذكرة إلى محطة لا تظهر على أي خريطة. كلما اقترب القطار من وجهته، اختفى عشرون دقيقة من ذاكرة الجميع على المتنه.',
      synopsisEn: 'The last night train. One passenger, holding a ticket to a station that appears on no map. The closer the train gets, the more twenty minutes vanish from everyone\'s memory aboard.',
      posterUrl: '/images/poster-midnight.jpg', backdropUrl: '/images/poster-midnight.jpg',
      releaseYear: 2025, releaseDate: '2025-01-30', genres: JSON.stringify(['Thriller', 'Horror']),
      runtime: 104, rating: 7.7, ageRating: '+16',
      director: 'Kim Do-hyun', cast: JSON.stringify(['Lee Seo-yun', 'Rami Fadel', 'Jun Park']),
      country: 'International', contentLang: 'ko', playbackType: 'demo', playbackUrl: '/media/demo-film.mp4', sortOrder: 6,
    },
    {
      slug: 'paper-boats', type: 'movie', titleAr: 'قوارب ورقية', titleEn: 'Paper Boats',
      synopsisAr: 'فيلم رسوم متحركة دافئ عن فتاة تصنع قوارباً ورقية من رسائل جدتها القديمة وتطلقها في النهر، لتكتشف أن كل قارب يعود إليها حاملاً قصة لم تحدث بعد.',
      synopsisEn: 'A warm animated feature about a girl who folds paper boats from her grandmother\'s old letters and sets them down the river — only to find each boat returning with a story that hasn\'t happened yet.',
      releaseYear: 2024, releaseDate: '2024-07-18', genres: JSON.stringify(['Animation', 'Family', 'Drama']),
      runtime: 92, rating: 8.0, ageRating: 'PG',
      director: 'Yuki Tanabe', cast: JSON.stringify(['Mai Hoshino', 'Kareem Nader', 'Elle Tran']),
      country: 'International', contentLang: 'en', playbackType: 'demo', playbackUrl: '/media/demo-film.mp4', sortOrder: 7,
    },
    {
      slug: 'the-last-laugh', type: 'movie', titleAr: 'ضحكة أخيرة', titleEn: 'The Last Laugh',
      synopsisAr: 'كوميديان فاشل يرث مسرحاً مسكوناً بشبح ناقد فني يموت غاضباً قبل مئة عام. لينجح، عليه أن يجعله يضحك… مرة واحدة.',
      synopsisEn: 'A failing comedian inherits a theatre haunted by the ghost of a critic who died angry a century ago. To succeed, he must make him laugh — just once.',
      releaseYear: 2024, releaseDate: '2024-12-01', genres: JSON.stringify(['Comedy', 'Fantasy']),
      runtime: 96, rating: 7.1, ageRating: 'PG',
      director: 'Nora Witt', cast: JSON.stringify(['Dani Rev', 'Hala Sabri', 'Marco Belli']),
      country: 'International', contentLang: 'en', playbackType: 'demo', playbackUrl: '/media/demo-film.mp4', sortOrder: 8,
    },
    {
      slug: 'ashes-and-dust', type: 'movie', titleAr: 'رماد وغبار', titleEn: 'Ashes and Dust',
      synopsisAr: 'ثلاثة أجيال من عائلة واحدة تعيش حصاراً واحداً، تحكي الأرض بلغتها عن ما نسيته الناس. دراما حربية صامتة اللسان، عالية الإيقاع في القلب.',
      synopsisEn: 'Three generations of one family live through one siege, as the land itself tells what the people forgot. A quiet war drama with a thundering heart.',
      releaseYear: 2023, releaseDate: '2023-09-08', genres: JSON.stringify(['Drama', 'History']),
      runtime: 133, rating: 7.9, ageRating: '+16',
      director: 'Tariq Selim', cast: JSON.stringify(['Widad Ammar', 'Firas Doumani', 'Laila Boutros']),
      country: 'Iraq', contentLang: 'ar', playbackType: 'demo', playbackUrl: '/media/demo-film.mp4', sortOrder: 9,
    },
    {
      slug: 'exile-road', type: 'movie', titleAr: 'طريق المنفى', titleEn: 'Exile Road',
      synopsisAr: 'شاعر مغترب يعود إلى بغداد بعد ثلاثين عاماً ليبيع البيت الذي تركه، فيكتشف أن الحي بأكمله انتظر عودته ليواجه سرّاً دفنه قبل أن يرحل.',
      synopsisEn: 'An exiled poet returns to Baghdad after thirty years to sell the house he left behind — and finds the whole neighborhood waited for his return to confront a secret he buried before leaving.',
      releaseYear: 2023, releaseDate: '2023-05-19', genres: JSON.stringify(['Drama', 'Arabic Movies']),
      runtime: 115, rating: 7.8, ageRating: '+13',
      director: 'Hussein Al-Ali', cast: JSON.stringify(['Jawad Al-Rikabi', 'Noor Hameed', 'Umm Kulthum Saad']),
      country: 'Iraq', contentLang: 'ar', playbackType: 'demo', playbackUrl: '/media/demo-film.mp4', sortOrder: 10,
    },
    {
      slug: 'crimson-circuit', type: 'movie', titleAr: 'الحلقة القرمزية', titleEn: 'Crimson Circuit',
      synopsisAr: 'في مصنع آلي مهجور، تكتشف مجموعة صيانة دائرة كهربائية لا تصل إلى أي جهاز… لكنها تسخن كل ليلة تماماً في الثالثة فجراً. رعب تكنولوجي بطيء الاحتراق.',
      synopsisEn: 'In a decommissioned robot factory, a maintenance crew discovers a circuit connected to nothing — yet it heats up every night at exactly 3 a.m. A slow-burn techno-horror.',
      releaseYear: 2025, releaseDate: '2025-02-14', genres: JSON.stringify(['Horror', 'Science Fiction']),
      runtime: 101, rating: 6.9, ageRating: '+18',
      director: 'Elena Márquez', cast: JSON.stringify(['Ruth Ekwueme', 'Jan Novak', 'Bilal Osman']),
      country: 'International', contentLang: 'en', playbackType: 'demo', playbackUrl: '/media/demo-film.mp4', sortOrder: 11,
    },
    {
      slug: 'the-deep-blue-signal', type: 'movie', titleAr: 'إشارة العمق الأزرق', titleEn: 'The Deep Blue Signal',
      synopsisAr: 'وثائقي يتابع فريق غوص عميق يسجل أصوات المحيط على بعد أربعة آلاف متر، فيلتقط نمطاً متكرراً لا ينبغي أن يوجد. حكاية حقيقية الشكل عن أعظم لغز في كوكبنا.',
      synopsisEn: 'A documentary following a deep-sea team recording sound four thousand meters down — capturing a repeating pattern that should not exist. A true-shaped story about our planet\'s greatest riddle.',
      releaseYear: 2024, releaseDate: '2024-04-22', genres: JSON.stringify(['Documentary']),
      runtime: 88, rating: 7.5, ageRating: 'PG',
      director: 'Jonas Berg', cast: JSON.stringify(['Prof. Hana Idris', 'Crew of RV Thalassa']),
      country: 'International', contentLang: 'en', playbackType: 'demo', playbackUrl: '/media/demo-film.mp4', sortOrder: 12,
    },
    {
      slug: 'sands-of-time', type: 'movie', titleAr: 'رمال الزمن', titleEn: 'Sands of Time',
      synopsisAr: 'عالمة آثار تجد ساعة رملية في قلب تلّ بابلي لا تنفد رمالها أبداً، وتكتشف أن كل حبة تسقط منها تُعيد يومها الأخير مرة أخرى… بتغيير واحد صغير.',
      synopsisEn: 'An archaeologist unearths a Babylonian hourglass whose sand never runs out — and discovers every falling grain replays her last day again… with one small change.',
      releaseYear: 2024, releaseDate: '2024-08-09', genres: JSON.stringify(['Adventure', 'Fantasy']),
      runtime: 121, rating: 7.6, ageRating: '+13',
      director: 'Layla Mansour', cast: JSON.stringify(['Yara Haddad', 'Saif Al-Din', 'Peter Lange']),
      country: 'International', contentLang: 'en', playbackType: 'demo', playbackUrl: '/media/demo-film.mp4', sortOrder: 13,
    },
    {
      slug: 'al-mudif', type: 'movie', titleAr: 'المضيف', titleEn: 'Al-Mudif',
      synopsisAr: 'وثائقي حميمي عن آخر مضيف مضيف عشائري في هور الحمار، وضيوفه الذين ما زالوا يصلون كل جمعة… حتى يتوقف أحدٌ عن القدوم.',
      synopsisEn: 'An intimate documentary about the last mudif host in the Hor al-Hammar marshes, and the guests who still arrive every Friday — until one of them stops coming.',
      releaseYear: 2025, releaseDate: '2025-03-01', genres: JSON.stringify(['Documentary', 'Arabic Movies']),
      runtime: 76, rating: 8.3, ageRating: 'PG', isNew: true,
      director: 'Sajad Kareem', cast: JSON.stringify(['Sheikh Ajil Al-Fatla']),
      country: 'Iraq', contentLang: 'ar', playbackType: 'demo', playbackUrl: '/media/demo-film.mp4', sortOrder: 14,
    },
  ];

  // ── Series ───────────────────────────────────────────────────────────────
  const series: Array<Record<string, unknown>> = [
    {
      slug: 'blood-of-the-sands', type: 'series', titleAr: 'سلالة الرمال', titleEn: 'Blood of the Sands',
      synopsisAr: 'في إمارة صحراوية على شفير التاريخ، تتشابك مصائر عائلتي نفط وتوابل في صراع يمتد ثلاثة عقود: سلطة، حب ممنوع، وبئر واحد يعرف سرّ القبيلة. ملحمة عربية متعددة المواسم.',
      synopsisEn: 'In a desert emirate on the edge of history, the fates of an oil dynasty and a spice merchant family entangle across three decades — power, forbidden love, and one well that knows the tribe\'s secret. A multi-season Arabic epic.',
      posterUrl: '/images/poster-sands.jpg', backdropUrl: '/images/hero-sands.jpg',
      releaseYear: 2023, releaseDate: '2023-10-01', genres: JSON.stringify(['Drama', 'Arabic Series', 'History']),
      rating: 8.8, ageRating: '+16', featured: true, trending: true,
      director: 'Mahmoud Al-Rashed', cast: JSON.stringify(['Basem Farah', 'Aisha Al-Mansouri', 'Kareem Nader', 'Widad Ammar']),
      country: 'Arab Region', contentLang: 'ar', playbackType: 'demo', playbackUrl: '/media/demo-film.mp4', sortOrder: 1,
    },
    {
      slug: 'station-nine', type: 'series', titleAr: 'المحطة التاسعة', titleEn: 'Station Nine',
      synopsisAr: 'طاقم محطة مدارية مهجورة جزئياً يستقبل طلب إرساء من مركبة أُلغيت قبل عشرين عاماً. كل موسم يكشف طابقاً آخر من المحطة… وطاقماً آخر نسوا أنهم على متنها.',
      synopsisEn: 'The crew of a partially abandoned orbital station receives a docking request from a ship decommissioned twenty years ago. Each season reveals another deck of the station — and another crew that forgot they were aboard.',
      posterUrl: '/images/poster-station9.jpg', backdropUrl: '/images/poster-station9.jpg',
      releaseYear: 2024, releaseDate: '2024-09-15', genres: JSON.stringify(['Science Fiction', 'Thriller']),
      rating: 8.4, ageRating: '+16', featured: true, trending: true, isNew: true,
      director: 'Priya Chandran', cast: JSON.stringify(['Mira Sadek', 'Alex Duval', 'Sara Haddad']),
      country: 'International', contentLang: 'en', playbackType: 'demo', playbackUrl: '/media/demo-film.mp4', sortOrder: 2,
    },
    {
      slug: 'bosphorus-nights', type: 'series', titleAr: 'ليالي البوسفور', titleEn: 'Bosphorus Nights',
      synopsisAr: 'على ضفاف إسطنبول، تدير طبيبة مخابز صغيرة شجرتها العائلية في صمت، حتى يعود شاب يحمل الاسم نفسه لجدها المفقود. دراما رومانسية تركية ببطءِ مدٍّ وجزر.',
      synopsisEn: 'On the shores of Istanbul, a baker quietly runs her family\'s legacy — until a young man arrives carrying the same name as her long-lost grandfather. A Turkish romantic drama moving at the pace of tides.',
      posterUrl: '/images/poster-bosphorus.jpg', backdropUrl: '/images/poster-bosphorus.jpg',
      releaseYear: 2023, releaseDate: '2023-11-10', genres: JSON.stringify(['Drama', 'Turkish Series', 'Romance']),
      rating: 8.1, ageRating: '+13', trending: true,
      director: 'Emre Yalçın', cast: JSON.stringify(['Deniz Arslan', 'Kerem Aydın', 'Leyla Demir']),
      country: 'Türkiye', contentLang: 'tr', playbackType: 'demo', playbackUrl: '/media/demo-film.mp4', sortOrder: 3,
    },
    {
      slug: 'andalus', type: 'series', titleAr: 'الأندلس', titleEn: 'Andalus',
      synopsisAr: 'قرطبة، سنة ٩٩٩: فتيان من ثلاث ديانات يدرسون في المدرسة العليا نفسها، وتاريخٌ يعرف أن أياً منهم لن يكون هنا بعد خمسين عاماً. ملحمة تاريخية عن آخر قرن ذهبي.',
      synopsisEn: 'Cordoba, 999 AD: three boys of three faiths study in the same great school, and history already knows none of them will be here in fifty years. A historical epic about the last golden century.',
      posterUrl: '/images/poster-andalus.jpg', backdropUrl: '/images/poster-andalus.jpg',
      releaseYear: 2024, releaseDate: '2024-02-20', genres: JSON.stringify(['History', 'Drama', 'Arabic Series']),
      rating: 8.6, ageRating: '+16', trending: true,
      director: 'Mahmoud Al-Rashed', cast: JSON.stringify(['Firas Doumani', 'Hala Sabri', 'Ahmed Benali', 'Layla Qasim']),
      country: 'Arab Region', contentLang: 'ar', playbackType: 'demo', playbackUrl: '/media/demo-film.mp4', sortOrder: 4,
    },
    {
      slug: 'the-prosecution', type: 'series', titleAr: 'النيابة', titleEn: 'The Prosecution',
      synopsisAr: 'نائبة مدعٍ عام شابة في بغداد تتولى قضايا المدينة الأكثر توهجاً، واكتشافها أن كل ملف في مكتبها يحمل بصمة شخص تحمي مسيرتها. جريمة عربية، موسم جديد كل عام.',
      synopsisEn: 'A young public prosecutor in Baghdad takes the city\'s most explosive cases — and finds every file carries the fingerprint of someone protecting her career. An Arabic crime series, airing now.',
      releaseYear: 2025, releaseDate: '2025-01-12', genres: JSON.stringify(['Crime', 'Drama', 'Arabic Series']),
      rating: 8.0, ageRating: '+16', isNew: true,
      director: 'Nadia Kassem', cast: JSON.stringify(['Rana Al-Obeidi', 'Jawad Al-Rikabi', 'Saif Al-Din']),
      country: 'Iraq', contentLang: 'ar', playbackType: 'demo', playbackUrl: '/media/demo-film.mp4', sortOrder: 5,
    },
    {
      slug: 'seoul-echo', type: 'series', titleAr: 'صدى سول', titleEn: 'Seoul Echo',
      synopsisAr: 'مذيعة بودكاست ليلي تتلقى مكالمات من مستمع يصف جرائم تحدث قبل وقوعها بساعات. الشرطة لا تصدقها، والقاتل يستمع أيضاً. إثارة كورية حادة الإيقاع.',
      synopsisEn: 'A late-night podcast host receives calls from a listener describing crimes hours before they happen. The police don\'t believe her — and the killer is listening too. A sharp Korean thriller.',
      releaseYear: 2024, releaseDate: '2024-06-01', genres: JSON.stringify(['Thriller', 'Korean Series', 'Crime']),
      rating: 8.3, ageRating: '+18', trending: true,
      director: 'Kim Do-hyun', cast: JSON.stringify(['Lee Seo-yun', 'Jun Park', 'Choi Min-ji']),
      country: 'South Korea', contentLang: 'ko', playbackType: 'demo', playbackUrl: '/media/demo-film.mp4', sortOrder: 6,
    },
    {
      slug: 'wolves-of-the-north', type: 'series', titleAr: 'ذئاب الشمال', titleEn: 'Wolves of the North',
      synopsisAr: 'بعد انهيار أُسرة تهريب كبرى، تتقاتل ثلاثة أشقاء على العرش الفارغ في مدينة سامراء السفلية. إثارة وعنف واقعي وولاءات تُشترى بالكيلو.',
      synopsisEn: 'After a smuggling dynasty collapses, three siblings fight for an empty throne in the lower city. Realistic grit, violence, and loyalties sold by the kilo.',
      releaseYear: 2023, releaseDate: '2023-04-14', genres: JSON.stringify(['Action', 'Crime']),
      rating: 7.9, ageRating: '+18',
      director: 'Marc Delon', cast: JSON.stringify(['Idris Malen', 'Ruth Ekwueme', 'Adam Khoury']),
      country: 'International', contentLang: 'en', playbackType: 'demo', playbackUrl: '/media/demo-film.mp4', sortOrder: 7,
    },
    {
      slug: 'little-atlas', type: 'series', titleAr: 'أطلس الصغير', titleEn: 'Little Atlas',
      synopsisAr: 'مسلسل رسوم متحركة عائلي عن جبل عملاق اسمه أطلس يتجول بالعالم على ظهره، وعلى ظهره قرية كاملة من المطافئ الفضوليين. لكل حلقة دولة جديدة وخريطة جديدة.',
      synopsisEn: 'A family animation about a giant walking mountain named Atlas who tours the world — with an entire village of curious firefighters living on his back. Each episode, a new country and a new map.',
      releaseYear: 2024, releaseDate: '2024-05-05', genres: JSON.stringify(['Animation', 'Family', 'Adventure']),
      rating: 7.8, ageRating: 'G',
      director: 'Yuki Tanabe', cast: JSON.stringify(['Mai Hoshino', 'Elle Tran', 'Kareem Nader']),
      country: 'International', contentLang: 'en', playbackType: 'demo', playbackUrl: '/media/demo-film.mp4', sortOrder: 8,
    },
    {
      slug: 'the-code', type: 'series', titleAr: 'الشيفرة', titleEn: 'The Code',
      synopsisAr: 'مبرمجة تفقد وظيفتها لأن نظاماً قرر ذلك، فتقرر اختراق النظام نفسه — لتكتشف أنه يدير قراراً أكثر من الشركات: المدينة كلها. إثارة تقنية ذكية وقلقة.',
      synopsisEn: 'A programmer is laid off by an algorithm, so she decides to hack it — and discovers it decides far more than corporate staffing: it runs the entire city. A smart, unsettling techno-thriller.',
      releaseYear: 2025, releaseDate: '2025-04-03', genres: JSON.stringify(['Thriller', 'Science Fiction']),
      rating: 8.2, ageRating: '+16', isNew: true,
      director: 'Priya Chandran', cast: JSON.stringify(['Choi Min-ji', 'Paul Wenner', 'Bilal Osman']),
      country: 'International', contentLang: 'en', playbackType: 'demo', playbackUrl: '/media/demo-film.mp4', sortOrder: 9,
    },
    {
      slug: 'karrada-nights', type: 'series', titleAr: 'ليالي الكرادة', titleEn: 'Karrada Nights',
      synopsisAr: 'مقهى بغدادي عالق بين زبائنه العجائز وعاملاته الشابات، تمرّ فيه حكايات الحي كل ليلة: خطوبة فاشلة، دين قديم، وأغنية يرفض الجميع أن يتذكروا من أين يعرفونها. كوميديا درامية دافئة.',
      synopsisEn: 'A Baghdad café stuck between its elderly regulars and its young staff, where the neighborhood\'s stories pass through nightly: a failed engagement, an old debt, and a song nobody admits remembering. A warm dramedy.',
      releaseYear: 2024, releaseDate: '2024-10-01', genres: JSON.stringify(['Comedy', 'Drama', 'Arabic Series']),
      rating: 8.5, ageRating: '+13', trending: true,
      director: 'Sajad Kareem', cast: JSON.stringify(['Umm Kulthum Saad', 'Ammar Zaidan', 'Noor Hameed', 'Sajad Kareem']),
      country: 'Iraq', contentLang: 'ar', playbackType: 'demo', playbackUrl: '/media/demo-film.mp4', sortOrder: 10,
    },
  ];

  const titleRows: string[] = [];
  for (const m of [...movies, ...series]) {
    const row = await prisma.title.create({ data: m as never });
    titleRows.push(row.id);
  }
  console.log(`Created ${titleRows.length} titles`);

  // ── Seasons & episodes ───────────────────────────────────────────────────
  const seasonPlans: Record<string, { seasons: number; epsPerSeason: number[] }> = {
    'blood-of-the-sands': { seasons: 3, epsPerSeason: [8, 8, 6] },
    'station-nine': { seasons: 2, epsPerSeason: [8, 6] },
    'bosphorus-nights': { seasons: 2, epsPerSeason: [10, 8] },
    'andalus': { seasons: 2, epsPerSeason: [8, 8] },
    'the-prosecution': { seasons: 1, epsPerSeason: [10] },
    'seoul-echo': { seasons: 1, epsPerSeason: [8] },
    'wolves-of-the-north': { seasons: 2, epsPerSeason: [8, 8] },
    'little-atlas': { seasons: 2, epsPerSeason: [12, 10] },
    'the-code': { seasons: 1, epsPerSeason: [8] },
    'karrada-nights': { seasons: 1, epsPerSeason: [10] },
  };

  const epTitleAr = (seriesTitle: string, s: number, e: number) => {
    const arcs: Record<string, string[][]> = {
      default: [
        ['البداية', 'الصدع', 'ما وراء الحدود', 'ديون القديمين', 'الموعد', 'النار الصغيرة', 'ليلة طويلة', 'ما تبقى', 'الصراع', 'القرار', 'الطريق', 'الفجر'],
        ['رياح جديدة', 'الحصار', 'الأسماء', 'الندبة', 'الظل الأول', 'بريق الذهب', 'الوهم', 'العهد', 'القسم', 'الرحيل'],
        ['العودة', 'السؤال', 'اللحظة الأخيرة', 'الثمن', 'الحقيقة', 'الأفق'],
      ],
    };
    const pool = arcs.default[Math.min(s - 1, 2)];
    return pool[(e - 1) % pool.length];
  };
  const epTitleEn = (s: number, e: number) => {
    const arcs = [
      ['The Beginning', 'The Fracture', 'Beyond the Border', 'Old Debts', 'The Appointment', 'A Small Fire', 'One Long Night', 'What Remains', 'The Clash', 'The Decision', 'The Road', 'Dawn'],
      ['New Winds', 'The Siege', 'Names', 'The Mourning', 'First Shadow', 'Glitter of Gold', 'The Illusion', 'The Pact', 'The Oath', 'Departure'],
      ['The Return', 'The Question', 'The Last Moment', 'The Price', 'The Truth', 'The Horizon'],
    ];
    const pool = arcs[Math.min(s - 1, 2)];
    return pool[(e - 1) % pool.length];
  };

  for (const t of series) {
    const slug = t.slug as string;
    const plan = seasonPlans[slug];
    if (!plan) continue;
    const titleRow = await prisma.title.findUnique({ where: { slug } });
    if (!titleRow) continue;
    for (let s = 1; s <= plan.seasons; s++) {
      const season = await prisma.season.create({
        data: { titleId: titleRow.id, number: s, titleAr: `الموسم ${s}`, titleEn: `Season ${s}` },
      });
      for (let e = 1; e <= plan.epsPerSeason[s - 1]; e++) {
        await prisma.episode.create({
          data: {
            seasonId: season.id,
            titleId: titleRow.id,
            number: e,
            titleAr: epTitleAr(slug, s, e),
            titleEn: epTitleEn(s, e),
            synopsisAr: `الحلقة ${e} من الموسم ${s} من ${t.titleAr}. أحداث تتشابك وتقود الشخصيات إلى مفترق لا رجعة فيه، بتوتر متصاعد وأجواء سينمائية متقنة.`,
            synopsisEn: `Episode ${e} of Season ${s} of ${t.titleEn}. Threads tighten and characters reach a point of no return, with rising tension and crafted cinematic atmosphere.`,
            runtime: 42 + ((e * 7) % 14),
            playbackType: 'demo',
            playbackUrl: '/media/demo-film.mp4',
            stillSeed: `${slug}-s${s}e${e}`,
          },
        });
      }
    }
  }
  console.log('Created seasons & episodes');

  // ── Live TV channels ─────────────────────────────────────────────────────
  const channels = [
    // Sports
    { code: 'TVORA-SPORTS-1', nameAr: 'تڤورا سبورت 1', nameEn: 'TVORA Sports 1', category: 'sports', colorA: '#C8A24B', colorB: '#151310', quality: '4K',
      descriptionAr: 'القناة الرياضية الأولى — أبرز المباريات والبطولات على مدار الساعة.', descriptionEn: 'The flagship sports channel — top matches and tournaments around the clock.',
      nowPlayingAr: 'ملخص الجولة الكبرى — تحليل واستوديو', nowPlayingEn: 'Round of the week — highlights & studio analysis' },
    { code: 'TVORA-SPORTS-2', nameAr: 'تڤورا سبورت 2', nameEn: 'TVORA Sports 2', category: 'sports', colorA: '#D97742', colorB: '#171009', quality: 'HD',
      descriptionAr: 'البطولات القارية والاستوديوهات التحليلية الليلية.', descriptionEn: 'Continental tournaments and late-night analysis studios.',
      nowPlayingAr: 'استوديو ما قبل المباراة', nowPlayingEn: 'Pre-match studio' },
    { code: 'TVORA-SPORTS-IQ', nameAr: 'تڤورا سبورت العراق', nameEn: 'TVORA Sports Iraq', category: 'sports', colorA: '#4E9B6F', colorB: '#0B120E', quality: 'HD',
      descriptionAr: 'الكرة العراقية أولاً — الدوري المحلي والمنتخب.', descriptionEn: 'Iraqi football first — the local league and the national team.',
      nowPlayingAr: 'أهداف الدوري العراقي — الموسم الحالي', nowPlayingEn: 'Iraq Stars League goals — current season' },
    // Movies
    { code: 'TVORA-CINEMA', nameAr: 'تڤورا سينما', nameEn: 'TVORA Cinema', category: 'movies', colorA: '#9A8FC2', colorB: '#0F0E14', quality: '4K',
      descriptionAr: 'أفلام العالم الأولى — عروض أولى كل ليلة.', descriptionEn: 'World cinema premieres — a new first-run film every night.',
      nowPlayingAr: 'فيلم الليلة: ملحمة الصحراء', nowPlayingEn: 'Tonight: Sands of the Epic' },
    { code: 'TVORA-ACTION', nameAr: 'تڤورا أكشن', nameEn: 'TVORA Action', category: 'movies', colorA: '#C25B5B', colorB: '#150C0C', quality: 'HD',
      descriptionAr: 'أكشن لا يتوقف — مطاردات وانفجارات وقصص انتقام.', descriptionEn: 'Non-stop action — chases, explosions and revenge stories.',
      nowPlayingAr: 'ماراثون الأكشن — أربع أفلام متتالية', nowPlayingEn: 'Action marathon — four films back to back' },
    { code: 'TVORA-CLASSICS', nameAr: 'تڤورا كلاسيك', nameEn: 'TVORA Classics', category: 'movies', colorA: '#B08A50', colorB: '#131009', quality: 'HD',
      descriptionAr: 'الكنوز السينمائية من كل العصور، مُرممة بجودة عالية.', descriptionEn: 'Cinematic treasures from every era, remastered in high quality.',
      nowPlayingAr: 'كلاسيكيات الأربعينيات', nowPlayingEn: 'Forties classics' },
    // Series
    { code: 'TVORA-DRAMA', nameAr: 'تڤورا دراما', nameEn: 'TVORA Drama', category: 'series', colorA: '#8FB8D8', colorB: '#0C1014', quality: 'HD',
      descriptionAr: 'مسلسلات درامية عالمية بترجمة احترافية وحلقات أولاً بأول.', descriptionEn: 'Global drama series with professional subtitles and weekly episodes.',
      nowPlayingAr: 'الموسم الجديد: أزقة الأندلس', nowPlayingEn: 'New season: Alleys of Andalus' },
    { code: 'TVORA-TURKISH', nameAr: 'تڤورا تركي', nameEn: 'TVORA Turkish', category: 'series', colorA: '#B04A4A', colorB: '#140B0B', quality: 'HD',
      descriptionAr: 'أشهر المسلسلات التركية المدبلجة والمترجمة.', descriptionEn: 'The most beloved Turkish series, dubbed and subtitled.',
      nowPlayingAr: 'حكاية البوسفور — الحلقة 14', nowPlayingEn: 'Bosphorus Tale — Episode 14' },
    { code: 'TVORA-KOREAN', nameAr: 'تڤورا كوري', nameEn: 'TVORA Korean', category: 'series', colorA: '#7FB09E', colorB: '#0B1210', quality: 'HD',
      descriptionAr: 'موجة الكوريين — رومانسي وإثارة ودراما ملكية.', descriptionEn: 'The Korean wave — romance, thrillers and royal dramas.',
      nowPlayingAr: 'ماراثون نهاية الأسبوع', nowPlayingEn: 'Weekend binge marathon' },
    // Kids
    { code: 'TVORA-KIDS', nameAr: 'تڤورا كيدز', nameEn: 'TVORA Kids', category: 'kids', colorA: '#D8A24B', colorB: '#151007', quality: 'HD',
      descriptionAr: 'رسوم متحركة وبرامج آمنة ومرحة لكل الأعمار.', descriptionEn: 'Safe, joyful animation and shows for every age.',
      nowPlayingAr: 'سلسلة مغامرات الفضاء', nowPlayingEn: 'Space adventures series' },
    { code: 'TVORA-JUNIOR', nameAr: 'تڤورا جونيور', nameEn: 'TVORA Junior', category: 'kids', colorA: '#C7A600', colorB: '#131108', quality: 'SD',
      descriptionAr: 'قصص قبل النوم وتعليم باللعب.', descriptionEn: 'Bedtime stories and learning through play.',
      nowPlayingAr: 'حكايات الحيوانات الصغيرة', nowPlayingEn: 'Little animal tales' },
    // Documentary
    { code: 'TVORA-DOCU', nameAr: 'تڤورا وثائقي', nameEn: 'TVORA Docu', category: 'documentary', colorA: '#9FB7CB', colorB: '#0C0F12', quality: '4K',
      descriptionAr: 'وثائقيات تاريخ وعلوم وحضارات بجودة فائقة.', descriptionEn: 'History, science and civilizations documentaries in ultra HD.',
      nowPlayingAr: 'أسرار المحيط العميق', nowPlayingEn: 'Secrets of the deep ocean' },
    { code: 'TVORA-NATURE', nameAr: 'تڤورا ناتشور', nameEn: 'TVORA Nature', category: 'documentary', colorA: '#4E9B6F', colorB: '#0A120D', quality: '4K',
      descriptionAr: 'كوكبنا بكل ألوانه — من الغابات إلى الصحاري.', descriptionEn: 'Our planet in full color — from forests to deserts.',
      nowPlayingAr: 'الصحراء بعد المطر', nowPlayingEn: 'The desert after rain' },
    // News
    { code: 'TVORA-NEWS', nameAr: 'تڤورا نيوز', nameEn: 'TVORA News', category: 'news', colorA: '#B8B8BE', colorB: '#101012', quality: 'HD',
      descriptionAr: 'أخبار العالم والعربية كل ساعة، بلا توقف.', descriptionEn: 'World and Arab news every hour, around the clock.',
      nowPlayingAr: 'نشرة الأخبار الرئيسية', nowPlayingEn: 'Main evening bulletin' },
    // Music
    { code: 'TVORA-MUSIC', nameAr: 'تڤورا ميوزك', nameEn: 'TVORA Music', category: 'music', colorA: '#C98FB8', colorB: '#130E12', quality: 'HD',
      descriptionAr: 'أغاني عربية وعالمية وكليبات حصرية.', descriptionEn: 'Arabic and global hits with exclusive videos.',
      nowPlayingAr: 'قائمة الأكثر طلباً', nowPlayingEn: 'Most-requested playlist' },
    // General
    { code: 'TVORA-ONE', nameAr: 'تڤورا ون', nameEn: 'TVORA One', category: 'general', colorA: '#D8C9A3', colorB: '#131009', quality: 'HD',
      descriptionAr: 'القناة العامة — ترفيه وحوارات وبرامج فعليات.', descriptionEn: 'The general channel — entertainment, talk shows and events.',
      nowPlayingAr: 'برنامج الضيف — لقاء حصري', nowPlayingEn: 'The Guest — exclusive interview' },
    { code: 'TVORA-LIFE', nameAr: 'تڤورا لايف', nameEn: 'TVORA Life', category: 'general', colorA: '#7FB0B8', colorB: '#0B1113', quality: 'HD',
      descriptionAr: 'طبخ وسفر وأناقة وبيت — نمط حياة بالعربية.', descriptionEn: 'Cooking, travel, style and home — lifestyle in Arabic.',
      nowPlayingAr: 'مطابخ العالم — إيطاليا', nowPlayingEn: 'Kitchens of the world — Italy' },
  ];
  for (const [i, ch] of channels.entries()) {
    await prisma.channel.create({
      data: {
        ...ch,
        streamType: 'demo',
        streamUrl: ch.category === 'sports' ? '/media/demo-match.mp4' : '/media/demo-film.mp4',
        visible: true,
        sortOrder: i + 1,
      },
    });
  }
  console.log(`Created ${channels.length} TV channels`);

  // ── Site settings ────────────────────────────────────────────────────────
  await prisma.siteSetting.createMany({
    data: [
      { key: 'branding', value: JSON.stringify({ name: 'TVORA', tagline: 'Cinema. Series. Live TV Channels.' }) },
      { key: 'demoMode', value: JSON.stringify({ enabled: true, reason: 'No external metadata provider configured. All catalog and channel data is original sample content.', tmdbConfigured: false }) },
      { key: 'homepageSections', value: JSON.stringify(['hero', 'trending', 'featured', 'new', 'arabic', 'channels', 'topRated']) },
      { key: 'maintenanceMode', value: JSON.stringify({ enabled: false }) },
    ],
  });

  console.log('Seed complete ✔');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
