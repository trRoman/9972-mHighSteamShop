export const dynamic = "force-dynamic";

import ProductList from "@/components/ProductList";

export default function HomePage() {
	return (
		<div className="py-4">
			<ProductList />
		</div>
	);
}

