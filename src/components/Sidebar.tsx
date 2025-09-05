"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { signOut } from "next-auth/react";
import { useTenant } from "@/hooks/useTenant";
import { fetchAvailableDashboards, DashboardInfo } from "@/lib/sheets";
import styles from "@/styles/Sidebar.module.css";

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
  const [dashboards, setDashboards] = useState<DashboardInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const { tenantName } = useTenant();

  useEffect(() => {
    loadDashboards();
  }, []);

  const loadDashboards = async () => {
    try {
      setLoading(true);
      const availableDashboards = await fetchAvailableDashboards();
      setDashboards(availableDashboards);
    } catch (error) {
      console.error('Erro ao carregar dashboards:', error);
      // Em caso de erro, usar dashboards padrão
      setDashboards([
        { id: 'sales', name: 'sales', label: 'Vendas', description: 'Dashboard de vendas' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Ícones para diferentes tipos de dashboard
  const getDashboardIcon = (dashboardId: string) => {
    switch (dashboardId) {
      case 'sales':
        return <Icon><svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12L8.1 13h7.45c.75 0 1.41-.41 1.75-1.03L21.7 4H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-1.99-2z"/></svg></Icon>;
      case 'customer':
        return <Icon><svg viewBox="0 0 24 24" fill="currentColor"><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg></Icon>;
      default:
        return <Icon><svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg></Icon>;
    }
  };

  // Construir menu dinamicamente
  const nav: NavItem[] = [
    { href: "/", label: "Home", icon: <Icon><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg></Icon> },
    // Dashboards dinâmicos
    ...dashboards.map(dashboard => ({
      href: `/dashboard/${dashboard.id}`,
      label: dashboard.label,
      icon: getDashboardIcon(dashboard.id)
    })),
    { label: "Logout", icon: <Icon><svg viewBox="0 0 24 24" fill="currentColor"><path d="M17 7l-1.41 1.41L18.18 11H8v2h10.17l-2.58 2.59L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg></Icon>, onClick: () => signOut({ callbackUrl: "/login" }) },
  ];

  return (
    <aside
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      className={styles.sidebar}
    >
      <div className={styles.sbInner}>
        <div className={styles.sbBrand}>
          <div className={styles.logo}>▰▰</div>
          {expanded && <div className={styles.brandText}>{tenantName}</div>}
        </div>

        <nav className={styles.sbNav}>
          <div className={styles.sbNavMain}>
            {/* Grupo 1: Home */}
            <div className={styles.navGroup}>
              {nav.slice(0, 1).map((item) => {
                const isActive = item.href ? pathname === item.href : false;
                const content = (
                  <div className={`${styles.sbItem} ${isActive ? styles.active : ""}`}>
                    {item.icon}
                    {expanded && <span className={styles.label}>{item.label}</span>}
                  </div>
                );

                return item.href ? (
                  <Link key={item.label} href={item.href} className={styles.sbLink} title={item.label}>
                    {content}
                  </Link>
                ) : (
                  <button key={item.label} className={styles.sbLink} title={item.label} onClick={item.onClick}>
                    {content}
                  </button>
                );
              })}
            </div>

            {/* Separador visual */}
            <div className={styles.navSeparator} />

            {/* Grupo 2: Dashboards dinâmicos */}
            <div className={styles.navGroup}>
              {nav.slice(1, -1).map((item) => {
                const isActive = item.href ? pathname === item.href : false;
                const content = (
                  <div className={`${styles.sbItem} ${isActive ? styles.active : ""} ${loading ? styles.loading : ""}`}>
                    {item.icon}
                    {expanded && <span className={styles.label}>{item.label}</span>}
                  </div>
                );

                return item.href ? (
                  <Link key={item.label} href={item.href} className={styles.sbLink} title={item.label}>
                    {content}
                  </Link>
                ) : (
                  <button key={item.label} className={styles.sbLink} title={item.label} onClick={item.onClick}>
                    {content}
                  </button>
                );
              })}
            </div>
          </div>
          
          <div className={styles.sbNavFooter}>
            {nav.slice(-1).map((item) => {
              const content = (
                <div className={styles.sbItem}>
                  {item.icon}
                  {expanded && <span className={styles.label}>{item.label}</span>}
                </div>
              );

              return (
                <button key={item.label} className={styles.sbLink} title={item.label} onClick={item.onClick}>
                  {content}
                </button>
              );
            })}
          </div>
        </nav>
      </div>

    </aside>
  );
}


