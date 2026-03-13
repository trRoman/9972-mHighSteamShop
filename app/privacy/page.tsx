export const dynamic = "force-dynamic";

export default function PrivacyPage() {
	return (
		<div className="max-w-4xl mx-auto">
			<h1 className="text-3xl font-bold mb-8 text-[#022359]">Политика конфиденциальности</h1>

			<div className="prose max-w-none">
				<section className="mb-6">
					<h2 className="text-xl font-semibold mb-3 text-[#022359]">1. Общие положения</h2>
					<p className="text-gray-700 mb-2">
						Настоящая политика конфиденциальности определяет порядок обработки и защиты персональных данных 
						пользователей интернет-магазина «Заказ доставки еды в баню» (далее — Сайт).
					</p>
					<p className="text-gray-700">
						Политика конфиденциальности разработана в соответствии с Федеральным законом от 27.07.2006 
						№ 152-ФЗ «О персональных данных».
					</p>
				</section>

				<section className="mb-6">
					<h2 className="text-xl font-semibold mb-3 text-[#022359]">2. Сбор и использование персональных данных</h2>
					<p className="text-gray-700 mb-2">
						Мы собираем и используем персональные данные пользователей исключительно для оформления заказов, 
						обработки платежей и доставки товаров.
					</p>
					<p className="text-gray-700 mb-2">
						Персональные данные, которые мы собираем:
					</p>
					<ul className="list-disc pl-6 text-gray-700 mb-2">
						<li>Фамилия, имя, отчество</li>
						<li>Контактный телефон</li>
						<li>Адрес электронной почты</li>
						<li>Адрес доставки</li>
					</ul>
				</section>

				<section className="mb-6">
					<h2 className="text-xl font-semibold mb-3 text-[#022359]">3. Передача персональных данных</h2>
					<p className="text-gray-700 mb-2">
						Мы не передаём персональные данные третьим лицам, за исключением случаев, когда это необходимо 
						для исполнения обязательств перед пользователем (доставка товаров, обработка платежей).
					</p>
				</section>

				<section className="mb-6">
					<h2 className="text-xl font-semibold mb-3 text-[#022359]">4. Защита персональных данных</h2>
					<p className="text-gray-700">
						Мы принимаем все необходимые меры для защиты персональных данных от неправомерного доступа, 
						изменения, уничтожения или распространения.
					</p>
				</section>

				<section className="mb-6">
					<h2 className="text-xl font-semibold mb-3 text-[#022359]">5. Права пользователя</h2>
					<p className="text-gray-700 mb-2">
						Пользователь имеет право:
					</p>
					<ul className="list-disc pl-6 text-gray-700">
						<li>Получить информацию о своих персональных данных</li>
						<li>Требовать уточнения, блокирования или уничтожения своих персональных данных</li>
						<li>Отозвать согласие на обработку персональных данных</li>
					</ul>
				</section>

				<section className="mb-6">
					<h2 className="text-xl font-semibold mb-3 text-[#022359]">6. Контакты</h2>
					<p className="text-gray-700">
						По всем вопросам, связанным с обработкой персональных данных, вы можете обратиться по адресу:
						г. Мытищи, Ново-Мытищинский проспект, дом 5, корпус 1
					</p>
				</section>
			</div>
		</div>
	);
}
