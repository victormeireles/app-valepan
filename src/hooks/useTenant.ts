"use client";

import { useSession } from "next-auth/react";

export function useTenant() {
  const { data: session } = useSession();
  
  return {
    tenantName: session?.tenantName || "Dashboard",
    tenantId: session?.tenantId,
    userEmail: session?.user?.email,
    userName: session?.user?.name,
  };
}
