import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**', // Permite qualquer domínio
        port: '',
        pathname: '/**', // Permite qualquer caminho
      },
    ],
  },
};

export default nextConfig;
