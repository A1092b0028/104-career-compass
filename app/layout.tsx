import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "104 職涯羅盤",
  description: "整理適合你的職缺，保存自己的應徵進度。熟人測試版。",
  robots: { index: false, follow: false },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body className="antialiased">{children}</body>
    </html>
  );
}
