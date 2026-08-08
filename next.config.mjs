const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");

/** @type {import('next').NextConfig} */
export default {
  reactStrictMode: true,
  images: {
    remotePatterns: supabaseUrl
      ? [new URL(`${supabaseUrl}/storage/v1/object/public/order-gallery/**`)]
      : [],
  },
};
