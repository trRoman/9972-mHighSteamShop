// ./components/ProductList.tsx
// Компонент списка товаров

"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import ProductCard, { type Product } from "./ProductCard";

type ApiResponse = {
	items: Product[];
	total: number;
	page: number;
	limit: number;
	hasMore: boolean;
};

export default function ProductList() {
	const params = useSearchParams();
	const category = params.get("category") ?? "";
	const [defaultSlug, setDefaultSlug] = useState<string>("");
	const [defaultReady, setDefaultReady] = useState(false);

	const [items, setItems] = useState<Product[]>([]);
	const [page, setPage] = useState(1);
	const [hasMore, setHasMore] = useState(true);
	const [loading, setLoading] = useState(false);
	const observerRef = useRef<HTMLDivElement | null>(null);

	// Загружаем категорию по умолчанию один раз
	useEffect(() => {
		let ignore = false;
		(async () => {
			try {
				const res = await fetch("/api/categories");
				if (!res.ok) throw new Error();
				const data = await res.json();
				const def = (data.items as Array<{ slug: string; is_default?: number }>).find(c => c.is_default === 1);
				if (!ignore) {
					setDefaultSlug(def?.slug ?? "");
					setDefaultReady(true);
				}
			} catch {
				if (!ignore) setDefaultReady(true);
			}
		})();
		return () => { ignore = true; };
	}, []);

	const effectiveCategory = category || defaultSlug;

	const resetKey = useMemo(() => `${effectiveCategory}`, [effectiveCategory]);

	useEffect(() => {
		let ignore = false;
		async function load() {
			// Ждём определения дефолтной категории, если параметр не задан
			if (!category && !defaultReady) return;
			setLoading(true);
			try {
				const url = new URL("/api/products", window.location.origin);
				url.searchParams.set("page", String(page));
				url.searchParams.set("limit", "10");
				if (effectiveCategory) url.searchParams.set("category", effectiveCategory);
				const res = await fetch(url.toString());
				const data: ApiResponse = await res.json();
				if (!ignore) {
					setItems((prev) => page === 1 ? data.items : [...prev, ...data.items]);
					setHasMore(data.hasMore);
				}
			} finally {
				if (!ignore) setLoading(false);
			}
		}
		load();
		return () => { ignore = true; };
	}, [page, category, defaultReady, effectiveCategory]);

	useEffect(() => {
		setItems([]);
		setPage(1);
		setHasMore(true);
	}, [resetKey]);

	useEffect(() => {
		if (!observerRef.current) return;
		const el = observerRef.current;
		const io = new IntersectionObserver((entries) => {
			entries.forEach((entry) => {
				if (entry.isIntersecting && hasMore && !loading) {
					setPage((p) => p + 1);
				}
			});
		}, { rootMargin: "300px" });
		io.observe(el);
		return () => {
			io.disconnect();
		};
	}, [hasMore, loading, effectiveCategory]);

	return (
		<>
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				{items.map((p) => (
					<ProductCard key={`${p.id}-${Math.floor(p.price / 100)}`} product={p} />
				))}
			</div>
			<div ref={observerRef} className="h-10" />
			{loading && (
				<div className="py-6 text-center text-gray-600">Загрузка…</div>
			)}
			{!hasMore && !loading && items.length > 0 && (
				<div className="py-6 text-center text-gray-500">Это все товары</div>
			)}
		</>
	);
}

