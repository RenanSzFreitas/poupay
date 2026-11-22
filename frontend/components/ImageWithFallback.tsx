'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

type Props = {
  src: string | null | undefined;
  alt: string;
  fallbackText: string;
  className?: string;
  sizes?: string;
  fit?: 'cover' | 'contain';
  imgPadding?: string;
};

// Mostra a imagem; se não houver endereço ou o arquivo falhar, mostra a inicial
export default function ImageWithFallback({
  src,
  alt,
  fallbackText,
  className = '',
  sizes = '(max-width: 768px) 50vw, 25vw',
  fit = 'contain',
  imgPadding = 'p-2'
}: Props) {
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Se o arquivo falhou antes da página "acordar" no navegador, o onError não dispara:
  // esta checagem cobre esse caso
  useEffect(() => {
    const el = imgRef.current;
    if (el && el.complete && el.naturalWidth === 0) setFailed(true);
  }, [src]);

  if (!src || failed) {
    return (
      <div className={`flex items-center justify-center bg-[#e8ecd9] ${className}`}>
        <span className="text-3xl font-bold text-[#4f5e2f]/40">
          {fallbackText.charAt(0).toUpperCase()}
        </span>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden bg-white ${className}`}>
      <Image
        ref={imgRef}
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        className={fit === 'cover' ? 'object-cover' : `object-contain ${imgPadding}`}
        onError={() => setFailed(true)}
      />
    </div>
  );
}