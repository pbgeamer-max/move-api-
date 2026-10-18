import type { Metadata, Viewport } from "next";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

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
