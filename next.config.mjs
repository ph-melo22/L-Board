import { withSentryConfig } from '@sentry/nextjs'

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', 'lboard.com.br', 'www.lboard.com.br'],
      bodySizeLimit: '50mb',
    },
    serverComponentsExternalPackages: ['pdf-parse', 'mammoth'],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self'",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.sentry.io https://vercel.live",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ]
  },
}

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Upload source maps silenciosamente no build
  silent: !process.env.CI,

  // Desativa telemetria do Sentry CLI
  telemetry: false,

  // Esconde source maps do bundle final (segurança)
  hideSourceMaps: true,

  // Não alarga o bundle com logging do Sentry no client
  disableLogger: true,

  // Compatibilidade com Vercel (tunnel de eventos)
  tunnelRoute: '/monitoring',

  // Não roda a checagem de auth no build local sem token
  authToken: process.env.SENTRY_AUTH_TOKEN,
})
