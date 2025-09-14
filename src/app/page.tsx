'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { fetchExternalSheets, type ExternalSheet } from '@/lib/externalSheets';
import { fetchAvailableDashboards, type DashboardInfo } from '@/lib/sheets';
import { useTenant } from '@/hooks/useTenant';
import LoadingOverlay from '@/components/LoadingOverlay';

export default function Home() {
  const { data: session, status } = useSession();
  const { tenantName } = useTenant();
  const [loading, setLoading] = useState(true);
  const [externalSheets, setExternalSheets] = useState<ExternalSheet[]>([]);
  const [availableDashboards, setAvailableDashboards] = useState<DashboardInfo[]>([]);

  useEffect(() => {
    if (status === 'authenticated') {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    async function loadData() {
      try {
        const [sheetsData, dashboardsData] = await Promise.all([
          fetchExternalSheets(),
          fetchAvailableDashboards()
        ]);
        setExternalSheets(sheetsData);
        setAvailableDashboards(dashboardsData);
      } catch (err) {
        console.error('Falha ao carregar dados:', err);
        setExternalSheets([]);
        setAvailableDashboards([]);
      }
    }
    if (status === 'authenticated') {
      void loadData();
    }
  }, [status]);

  if (status === 'unauthenticated') {
    redirect('/login');
  }

  if (status === 'loading' || loading) {
    return <LoadingOverlay show={true} message="Carregando dashboard..." />;
  }
  
  if (!session) {
    return null;
  }

  // Função para mapear dashboards dinâmicos
  const getDashboardConfig = (dashboard: DashboardInfo) => {
    const configs: Record<string, {
      title: string;
      description: string;
      icon: string;
      color: string;
      bgColor: string;
    }> = {
      sales: {
        title: "Dashboard de Vendas",
        description: "Análise de vendas por produto e margem",
        icon: "bar_chart",
        color: "#1E88E5",
        bgColor: "rgba(30, 136, 229, 0.15)"
      },
      customer: {
        title: "Dashboard de Clientes",
        description: "Análise de clientes e comportamento de compra",
        icon: "people",
        color: "#00d3a7",
        bgColor: "rgba(0, 211, 167, 0.15)"
      }
    };

    const config = configs[dashboard.id] || {
      title: dashboard.label,
      description: dashboard.description || "Dashboard operacional",
      icon: "dashboard",
      color: "#e67e22",
      bgColor: "rgba(230, 126, 34, 0.15)"
    };

    return {
      id: dashboard.id,
      title: config.title,
      description: config.description,
      status: "Disponível",
      href: `/dashboard/${dashboard.id}`,
      icon: config.icon,
      color: config.color,
      bgColor: config.bgColor
    };
  };

  const dashboards = availableDashboards.map(getDashboardConfig);



  return (
    <>
      {/* Carregar Google Fonts Material Icons */}
      <link 
        href="https://fonts.googleapis.com/icon?family=Material+Icons" 
        rel="stylesheet" 
      />
      
      <style jsx global>{`
        :root {
          --bg: #0a0e14;
          --panel: rgba(20, 22, 28, .7);
          --panel-border: rgba(255,255,255,.09);
          --muted: #c9cbd6;
          --text: #f2f4f7;
          --accent: #e67e22;
          --accent-2: #f4c27a;
          --danger: #c0392b;
          --glass: rgba(255,255,255,.08);
        }

        * { box-sizing: border-box; }
        body {
          margin: 0; 
          font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif;
          color: var(--text) !important; 
          background: linear-gradient(180deg, #090c12 0%, #0f1420 60%, #090c12 100%) !important;
          min-height: 100vh;
        }

        .bg-animations { position: fixed; inset: 0; overflow: hidden; z-index: -1; }
        .orb { position: absolute; width: 520px; height: 520px; filter: blur(82px); opacity: .4; border-radius: 50%; animation: float 20s ease-in-out infinite; }
        .orb-a { background: radial-gradient(circle at 30% 30%, #1E88E5, transparent 60%); top: -120px; left: -80px; }
        .orb-b { background: radial-gradient(circle at 70% 70%, #00d3a7, transparent 60%); bottom: -140px; right: -120px; animation-delay: -6s; }
        @keyframes float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-20px) } }
        .grid-overlay { position: absolute; inset: 0; background: linear-gradient(transparent 95%, rgba(255,255,255,.05) 95%), linear-gradient(90deg, transparent 95%, rgba(255,255,255,.05) 95%); background-size: 28px 28px; mix-blend-mode: overlay; opacity: .25; }

        .app-header {
          display: flex; justify-content: space-between; align-items: center;
          width: 100%;
          margin-left: 0;
          padding: 12px 12px;
          position: sticky; top: 0; z-index: 998;
          backdrop-filter: blur(12px); 
          background: linear-gradient(180deg, rgba(9,14,28,.65), rgba(9,14,28,.35)); 
          border-bottom: 1px solid var(--panel-border);
          transition: margin-left 0.2s ease, width 0.2s ease; /* Transição suave */
        }
        
        /* Em desktop, ajustar header para sidebar */
        @media (min-width: 769px) {
          .app-header {
            margin-left: 0; /* Não precisa de margem, o container pai já tem */
            width: 100%; /* Ocupa toda a largura disponível */
            padding: 12px 20px;
            border-left: 1px solid rgba(255, 255, 255, 0.03); /* Borda sutil para conectar ao sidebar */
            border-top-left-radius: 0; /* Remove borda arredondada esquerda */
            border-bottom-left-radius: 0; /* Remove borda arredondada esquerda */
          }
        }
        
        .header-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        
        .brand { 
          margin: 0; 
          font-size: 24px; 
          font-weight: 800; 
          letter-spacing: .4px; 
          color: var(--text);
          line-height: 1.2;
        }
        
        .brand span { color: var(--accent); }
        
        .header-right { 
          display: flex; 
          align-items: center; 
          position: relative; 
        }
        
        .logout-btn-icon {
          background: transparent;
          color: var(--text);
          border: none;
          padding: 8px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
        }
        
        .logout-btn-icon:hover {
          background: rgba(255,255,255,.05);
          transform: translateY(-1px);
        }
        
        .logout-btn-icon .material-icons {
          font-size: 20px;
          color: #e67e22;
        }

        .container { 
          padding: 8px 12px 40px; 
          display: grid; 
          gap: 16px; 
          width: 100%; 
          max-width: none; 
        }
        
        /* Em desktop, ajustar container para sidebar */
        @media (min-width: 769px) {
          .container {
            padding: 8px 20px 40px;
          }
        }
        
        .welcome-section {
          text-align: center;
          margin-bottom: 32px;
          padding: 32px 20px;
        }
        
        .welcome-title {
          font-size: 32px;
          font-weight: 800;
          color: var(--text);
          margin: 0 0 12px 0;
          letter-spacing: -0.5px;
        }
        
        .welcome-subtitle {
          font-size: 16px;
          color: var(--muted);
          margin: 0;
          font-weight: 500;
        }
        
        .dashboards-grid {
          display: grid;
          /* auto-fit colapsa colunas vazias, permitindo centralização real quando há poucos itens */
          grid-template-columns: repeat(auto-fit, minmax(320px, 510px));
          justify-content: center;
          gap: 20px;
          margin-bottom: 32px;
        }
        
        .dashboard-card {
          background: var(--panel);
          border: 1px solid var(--panel-border);
          border-radius: 20px;
          padding: 24px;
          box-shadow: 0 8px 24px rgba(0,0,0,.25), inset 0 1px rgba(255,255,255,.06);
          backdrop-filter: blur(8px);
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }
        
        .dashboard-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 16px 40px rgba(0,0,0,.35), inset 0 1px rgba(255,255,255,.08);
          border-color: rgba(255,255,255,.15);
        }
        
        .dashboard-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, var(--accent), var(--accent-2));
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        
        .dashboard-card:hover::before {
          opacity: 1;
        }
        
        .dashboard-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }
        
        .dashboard-icon {
          width: 56px;
          height: 56px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }
        
        .dashboard-icon .material-icons {
          font-size: 28px;
          font-weight: normal;
        }
        
        .dashboard-icon::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 16px;
          padding: 2px;
          background: linear-gradient(135deg, rgba(255,255,255,.2), rgba(255,255,255,.05));
          mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          mask-composite: exclude;
        }
        
        .status-badge {
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .status-available {
          background: rgba(0, 211, 167, 0.2);
          color: #00d3a7;
          border: 1px solid rgba(0, 211, 167, 0.3);
        }
        
        .status-development {
          background: rgba(244, 194, 122, 0.2);
          color: #f4c27a;
          border: 1px solid rgba(244, 194, 122, 0.3);
        }
        
        .dashboard-title {
          font-size: 18px;
          font-weight: 700;
          color: var(--text);
          margin: 0 0 8px 0;
          letter-spacing: 0.2px;
        }
        
        .dashboard-description {
          color: var(--muted);
          font-size: 14px;
          line-height: 1.5;
          margin: 0 0 24px 0;
        }
        
        .dashboard-button {
          width: 100%;
          padding: 12px 20px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 14px;
          text-decoration: none;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s ease;
          border: none;
          cursor: pointer;
        }
        
        .dashboard-button.available {
          background: linear-gradient(135deg, var(--accent), #cf6e1d);
          color: white;
          box-shadow: 0 4px 16px rgba(230,126,34,.3);
        }
        
        .dashboard-button.available:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(230,126,34,.4);
        }
        
        .dashboard-button.disabled {
          background: rgba(255,255,255,.08);
          color: var(--muted);
          border: 1px solid rgba(255,255,255,.12);
          cursor: not-allowed;
        }
        
        .sheets-section {
          margin-top: 32px;
        }
        
        .sheets-grid {
          display: grid;
          /* auto-fit colapsa colunas vazias, permitindo centralização real quando há poucos itens */
          grid-template-columns: repeat(auto-fit, minmax(280px, 380px));
          justify-content: center;
          gap: 20px;
        }
        
        .sheet-card {
          background: var(--panel);
          border: 1px solid var(--panel-border);
          border-radius: 20px;
          padding: 24px;
          box-shadow: 0 8px 24px rgba(0,0,0,.25), inset 0 1px rgba(255,255,255,.06);
          backdrop-filter: blur(8px);
          transition: all 0.3s ease;
          text-decoration: none;
          color: var(--text);
          display: flex;
          align-items: center;
          gap: 20px;
          position: relative;
          overflow: hidden;
        }
        
        .sheet-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, var(--accent), var(--accent-2));
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        
        .sheet-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 16px 40px rgba(0,0,0,.35), inset 0 1px rgba(255,255,255,.08);
          border-color: rgba(255,255,255,.15);
        }
        
        .sheet-card:hover::before {
          opacity: 1;
        }
        
        .sheet-icon {
          width: 56px;
          height: 56px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          position: relative;
        }
        
        .sheet-icon .material-icons {
          font-size: 28px;
          font-weight: normal;
        }
        
        .sheet-icon::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 16px;
          padding: 2px;
          background: linear-gradient(135deg, rgba(255,255,255,.2), rgba(255,255,255,.05));
          mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          mask-composite: exclude;
        }
        
        .sheet-content {
          flex: 1;
          min-width: 0;
        }
        
        .sheet-title {
          font-size: 16px;
          font-weight: 700;
          color: var(--text);
          margin: 0 0 6px 0;
          letter-spacing: 0.2px;
        }
        
        .sheet-description {
          color: var(--muted);
          font-size: 13px;
          line-height: 1.4;
          margin: 0;
        }
        
        .sheet-arrow {
          color: var(--muted);
          opacity: 0.6;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }
        
        .sheet-card:hover .sheet-arrow {
          opacity: 1;
          color: var(--accent);
          transform: translateX(4px);
        }
        
        .arrow-icon {
          width: 16px;
          height: 16px;
          fill: currentColor;
        }
        
        @media (max-width: 768px) {
          .app-header {
            padding: 12px 12px 12px 68px; /* Aumentado para dar mais espaço */
          }
          
          .header-left {
            margin-left: 12px; /* Espaçamento aumentado entre menu hamburger e título */
          }
          
          .brand {
            font-size: 20px;
          }
          
          .welcome-title {
            font-size: 24px;
          }
          
          .welcome-subtitle {
            font-size: 14px;
          }
          
          .dashboards-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }
          
          .sheets-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }
          
          .sheet-card {
            padding: 20px;
            gap: 16px;
          }
          
          .sheet-icon {
            width: 48px;
            height: 48px;
          }
          
          .sheet-icon .material-icons {
            font-size: 24px;
          }
        }
        
        /* Em desktop, header sem espaçamento extra */
        @media (min-width: 769px) {
          .app-header {
            padding: 12px 20px;
          }
        }
      `}</style>
      
      <div className="bg-animations">
        <div className="orb orb-a"></div>
        <div className="orb orb-b"></div>
        <div className="grid-overlay"></div>
            </div>

      <header className="app-header">
        <div className="header-left">
          <div className="brand">
            <span>{tenantName}</span> Dash
          </div>
        </div>
        <div className="header-right">
          <Link href="/api/auth/signout" className="logout-btn-icon" title="Sair">
            <span className="material-icons">logout</span>
          </Link>
        </div>
      </header>

      <main className="container">
        <section className="welcome-section">
          <h2 className="welcome-title">Dashboards Disponíveis</h2>
          <p className="welcome-subtitle">Selecione um dashboard para visualizar os dados operacionais</p>
        </section>

        <section className="dashboards-grid">
          {dashboards.map((dashboard) => (
            <div key={dashboard.id} className="dashboard-card">
              <div className="dashboard-header">
                <div 
                  className="dashboard-icon"
                  style={{ 
                    background: dashboard.bgColor,
                    color: dashboard.color
                  }}
                >
                  <span className="material-icons">{dashboard.icon}</span>
                  </div>
                <span className={`status-badge ${
                  dashboard.status === "Disponível" ? "status-available" : "status-development"
                  }`}>
                    {dashboard.status}
                  </span>
                </div>
                
              <h3 className="dashboard-title">{dashboard.title}</h3>
              <p className="dashboard-description">{dashboard.description}</p>
              
              {dashboard.status === "Disponível" ? (
                <Link 
                  href={dashboard.href}
                  className="dashboard-button available"
                >
                  Acessar Dashboard
                  <svg className="arrow-icon" viewBox="0 0 24 24">
                    <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8-8-8z"/>
                  </svg>
                </Link>
              ) : (
                <button className="dashboard-button disabled">
                  Em breve
                </button>
              )}
            </div>
          ))}
        </section>

        <section className="sheets-section">
          <h3 style={{ 
            gridColumn: '1 / -1', 
            margin: '0 0 16px 0', 
            fontSize: '18px', 
            fontWeight: '700', 
            color: 'var(--accent-2)',
            letterSpacing: '0.2px',
			textAlign: 'center'
          }}>
            Planilhas de Dados
          </h3>
          <div className="sheets-grid">
            {externalSheets.map((sheet) => {
              const iconStyle = { background: 'rgba(99, 102, 241, 0.15)', color: '#6366f1' } as const;
              return (
                <a
                  key={sheet.id}
                  href={sheet.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="sheet-card"
                >
                  <div className="sheet-icon" style={iconStyle}>
                    <span className="material-icons">table_chart</span>
                  </div>
                  <div className="sheet-content">
                    <h4 className="sheet-title">{sheet.title ?? 'Planilha'}</h4>
                    <p className="sheet-description">{sheet.description ?? ''}</p>
                  </div>
                  <div className="sheet-arrow">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M7 17L17 7M17 7H7M17 7V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </a>
              );
            })}
          </div>
        </section>
      </main>
    </>
  );
}
