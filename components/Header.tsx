"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart-context";
import { usePathname, useRouter } from "next/navigation";

export default function Header() {
	const [open, setOpen] = useState(false);
	const { totalItems } = useCart();
	const [isAdmin, setIsAdmin] = useState(false);
	const router = useRouter();
	const pathname = usePathname();
	const [showCartFab, setShowCartFab] = useState(false);

	useEffect(() => {
		fetch("/api/auth/me", { cache: "no-store" })
			.then(async r => {
				if (!r.ok) return { authenticated: false };
				return r.json();
			})
			.then(d => setIsAdmin(Boolean(d?.authenticated)))
			.catch(() => setIsAdmin(false));
	}, [pathname]);

	async function handleLogout() {
		try {
			await fetch("/api/auth/logout", { method: "POST" });
		} catch {}
		setIsAdmin(false);
		setOpen(false);
		router.replace("/");
	}

	// show floating cart button on scroll
	useEffect(() => {
		const onScroll = () => {
			setShowCartFab(window.scrollY > 100);
		};
		onScroll();
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	}, []);

	return (
		<div className="sticky top-0 z-40 bg-[#E7E0D6] flex items-center h-16">
			<button
				aria-label="Открыть меню"
				className="w-10 h-10 flex items-center justify-center rounded hover:bg-gray-100"
				onClick={() => setOpen((v) => !v)}
			>
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
					<path fillRule="evenodd" d="M3 6.75A.75.75 0 0 1 3.75 6h16.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 6.75Zm0 10.5a.75.75 0 0 1 .75-.75h16.5a.75.75 0 0 1 0 1.5H3.75a.75.75 0 0 1-.75-.75Zm0-5.25a.75.75 0 0 1 .75-.75h16.5a.75.75 0 0 1 0 1.5H3.75a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
				</svg>
			</button>
			<div className="flex-1 text-center font-semibold">
				<Link href="/" className="uppercase text-[#022359] font-bold">Заказ доставки еды в баню</Link>
			</div>
			<Link href="/cart" className="relative w-10 h-10 flex items-center justify-center rounded hover:bg-gray-100">
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
					<path d="M2.25 2.25a.75.75 0 0 0 0 1.5h1.386c.17 0 .318.114.36.279l2.31 9.243a2.25 2.25 0 0 0 2.187 1.698h8.022a2.25 2.25 0 0 0 2.187-1.698l1.35-5.4a.75.75 0 0 0-.728-.927H6.888l-.48-1.92A2.25 2.25 0 0 0 3.636 2.25H2.25Z" />
					<path d="M9 20.25A1.5 1.5 0 1 0 9 17.25a1.5 1.5 0 0 0 0 3Zm9 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
				</svg>
				{totalItems > 0 && (
					<span className="absolute -top-1 -right-1 text-[10px] bg-red-600 text-white w-5 h-5 rounded-full flex items-center justify-center">
						{totalItems}
					</span>
				)}
			</Link>

			{open && (
				<div className="fixed inset-0 z-40">
					<div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
					<div className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-lg p-4">
						<div className="flex items-center justify-between mb-4">
							<div className="font-semibold">Меню</div>
							<button className="w-8 h-8 rounded hover:bg-gray-100" onClick={() => setOpen(false)}>✕</button>
						</div>
						<nav className="space-y-2">
							<Link href="/" className="block px-2 py-2 rounded hover:bg-gray-100" onClick={() => setOpen(false)}>
								Главная
							</Link>
							<Link href="/cart" className="block px-2 py-2 rounded hover:bg-gray-100" onClick={() => setOpen(false)}>
								Корзина
							</Link>
							{isAdmin && (
								<Link href="/admin/orders" className="block px-2 py-2 rounded hover:bg-gray-100" onClick={() => setOpen(false)}>
									Заказы
								</Link>
							)}
							{isAdmin ? (
								<Link href="/admin/products" className="block px-2 py-2 rounded hover:bg-gray-100" onClick={() => setOpen(false)}>
									Аккаунт
								</Link>
							) : (
								<Link href="/login" className="block px-2 py-2 rounded hover:bg-gray-100" onClick={() => setOpen(false)}>
									Войти
								</Link>
							)}
							{isAdmin && (
								<button
									className="block w-full text-left px-2 py-2 rounded hover:bg-gray-100"
									onClick={handleLogout}
								>
									Выйти
								</button>
							)}
						</nav>
					</div>
				</div>
			)}

			{showCartFab && pathname === "/" && (
				<Link
					href="/cart"
					aria-label="Открыть корзину"
					className="fixed right-4 bottom-4 z-50 w-14 h-14 rounded-full bg-[#022359] text-white flex items-center justify-center shadow-lg hover:bg-[#022359]/90"
				>
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
						<path d="M2.25 2.25a.75.75 0 0 0 0 1.5h1.386c.17 0 .318.114.36.279l2.31 9.243a2.25 2.25 0 0 0 2.187 1.698h8.022a2.25 2.25 0 0 0 2.187-1.698l1.35-5.4a.75.75 0 0 0-.728-.927H6.888l-.48-1.92A2.25 2.25 0 0 0 3.636 2.25H2.25Z" />
						<path d="M9 20.25A1.5 1.5 0 1 0 9 17.25a1.5 1.5 0 0 0 0 3Zm9 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
					</svg>
					{totalItems > 0 && (
						<span className="absolute -top-1 -right-1 text-[10px] bg-red-600 text-white w-5 h-5 rounded-full flex items-center justify-center">
							{totalItems}
						</span>
					)}
				</Link>
			)}
		</div>
	);
}

