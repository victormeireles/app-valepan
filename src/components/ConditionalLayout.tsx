"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";

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
  
  // Páginas onde não queremos mostrar o sidebar
  const noSidebarPages = ["/login"];
  
  const shouldShowSidebar = !noSidebarPages.includes(pathname);

  if (shouldShowSidebar) {
    return (
      <div className="app-shell">
        <Sidebar />
        <div className="app-content">{children}</div>
      </div>
    );
  }

  // Para páginas sem sidebar (como login), renderiza diretamente o conteúdo
  return <>{children}</>;
}
