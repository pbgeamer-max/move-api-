# دليل إعداد Firebase و Railway لمنصة TVORA

يشرح هذا الدليل كيفية ربط مشروع **TVORA** بقاعدة بيانات **Firebase Firestore** ونشره على منصة **Railway**.

---

## أولاً: إعداد Firebase Firestore

### 1. إنشاء مشروع جديد في Firebase
1. توجه إلى [Firebase Console](https://console.firebase.google.com/).
2. اضغط على **Add project** (إضافة مشروع).
3. أدخل اسم المشروع (مثلاً: `tvora-stream`) ثم اضغط **Continue**.
4. (اختياري) يمكنك تعطيل Google Analytics أو تركه، ثم اضغط **Create project**.

### 2. تفعيل قاعدة بيانات Firestore
1. من القائمة الجانبية في Firebase Console، اضغط على **Build** ثم اختر **Firestore Database**.
2. اضغط على **Create database**.
3. اختر الموقع الجغرافي الأقرب إليك (مثل `europe-west` أو `us-central`).
4. في شاشة قواعد الأمان (Security Rules)، اختر **Start in production mode** (الوضع الإنتاجي) ثم اضغط **Create**.
   > **ملاحظة:** تطبيق TVORA يستخدم `firebase-admin` من جهة السيرفر، مما يعني أنه يملك صلاحيات وصول آمنة تلقائياً لقراءة وكتابة البيانات بدون الاعتماد على قواعد الأمان العامة للعميل.

### 3. استخراج مفتاح الخدمة (Service Account Key)
1. في Firebase Console، اضغط على أيقونة **الإعدادات ⚙️** (Project Settings) بجانب اسم المشروع في أعلى القائمة الجانبية.
2. انتقل إلى تبويب **Service accounts** (حسابات الخدمة).
3. اختر **Node.js** ثم اضغط على الزر الأزرق: **Generate new private key** (توليد مفتاح خاص جديد).
4. اضغط **Generate key**؛ سيتم تحميل ملف JSON يحتوي على المفاتيح السرية (احتفظ به في مكان آمن ولا ترفعه أبداً على GitHub).

---

## ثانياً: المتغيرات البيئية (Environment Variables)

افتح ملف الـ JSON الذي قمت بتحميله، ستجد فيه القيم التالية:

```json
{
  "project_id": "tvora-xxxxx",
  "client_email": "firebase-adminsdk-xxxxx@tvora-xxxxx.iam.gserviceaccount.com",
  "private_key": "-----BEGIN PRIVATE KEY-----\n..."
}
```

### الطريقة الأولى: إضافتها في ملف `.env` محلياً
قم بإنشاء ملف `.env` (أو تعديل الموجود) وأضف المتغيرات التالية:
```env
FIREBASE_PROJECT_ID="اسم-المشروع-هنا"
FIREBASE_CLIENT_EMAIL="البريد-الإلكتروني-للخدمة-هنا"
FIREBASE_PRIVATE_KEY="المفتاح-الخاص-بالكامل-هنا"
DATABASE_PROVIDER="firebase"
```

---

## ثالثاً: بذر ونقل المحتوى التجريبي إلى Firestore (Seeding)

بعد وضع المتغيرات في `.env`، يمكنك تشغيل سكربت البذر لنقل جميع الأفلام والمسلسلات وقنوات البث والحسابات إلى Firestore مباشرة:

```bash
npm run firebase:seed
```

سيتم إنشاء المجموعات (Collections) التالية تلقائياً في Firestore:
- `titles`: جميع الأفلام والمسلسلات.
- `seasons`: المواسم الخاصة بالمسلسلات.
- `episodes`: الحلقات.
- `channels`: قنوات البث التلفزيوني المباشر (17 قناة).
- `users`: الحسابات الافتراضية (المدير والمستخدم).
- `site_settings`: إعدادات المنصة.

---

## رابعاً: الرفع والنشر على منصة Railway

1. سجّل دخولك إلى [Railway.app](https://railway.app/).
2. اضغط على **+ New Project** ثم اختر **Deploy from GitHub repo**.
3. اختر مستودعك: `amer1iq/TVORA`.
4. بعد إضافة المستودع، اضغط على المشروع ثم ادخل إلى تبويب **Variables**:
   - أضف المتغيرات:
     - `FIREBASE_PROJECT_ID`: معرف مشروع فايربيس.
     - `FIREBASE_CLIENT_EMAIL`: البريد الإلكتروني لمفتاح الخدمة.
     - `FIREBASE_PRIVATE_KEY`: المفتاح الخاص (Private Key).
     - `DATABASE_PROVIDER`: اكتب `firebase`.
5. سيتولى Railway بناء التطبيق عبر الـ `Dockerfile` المرفق تلقائياً وسيعطيك رابطاً عاماً (`xxx.up.railway.app`) لتصفح الموقع!
