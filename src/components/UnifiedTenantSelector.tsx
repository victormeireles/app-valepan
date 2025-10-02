"use client";

import { useState, useEffect, useRef } from "react";
import { useMultiTenant } from "@/hooks/useMultiTenant";
import styles from "@/styles/Sidebar.module.css";

interface UnifiedTenantSelectorProps {
  variant?: 'desktop' | 'mobile';
}

const Icon = ({ children }: { children: React.ReactNode }) => (
  <span aria-hidden className="inline-flex items-center justify-center w-5 h-5">
    {children}
  </span>
);

export default function UnifiedTenantSelector({ variant = 'desktop' }: UnifiedTenantSelectorProps) {
  const { availableTenants, currentTenant, hasMultipleTenants, changeTenant, isChanging } = useMultiTenant();
  const [isOpen, setIsOpen] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Detectar quando o sidebar está expandido (apenas para desktop)
  useEffect(() => {
    if (variant === 'mobile') return;

    const handleMouseEnter = () => setIsSidebarExpanded(true);
    const handleMouseLeave = () => {
      setIsSidebarExpanded(false);
      setIsOpen(false); // Fechar dropdown quando sidebar recolher
    };

    const sidebar = document.querySelector(`.${styles.sidebar}`);
    if (sidebar) {
      sidebar.addEventListener('mouseenter', handleMouseEnter);
      sidebar.addEventListener('mouseleave', handleMouseLeave);
      
      return () => {
        sidebar.removeEventListener('mouseenter', handleMouseEnter);
        sidebar.removeEventListener('mouseleave', handleMouseLeave);
      };
    }
  }, [variant]);

  // Fechar dropdown quando clicar fora dele (apenas para mobile)
  useEffect(() => {
    if (variant === 'desktop') return;

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, variant]);

  if (!hasMultipleTenants) {
    return null;
  }

  const handleTenantChange = async (tenantId: string) => {
    try {
      await changeTenant(tenantId);
      setIsOpen(false);
    } catch (error) {
      console.error('❌ Erro ao trocar tenant:', error);
    }
  };

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  // Renderização para desktop
  if (variant === 'desktop') {
    return (
      <div className={styles.tenantSelector}>
        <button
          className={`${styles.sbLink} ${isOpen ? styles.active : ""}`}
          onClick={handleToggle}
          disabled={isChanging}
          title={isSidebarExpanded ? "Trocar empresa" : currentTenant.name || "Empresa"}
        >
          <div className={styles.sbItem}>
            <Icon>
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M6.99 11L3 15l3.99 4v-3H14v-2H6.99v-3zM21 9l-3.99-4v3H10v2h7.01v3L21 9z"/>
              </svg>
            </Icon>
            {isSidebarExpanded && (
              <span className={styles.label}>
                {isChanging ? "Trocando..." : currentTenant.name || "Empresa"}
              </span>
            )}
            {isSidebarExpanded && (
              <Icon>
                <svg 
                  viewBox="0 0 24 24" 
                  fill="currentColor"
                  className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                >
                  <path d="M7 10l5 5 5-5z"/>
                </svg>
              </Icon>
            )}
          </div>
        </button>

        {isOpen && (
          <div className={styles.tenantDropdown}>
            {availableTenants.map((tenant) => {
              const isActive = tenant.id === currentTenant.id;
              
              return (
                <button
                  key={tenant.id}
                  className={`${styles.tenantOption} ${isActive ? styles.active : ""}`}
                  onClick={() => handleTenantChange(tenant.id)}
                  disabled={isChanging}
                >
                  <span className={styles.tenantName}>{tenant.name}</span>
                  {isActive && (
                    <Icon>
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                      </svg>
                    </Icon>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Renderização para mobile
  return (
    <div className="mobile-tenant-selector" ref={dropdownRef}>
      <button
        className={`mobile-tenant-button ${isOpen ? 'active' : ''}`}
        onClick={handleToggle}
        disabled={isChanging}
        title="Trocar empresa"
      >
        <div className="mobile-tenant-inner">
          <span className="material-icons mobile-tenant-icon">swap_horiz</span>
          <span className="mobile-tenant-label">
            {isChanging ? "Trocando..." : currentTenant.name || "Empresa"}
          </span>
          {isChanging ? (
            <div className="mobile-tenant-loading" />
          ) : (
            <span className={`material-icons mobile-tenant-arrow ${isOpen ? 'open' : ''}`}>
              expand_more
            </span>
          )}
        </div>
      </button>

      {isOpen && (
        <div className="mobile-tenant-dropdown">
          {availableTenants.map((tenant) => (
            <button
              key={tenant.id}
              className={`mobile-tenant-option ${tenant.id === currentTenant.id ? 'active' : ''}`}
              onClick={() => handleTenantChange(tenant.id)}
              disabled={isChanging}
            >
              <span className="mobile-tenant-name">{tenant.name}</span>
              {tenant.id === currentTenant.id && (
                <span className="material-icons mobile-tenant-check">check</span>
              )}
            </button>
          ))}
        </div>
      )}

      <style jsx>{`
        .mobile-tenant-selector {
          margin: 0 6px 16px;
          position: relative;
        }

        .mobile-tenant-button {
          display: block;
          width: 100%;
          background: transparent;
          border: 0;
          text-align: left;
          padding: 0;
          cursor: pointer;
        }

        .mobile-tenant-inner {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.05);
          transition: all 0.2s ease;
        }

        .mobile-tenant-button:hover .mobile-tenant-inner {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.15);
          transform: translateY(-1px);
        }

        .mobile-tenant-button.active .mobile-tenant-inner {
          background: rgba(230, 126, 34, 0.15);
          border-color: rgba(230, 126, 34, 0.3);
        }

        .mobile-tenant-icon {
          font-size: 20px;
          color: #e67e22;
        }

        .mobile-tenant-label {
          flex: 1;
          font-size: 15px;
          font-weight: 600;
          color: #c9d4ea;
          letter-spacing: 0.2px;
        }

        .mobile-tenant-arrow {
          font-size: 20px;
          color: #c9d4ea;
          transition: transform 0.2s ease;
        }

        .mobile-tenant-arrow.open {
          transform: rotate(180deg);
        }

        .mobile-tenant-dropdown {
          margin-top: 8px;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          overflow: hidden;
          backdrop-filter: blur(10px);
        }

        .mobile-tenant-option {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 12px 14px;
          background: transparent;
          border: 0;
          color: #c9d4ea;
          text-align: left;
          transition: background 0.2s ease;
        }

        .mobile-tenant-option:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .mobile-tenant-option.active {
          background: rgba(230, 126, 34, 0.1);
          color: #ffd9b3;
        }

        .mobile-tenant-name {
          font-size: 14px;
          font-weight: 500;
          flex: 1;
        }

        .mobile-tenant-check {
          font-size: 18px;
          color: #e67e22;
        }

        .mobile-tenant-loading {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.2);
          border-top-color: #e67e22;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
