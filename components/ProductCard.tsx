// components/ProductCard.tsx
// Это компонент для отображения карточки товара на главной странице


"use client";
import { useCart } from "@/lib/cart-context";
import { useState } from "react";
import Snackbar from "@mui/material/Snackbar";
import MuiAlert from "@mui/material/Alert";

export type Product = {
	id: number;
	name: string;
	description: string;
	price: number;
	rating: number;
	image: string;
};

export default function ProductCard({ product }: { product: Product }) {
	const { addItem } = useCart();
	const [qty, setQty] = useState<number>(1);
	const [toastOpen, setToastOpen] = useState(false);
	const [toastMsg, setToastMsg] = useState<string>("");
	const [isAdded, setIsAdded] = useState(false);

	function handleAdd() {
		addItem({ id: product.id, name: product.name, price: product.price, image: product.image }, qty);
		setToastMsg(`${product.name} добавлен в корзину`);
		setToastOpen(true);
		setIsAdded(true);
		setTimeout(() => setIsAdded(false), 1500);
	}
	return (
		<div className="border overflow-hidden flex flex-col bg-white/70">
			<div className="relative">
				<img
					src={product.image}
					alt={product.name}
					className="w-full h-90 object-cover"
					loading="lazy"
				/>
				<div className="absolute top-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
					★ {product.rating.toFixed(1)}
				</div>
			</div>
			<div className="p-3 flex-1 flex flex-col">
				<div className="font-medium">{product.name}</div>
				<div className="text-sm text-gray-600 line-clamp-2 mt-1">{product.description}</div>
				<div className="flex items-center justify-between mt-3">
					<div className="text-xl font-semibold text-gray-900">{product.price.toLocaleString()} ₽</div>
					<div className="flex items-center gap-2">
						<button
							className="w-8 h-8 border rounded hover:bg-gray-100"
							onClick={() => setQty((v) => Math.max(1, v - 1))}
							aria-label="Уменьшить количество"
						>
							-
						</button>
						<span className="w-6 text-center select-none">{qty}</span>
						<button
							className="w-8 h-8 border rounded hover:bg-gray-100"
							onClick={() => setQty((v) => v + 1)}
							aria-label="Увеличить количество"
						>
							+
						</button>
					</div>
				</div>
				<button
					className={`mt-3 py-2 rounded transition-transform duration-150 ease-out active:scale-95 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
						isAdded ? "bg-green-600 text-white focus:ring-green-600" : "bg-[#022359] text-white hover:bg-[#022359]/80 focus:ring-[#022359]"
					}`}
					onClick={handleAdd}
					disabled={isAdded}
				>
					{isAdded ? "Добавлено" : "В корзину"}
				</button>
			</div>
			<Snackbar
				open={toastOpen}
				autoHideDuration={2000}
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

