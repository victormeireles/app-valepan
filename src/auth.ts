
/* eslint-disable @typescript-eslint/no-explicit-any */
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

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
		async jwt({ token, account, trigger }) {
			// Debug: Log do que está vindo
			console.log('[JWT Callback] Trigger:', trigger);
			console.log('[JWT Callback] Token:', token);
			console.log('[JWT Callback] Account:', account);
			
			// Primeira vez (login) - salvar tokens
			if (account) {
				console.log('[JWT Callback] Account keys:', Object.keys(account));
				console.log('[JWT Callback] Access Token:', account.access_token);
				console.log('[JWT Callback] Refresh Token:', account.refresh_token);
				
				token.accessToken = account.access_token;
				token.refreshToken = account.refresh_token;
				token.expiresAt = account.expires_at;
				
				console.log('[JWT Callback] Tokens salvos - expires at:', new Date((account.expires_at || 0) * 1000));
				return token;
			}
			
			// Verificar se o token ainda é válido
			const now = Math.floor(Date.now() / 1000);
			const expiresAt = (token.expiresAt as number) || 0;
			
			// Se ainda tem pelo menos 5 minutos, usar token atual
			if (expiresAt > now + 300) {
				console.log('[JWT Callback] Token ainda válido por', Math.round((expiresAt - now) / 60), 'minutos');
				return token;
			}
			
			// Token expirado ou expirando - tentar refresh
			console.log('[JWT Callback] Token expirado/expirando, tentando refresh...');
			
			if (!token.refreshToken) {
				console.log('[JWT Callback] Sem refresh token disponível');
				return token;
			}
			
			try {
				console.log('[JWT Callback] Iniciando refresh do token...');
				
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
					
					console.log('[JWT Callback] ✅ Token renovado com sucesso!');
					console.log('[JWT Callback] Novo token válido até:', new Date(newExpiresAt * 1000));
					
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
			// Debug: Log do que está vindo
			console.log('[Session Callback] Session:', session);
			console.log('[Session Callback] Token:', token);
			
			// Passar o access token para a sessão
			session.accessToken = token.accessToken as string;
			
			console.log('[Session Callback] Session final:', session);
			return session;
		},
		// @ts-expect-error - NextAuth v5 callback typing
		async signIn({ user }) {
			const allowed = (process.env.AUTH_ALLOWED_EMAILS ?? "")
				.split(",")
				.map((e) => e.trim().toLowerCase())
				.filter(Boolean);

			const email = (user?.email as string)?.toLowerCase();
			if (!email) return false;
			if (allowed.length === 0) return true;
			return allowed.includes(email);
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


