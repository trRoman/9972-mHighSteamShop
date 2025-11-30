export const dynamic = "force-dynamic";

import { Suspense } from "react";
import ProductList from "@/components/ProductList";

export default function HomePage() {
	return (
		<div className="py-4">
			<Suspense fallback={<div />}>
				<ProductList />
			</Suspense>
		</div>
	);
}

