import Link from "next/link";

export default function Footer() {
	return (
		<footer className="border-t bg-[#E7E0D6] mt-auto">
			<div className="container py-6">
				<div className="flex flex-col md:flex-row justify-between items-center gap-4">
					<div className="text-sm text-gray-600">
						© {new Date().getFullYear()} ИП Асатрян Альберт Арсенович
					</div>
					<nav className="flex flex-wrap justify-center gap-4 text-sm">
						<Link href="/privacy" className="text-[#022359] hover:underline">
							Политика конфиденциальности
						</Link>
						<Link href="/personal-data" className="text-[#022359] hover:underline">
							Обработка персональных данных
						</Link>
						<Link href="/contacts" className="text-[#022359] hover:underline">
							Контакты
						</Link>
					</nav>
				</div>
			</div>
		</footer>
	);
}
