"use client";

import { useState, useEffect } from "react";
import { useMultiTenant } from "@/hooks/useMultiTenant";
import styles from "@/styles/Sidebar.module.css";

const Icon = ({ children }: { children: React.ReactNode }) => (
  <span aria-hidden className="inline-flex items-center justify-center w-5 h-5">
    {children}
  </span>
);

export default function TenantSelector() {
  const { availableTenants, currentTenant, hasMultipleTenants, changeTenant, isChanging } = useMultiTenant();
  const [isOpen, setIsOpen] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);

  // Detectar quando o sidebar está expandido
  useEffect(() => {
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
  }, []);

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
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
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

