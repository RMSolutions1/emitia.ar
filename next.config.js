function resolveAppUrl() {
  const raw = (process.env.NEXTAUTH_URL || '').trim();
  if (/^https?:\/\//i.test(raw)) return raw.replace(/\/$/, '');
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.replace(/^https?:\/\//, '')}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/^https?:\/\//, '')}`;
  }
  return 'https://emitia.com.ar';
}

const appUrl = resolveAppUrl();
if (!process.env.NEXTAUTH_URL || !String(process.env.NEXTAUTH_URL).trim()) {
  process.env.NEXTAUTH_URL = appUrl;
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  productionBrowserSourceMaps: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: { unoptimized: true },
  env: {
    NEXTAUTH_URL: appUrl,
  },
};

module.exports = nextConfig;
