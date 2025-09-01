"use client";

import { useEffect } from "react";
import { useTenant } from "@/hooks/useTenant";

export default function DynamicTitle() {
  const { tenantName } = useTenant();

  useEffect(() => {
    // Atualizar o título da página com o nome do tenant
    document.title = `${tenantName} Dashboard`;
  }, [tenantName]);

  return null; // Este componente não renderiza nada visualmente
}
