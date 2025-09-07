"use client";

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { BRANDING_CONFIG, type LogoVariant, type LogoContext } from '@/config/branding';

interface LogoProps {
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  variant?: LogoVariant;
  context?: LogoContext;
}

export default function Logo({ 
  width, 
  height, 
  className = '',
  priority = false,
  variant = 'auto',
  context
}: LogoProps) {
  const [mounted, setMounted] = useState(false);
  
  // Evitar hidratação mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Usar tamanhos do contexto se especificado
  const finalWidth = width ?? (context ? BRANDING_CONFIG.logoSizes[context].width : 120);
  const finalHeight = height ?? (context ? BRANDING_CONFIG.logoSizes[context].height : 40);

  if (!mounted) {
    // Fallback durante hidratação
    return (
      <div 
        className={`bg-gray-200 dark:bg-gray-700 rounded animate-pulse ${className}`}
        style={{ width: finalWidth, height: finalHeight }}
      />
    );
  }

  // Determinar qual logo usar
  let logoSrc: string;
  
  // Se for contexto colapsado, usar logo compacta
  if (context === 'sidebarCollapsed') {
    logoSrc = BRANDING_CONFIG.logos.compact;
  } else if (variant === 'light') {
    logoSrc = BRANDING_CONFIG.logos.light;
  } else if (variant === 'dark') {
    logoSrc = BRANDING_CONFIG.logos.dark;
  } else {
    // Auto: detectar tema baseado na classe do body ou preferência do sistema
    const isDark = typeof window !== 'undefined' && 
      (document.documentElement.classList.contains('dark') || 
       window.matchMedia('(prefers-color-scheme: dark)').matches);
    logoSrc = isDark 
      ? BRANDING_CONFIG.logos.light
      : BRANDING_CONFIG.logos.dark;
  }

  return (
    <Image
      src={logoSrc}
      alt={`${BRANDING_CONFIG.companyName} Logo`}
      width={finalWidth}
      height={finalHeight}
      priority={priority}
      className={className}
    />
  );
}
