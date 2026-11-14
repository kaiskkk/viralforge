"use client";

import { useState } from "react";

/** Miniature de la vidéo source ; disparaît si la plateforme refuse de la servir. */
export function VideoThumbnail({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    // Image servie par la plateforme : pas d'optimisation côté site.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="h-14 w-10 shrink-0 rounded-md object-cover"
    />
  );
}
