// components/AdminProductsTable.tsx
// Этот компонент отображает таблицу товаров в административной панели

"use client";
import { memo, useEffect, useMemo, useState, useCallback } from "react";
import Snackbar from "@mui/material/Snackbar";
import MuiAlert from "@mui/material/Alert";

type Product = {
	id: number;
	name: string;
	description: string;
	price: number;
	image: string;
	category_slug?: string;
	category_name?: string;
};

export default function AdminProductsTable() {
	const [items, setItems] = useState<Product[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [q, setQ] = useState("");
	const [categories, setCategories] = useState<Array<{id:number; slug:string; name:string}>>([]);
	const [category, setCategory] = useState<string>("");
	// new product form
	const [newName, setNewName] = useState("");
	const [newDescription, setNewDescription] = useState("");
	const [newPrice, setNewPrice] = useState<number>(0);
	const [newCategorySlug, setNewCategorySlug] = useState<string>("");
	const [newImage, setNewImage] = useState<File | null>(null);

	// toast
	const [toastOpen, setToastOpen] = useState(false);
	const [toastMsg, setToastMsg] = useState<string>("");

	async function load() {
		setLoading(true);
		setError(null);
		try {
			const url = new URL("/api/admin/products", window.location.origin);
			if (q.trim()) url.searchParams.set("q", q.trim());
			if (category) url.searchParams.set("category", category);
			const res = await fetch(url.toString());
			if (!res.ok) throw new Error("Не удалось загрузить товары");
			const data = await res.json();
			setItems(data.items);
		} catch (e: any) {
			setError(e.message ?? "Ошибка");
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		load();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [category]);

	useEffect(() => {
		let t = setTimeout(() => load(), 350);
		return () => clearTimeout(t);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [q]);

	useEffect(() => {
		(async () => {
			const res = await fetch("/api/categories");
			if (res.ok) {
				const data = await res.json();
				setCategories(data.items);
			}
		})();
	}, []);

	async function createProduct() {
		try {
			if (!newName.trim() || !newDescription.trim() || !newCategorySlug) {
				alert("Заполните название, описание и категорию");
				return;
			}
			const cat = categories.find(c => c.slug === newCategorySlug);
			if (!cat) {
				alert("Выберите категорию");
				return;
			}
			const res = await fetch("/api/admin/products", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: newName.trim(),
					description: newDescription.trim(),
					price: Math.max(0, Math.floor(newPrice || 0)),
					category_id: cat.id
				})
			});
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(data.error ?? "Ошибка создания");
			}
			// API теперь возвращает созданный товар целиком
			const created = await res.json() as Product & { category_slug?: string; category_name?: string };
			let finalImage = created.image;
			// Если приложили картинку — загружаем и обновляем ссылку
			if (newImage && created.id) {
				const fd = new FormData();
				fd.append("file", newImage);
				const up = await fetch(`/api/admin/products/${created.id}/image`, { method: "POST", body: fd });
				if (up.ok) {
					const j = await up.json().catch(() => ({} as any));
					if (j && j.image) finalImage = j.image;
				}
			}
			// Оптимистично добавим товар в список без полной перезагрузки
			const newItem: Product = {
				id: created.id,
				name: newName.trim(),
				description: newDescription.trim(),
				price: Math.max(0, Math.floor(newPrice || 0)),
				image: finalImage,
				category_slug: created.category_slug,
				category_name: created.category_name
			};
			setItems(prev => [newItem, ...prev]);
			// reset
			setNewName("");
			setNewDescription("");
			setNewPrice(0);
			setNewCategorySlug("");
			setNewImage(null);
		} catch (e: any) {
			alert(e.message ?? "Ошибка");
		}
	}

	const saveRow = useCallback(async (id: number, name: string, description: string, price: number) => {
		const res = await fetch(`/api/admin/products/${id}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name, description, price })
		});
		if (!res.ok) {
			setToastMsg("Ошибка сохранения");
			setToastOpen(true);
		} else {
			setToastMsg("Изменения сохранены");
			setToastOpen(true);
			// актуализируем локальный список без полной перезагрузки
			setItems(prev => prev.map(x => x.id === id ? { ...x, name, description, price } : x));
		}
	}, []);

	const deleteRow = useCallback(async (id: number) => {
		if (!confirm("Удалить товар?")) return;
		const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
		if (res.ok) {
			setItems(prev => prev.filter(x => x.id !== id));
		} else {
			alert("Ошибка удаления");
		}
	}, []);

	const uploadImage = useCallback(async (id: number, file: File) => {
		const fd = new FormData();
		fd.append("file", file);
		const res = await fetch(`/api/admin/products/${id}/image`, {
			method: "POST",
			body: fd
		});
		if (res.ok) {
			// подтянем обновлённый список (URL картинки меняется)
			load();
		} else {
			alert("Ошибка загрузки изображения");
		}
	}, []);

	const grouped = useMemo(() => groupByCategory(items), [items]);

	type ProductRowProps = {
		p: Product;
		onSave: (id: number, name: string, description: string, price: number) => Promise<void>;
		onDelete: (id: number) => Promise<void> | void;
		onUpload: (id: number, file: File) => Promise<void>;
	};

	const ProductRow = memo(function ProductRowInner({ p, onSave, onDelete, onUpload }: ProductRowProps) {
		const [name, setName] = useState(p.name);
		const [description, setDescription] = useState(p.description);
		const [price, setPrice] = useState<number>(p.price);

		// обновляем локальные поля, если пришли новые данные
		useEffect(() => { setName(p.name); }, [p.name]);
		useEffect(() => { setDescription(p.description); }, [p.description]);
		useEffect(() => { setPrice(p.price); }, [p.price]);

		return (
			<tr className="border-t align-top">
				<td className="px-3 py-2">{p.id}</td>
				<td className="px-3 py-2 w-64">
					<input className="w-full border rounded px-2 py-1" value={name} onChange={(e) => setName(e.target.value)} />
				</td>
				<td className="px-3 py-2 w-[28rem]">
					<textarea className="w-full border rounded px-2 py-1 h-20" value={description} onChange={(e) => setDescription(e.target.value)} />
				</td>
				<td className="px-3 py-2 w-32">
					<input
						type="number"
						className="w-full border rounded px-2 py-1"
						value={Number.isFinite(price) ? price : 0}
						onChange={(e) => setPrice(Number(e.target.value || 0))}
					/>
				</td>
				<td className="px-3 py-2 w-64">
					<div className="flex items-center gap-2">
						<img src={p.image} alt="" className="w-16 h-16 object-cover rounded border transition-opacity duration-300" loading="lazy" decoding="async" fetchPriority="low" />
						<label className="text-sm">
							<input
								type="file"
								accept="image/*"
								className="hidden"
								onChange={(e) => {
									const file = e.target.files?.[0];
									if (file) onUpload(p.id, file);
								}}
							/>
							<span className="px-2 py-1 border rounded cursor-pointer hover:bg-gray-100">Загрузить</span>
						</label>
					</div>
				</td>
				<td className="px-3 py-2">
					<div className="flex gap-2">
						<button className="px-3 py-1 border rounded hover:bg-gray-100" onClick={() => onSave(p.id, name, description, price)}>Сохранить</button>
						<button className="px-3 py-1 border rounded text-red-600 hover:bg-red-50" onClick={() => onDelete(p.id)}>Удалить</button>
					</div>
				</td>
			</tr>
		);
	});

	return (
		<div className="overflow-x-auto bg-white/70 border rounded">
			{/* New product form */}
			<div className="p-3 border-b">
				<div className="font-medium mb-2">Добавить товар</div>
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
					<input
						className="border rounded px-2 py-2"
						placeholder="Название"
						value={newName}
						onChange={(e) => setNewName(e.target.value)}
					/>
					<select
						className="border rounded px-2 py-2"
						value={newCategorySlug}
						onChange={(e) => setNewCategorySlug(e.target.value)}
					>
						<option value="">Категория</option>
						{categories.map(c => (
							<option key={`new-${c.id}`} value={c.slug}>{c.name}</option>
						))}
					</select>
					<input
						type="number"
						className="border rounded px-2 py-2"
						placeholder="Цена"
						value={Number.isFinite(newPrice) ? newPrice : 0}
						onChange={(e) => setNewPrice(Number(e.target.value || 0))}
					/>
					<label className="border rounded px-2 py-2 text-sm flex items-center gap-2 cursor-pointer">
						<input
							type="file"
							accept="image/*"
							className="hidden"
							onChange={(e) => setNewImage(e.target.files?.[0] ?? null)}
						/>
						<span>{newImage ? `Файл: ${newImage.name}` : "Изображение (загрузить)"}</span>
					</label>
				</div>
				<textarea
					className="mt-2 w-full border rounded px-2 py-2"
					rows={3}
					placeholder="Описание"
					value={newDescription}
					onChange={(e) => setNewDescription(e.target.value)}
				/>
				<div className="mt-2">
					<button className="px-3 py-2 border rounded hover:bg-gray-100" onClick={createProduct}>
						Добавить товар
					</button>
				</div>
			</div>
			<div className="p-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex items-center gap-2">
					<label className="text-sm text-gray-700">Категория:</label>
					<select className="border rounded px-2 py-1" value={category} onChange={(e) => setCategory(e.target.value)}>
						{/* options */}
						<option value="">Все</option>
						{categories.map(c => (
							<option key={c.id} value={c.slug}>{c.name}</option>
						))}
					</select>
				</div>
				<div className="flex-1 sm:max-w-sm">
					<input
						className="w-full border rounded px-3 py-2"
						placeholder="Поиск по названию и описанию…"
						value={q}
						onChange={(e) => setQ(e.target.value)}
					/>
				</div>
			</div>
			{error && <div className="p-3 text-red-600">{error}</div>}
			{/* Mobile cards (xs) */}
			<div className="grid gap-3 p-3 sm:hidden">
				{items.map((p) => (
					<div key={`m-${p.id}`} className="border rounded p-3 bg-white">
						<div className="flex items-start gap-3">
							<img src={p.image} alt="" className="w-16 h-16 object-cover rounded border transition-opacity duration-300" loading="lazy" decoding="async" fetchPriority="low" />
							<div className="flex-1">
								<div className="text-xs text-gray-500">ID: {p.id}</div>
								<input className="mt-1 w-full border rounded px-2 py-1" value={p.name} onChange={(e) => {
									const val = e.target.value;
									setItems(prev => prev.map(x => x.id === p.id ? { ...x, name: val } : x));
								}} />
							</div>
						</div>
						<textarea className="mt-2 w-full border rounded px-2 py-1 h-24" value={p.description} onChange={(e) => {
							const val = e.target.value;
							setItems(prev => prev.map(x => x.id === p.id ? { ...x, description: val } : x));
						}} />
						<div className="mt-2 flex items-center gap-2">
							<input type="number" className="w-32 border rounded px-2 py-1" value={p.price} onChange={(e) => {
								const val = Number(e.target.value || 0);
								setItems(prev => prev.map(x => x.id === p.id ? { ...x, price: val } : x));
							}} />
							<label className="text-sm">
								<input type="file" accept="image/*" className="hidden" onChange={(e) => {
									const file = e.target.files?.[0];
									if (file) uploadImage(p.id, file);
								}} />
								<span className="px-2 py-1 border rounded cursor-pointer hover:bg-gray-100">Загрузить фото</span>
							</label>
						</div>
						<div className="mt-3 flex gap-2">
							<button className="flex-1 px-3 py-2 border rounded hover:bg-gray-100" onClick={() => saveRow(p.id, p.name, p.description, p.price)}>Сохранить</button>
							<button className="flex-1 px-3 py-2 border rounded text-red-600 hover:bg-red-50" onClick={() => deleteRow(p.id)}>Удалить</button>
						</div>
					</div>
				))}
			</div>
			{/* Desktop tables (sm and up) */}
			<div className="hidden sm:block">
				{Object.entries(grouped).map(([cat, rows]) => (
					<div key={cat}>
						<div className="bg-gray-50 px-3 py-2 font-medium">{cat}</div>
						<table className="min-w-full text-sm">
							<thead className="bg-gray-100">
								<tr>
									<th className="text-left px-3 py-2">ID</th>
									<th className="text-left px-3 py-2">Название</th>
									<th className="text-left px-3 py-2">Описание</th>
									<th className="text-left px-3 py-2">Цена</th>
									<th className="text-left px-3 py-2">Фото</th>
									<th className="px-3 py-2"></th>
								</tr>
							</thead>
							<tbody>
								{rows.map((p) => (
									<ProductRow key={p.id} p={p} onSave={saveRow} onDelete={deleteRow} onUpload={uploadImage} />
								))}
							</tbody>
						</table>
					</div>
				))}
			</div>
			{loading && <div className="p-3 text-gray-600">Загрузка…</div>}

			<Snackbar
				open={toastOpen}
				autoHideDuration={3000}
				onClose={() => setToastOpen(false)}
				anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
			>
				<MuiAlert elevation={6} variant="filled" severity="success" onClose={() => setToastOpen(false)}>
					{toastMsg}
				</MuiAlert>
			</Snackbar>
		</div>
	);
}

function groupByCategory(items: Product[]) {
	const map: Record<string, Product[]> = {};
	for (const p of items) {
		const key = p.category_name || "Без категории";
		if (!map[key]) map[key] = [];
		map[key].push(p);
	}
	return map;
}


