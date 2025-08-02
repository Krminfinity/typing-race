import fs from 'fs';
import path from 'path';
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/** 動的にSEOキーワードをCSVから読み込み、トップ50を設定 */
export async function generateMetadata(): Promise<Metadata> {
  const csvPath = path.join(process.cwd(), '参考資料', 'rakkokeyword_202582142034.csv');
  const content = fs.readFileSync(csvPath, 'utf8');
  const lines = content.split(/\r?\n/).slice(1);
  const keywords = lines
    .map(line => line.split('\t')[3]?.replace(/"/g, ''))
    .filter(Boolean)
    .slice(0, 50);
  return {
    // タブに表示されるサイト名を絵文字付きでわかりやすく
    title: 'TypeGo - 教室向けタイピング競技',
    description: 'Next.js × Socket.io で作る教室向けタイピングレース。PIN で簡単参加、リアルタイム進捗・順位表示。',
    keywords,
    // ファビコンと Apple Touch Icon を正しいパスで参照
    icons: {
      icon: 'favicon.ico',
      shortcut: 'favicon.ico',
      apple: 'apple-touch-icon.png',
    },
    openGraph: {
      title: 'TypeGo｜教室向けリアルタイムタイピング競技',
      description: 'Next.js × Socket.io で作る教室向けタイピングレース。PIN で簡単参加、リアルタイム進捗・順位表示。',
      url: 'https://typing-race-eight.vercel.app',
      siteName: 'TypeGo',
      locale: 'ja_JP',
      type: 'website',
    },
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
