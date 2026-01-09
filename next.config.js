/** @type {import('next').NextConfig} */
const nextConfig = {
  // Removed standalone output for Nixpacks compatibility - H2
  // output: 'standalone',
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Expose env variables at build time
  env: {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || process.env.URL || 'https://wind.qub3.uk',
  },
};

// #region agent log
const fs = require('fs');
const logPath = 'd:\\PROIECTE_IT\\Wind_Warning_Netlify-Dokploy\\.cursor\\debug.log';
try {
  fs.appendFileSync(logPath, JSON.stringify({location:'next.config.js:3',message:'Next config loaded',data:{outputMode:nextConfig.output,siteUrl:nextConfig.env.NEXT_PUBLIC_SITE_URL},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2'})+'\n');
} catch(e) {}
// #endregion

module.exports = nextConfig;
