import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Retorna um cliente Supabase com Service Role para uso exclusivo no servidor.
 * Não use em código que roda no cliente (browser).
 */
export function getSupabaseAdminClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SERVICE_ROLE;

  if (!url) {
    throw new Error("SUPABASE_URL não configurada");
  }
  if (!serviceRoleKey) {
    throw new Error("SERVICE_ROLE não configurada");
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Cliente público (anon) – útil caso venha a ser usado em componentes server
 * sem privilégios elevados. Não é usado na autenticação por enquanto.
 */
export function getSupabaseAnonClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!url) {
    throw new Error("SUPABASE_URL não configurada");
  }
  if (!anonKey) {
    throw new Error("SUPABASE_ANON_KEY não configurada");
  }

  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}


