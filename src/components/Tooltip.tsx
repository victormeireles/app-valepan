'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import tooltipStyles from '@/styles/tooltip.module.css';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export default function Tooltip({ 
  content, 
  children, 
  position = 'top',
  className = '' 
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };

    let top = 0;
    let left = 0;

    switch (position) {
      case 'top':
        top = triggerRect.top - tooltipRect.height - 8;
        left = triggerRect.right - tooltipRect.width;
        break;
      case 'bottom':
        top = triggerRect.bottom + 8;
        left = triggerRect.right - tooltipRect.width;
        break;
      case 'left':
        top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
        left = triggerRect.left - tooltipRect.width - 8;
        break;
      case 'right':
        top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
        left = triggerRect.right + 8;
        break;
    }

    // Ajustar posição se sair da viewport
    if (left < 8) {
      // Se não couber à esquerda, tentar à direita
      left = triggerRect.right + 8;
      if (left + tooltipRect.width > viewport.width - 8) {
        // Se não couber à direita também, centralizar
        left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
      }
    }
    if (left + tooltipRect.width > viewport.width - 8) {
      left = viewport.width - tooltipRect.width - 8;
    }
    if (top < 8) {
      // Se não couber acima, mostrar abaixo
      top = triggerRect.bottom + 8;
    }
    if (top + tooltipRect.height > viewport.height - 8) {
      top = viewport.height - tooltipRect.height - 8;
    }

    // Garantir que a posição seja válida
    top = Math.max(8, top);
    left = Math.max(8, left);

    setTooltipPosition({ top, left });
  }, [position]);

  useEffect(() => {
    if (isVisible) {
      // Pequeno delay para garantir que o tooltip seja renderizado antes de calcular a posição
      const timeoutId = setTimeout(() => {
        updatePosition();
      }, 10);
      
      const handleResize = () => updatePosition();
      const handleScroll = () => updatePosition();
      
      window.addEventListener('resize', handleResize);
      window.addEventListener('scroll', handleScroll);
      
      return () => {
        clearTimeout(timeoutId);
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('scroll', handleScroll);
      };
    }
  }, [isVisible, position, updatePosition]);

  const handleMouseEnter = () => {
    setIsVisible(true);
  };

  const handleMouseLeave = () => {
    setIsVisible(false);
  };

  const handleClick = () => {
    setIsVisible(!isVisible);
  };

  return (
    <div 
      ref={triggerRef}
      className={`${tooltipStyles.trigger} ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {children}
      {isVisible && typeof window !== 'undefined' && createPortal(
        <div
          ref={tooltipRef}
          className={`${tooltipStyles.tooltip} ${tooltipStyles[position]}`}
          style={{
            top: tooltipPosition.top,
            left: tooltipPosition.left,
          }}
        >
          {content}
        </div>,
        document.body
      )}
    </div>
  );
}
