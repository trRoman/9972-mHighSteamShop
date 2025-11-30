// components/AdminCategoriesTable.tsx
// Это компонент для отображения таблицы категорий в админ-панели

"use client";
import { useEffect, useState } from "react";

type Category = { id: number; slug: string; name: string };

export default function AdminCategoriesTable() {
	const [items, setItems] = useState<Category[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [newSlug, setNewSlug] = useState("");
	const [newName, setNewName] = useState("");

	async function load() {
		setLoading(true);
		setError(null);
		try {
			const res = await fetch("/api/admin/categories");
			if (!res.ok) throw new Error("Не удалось загрузить категории");
			const data = await res.json();
			setItems(data.items);
		} catch (e: any) {
			setError(e.message ?? "Ошибка");
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => { load(); }, []);

	async function saveRow(c: Category) {
		const res = await fetch(`/api/admin/categories/${c.id}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ slug: c.slug, name: c.name })
		});
		if (!res.ok) {
			const data = await res.json().catch(() => ({}));
			alert(data.error ?? "Ошибка сохранения");
		} else {
			load();
		}
	}

	async function deleteRow(id: number) {
		if (!confirm("Удалить категорию?")) return;
		const res = await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
		if (!res.ok) {
			const data = await res.json().catch(() => ({}));
			alert(data.error ?? "Ошибка удаления");
		} else {
			setItems(prev => prev.filter(x => x.id !== id));
		}
	}

	async function createCategory() {
		const res = await fetch(`/api/admin/categories`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ slug: newSlug, name: newName })
		});
		if (!res.ok) {
			const data = await res.json().catch(() => ({}));
			alert(data.error ?? "Ошибка создания");
		} else {
			setNewSlug("");
			setNewName("");
			load();
		}
	}

	return (
		<div className="overflow-x-auto bg-white/70 border rounded">
			{error && <div className="p-3 text-red-600">{error}</div>}
			<div className="p-3 flex flex-col sm:flex-row gap-2 sm:items-end">
				<div className="sm:w-56">
					<label className="block text-sm text-gray-600">Slug</label>
					<input className="w-full border rounded px-2 py-1" value={newSlug} onChange={(e) => setNewSlug(e.target.value)} placeholder="grill" />
				</div>
				<div className="sm:w-64">
					<label className="block text-sm text-gray-600">Название</label>
					<input className="w-full border rounded px-2 py-1" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Гриль" />
				</div>
				<button className="w-full sm:w-auto px-3 py-2 border rounded hover:bg-gray-100" onClick={createCategory}>Добавить</button>
			</div>
			{/* Mobile cards */}
			<div className="grid gap-3 p-3 sm:hidden">
				{items.map((c) => (
					<div key={`m-${c.id}`} className="border rounded p-3 bg-white">
						<div className="text-xs text-gray-500">ID: {c.id}</div>
						<input className="mt-2 w-full border rounded px-2 py-1" value={c.slug} onChange={(e) => {
							const val = e.target.value; setItems(prev => prev.map(x => x.id === c.id ? { ...x, slug: val } : x));
						}} />
						<input className="mt-2 w-full border rounded px-2 py-1" value={c.name} onChange={(e) => {
							const val = e.target.value; setItems(prev => prev.map(x => x.id === c.id ? { ...x, name: val } : x));
						}} />
						<div className="mt-3 flex gap-2">
							<button className="flex-1 px-3 py-2 border rounded hover:bg-gray-100" onClick={() => saveRow(c)}>Сохранить</button>
							<button className="flex-1 px-3 py-2 border rounded text-red-600 hover:bg-red-50" onClick={() => deleteRow(c.id)}>Удалить</button>
						</div>
					</div>
				))}
			</div>
			{/* Desktop table */}
			<table className="hidden sm:table min-w-full text-sm">
				<thead className="bg-gray-100">
					<tr>
						<th className="text-left px-3 py-2">ID</th>
						<th className="text-left px-3 py-2">Slug</th>
						<th className="text-left px-3 py-2">Название</th>
						<th className="px-3 py-2"></th>
					</tr>
				</thead>
				<tbody>
					{items.map((c) => (
						<tr key={c.id} className="border-t">
							<td className="px-3 py-2">{c.id}</td>
							<td className="px-3 py-2 w-64">
								<input className="w-full border rounded px-2 py-1" value={c.slug} onChange={(e) => {
									const val = e.target.value; setItems(prev => prev.map(x => x.id === c.id ? { ...x, slug: val } : x));
								}} />
							</td>
							<td className="px-3 py-2 w-80">
								<input className="w-full border rounded px-2 py-1" value={c.name} onChange={(e) => {
									const val = e.target.value; setItems(prev => prev.map(x => x.id === c.id ? { ...x, name: val } : x));
								}} />
							</td>
							<td className="px-3 py-2">
								<div className="flex gap-2">
									<button className="px-3 py-1 border rounded hover:bg-gray-100" onClick={() => saveRow(c)}>Сохранить</button>
									<button className="px-3 py-1 border rounded text-red-600 hover:bg-red-50" onClick={() => deleteRow(c.id)}>Удалить</button>
								</div>
							</td>
						</tr>
					))}
				</tbody>
			</table>
			{loading && <div className="p-3 text-gray-600">Загрузка…</div>}
		</div>
	);
}


