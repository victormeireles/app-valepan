
/* eslint-disable @typescript-eslint/no-explicit-any */
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { getSupabaseAdminClient } from "@/lib/supabase";

const authConfig = {
	secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
	providers: [
		Google({
			clientId: process.env.GOOGLE_CLIENT_ID!,
			clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
			authorization: {
				params: {
					scope: 'openid email profile https://www.googleapis.com/auth/spreadsheets.readonly',
					access_type: 'offline',
					prompt: 'consent',
				},
			},
		}),
	],
	pages: {
		signIn: "/login",
	},
	session: { strategy: "jwt" },
	debug: process.env.NODE_ENV === "development",
	trustHost: true,
	basePath: "/api/auth",
	callbacks: {
		// @ts-expect-error - NextAuth v5 callback typing
		async jwt({ token, account, trigger, user }) {
			// Primeira vez (login) - salvar tokens e dados do tenant
			if (account) {
				token.accessToken = account.access_token;
				token.refreshToken = account.refresh_token;
				token.expiresAt = account.expires_at;
				
				// Buscar tenant do membro pelo e-mail
				try {
					const email = (user?.email as string | undefined)?.toLowerCase();
					if (email) {
						const supabase = getSupabaseAdminClient();
						// Primeiro, buscar o tenant_id do membro
						const { data: memberData, error: memberError } = await supabase
							.from('tenant_members')
							.select('tenant_id')
							.ilike('email', email)
							.limit(1)
							.maybeSingle();

						if (memberError) {
							console.error('[JWT Callback] Erro ao buscar tenant_id do membro:', memberError);
						} else if (memberData && memberData.tenant_id) {
							const tenantId = memberData.tenant_id;
							
							// Agora buscar o nome do tenant
							const { data: tenantData, error: tenantError } = await supabase
								.from('tenants')
								.select('name')
								.eq('id', tenantId)
								.limit(1)
								.maybeSingle();

							if (tenantError) {
								console.error('[JWT Callback] Erro ao buscar nome do tenant:', tenantError);
							} else if (tenantData && tenantData.name) {
								const tenantName = tenantData.name;
								token.tenantId = tenantId;
								token.tenantName = tenantName;
							}
						}
					}
				} catch (err) {
					console.error('[JWT Callback] Exceção ao buscar tenant do membro:', err);
				}
				
				return token;
			}
			
			// Verificar se o token ainda é válido
			const now = Math.floor(Date.now() / 1000);
			const expiresAt = (token.expiresAt as number) || 0;
			
			// Se ainda tem pelo menos 5 minutos, usar token atual
			if (expiresAt > now + 300) {
				return token;
			}
			
			if (!token.refreshToken) {
				return token;
			}
			
			try {
				const response = await fetch('https://oauth2.googleapis.com/token', {
					method: 'POST',
					headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
					body: new URLSearchParams({
						grant_type: 'refresh_token',
						refresh_token: token.refreshToken as string,
						client_id: process.env.GOOGLE_CLIENT_ID!,
						client_secret: process.env.GOOGLE_CLIENT_SECRET!,
					}),
				});
				
				if (response.ok) {
					const refreshed = await response.json();
					const newExpiresAt = Math.floor(Date.now() / 1000) + refreshed.expires_in;
					
					return {
						...token,
						accessToken: refreshed.access_token,
						expiresAt: newExpiresAt,
						refreshToken: refreshed.refresh_token || token.refreshToken,
					};
				} else {
					const errorText = await response.text();
					console.error('[JWT Callback] ❌ Erro ao renovar token:', response.status, errorText);
					
					// Se refresh falhou, manter token expirado mas sinalizar erro
					return {
						...token,
						error: 'refresh_failed'
					};
				}
			} catch (error) {
				console.error('[JWT Callback] ❌ Exceção ao renovar token:', error);
				
				// Se refresh falhou, manter token expirado mas sinalizar erro
				return {
					...token,
					error: 'refresh_error'
				};
			}
		},
		// @ts-expect-error - NextAuth v5 callback typing
		async session({ session, token }) {
			// Passar tokens e tenant para a sessão
			session.accessToken = token.accessToken as string;
			session.tenantId = token.tenantId as string | undefined;
			session.tenantName = token.tenantName as string | undefined;
			
			return session;
		},
		// @ts-expect-error - NextAuth v5 callback typing
		async signIn({ user }) {
			const email = (user?.email as string)?.toLowerCase();
			if (!email) return false;

			try {
				const supabase = getSupabaseAdminClient();
				const { data, error } = await supabase
					.from("tenant_members")
					.select("id")
					.ilike("email", email)
					.limit(1)
					.maybeSingle();

				if (error) {
					console.error("[signIn] Erro consultando tenant_members:", error);
					return false;
				}

				return !!data;
			} catch (err) {
				console.error("[signIn] Exceção ao validar no Supabase:", err);
				return false;
			}
		},
		// @ts-expect-error - NextAuth v5 callback typing
		authorized({ auth, request: { nextUrl } }) {
			const isLoggedIn = !!(auth?.user as Record<string, unknown>);
			const isOnLogin = nextUrl.pathname.startsWith("/login");

			if (isOnLogin) {
				if (isLoggedIn) return Response.redirect(new URL("/", nextUrl));
				return true;
			}

			if (!isLoggedIn) return false;
			return true;
		},
	},
};

// Contorna problemas de tipagem do NextAuth v5 beta
const nextAuthResult = (NextAuth as any)(authConfig);

export const {
  handlers,
  auth,
  signIn,
  signOut,
} = nextAuthResult;


