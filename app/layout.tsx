import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/lib/cart-context";
import Header from "@/components/Header";
import CategoryBar from "@/components/CategoryBar";

export const metadata: Metadata = {
	title: "Заказ доставки еды в баню",
	description: "Интернет-магазин доставки еды в баню",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="ru">
			<body>
				<CartProvider>
					<header className="border-b">
						<div className="container">
							<Header />
						</div>
					</header>
					<div className="container">
						<CategoryBar />
					</div>
					<main className="container py-6">
						{children}
					</main>
				</CartProvider>
			</body>
		</html>
	);
}

