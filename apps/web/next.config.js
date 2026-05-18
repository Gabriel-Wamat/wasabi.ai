/** @type {import('next').NextConfig} */
const path = require('path')

const nextConfig = {
  output: 'export',
  outputFileTracingRoot: path.join(__dirname, '../..'),
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api',
    NEXT_PUBLIC_EXP001_ONBOARDING_ENABLED: process.env.NEXT_PUBLIC_EXP001_ONBOARDING_ENABLED ?? 'false',
  },
}
module.exports = nextConfig
