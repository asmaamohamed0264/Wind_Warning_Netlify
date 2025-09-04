import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import OneSignalInit from '@/components/OneSignalInit';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Monitor Vânt Aleea Someșul Cald - Protecție împotriva vânturilor periculoase',
  description: 'Sistem proactiv de monitorizare și alertă timpurie pentru vânturi pe Aleea Someșul Cald. Primește alerte în timp real pentru condiții meteorologice periculoase prin notificări browser și SMS.',
  keywords: 'alertă vânt, alerte meteo, Aleea Someșul Cald, București, România, avertizare furtună, prognoză vânt, alerte siguranță',
  authors: [{ name: 'Bogdan pentru Loredana' }],
  viewport: 'width=device-width, initial-scale=1',
  themeColor: '#1f2937',
  openGraph: {
    title: 'Monitor Vânt Aleea Someșul Cald',
    description: 'Fii cu un pas înaintea condițiilor meteorologice periculoase cu monitorizare în timp real și alerte proactive',
    type: 'website',
    locale: 'ro_RO',
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
        <meta name="apple-mobile-web-app-title" content="Monitor Vânt Aleea Someșul Cald" />
        
        {/* Preconnect to external domains for performance */}
        <link rel="preconnect" href="https://api.openweathermap.org" />
        <link rel="dns-prefetch" href="https://api.openweathermap.org" />

        {/* OneSignal Web SDK v16 + coada recomandată */}
        <Script
          src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js"
          strategy="afterInteractive"
        />
        <Script id="onesignal-queue" strategy="afterInteractive">
          {`window.OneSignalDeferred = window.OneSignalDeferred || [];`}
        </Script>
      </head>
      <body className={`${inter.className} bg-gray-900 text-white antialiased`}>
        {/* Inițializează OneSignal după hidratare */}
        <OneSignalInit />
        {children}
        {/* Favicon and app icons */}
        <link rel="icon" href="/1000088934-modified.png" />
        <link rel="apple-touch-icon" href="/1000088934-modified.png" />
        <link rel="shortcut icon" href="/1000088934-modified.png" />
      </body>
    </html>
  );
}
