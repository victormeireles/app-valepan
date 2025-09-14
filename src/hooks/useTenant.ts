"use client";

import { useSession } from "next-auth/react";

export function useTenant() {
  const { data: session } = useSession();

  return {
    tenantId: session?.tenantId,
    tenantName: session?.tenantName,
    tenantSlug: session?.tenantSlug,
    userEmail: session?.user?.email,
    userName: session?.user?.name,
  };
}
