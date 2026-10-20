import type { Metadata, Viewport } from "next";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: {
    default: "MOVE API — لوحة تحكم وسيرفر واجهات برمجة التطبيقات",
    template: "%s | MOVE API",
  },
  description:
    "MOVE API خادم وواجهات برمجة التطبيقات للأفلام والمسلسلات والحلقات والمواسم واستخراج روابط البث المباشر لموقعك.",
  keywords: ["MOVE API", "أفلام", "مسلسلات", "API", "مواسم", "حلقات", "بث مباشر"],
  robots: { index: false, follow: false },
};


export const viewport: Viewport = {
  themeColor: "#070708",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        {children}
        <Toaster position="bottom-center" richColors theme="dark" />
      </body>
    </html>
  );
}
