/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/.well-known/oauth-authorization-server',
        destination: '/api/oauth-metadata',
      },
    ]
  },
}

export default nextConfig
