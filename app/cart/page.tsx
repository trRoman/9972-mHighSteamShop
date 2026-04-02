// ./app/cart/page.tsx
// Корзина и оформление заказа

"use client";
export const dynamic = "force-dynamic";
import { Suspense, useEffect, useRef } from "react";
import { useCart } from "@/lib/cart-context";
import { useState } from "react";
import Snackbar from "@mui/material/Snackbar";
import MuiAlert from "@mui/material/Alert";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import CircularProgress from "@mui/material/CircularProgress";

export default function CartPage() {
	const { items, removeItem, updateQuantity, totalPrice } = useCart();
	const [custName, setCustName] = useState<string>("");
	const [phoneDigits, setPhoneDigits] = useState<string>("");
	const [custAddress, setCustAddress] = useState<string>("залив Красная Горка, городской округ Мытищи, Московская область");
	const [deliveryTime, setDeliveryTime] = useState<string>("");
	const [toastOpen, setToastOpen] = useState(false);
	const [toastMsg, setToastMsg] = useState<string>("");
	const [toastSeverity, setToastSeverity] = useState<"success" | "error" | "info" | "warning">("info");
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [pendingRemoveId, setPendingRemoveId] = useState<number | null>(null);

	// Payment modal
	const [paymentModal, setPaymentModal] = useState<{
		open: boolean;
		confirmationToken: string | null;
		orderId: number | null;
	}>({ open: false, confirmationToken: null, orderId: null });
	const [widgetLoading, setWidgetLoading] = useState(false);
	const checkoutRef = useRef<any>(null);

	type PlacedOrder = {
		id: number;
		createdAt: string;
		createdTo: string;
		status?: string;
		name: string;
		phone: string;
		address: string;
		items: { id: number; name: string; price: number; quantity: number; image: string }[];
		total: number;
	};
	const [orders, setOrders] = useState<PlacedOrder[]>([]);
	const [orderTab, setOrderTab] = useState(0);
	const [confirmOrderOpen, setConfirmOrderOpen] = useState(false);
	const [pendingOrderId, setPendingOrderId] = useState<number | null>(null);
	const [loadedImages, setLoadedImages] = useState<Record<number, boolean>>({});

	// phone mask helpers (+7-(XXX)-XXX-XX-XX)
	function maskFromDigits(d: string) {
		const a = d.slice(0, 3);
		const b = d.slice(3, 6);
		const c = d.slice(6, 8);
		const e = d.slice(8, 10);
		let formatted = "+7";
		if (d.length > 0) formatted += "-(" + a;
		if (d.length >= 3) formatted += ")";
		if (d.length > 3) formatted += "-" + b;
		if (d.length > 6) formatted += "-" + c;
		if (d.length > 8) formatted += "-" + e;
		return formatted;
	}

	const maskedPhone = maskFromDigits(phoneDigits);
	let _prevMasked = maskedPhone;
	function handlePhoneInput(raw: string) {
		const digitsOnly = raw.replace(/\D/g, "").replace(/^7/, "").slice(0, 10);
		let newDigits = digitsOnly;
		if (digitsOnly.length === phoneDigits.length && raw.length < _prevMasked.length) {
			newDigits = phoneDigits.slice(0, -1);
		}
		setPhoneDigits(newDigits);
		_prevMasked = maskFromDigits(newDigits);
	}

	// Load orders from backend by cookie token
	async function loadOrders() {
		try {
			const res = await fetch("/api/orders/my", { cache: "no-store" });
			if (!res.ok) return;
			const data = await res.json();
			const mapped: PlacedOrder[] = (data.items || []).map((o: any) => ({
				id: o.id,
				createdAt: o.createdAt ?? o.created_at,
				createdTo: o.created_to ?? "",
				status: o.status,
				name: o.customer_name ?? "",
				phone: o.customer_phone ?? "",
				address: o.customer_address ?? "",
				items: (o.items || []).map((it: any) => ({
					id: it.id, name: it.name, price: it.price, quantity: it.quantity, image: it.image
				})),
				total: o.total
			}));
			setOrders(mapped);
			if (mapped.length > 0) setOrderTab(mapped.length - 1);

			// Edge case: user closed browser during payment and returned.
			// If the pending order is now "оплачен" — clear the cart.
			const pendingId = localStorage.getItem("yk_pending_order");
			if (pendingId) {
				const paid = mapped.find(o => String(o.id) === pendingId && o.status === "оплачен");
				if (paid) {
					items.forEach(it => removeItem(it.id));
					localStorage.removeItem("yk_pending_order");
				}
			}
		} catch {}
	}

	// eslint-disable-next-line react-hooks/exhaustive-deps
	useEffect(() => { loadOrders(); }, []);

	useEffect(() => {
		const onVisible = () => {
			if (document.visibilityState === "visible") loadOrders();
		};
		document.addEventListener("visibilitychange", onVisible);
		let timer: any = null;
		function setupTimer() {
			if (timer) clearInterval(timer);
			if (orders.length > 0) {
				timer = setInterval(() => loadOrders(), 5000);
			}
		}
		setupTimer();
		return () => {
			document.removeEventListener("visibilitychange", onVisible);
			if (timer) clearInterval(timer);
		};
	}, [orders.length]);

	// Initialize YooKassa widget when payment modal opens
	useEffect(() => {
		if (!paymentModal.open || !paymentModal.confirmationToken) return;

		setWidgetLoading(true);

		const initWidget = () => {
			// Small delay to ensure Dialog DOM is fully mounted
			setTimeout(() => {
				try {
					const checkout = new (window as any).YooMoneyCheckoutWidget({
						confirmation_token: paymentModal.confirmationToken,
						return_url: window.location.origin + "/cart",
						error_callback: (err: any) => {
							console.error("YooKassa widget error:", err);
						},
					});
					checkoutRef.current = checkout;
					checkout.render("yookassa-widget-container");
					setWidgetLoading(false);
					checkout.on("success", handlePaymentSuccess);
					checkout.on("fail", handlePaymentFail);
				} catch (err) {
					console.error("YooKassa widget init error:", err);
					setWidgetLoading(false);
				}
			}, 150);
		};

		if ((window as any).YooMoneyCheckoutWidget) {
			initWidget();
		} else {
			// Load script from CDN if not already loaded
			const existing = document.querySelector("script[data-yookassa-widget]");
			if (existing) {
				// Script tag exists but widget not ready — wait for load
				existing.addEventListener("load", initWidget, { once: true });
			} else {
				const script = document.createElement("script");
				script.setAttribute("data-yookassa-widget", "1");
				script.src = "https://yookassa.ru/checkout-widget/v1/checkout-widget.js";
				script.onload = initWidget;
				script.onerror = () => {
					setWidgetLoading(false);
					showToast("Не удалось загрузить форму оплаты", "error");
					closePaymentModal();
				};
				document.head.appendChild(script);
			}
		}

		return () => {
			if (checkoutRef.current) {
				try { checkoutRef.current.destroy(); } catch {}
				checkoutRef.current = null;
			}
		};
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [paymentModal.open, paymentModal.confirmationToken]);

	function showToast(msg: string, severity: "success" | "error" | "info" | "warning") {
		setToastMsg(msg);
		setToastSeverity(severity);
		setToastOpen(true);
	}

	function closePaymentModal() {
		setPaymentModal({ open: false, confirmationToken: null, orderId: null });
	}

	function handlePaymentSuccess() {
		localStorage.removeItem("yk_pending_order");
		const paidOrderId = paymentModal.orderId;
		closePaymentModal();
		items.forEach(it => removeItem(it.id));
		showToast("Оплата прошла успешно! Заказ подтверждён.", "success");
		// Webhook from YooKassa may arrive a few seconds after the widget fires "success".
		// Poll until the paid order appears (status "оплачен"), max 30 seconds.
		let attempts = 0;
		const poll = setInterval(async () => {
			attempts++;
			try {
				const res = await fetch("/api/orders/my", { cache: "no-store" });
				if (!res.ok) return;
				const data = await res.json();
				const mapped: PlacedOrder[] = (data.items || []).map((o: any) => ({
					id: o.id,
					createdAt: o.createdAt ?? o.created_at,
					createdTo: o.created_to ?? "",
					status: o.status,
					name: o.customer_name ?? "",
					phone: o.customer_phone ?? "",
					address: o.customer_address ?? "",
					items: (o.items || []).map((it: any) => ({
						id: it.id, name: it.name, price: it.price, quantity: it.quantity, image: it.image
					})),
					total: o.total
				}));
				setOrders(mapped);
				setOrderTab(mapped.length > 0 ? mapped.length - 1 : 0);
				const found = mapped.find(o => o.id === paidOrderId && o.status === "оплачен");
				if (found || attempts >= 15) clearInterval(poll);
			} catch {
				if (attempts >= 15) clearInterval(poll);
			}
		}, 2000);
	}

	function handlePaymentFail() {
		localStorage.removeItem("yk_pending_order");
		closePaymentModal();
		showToast("Оплата не завершена. Заказ будет отменён.", "warning");
		loadOrders();
	}

	function handleCheckout() {
		if (!custName.trim() || !maskedPhone.trim()) {
			showToast("Пожалуйста, заполните имя и телефон.", "warning");
			return;
		}
		if (!/^\+7-\(\d{3}\)-\d{3}-\d{2}-\d{2}$/.test(maskedPhone)) {
			showToast("Введите телефон в формате +7-(XXX)-XXX-XX-XX", "warning");
			return;
		}
		if (items.length === 0) {
			showToast("Корзина пуста.", "info");
			return;
		}

		fetch("/api/orders", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				name: custName.trim(),
				phone: maskedPhone.trim(),
				address: custAddress,
				deliveryTime: deliveryTime,
				items: items.map(it => ({ id: it.id, quantity: it.quantity }))
			})
		}).then(async (res) => {
			if (!res.ok) {
				const data = await res.json().catch(() => ({} as any));
				throw new Error(data?.error || "Не удалось оформить заказ");
			}
			const data = await res.json().catch(() => ({} as any));
			if (data?.confirmationToken) {
				if (data.id) localStorage.setItem("yk_pending_order", String(data.id));
				setPaymentModal({
					open: true,
					confirmationToken: data.confirmationToken,
					orderId: data.id ?? null,
				});
			} else {
				showToast("Ошибка: не получен токен оплаты", "error");
			}
		}).catch((err: Error) => {
			showToast(err.message || "Ошибка оформления заказа", "error");
		});
	}

	return (
		<Suspense fallback={<div />}>
		<div className="py-4 pb-24">
			<h1 className="text-2xl font-semibold mb-4">Корзина</h1>
			{/* Вкладки "Ваши заказы" */}
			{orders.length > 0 && (
				<div className="mb-4 bg-white/70 border rounded">
					<div className="px-3 pt-3 text-sm text-gray-600">Ваши заказы</div>
					<div className="px-2">
						<Tabs
							value={orderTab}
							onChange={(_, v) => setOrderTab(v)}
							variant="scrollable"
							scrollButtons="auto"
						>
							{orders.map((o) => (
								<Tab key={o.id} label={`Заказ #${o.id}`} />
							))}
						</Tabs>
					</div>
					<div className="p-3">
						{orders[orderTab] && (
							<div className="space-y-2">
								<div className="text-sm text-gray-700">ID заказа: {orders[orderTab].id}</div>
								{orders[orderTab].status && (
									<div className="text-sm text-gray-700">
										Статус:{" "}
										<span className={
											orders[orderTab].status === "оплачен" ? "text-green-600 font-medium" :
											orders[orderTab].status === "ожидает_оплаты" ? "text-yellow-600 font-medium" :
											orders[orderTab].status === "отменён" ? "text-red-600 font-medium" :
											"text-gray-700"
										}>
											{orders[orderTab].status === "ожидает_оплаты" ? "ожидает оплаты" : orders[orderTab].status}
										</span>
									</div>
								)}
								<div className="text-sm text-gray-700">Дата: {orders[orderTab].createdAt}</div>
								<div className="text-sm text-gray-700">Желаемое время: {orders[orderTab].createdTo}</div>
								<div className="text-sm text-gray-700">Имя: {orders[orderTab].name}</div>
								<div className="text-sm text-gray-700">Телефон: {orders[orderTab].phone}</div>
								<div className="text-sm text-gray-700">Адрес: {orders[orderTab].address}</div>
								<div className="border-t pt-2 space-y-1">
									{orders[orderTab].items.map(oi => (
										<div key={`${orders[orderTab].id}-${oi.id}`} className="flex items-center justify-between text-sm">
											<div>{oi.name} × {oi.quantity}</div>
											<div>{(oi.price * oi.quantity).toLocaleString()} ₽</div>
										</div>
									))}
								</div>
								<div className="flex justify-between font-semibold pt-1 border-t">
									<span>Итого</span>
									<span>{orders[orderTab].total.toLocaleString()} ₽</span>
								</div>
								{orders[orderTab].status === "ожидает" && (
									<button
										className="text-sm text-red-600 hover:underline"
										onClick={() => { setPendingOrderId(orders[orderTab].id); setConfirmOrderOpen(true); }}
									>
										Удалить заказ
									</button>
								)}
							</div>
						)}
					</div>
				</div>
			)}

			{items.length === 0 ? (
				<p className="text-gray-600">Корзина пуста.</p>
			) : (
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					{/* Mobile customer form */}
					<div className="sm:hidden">
						<div className="p-4 border rounded-md bg-white/70">
							<div className="grid gap-3">
								<div>
									<label className="block text-sm text-gray-600 mb-1">Имя*</label>
									<input
										required
										className="w-full border rounded px-3 py-2"
										placeholder="Ваше имя"
										value={custName}
										onChange={(e) => setCustName(e.target.value)}
									/>
								</div>
								<div>
									<label className="block text-sm text-gray-600 mb-1">Телефон*</label>
									<input
										required
										type="tel"
										inputMode="numeric"
										pattern="^\+7-\(\d{3}\)-\d{3}-\d{2}-\d{2}$"
										className="w-full border rounded px-3 py-2"
										placeholder="+7-(XXX)-XXX-XX-XX"
										value={maskedPhone}
										onChange={(e) => handlePhoneInput(e.target.value)}
									/>
								</div>
								<div>
									<label className="block text-sm text-gray-600 mb-1">Желаемое время</label>
									<input
										type="datetime-local"
										className="w-full border rounded px-3 py-2"
										value={deliveryTime}
										onChange={(e) => setDeliveryTime(e.target.value)}
									/>
								</div>
								<div>
									<label className="block text-sm text-gray-600 mb-1">Адрес</label>
									<textarea
										className="w-full border rounded px-3 py-2"
										rows={3}
										value={custAddress}
										onChange={(e) => setCustAddress(e.target.value)}
									/>
								</div>
							</div>
						</div>
					</div>
					<div className="lg:col-span-2 space-y-4">
						{items.map((it) => (
							<div key={it.id} className="bg-white/70 flex items-start gap-4 p-4 border rounded-md">
								<div className="relative w-20 h-20 shrink-0">
									<div className={`absolute inset-0 bg-gray-200 rounded ${loadedImages[it.id] ? "opacity-0" : "opacity-100 animate-pulse"} transition-opacity duration-500`} />
									<img
										src={it.image}
										alt={it.name}
										className={`absolute inset-0 w-full h-full object-cover rounded transition-opacity duration-500 ${loadedImages[it.id] ? "opacity-100" : "opacity-0"}`}
										onLoad={() => setLoadedImages(prev => ({ ...prev, [it.id]: true }))}
										loading="lazy"
										decoding="async"
										fetchPriority="low"
									/>
								</div>
								<div className="flex-1">
									<div className="font-medium">{it.name}</div>
									<div className="mt-2 text-lg font-semibold text-gray-800">{it.price.toLocaleString()} ₽</div>
									<div className="mt-2 flex items-center gap-3">
										<button
											className="w-9 h-9 border rounded flex items-center justify-center text-lg"
											onClick={() => updateQuantity(it.id, Math.max(1, it.quantity - 1))}
										>-</button>
										<span className="w-8 text-center">{it.quantity}</span>
										<button
											className="w-9 h-9 border rounded flex items-center justify-center text-lg"
											onClick={() => updateQuantity(it.id, it.quantity + 1)}
										>+</button>
										<button
											className="ml-auto w-9 h-9 border rounded text-red-600 border-red-300 hover:bg-red-50 flex items-center justify-center"
											onClick={() => { setPendingRemoveId(it.id); setConfirmOpen(true); }}
											aria-label="Удалить товар"
											title="Удалить"
										>
											<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
												<path fillRule="evenodd" d="M9 3a1 1 0 0 0-1 1v1H5.5a.75.75 0 0 0 0 1.5H6v12A2.5 2.5 0 0 0 8.5 21h7A2.5 2.5 0 0 0 18 18.5V6.5h.5a.75.75 0 0 0 0-1.5H16V4a1 1 0 0 0-1-1H9Zm6 3.5H9V4.5h6v2ZM10 9.25a.75.75 0 0 1 .75.75v7a.75.75 0 0 1-1.5 0v-7a.75.75 0 0 1 .75-.75Zm3.25.75a.75.75 0 0 0-1.5 0v7a.75.75 0 0 0 1.5 0v-7Z" clipRule="evenodd" />
											</svg>
										</button>
									</div>
								</div>
							</div>
						))}
					</div>
					<div className="lg:col-span-1 hidden lg:block">
						<div className="p-4 border rounded-md bg-white/70">
							<div className="grid gap-3 mb-3">
								<div>
									<label className="block text-sm text-gray-600 mb-1">Имя*</label>
									<input
										required
										className="w-full border rounded px-3 py-2"
										placeholder="Ваше имя"
										value={custName}
										onChange={(e) => setCustName(e.target.value)}
									/>
								</div>
								<div>
									<label className="block text-sm text-gray-600 mb-1">Телефон*</label>
									<input
										required
										type="tel"
										inputMode="numeric"
										pattern="^\+7-\(\d{3}\)-\d{3}-\d{2}-\d{2}$"
										className="w-full border rounded px-3 py-2"
										placeholder="+7-(XXX)-XXX-XX-XX"
										value={maskedPhone}
										onChange={(e) => handlePhoneInput(e.target.value)}
									/>
								</div>
								<div>
									<label className="block text-sm text-gray-600 mb-1">Желаемое время</label>
									<input
										type="datetime-local"
										className="w-full border rounded px-3 py-2"
										value={deliveryTime}
										onChange={(e) => setDeliveryTime(e.target.value)}
									/>
								</div>
								<div>
									<label className="block text-sm text-gray-600 mb-1">Адрес</label>
									<textarea
										className="w-full border rounded px-3 py-2"
										rows={3}
										value={custAddress}
										onChange={(e) => setCustAddress(e.target.value)}
									/>
								</div>
							</div>
							<div className="flex justify-between mb-2">
								<span>Итоговая стоимость заказа</span>
								<span className="font-semibold">{totalPrice.toLocaleString()} ₽</span>
							</div>
							<button className="w-full mt-2 bg-black text-white py-2 rounded hover:bg-gray-900" onClick={handleCheckout}>
								Оформить и оплатить
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Mobile sticky checkout bar */}
			{items.length > 0 && (
				<div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t p-3">
					<div className="flex items-center justify-between">
						<div>
							<div className="text-xs text-gray-500">Итоговая стоимость заказа</div>
							<div className="text-xl font-semibold">{totalPrice.toLocaleString()} ₽</div>
						</div>
						<button className="bg-black text-white px-4 py-2 rounded hover:bg-gray-900" onClick={handleCheckout}>
							Оплатить
						</button>
					</div>
				</div>
			)}

			{/* Payment modal */}
			<Dialog
				open={paymentModal.open}
				onClose={handlePaymentFail}
				maxWidth="sm"
				fullWidth
				PaperProps={{ sx: { borderRadius: 2 } }}
			>
				<DialogTitle sx={{ pb: 1 }}>
					Оплата заказа {paymentModal.orderId ? `#${paymentModal.orderId}` : ""}
				</DialogTitle>
				<DialogContent sx={{ pb: 2, minHeight: 300 }}>
					{widgetLoading && (
						<div className="flex items-center justify-center h-48">
							<CircularProgress />
						</div>
					)}
					<div
						id="yookassa-widget-container"
						style={{ display: widgetLoading ? "none" : "block" }}
					/>
				</DialogContent>
			</Dialog>

			{/* Snackbar */}
			<Snackbar
				open={toastOpen}
				autoHideDuration={3000}
				onClose={() => setToastOpen(false)}
				anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
			>
				<MuiAlert elevation={6} variant="filled" severity={toastSeverity} onClose={() => setToastOpen(false)}>
					{toastMsg}
				</MuiAlert>
			</Snackbar>

			{/* Confirm delete item dialog */}
			<Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
				<DialogTitle>Удалить товар</DialogTitle>
				<DialogContent>
					<DialogContentText>Точно удалить товар из корзины?</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setConfirmOpen(false)}>Отмена</Button>
					<Button
						color="error"
						onClick={() => {
							if (pendingRemoveId != null) {
								removeItem(pendingRemoveId);
								showToast("Товар удалён из корзины", "success");
							}
							setConfirmOpen(false);
							setPendingRemoveId(null);
						}}
					>
						Удалить
					</Button>
				</DialogActions>
			</Dialog>

			{/* Confirm delete order dialog */}
			<Dialog open={confirmOrderOpen} onClose={() => setConfirmOrderOpen(false)}>
				<DialogTitle>Удалить заказ</DialogTitle>
				<DialogContent>
					<DialogContentText>Вы уверены, что хотите удалить этот заказ?</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setConfirmOrderOpen(false)}>Отмена</Button>
					<Button
						color="error"
						onClick={async () => {
							try {
								if (pendingOrderId != null) {
									const res = await fetch(`/api/orders/${pendingOrderId}`, { method: "DELETE" });
									if (!res.ok) throw new Error();
									await loadOrders();
									showToast("Заказ удалён", "success");
								}
							} catch {
								showToast("Не удалось удалить заказ", "error");
							} finally {
								setConfirmOrderOpen(false);
								setPendingOrderId(null);
							}
						}}
					>
						Удалить
					</Button>
				</DialogActions>
			</Dialog>
		</div>
		</Suspense>
	);
}
