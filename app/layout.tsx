import './globals.css';
import Script from 'next/script';
import OneSignalInit from '@/components/OneSignalInit';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Meta PWA */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Monitor Vânt Aleea Someșul Cald" />

        {/* Optimizări rețea */}
        <link rel="preconnect" href="https://api.openweathermap.org" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://api.openweathermap.org" />
        <link rel="preconnect" href="https://cdn.onesignal.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://cdn.onesignal.com" />

        {/* Favicon & icons */}
        <link rel="icon" href="/1000088934-modified.png" />
        <link rel="apple-touch-icon" href="/1000088934-modified.png" />
        <link rel="shortcut icon" href="/1000088934-modified.png" />

        {/* OneSignal v16 SDK + coadă */}
        <Script
          src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js"
          async
          strategy="afterInteractive"
        />
        <Script id="onesignal-queue" strategy="afterInteractive">
          {`window.OneSignalDeferred = window.OneSignalDeferred || [];`}
        </Script>
      </head>
      <body>
        <OneSignalInit />
        {children}
      </body>
    </html>
  );
}
