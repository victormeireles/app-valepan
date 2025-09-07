import { signIn } from "@/auth";
import Logo from "@/components/Logo";

export default function LoginPage() {
	async function doSignIn() {
		"use server";
		await signIn("google");
	}

	return (
		<div className="min-h-svh flex items-center justify-center p-8">
			<div className="w-full max-w-sm rounded-lg border border-black/10 dark:border-white/10 p-6 space-y-6">
				<div className="flex flex-col items-center space-y-4">
					<Logo context="login" variant="auto" priority />
					<h1 className="text-xl font-semibold text-center">Entrar</h1>
				</div>
				<form action={doSignIn} className="space-y-3">
					<button
						type="submit"
						className="w-full h-10 rounded-md bg-black text-white dark:bg-white dark:text-black hover:opacity-90 transition"
					>
						Entrar com Google
					</button>
				</form>
				<p className="text-xs text-center text-black/60 dark:text-white/60">
					Apenas e-mails autorizados podem acessar.
				</p>
			</div>
		</div>
	);
}


