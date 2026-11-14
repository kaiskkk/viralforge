import type { MetadataRoute } from "next";

/** Installation sur l'écran d'accueil : ViralForge s'ouvre comme une application. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ViralForge",
    short_name: "ViralForge",
    description: "Des scripts TikTok, Reels et Shorts que personne ne swipe.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#08090a",
    theme_color: "#08090a",
    lang: "fr",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
