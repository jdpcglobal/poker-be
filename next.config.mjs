/** @type {import('next').NextConfig} */
const nextConfig = { 
    eslint: {
        // Warning: This allows production builds to successfully complete even if
        // your project has ESLint errors.
        ignoreDuringBuilds: true,
      },
    experimental: {
    // force all routes to be dynamic
  },
  // This makes all routes dynamic by default
  staticPageGenerationTimeout: 0,
};

export default nextConfig;
