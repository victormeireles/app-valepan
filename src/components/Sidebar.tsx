"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut } from "next-auth/react";

type NavItem = {
  href?: string;
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
};

const Icon = ({ children }: { children: React.ReactNode }) => (
  <span aria-hidden className="inline-flex items-center justify-center w-5 h-5">
    {children}
  </span>
);

export default function Sidebar() {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);

  const nav: NavItem[] = [
    { href: "/", label: "Home", icon: <Icon><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg></Icon> },
    { href: "/dashboard/faturamento", label: "Faturamento", icon: <Icon><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg></Icon> },
    { href: "/dashboard/vendas", label: "Vendas", icon: <Icon><svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12L8.1 13h7.45c.75 0 1.41-.41 1.75-1.03L21.7 4H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-1.99-2z"/></svg></Icon> },
    { href: "/dashboard/producao", label: "Produção", icon: <Icon><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg></Icon> },
    { label: "Logout", icon: <Icon><svg viewBox="0 0 24 24" fill="currentColor"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.59L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg></Icon>, onClick: () => signOut({ callbackUrl: "/login" }) },
  ];

  return (
    <aside
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      className="sidebar"
    >
      <div className="sb-inner">
        <div className="sb-brand">
          <div className="logo">▰▰</div>
          {expanded && <div className="brand-text">Valepan</div>}
        </div>

        <nav className="sb-nav">
          <div className="sb-nav-main">
            {/* Grupo 1: Home */}
            <div className="nav-group">
              {nav.slice(0, 1).map((item) => {
                const isActive = item.href ? pathname === item.href : false;
                const content = (
                  <div className={`sb-item ${isActive ? "active" : ""}`}>
                    {item.icon}
                    {expanded && <span className="label">{item.label}</span>}
                  </div>
                );

                return item.href ? (
                  <Link key={item.label} href={item.href} className="sb-link" title={item.label}>
                    {content}
                  </Link>
                ) : (
                  <button key={item.label} className="sb-link" title={item.label} onClick={item.onClick}>
                    {content}
                  </button>
                );
              })}
            </div>

            {/* Separador visual */}
            <div className="nav-separator" />

            {/* Grupo 2: Dashboard (Faturamento, Vendas, Produção) */}
            <div className="nav-group">
              {nav.slice(1, 4).map((item) => {
                const isActive = item.href ? pathname === item.href : false;
                const content = (
                  <div className={`sb-item ${isActive ? "active" : ""}`}>
                    {item.icon}
                    {expanded && <span className="label">{item.label}</span>}
                  </div>
                );

                return item.href ? (
                  <Link key={item.label} href={item.href} className="sb-link" title={item.label}>
                    {content}
                  </Link>
                ) : (
                  <button key={item.label} className="sb-link" title={item.label} onClick={item.onClick}>
                    {content}
                  </button>
                );
              })}
            </div>
          </div>
          
          <div className="sb-nav-footer">
            {nav.slice(-1).map((item) => {
              const content = (
                <div className="sb-item">
                  {item.icon}
                  {expanded && <span className="label">{item.label}</span>}
                </div>
              );

              return (
                <button key={item.label} className="sb-link" title={item.label} onClick={item.onClick}>
                  {content}
                </button>
              );
            })}
          </div>
        </nav>
      </div>

      <style jsx>{`
        .sidebar {
          position: fixed;
          inset: 0 auto 0 0;
          width: ${"64px"};
          z-index: 40;
          transition: width .18s ease;
        }
        .sidebar:hover { width: 220px; }
        .sb-inner {
          height: 100%;
          backdrop-filter: blur(8px);
          background: linear-gradient(180deg, rgba(18,26,46,.82), rgba(18,26,46,.72));
          border-right: 1px solid rgba(255,255,255,.06);
          box-shadow: 0 8px 30px rgba(0,0,0,.35);
          padding: 14px 10px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .sb-brand {
          display: flex; align-items: center; gap: 10px;
          color: #e6edf7; font-weight: 600;
        }
        .logo { filter: drop-shadow(0 6px 16px rgba(0,0,0,.4)); }
        .sb-nav { 
          display: flex; 
          flex-direction: column;
          height: 100%;
          gap: 0; 
        }
        .sb-nav-main { 
          display: flex; 
          flex-direction: column; 
          gap: 0; 
        }
        .nav-group { 
          display: flex; 
          flex-direction: column; 
          gap: 6px; 
        }
        .nav-separator { 
          height: 1px; 
          background: rgba(255,255,255,.08); 
          margin: 8px 4px; 
        }
        .sb-nav-footer { 
          margin-top: auto; 
          padding-top: 12px; 
        }
        .sb-link { 
          display: block; text-decoration: none; color: #c9d4ea; 
          background: transparent; border: 0; text-align: left; padding: 0;
        }
        .sb-item {
          display: flex; align-items: center; gap: 10px; 
          padding: 10px 12px; border-radius: 10px;
          border: 1px solid transparent; /* Sem borda por padrão */
          background: transparent; /* Sem background por padrão */
          transition: transform .12s ease, background .18s ease, border-color .18s ease;
        }
        .sb-item:hover { 
          background: rgba(255,255,255,.08); 
          border-color: rgba(255,255,255,.12);
          transform: translateY(-1px);
        }
        .sb-item.active { 
          background: rgba(230,126,34,.22); 
          border-color: rgba(230,126,34,.45);
          color: #ffd9b3;
        }
        .label { font-size: 14px; font-weight: 600; }
        .brand-text { font-size: 14px; opacity: .9; }
      `}</style>
    </aside>
  );
}


