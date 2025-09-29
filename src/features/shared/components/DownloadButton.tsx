import { useState } from 'react';
import vendasStyles from '@/styles/vendas.module.css';

type Props = {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'ghost';
};

export function DownloadButton({ 
  onClick, 
  disabled = false, 
  loading = false, 
  size = 'md',
  variant = 'primary' 
}: Props) {
  const [isPressed, setIsPressed] = useState(false);

  const handleClick = () => {
    if (disabled || loading) return;
    
    setIsPressed(true);
    setTimeout(() => setIsPressed(false), 150);
    onClick();
  };

  const sizeClasses = {
    sm: vendasStyles['download-btn-sm'],
    md: vendasStyles['download-btn-md'],
    lg: vendasStyles['download-btn-lg'],
  };

  const variantClasses = {
    primary: vendasStyles['download-btn-primary'],
    secondary: vendasStyles['download-btn-secondary'],
    ghost: vendasStyles['download-btn-ghost'],
  };

  return (
    <button
      className={`
        ${vendasStyles['download-btn']}
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${isPressed ? vendasStyles['download-btn-pressed'] : ''}
        ${disabled ? vendasStyles['download-btn-disabled'] : ''}
        ${loading ? vendasStyles['download-btn-loading'] : ''}
      `}
      onClick={handleClick}
      disabled={disabled || loading}
      title="Baixar em Excel"
    >
      <div className={vendasStyles['download-btn-content']}>
        {loading ? (
          <div className={vendasStyles['download-btn-spinner']} />
        ) : (
          <svg 
            className={vendasStyles['download-btn-icon']} 
            viewBox="0 0 24 24" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path 
              d="M12 15L12 3M12 15L8 11M12 15L16 11" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
            <path 
              d="M3 15V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V15" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          </svg>
        )}
        <span className={vendasStyles['download-btn-text']}>
          {loading ? 'Gerando...' : 'Excel'}
        </span>
      </div>
      
      {/* Efeito de brilho */}
      <div className={vendasStyles['download-btn-shine']} />
      
      {/* Efeito de gradiente animado */}
      <div className={vendasStyles['download-btn-gradient']} />
    </button>
  );
}
