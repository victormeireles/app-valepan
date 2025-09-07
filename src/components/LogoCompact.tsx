"use client";

import Image from 'next/image';
import { BRANDING_CONFIG } from '@/config/branding';

interface LogoCompactProps {
  className?: string;
  showText?: boolean;
}

export default function LogoCompact({ 
  className = '',
  showText = false 
}: LogoCompactProps) {
  if (showText) {
    // Mostrar logo SVG quando expandido
    return (
      <Image
        src={BRANDING_CONFIG.logos.light}
        alt={`${BRANDING_CONFIG.companyName} Logo`}
        width={120}
        height={40}
        priority
        className={className}
      />
    );
  }

  // Mostrar favicon quando colapsado
  return (
    <Image
      src={BRANDING_CONFIG.logos.compact}
      alt={`${BRANDING_CONFIG.companyName} Logo`}
      width={40}
      height={40}
      priority
      className={`rounded-lg shadow-lg ${className}`}
    />
  );
}
