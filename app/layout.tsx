import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/lib/cart-context";
import Header from "@/components/Header";
import CategoryBar from "@/components/CategoryBar";
import Footer from "@/components/Footer";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
	title: "Заказ доставки еды в баню",
	description: "Интернет-магазин доставки еды в баню",
};
//
export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="ru">
			<body className="flex flex-col min-h-screen">
				<CartProvider>
					<header className="border-b">
						<div className="container">
							<Header />
						</div>
					</header>
					<div className="container">
						<Suspense fallback={<div />}>
							<CategoryBar />
						</Suspense>
					</div>
					<main className="container py-6 flex-grow">
						<Suspense fallback={<div />}>
							{children}
						</Suspense>
					</main>
					<Footer />
				</CartProvider>
			</body>
		</html>
	);
}

