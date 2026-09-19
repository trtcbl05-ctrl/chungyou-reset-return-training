import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '崇友｜重置與緩速歸樓｜操作模擬影片',
  description: '崇友電梯重置與緩速歸樓操作模擬教學影片',
  manifest: '/manifest.webmanifest',
  themeColor: '#c2410c',
  icons: { icon: '/app-icon.svg', apple: '/apple-touch-icon.png' },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-Hant">
      <body>
        {children}
        <script dangerouslySetInnerHTML={{ __html: "if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/service-worker.js')})}" }} />
      </body>
    </html>
  );
}
