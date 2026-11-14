/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,

  // L'application n'utilise pas next/image. Désactiver l'optimiseur fait
  // répondre 404 à /_next/image, ce qui ferme les failles connues de cette
  // API sur la branche 14.x. À retirer si tu ajoutes next/image après être
  // passé sur une version maintenue de Next.js.
  images: { unoptimized: true },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Caméra et micro : réservés au Studio, sur ce site uniquement.
          { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
