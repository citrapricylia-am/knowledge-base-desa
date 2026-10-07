'use client';

import { useEffect, useRef } from 'react';

interface SmoothVideoProps {
  src: string;
  poster?: string;
  className?: string;
}

export default function SmoothVideo({ src, poster, className }: SmoothVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    const handleLoaded = () => {
      video.playbackRate = 0.5;
      video.play().catch(() => {});
    };

    video.addEventListener('loadedmetadata', handleLoaded);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoaded);
    };
  }, [src]);

  // Tanpa URL video: tampilkan poster sebagai gambar statis.
  // Mencegah <video> dengan src kosong (Chrome log error + layar hitam).
  if (!src) {
    return poster ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={poster} alt="" aria-hidden="true" className={className} />
    ) : (
      <div className={className} aria-hidden="true" />
    );
  }

  return (
    <video
      ref={videoRef}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      poster={poster}
      className={className}
    >
      <source src={src} type="video/mp4" />
    </video>
  );
}
