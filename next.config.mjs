/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000'],
      bodySizeLimit: '300mb',
    },
  },
  serverExternalPackages: ['pdf-parse', 'mammoth'],
}

export default nextConfig
