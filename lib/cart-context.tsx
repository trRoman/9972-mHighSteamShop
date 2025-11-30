"use client";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from "react";

export type CartItem = {
	id: number;
	name: string;
	price: number;
	image: string;
	quantity: number;
};

type CartState = {
	items: CartItem[];
};

type CartAction =
	| { type: "ADD"; payload: Omit<CartItem, "quantity">; quantity?: number }
	| { type: "REMOVE"; payload: { id: number } }
	| { type: "UPDATE_QTY"; payload: { id: number; quantity: number } }
	| { type: "SET"; payload: CartState };

const STORAGE_KEY = "shop_cart_v1";

function cartReducer(state: CartState, action: CartAction): CartState {
	switch (action.type) {
		case "ADD": {
			const exists = state.items.find((i) => i.id === action.payload.id);
			if (exists) {
				return {
					items: state.items.map((i) =>
						i.id === action.payload.id ? { ...i, quantity: i.quantity + (action.quantity ?? 1) } : i
					),
				};
			}
			return { items: [{ ...action.payload, quantity: action.quantity ?? 1 }, ...state.items] };
		}
		case "REMOVE":
			return { items: state.items.filter((i) => i.id !== action.payload.id) };
		case "UPDATE_QTY":
			return {
				items: state.items.map((i) => (i.id === action.payload.id ? { ...i, quantity: action.payload.quantity } : i)),
			};
		case "SET":
			return action.payload;
		default:
			return state;
	}
}

type CartContextValue = {
	items: CartItem[];
	addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
	removeItem: (id: number) => void;
	updateQuantity: (id: number, quantity: number) => void;
	totalItems: number;
	totalPrice: number;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
	const [state, dispatch] = useReducer(cartReducer, { items: [] });

	useEffect(() => {
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			if (raw) {
				const parsed = JSON.parse(raw) as CartState;
				dispatch({ type: "SET", payload: parsed });
			}
			// eslint-disable-next-line no-empty
		} catch {}
	}, []);

	useEffect(() => {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
	}, [state]);

	const addItem = useCallback((item: Omit<CartItem, "quantity">, quantity: number = 1) => {
		dispatch({ type: "ADD", payload: item, quantity });
	}, []);
	const removeItem = useCallback((id: number) => {
		dispatch({ type: "REMOVE", payload: { id } });
	}, []);
	const updateQuantity = useCallback((id: number, quantity: number) => {
		dispatch({ type: "UPDATE_QTY", payload: { id, quantity } });
	}, []);

	const totalItems = useMemo(
		() => state.items.reduce((sum, i) => sum + i.quantity, 0),
		[state.items]
	);
	const totalPrice = useMemo(
		() => state.items.reduce((sum, i) => sum + i.price * i.quantity, 0),
		[state.items]
	);

	const value = useMemo<CartContextValue>(() => ({
		items: state.items,
		addItem,
		removeItem,
		updateQuantity,
		totalItems,
		totalPrice
	}), [state.items, addItem, removeItem, updateQuantity, totalItems, totalPrice]);

	return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
	const ctx = useContext(CartContext);
	if (!ctx) throw new Error("CartContext not found. Wrap in <CartProvider>.");
	return ctx;
}

