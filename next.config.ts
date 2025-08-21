import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    AUTH_SECRET: process.env.AUTH_SECRET,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    AUTH_ALLOWED_EMAILS: process.env.AUTH_ALLOWED_EMAILS,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    SPREADSHEET_ID: process.env.SPREADSHEET_ID,
    SHEETS_RANGE: process.env.SHEETS_RANGE,
  },
  images: {
    domains: ['lh3.googleusercontent.com'],
  },
};

export default nextConfig;
