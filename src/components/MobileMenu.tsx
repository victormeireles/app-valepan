"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { signOut } from "next-auth/react";
import { useTenant } from "@/hooks/useTenant";

type NavItem = {
  href?: string;
  label: string;
  icon: string;
  onClick?: () => void;
};

export default function MobileMenu() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const { tenantName } = useTenant();

  const nav: NavItem[] = [
    { href: "/", label: "Home", icon: "home" },
    { href: "/dashboard/vendas", label: "Vendas", icon: "bar_chart" },
    { label: "Logout", icon: "logout", onClick: () => signOut({ callbackUrl: "/login" }) },
  ];

  // Fechar menu ao mudar de rota
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Prevenir scroll do body quando menu estiver aberto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleToggle = () => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    setIsOpen(!isOpen);
    
    setTimeout(() => setIsAnimating(false), 300);
  };

  const handleItemClick = (item: NavItem) => {
    if (item.onClick) {
      item.onClick();
    }
    setIsOpen(false);
  };

  return (
    <>
      {/* Botão Hamburger - Visível apenas em mobile */}
      <button
        className="mobile-menu-toggle"
        onClick={handleToggle}
        aria-label="Abrir menu de navegação"
        aria-expanded={isOpen}
      >
        <div className={`hamburger ${isOpen ? 'open' : ''}`}>
          <span></span>
          <span></span>
          <span></span>
        </div>
      </button>

      {/* Overlay do menu mobile */}
      <div className={`mobile-menu-overlay ${isOpen ? 'open' : ''}`} onClick={handleToggle} />

      {/* Menu mobile */}
      <div className={`mobile-menu ${isOpen ? 'open' : ''}`}>
        <div className="mobile-menu-header">
          <div className="mobile-brand">
            <div className="mobile-logo">▰▰</div>
            <span className="mobile-brand-text">{tenantName}</span>
          </div>
          <button 
            className="mobile-close-btn"
            onClick={handleToggle}
            aria-label="Fechar menu"
          >
            <span className="material-icons">close</span>
          </button>
        </div>

        <nav className="mobile-nav">
          {nav.map((item) => {
            const isActive = item.href ? pathname === item.href : false;
            const isLogout = item.label === 'Logout';

            return (
              <div key={item.label} className={`mobile-nav-item ${isLogout ? 'logout' : ''}`}>
                {isLogout && <div className="mobile-nav-separator" />}

                {item.href ? (
                  <Link
                    href={item.href}
                    className={`mobile-nav-link ${isActive ? 'active' : ''}`}
                    onClick={() => handleItemClick(item)}
                  >
                    <div className="mobile-nav-inner">
                      <span className="material-icons mobile-nav-icon">{item.icon}</span>
                      <span className="mobile-nav-label">{item.label}</span>
                      {isActive && <div className="mobile-nav-indicator" />}
                    </div>
                  </Link>
                ) : (
                  <button
                    className={`mobile-nav-link ${isLogout ? 'logout' : ''}`}
                    onClick={() => handleItemClick(item)}
                  >
                    <div className="mobile-nav-inner">
                      <span className="material-icons mobile-nav-icon">{item.icon}</span>
                      <span className="mobile-nav-label">{item.label}</span>
                    </div>
                  </button>
                )}
              </div>
            );
          })}
        </nav>

        <div className="mobile-menu-footer">
          <div className="mobile-user-info">
            <div className="mobile-user-avatar">
              <span className="material-icons">person</span>
            </div>
            <span className="mobile-user-text">Menu de Navegação</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .mobile-menu-toggle {
          display: none;
          position: fixed;
          top: 12px;
          left: 16px;
          z-index: 1002;
          background: rgba(20, 22, 28, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 12px;
          backdrop-filter: blur(12px);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .mobile-menu-toggle:hover {
          background: rgba(20, 22, 28, 0.95);
          border-color: rgba(255, 255, 255, 0.2);
          transform: translateY(-1px);
        }

        .hamburger {
          width: 20px;
          height: 16px;
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .hamburger span {
          width: 100%;
          height: 2px;
          background: #e67e22;
          border-radius: 1px;
          transition: all 0.3s ease;
          transform-origin: center;
        }

        .hamburger.open span:nth-child(1) {
          transform: rotate(45deg) translate(6px, 6px);
        }

        .hamburger.open span:nth-child(2) {
          opacity: 0;
        }

        .hamburger.open span:nth-child(3) {
          transform: rotate(-45deg) translate(6px, -6px);
        }

        .mobile-menu-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
          z-index: 1003;
          opacity: 0;
          visibility: hidden;
          transition: all 0.3s ease;
        }

        .mobile-menu-overlay.open {
          opacity: 1;
          visibility: visible;
        }

        .mobile-menu {
          position: fixed;
          top: 0;
          left: 0;
          width: 280px;
          height: 100vh;
          background: linear-gradient(180deg, rgba(9,14,28,0.95), rgba(9,14,28,0.9));
          backdrop-filter: blur(20px);
          border-right: 1px solid rgba(255, 255, 255, 0.03);
          z-index: 1004;
          transform: translateX(-100%);
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .mobile-menu.open {
          transform: translateX(0);
        }

        .mobile-menu-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px;
          border-bottom: none;
        }

        .mobile-brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .mobile-logo {
          font-size: 20px;
          color: #e67e22;
          filter: drop-shadow(0 4px 12px rgba(230, 126, 34, 0.3));
        }

        .mobile-brand-text {
          font-size: 18px;
          font-weight: 700;
          color: #f2f4f7;
          letter-spacing: 0.5px;
        }

        .mobile-close-btn {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          padding: 8px;
          color: #f2f4f7;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .mobile-close-btn:hover {
          background: rgba(255, 255, 255, 0.15);
          transform: scale(1.05);
        }

        .mobile-nav {
          flex: 1;
          padding: 16px 10px 24px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
        }

        .mobile-nav-item { margin: 0 6px 10px; }
        .mobile-nav-item.logout { margin-top: auto; }
        .mobile-nav-separator { height: 1px; background: rgba(255,255,255,.08); margin: 8px 8px 12px; }

        .mobile-nav-link {
          display: block; text-decoration: none; color: #c9d4ea;
          background: transparent; border: 0; text-align: left; padding: 0;
        }

        .mobile-nav-inner {
          display: flex; align-items: center; gap: 12px;
          padding: 12px 14px; border-radius: 12px;
          border: 1px solid transparent;
          transition: transform .12s ease, background .18s ease, border-color .18s ease;
        }

        .mobile-nav-link:hover .mobile-nav-inner {
          background: rgba(255,255,255,.08);
          border-color: rgba(255,255,255,.12);
          transform: translateY(-1px);
        }

        .mobile-nav-link.active .mobile-nav-inner {
          background: rgba(230,126,34,.22);
          border-color: rgba(230,126,34,.45);
          color: #ffd9b3;
        }
        
        /* Logout button - estilo minimalista como no desktop */
        .mobile-nav-link.logout .mobile-nav-inner { background: transparent; border-color: transparent; }

        .mobile-nav-icon { font-size: 20px; color: #e67e22; }

        .mobile-nav-label { font-size: 15px; font-weight: 600; letter-spacing: .2px; }

        .mobile-nav-indicator { margin-left: auto; width: 8px; height: 8px; background: #e67e22; border-radius: 50%; box-shadow: 0 0 12px rgba(230,126,34,.6); }

        .mobile-menu-footer {
          padding: 20px;
          border-top: none;
        }

        .mobile-user-info {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          background: transparent;
          border: none;
        }

        .mobile-user-avatar {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #e67e22, #cf6e1d);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .mobile-user-avatar .material-icons {
          font-size: 20px;
        }

        .mobile-user-text {
          color: #c9cbd6;
          font-size: 14px;
          font-weight: 500;
        }

        /* Responsividade */
        @media (max-width: 768px) {
          .mobile-menu-toggle {
            display: block;
          }
        }

        @media (min-width: 769px) {
          .mobile-menu-toggle,
          .mobile-menu-overlay,
          .mobile-menu {
            display: none !important;
          }
        }
        
        /* Garantir que em desktop o menu mobile não apareça */
        @media (min-width: 769px) {
          .mobile-menu-toggle {
            visibility: hidden !important;
            opacity: 0 !important;
            pointer-events: none !important;
            position: absolute !important;
            left: -9999px !important;
          }
        }

        /* Scrollbar personalizada para o menu mobile */
        .mobile-nav::-webkit-scrollbar {
          width: 4px;
        }

        .mobile-nav::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 2px;
        }

        .mobile-nav::-webkit-scrollbar-thumb {
          background: rgba(230, 126, 34, 0.3);
          border-radius: 2px;
        }

        .mobile-nav::-webkit-scrollbar-thumb:hover {
          background: rgba(230, 126, 34, 0.5);
        }
      `}</style>
    </>
  );
}
