"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useTenant } from "./useTenant";

export function useMultiTenant() {
  const { data: session, update } = useSession();
  const { tenantId, tenantName, tenantSlug } = useTenant();
  const router = useRouter();
  const [isChanging, startTransition] = useTransition();

  const availableTenants = session?.availableTenants || [];
  const currentTenant = {
    id: tenantId,
    name: tenantName,
    slug: tenantSlug,
  };

  const hasMultipleTenants = availableTenants.length > 1;

  const changeTenant = async (newTenantId: string) => {
    if (isChanging || !newTenantId || newTenantId === currentTenant.id) {
      return;
    }

    try {
      // Atualiza o token no backend e a sessão no frontend
      await update({ tenantId: newTenantId });

      // Redireciona para a home ao trocar de tenant
      // Isso garante que o usuário não fique em um dashboard 
      // que o novo tenant pode não ter acesso
      startTransition(() => {
        router.push('/');
      });
      
    } catch (error) {
      console.error('❌ Erro ao trocar tenant:', error);
      alert('Ocorreu um erro ao tentar trocar de empresa.');
    }
  };

  return {
    availableTenants,
    currentTenant,
    hasMultipleTenants,
    isChanging,
    changeTenant,
  };
}
