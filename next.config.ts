import type { NextConfig } from 'next';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Hindari Next.js salah pilih workspace root karena ada package-lock di parent
  turbopack: {
    root,
  },
};

export default nextConfig;
