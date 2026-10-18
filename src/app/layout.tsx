import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic, Manrope } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-plex-arabic",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: {
    default: "TVORA — سينما. مسلسلات. قنوات TV مباشرة",
    template: "%s | TVORA",
  },
  description:
    "TVORA منصة ترفيه سينمائية غامرة: أفلام، مسلسلات، وقنوات TV مباشرة على مدار الساعة — بتجربة دار سينما فاخرة بالعربية والإنجليزية.",
  keywords: ["TVORA", "أفلام", "مسلسلات", "قنوات TV", "بث مباشر", "streaming", "movies", "series", "live TV", "channels"],
  openGraph: {
    title: "TVORA — Cinema. Series. Live TV Channels.",
    description: "An immersive cinematic streaming experience: movies, series and live TV channels in Arabic & English.",
    type: "website",
    siteName: "TVORA",
    images: [{ url: "/images/hero-horizon.jpg", width: 1440, height: 720, alt: "TVORA" }],
  },
  robots: { index: true, follow: true },
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
      <body className={`${plexArabic.variable} ${manrope.variable} antialiased`}>
        {children}
        <Toaster position="bottom-center" richColors theme="dark" />
      </body>
    </html>
  );
}
