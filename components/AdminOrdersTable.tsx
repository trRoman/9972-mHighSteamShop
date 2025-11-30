// components/AdminOrdersTable.tsx
// Это компонент для отображения таблицы заказов в админ-панели

"use client";
import React from "react";
import { useEffect, useMemo, useState } from "react";

type Order = {
	id: number;
	createdAt: string;
	total: number;
	status: string;
	name?: string;
	phone?: string;
	address?: string;
	items?: Array<{ itemId: number; name: string; quantity: number; checked?: number | boolean }>;
};

const STATUSES = ["ожидает", "в обработке", "выполнен"];

export default function AdminOrdersTable() {
	const [orders, setOrders] = useState<Order[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [statusFilter, setStatusFilter] = useState<string>("");
	const [checkedByOrder, setCheckedByOrder] = useState<Record<number, Record<number, boolean>>>({});

	async function load() {
		setLoading(true);
		setError(null);
		try {
			const res = await fetch("/api/admin/orders", { cache: "no-store" });
			if (!res.ok) throw new Error("Failed");
			const data = await res.json();
			const items = data.items || [];
			setOrders(items);
			// initialize checklist state from server
			const init: Record<number, Record<number, boolean>> = {};
			for (const o of items as Order[]) {
				const map: Record<number, boolean> = {};
				for (const it of (o.items || [])) {
					map[it.itemId] = Boolean(it.checked);
				}
				init[o.id] = map;
			}
			setCheckedByOrder(init);
		} catch {
			setError("Не удалось загрузить заказы");
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => { load(); }, []);
	// auto-refresh to reflect external changes (e.g., user deletes order)
	useEffect(() => {
		const onVisible = () => {
			if (document.visibilityState === "visible") load();
		};
		document.addEventListener("visibilitychange", onVisible);
		const t = setInterval(load, 90000);
		return () => {
			document.removeEventListener("visibilitychange", onVisible);
			clearInterval(t);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const filtered = useMemo(() => {
		return statusFilter ? orders.filter(o => o.status === statusFilter) : orders;
	}, [orders, statusFilter]);

	async function updateStatus(id: number, status: string) {
		const prev = orders.slice();
		setOrders(o => o.map(x => x.id === id ? { ...x, status } : x));
		try {
			const res = await fetch(`/api/admin/orders/${id}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ status })
			});
			if (!res.ok) throw new Error("Failed");
		} catch {
			setOrders(prev);
			alert("Не удалось обновить статус");
		}
	}

	async function toggleCheck(orderId: number, itemId: number) {
		const current = Boolean(checkedByOrder[orderId]?.[itemId]);
		const next = !current;
		// optimistic
		setCheckedByOrder(prev => ({ ...prev, [orderId]: { ...(prev[orderId] || {}), [itemId]: next } }));
		try {
			const res = await fetch(`/api/admin/orders/items/${itemId}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ checked: next })
			});
			if (!res.ok) throw new Error("failed");
		} catch {
			// rollback
			setCheckedByOrder(prev => ({ ...prev, [orderId]: { ...(prev[orderId] || {}), [itemId]: current } }));
			alert("Не удалось сохранить чек‑лист");
		}
	}

	return (
		<div className="bg-white/70 border rounded p-3">
			<div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3">
				<div className="font-medium">Всего заказов: {orders.length}</div>
				<div className="sm:ml-auto">
					<select
						className="border rounded px-2 py-1"
						value={statusFilter}
						onChange={(e) => setStatusFilter(e.target.value)}
					>
						<option value="">Все статусы</option>
						{STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
					</select>
				</div>
			</div>
			{loading ? <div>Загрузка...</div> : error ? <div className="text-red-600">{error}</div> : (
				<>
					{/* Mobile cards */}
					<div className="sm:hidden space-y-3">
						{filtered.map(o => (
							<div key={o.id} className="border rounded bg-white p-3">
								<div className="flex items-center justify-between mb-1">
									<div className="font-semibold">Заказ #{o.id}</div>
									<div className="text-xs text-gray-600">{o.createdAt}</div>
								</div>
								<div className="text-sm text-gray-700">Имя: {o.name || "-"}</div>
								<div className="text-sm text-gray-700">Телефон: {o.phone || "-"}</div>
								<div className="text-sm text-gray-700">Адрес: {o.address || "-"}</div>
								{(o.items && o.items.length > 0) && (
									<div className="mt-2">
										<div className="text-xs text-gray-600 mb-1">Чек‑лист:</div>
										<div className="space-y-1">
											{o.items.map((it) => (
												<label key={it.itemId} className="flex items-center gap-2 text-sm">
													<input
														type="checkbox"
														checked={Boolean(checkedByOrder[o.id]?.[it.itemId])}
														onChange={() => toggleCheck(o.id, it.itemId)}
													/>
													<span>{it.name} × {it.quantity}</span>
												</label>
											))}
										</div>
									</div>
								)}
								<div className="flex items-center justify-between mt-2">
									<div className="font-medium">{o.total?.toLocaleString?.() || o.total} ₽</div>
									<select
										className="border rounded px-2 py-1 text-sm"
										value={o.status}
										onChange={(e) => updateStatus(o.id, e.target.value)}
									>
										{STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
									</select>
								</div>
							</div>
						))}
					</div>

					{/* Desktop table */}
					<div className="hidden sm:block overflow-x-auto">
						<table className="min-w-full text-sm">
							<thead>
								<tr className="text-left border-b">
									<th className="px-2 py-2">ID</th>
									<th className="px-2 py-2">Дата</th>
									<th className="px-2 py-2">Имя</th>
									<th className="px-2 py-2">Телефон</th>
									<th className="px-2 py-2">Адрес</th>
									<th className="px-2 py-2">Сумма</th>
									<th className="px-2 py-2">Статус</th>
								</tr>
							</thead>
							<tbody>
								{filtered.map(o => (
									<React.Fragment key={o.id}>
										<tr className="border-b">
											<td className="px-2 py-2 font-medium">#{o.id}</td>
											<td className="px-2 py-2">{o.createdAt}</td>
											<td className="px-2 py-2">{o.name || "-"}</td>
											<td className="px-2 py-2">{o.phone || "-"}</td>
											<td className="px-2 py-2">{o.address || "-"}</td>
											<td className="px-2 py-2">{o.total?.toLocaleString?.() || o.total} ₽</td>
											<td className="px-2 py-2">
												<select
													className="border rounded px-2 py-1"
													value={o.status}
													onChange={(e) => updateStatus(o.id, e.target.value)}
												>
													{STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
												</select>
											</td>
										</tr>
										{(o.items && o.items.length > 0) && (
											<tr className="border-b last:border-0">
												<td className="px-2 py-2 bg-white" colSpan={7}>
													<div className="text-xs text-gray-600 mb-1">Чек‑лист заказа:</div>
													<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
														{o.items.map((it) => (
															<label key={it.itemId} className="flex items-center gap-2 text-sm">
																<input
																	type="checkbox"
																	checked={Boolean(checkedByOrder[o.id]?.[it.itemId])}
																	onChange={() => toggleCheck(o.id, it.itemId)}
																/>
																<span className="truncate" title={`${it.name} × ${it.quantity}`}>
																	{it.name} × {it.quantity}
																</span>
															</label>
														))}
													</div>
												</td>
											</tr>
										)}
									</React.Fragment>
								))}
							</tbody>
						</table>
					</div>

				</>
			)}
		</div>
	);
}

