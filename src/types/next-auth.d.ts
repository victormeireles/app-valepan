// NextAuth types extension

declare module "next-auth" {
  interface Session {
    accessToken?: string
    tenantId?: string
    tenantName?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string
    refreshToken?: string
    expiresAt?: number
    tenantId?: string
    tenantName?: string
  }
}

// Garante que este .d.ts é tratado como módulo e aplica as augmentations
export {};
