"use client";
export const dynamic = "force-dynamic";
import { Suspense } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const router = useRouter();

	const onSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError(null);
		try {
			const res = await fetch("/api/auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email, password })
			});
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(data.error ?? "Ошибка входа");
			}
			router.replace("/admin/products");
		} catch (err: any) {
			setError(err.message ?? "Ошибка");
		} finally {
			setLoading(false);
		}
	};

	return (
		<Suspense fallback={<div />}>
		<div className="max-w-sm mx-auto py-10">
			<h1 className="text-2xl font-semibold mb-6 text-center">Вход администратора</h1>
			<form onSubmit={onSubmit} className="space-y-4">
				<div>
					<label className="block text-sm mb-1">E-mail</label>
					<input
						type="email"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						className="w-full border rounded px-3 py-2"
						required
					/>
				</div>
				<div>
					<label className="block text-sm mb-1">Пароль</label>
					<input
						type="password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						className="w-full border rounded px-3 py-2"
						required
					/>
				</div>
				{error && <div className="text-red-600 text-sm">{error}</div>}
				<button
					type="submit"
					disabled={loading}
					className="w-full bg-black text-white py-2 rounded hover:bg-gray-900 disabled:opacity-60"
				>
					{loading ? "Входим..." : "Войти"}
				</button>
			</form>
		</div>
		</Suspense>
	);
}


