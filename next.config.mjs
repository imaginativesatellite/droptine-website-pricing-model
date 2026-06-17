/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // @react-pdf/renderer pulls in node-only deps; keep it server-side.
  serverExternalPackages: ["@react-pdf/renderer"],
};

export default nextConfig;
