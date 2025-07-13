import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Wind Warning Bucharest - Stay Safe from Dangerous Winds',
  description: 'Proactive wind monitoring and early warning system for Bucharest. Get real-time alerts for dangerous wind conditions via browser notifications and SMS.',
  keywords: 'wind warning, weather alerts, Bucharest, Romania, storm warning, wind forecast, safety alerts',
  authors: [{ name: 'Wind Warning Team' }],
  viewport: 'width=device-width, initial-scale=1',
  themeColor: '#1f2937',
  openGraph: {
    title: 'Wind Warning Bucharest',
    description: 'Stay ahead of dangerous wind conditions with real-time monitoring and proactive alerts',
    type: 'website',
    locale: 'en_US',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* PWA and Mobile Optimization */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Wind Warning" />
        
        {/* Preconnect to external domains for performance */}
        <link rel="preconnect" href="https://api.openweathermap.org" />
        <link rel="dns-prefetch" href="https://api.openweathermap.org" />
      </head>
      <body className={`${inter.className} bg-gray-900 text-white antialiased`}>
        {children}
      </body>
    </html>
  );
}