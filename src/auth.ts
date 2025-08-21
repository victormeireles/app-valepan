import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

const config = {
	secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
	providers: [
		Google({
			clientId: process.env.GOOGLE_CLIENT_ID!,
			clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
			authorization: {
				params: {
					scope: 'openid email profile https://www.googleapis.com/auth/spreadsheets.readonly',
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
		async jwt({ token, account }) {
			// Salvar o access token no JWT token
			if (account) {
				token.accessToken = account.access_token;
			}
			return token;
		},
		async session({ session, token }) {
			// Passar o access token para a sessão
			// @ts-expect-error - NextAuth v5 beta typing issue
			session.accessToken = token.accessToken as string;
			return session;
		},
		async signIn({ user }) {
			const allowed = (process.env.AUTH_ALLOWED_EMAILS ?? "")
				.split(",")
				.map((e) => e.trim().toLowerCase())
				.filter(Boolean);

			const email = user?.email?.toLowerCase();
			if (!email) return false;
			if (allowed.length === 0) return true;
			return allowed.includes(email);
		},
		authorized({ auth, request: { nextUrl } }) {
			const isLoggedIn = !!auth?.user;
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

export const { handlers, auth, signIn, signOut } = NextAuth(config);


