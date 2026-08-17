const getHostFromUrl = (value) => {
  if (!value) return null;

  try {
    return new URL(value).host;
  } catch {
    return null;
  }
};

const allowedOrigins = Array.from(
  new Set(
    [
      "localhost:3000",
      "127.0.0.1:3000",
      "10.90.232.8:3000",
      "192.168.1.21:3000",
      "192.168.1.9:3000",
      getHostFromUrl(process.env.NEXTAUTH_URL)
    ].filter(Boolean)
  )
);

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: ".next-build",
  experimental: {
    serverActions: { allowedOrigins }
  }
};

export default nextConfig;
