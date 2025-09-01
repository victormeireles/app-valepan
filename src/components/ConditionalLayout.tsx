"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import MobileMenu from "./MobileMenu";
import DynamicTitle from "./DynamicTitle";

export default function ConditionalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  
  // Esconder loading inicial quando React estiver pronto
  useEffect(() => {
    const loader = document.getElementById('initial-loading');
    if (loader) {
      loader.style.display = 'none';
    }
  }, []);
  
  // Páginas onde não queremos mostrar a navegação
  const noSidebarPages = ["/login"];
  
  const shouldShowNav = !noSidebarPages.includes(pathname);

  if (shouldShowNav) {
    return (
      <div className="app-shell">
        {/* Título dinâmico baseado no tenant */}
        <DynamicTitle />
        {/* Menu mobile (hamburger + drawer) - sempre presente, visível apenas em mobile via CSS */}
        <MobileMenu />
        {/* Sidebar (desktop) - oculto em mobile via CSS */}
        <Sidebar />
        <div className="app-content">{children}</div>
      </div>
    );
  }

  // Para páginas sem navegação (como login), renderiza diretamente o conteúdo
  return <>{children}</>;
}
