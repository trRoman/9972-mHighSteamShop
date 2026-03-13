export const dynamic = "force-dynamic";

export default function ContactsPage() {
	return (
		<div className="max-w-4xl mx-auto">
			<h1 className="text-3xl font-bold mb-8 text-[#022359]">Контакты</h1>

			<div className="bg-white rounded-lg shadow-md p-6 mb-6">
				<h2 className="text-xl font-semibold mb-4 text-[#022359]">Реквизиты</h2>
				<div className="space-y-2 text-gray-700">
					<p><span className="font-medium">Наименование:</span> ИНДИВИДУАЛЬНЫЙ ПРЕДПРИНИМАТЕЛЬ АСАТРЯН АЛЬБЕРТ АРСЕНОВИЧ</p>
					<p><span className="font-medium">ИНН:</span> 504723501384</p>
					<p><span className="font-medium">ОГРНИП:</span> 324508100048232</p>
				</div>
			</div>

			<div className="bg-white rounded-lg shadow-md p-6 mb-6">
				<h2 className="text-xl font-semibold mb-4 text-[#022359]">Банковские реквизиты</h2>
				<div className="space-y-2 text-gray-700">
					<p><span className="font-medium">Расчётный счёт:</span> 40802810940000191837</p>
					<p><span className="font-medium">Наименование банка:</span> ПАО Сбербанк</p>
					<p><span className="font-medium">БИК:</span> 044525225</p>
					<p><span className="font-medium">Корреспондентский счёт:</span> 30101810400000000225</p>
					<p><span className="font-medium">ИНН банка:</span> 7707083893</p>
					<p><span className="font-medium">КПП:</span> 773643002</p>
					<p><span className="font-medium">Дата открытия счёта:</span> 27.03.2024</p>
				</div>
			</div>

			<div className="bg-white rounded-lg shadow-md p-6">
				<h2 className="text-xl font-semibold mb-4 text-[#022359]">Адрес обслуживающего подразделения</h2>
				<p className="text-gray-700">г. Мытищи, Ново-Мытищинский проспект, дом 5, корпус 1</p>
			</div>
		</div>
	);
}
