"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Route } from "next";

type Category = { id: number; slug: string; name: string; is_default?: number };

export default function CategoryBar() {
	const [items, setItems] = useState<Category[]>([]);
	const params = useSearchParams();
	const router = useRouter();
	const pathname = usePathname();
	const active = params.get("category") ?? "";

	useEffect(() => {
		let ignore = false;
		(async () => {
			const res = await fetch("/api/categories");
			const data = await res.json();
			if (!ignore) {
				const arr = (data.items as Category[]).slice();
				arr.sort((a, b) => {
					const da = a.is_default === 1 ? 1 : 0;
					const db = b.is_default === 1 ? 1 : 0;
					if (db - da !== 0) return db - da; // default first
					return a.id - b.id; // then by id asc
				});
				setItems(arr);
			}
		})();
		return () => { ignore = true; };
	}, []);

	const setCategory = (slug: string) => {
		const qs = new URLSearchParams(Array.from(params.entries()));
		if (slug) qs.set("category", slug);
		else qs.delete("category");
		const href = (`/?${qs.toString()}`) as Route;
		router.replace(href, { scroll: true });
	};

	return (
		<div className="flex items-center gap-2 py-2 overflow-x-auto">
			<button
				className={`px-3 py-1 rounded border ${active === "" ? "bg-[#022359] text-white border-gray-900" : "hover:bg-gray-100"}`}
				onClick={() => {
					// На главной кнопка "Все" снимает фильтр (без редиректов на других страницах)
					if (pathname === "/") setCategory("");
				}}
				aria-pressed={active === ""}
			>
				Все
			</button>
			{items.map(c => (
				<button
					key={c.id}
					className={`px-3 py-1 rounded border ${active === c.slug ? "bg-[#022359] text-white border-gray-900" : "hover:bg-gray-100"}`}
					onClick={() => setCategory(c.slug)}
					aria-pressed={active === c.slug}
				>
					{c.name}
				</button>
			))}
		</div>
	);
}

