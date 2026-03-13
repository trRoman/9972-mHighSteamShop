export const dynamic = "force-dynamic";

export default function PersonalDataPage() {
	return (
		<div className="max-w-4xl mx-auto">
			<h1 className="text-3xl font-bold mb-8 text-[#022359]">Обработка персональных данных</h1>

			<div className="prose max-w-none">
				<section className="mb-6">
					<h2 className="text-xl font-semibold mb-3 text-[#022359]">1. Общие положения</h2>
					<p className="text-gray-700 mb-2">
						Настоящий документ регламентирует порядок обработки персональных данных пользователей 
						интернет-магазина «Заказ доставки еды в баню» (далее — Сайт).
					</p>
					<p className="text-gray-700">
						Обработка персональных данных осуществляется в соответствии с Федеральным законом от 27.07.2006 
						№ 152-ФЗ «О персональных данных».
					</p>
				</section>

				<section className="mb-6">
					<h2 className="text-xl font-semibold mb-3 text-[#022359]">2. Цели обработки персональных данных</h2>
					<p className="text-gray-700 mb-2">
						Персональные данные пользователей обрабатываются в следующих целях:
					</p>
					<ul className="list-disc pl-6 text-gray-700">
						<li>Оформление и обработка заказов</li>
						<li>Организация доставки товаров</li>
						<li>Обработка платежей</li>
						<li>Информирование о статусе заказа</li>
						<li>Улучшение качества обслуживания</li>
					</ul>
				</section>

				<section className="mb-6">
					<h2 className="text-xl font-semibold mb-3 text-[#022359]">3. Перечень обрабатываемых персональных данных</h2>
					<p className="text-gray-700 mb-2">
						Обработке подлежат следующие персональные данные:
					</p>
					<ul className="list-disc pl-6 text-gray-700">
						<li>Фамилия, имя, отчество</li>
						<li>Контактный телефон</li>
						<li>Адрес электронной почты</li>
						<li>Адрес доставки</li>
					</ul>
				</section>

				<section className="mb-6">
					<h2 className="text-xl font-semibold mb-3 text-[#022359]">4. Способы обработки персональных данных</h2>
					<p className="text-gray-700 mb-2">
						Обработка персональных данных осуществляется следующими способами:
					</p>
					<ul className="list-disc pl-6 text-gray-700">
						<li>Сбор и запись персональных данных</li>
						<li>Хранение и накопление</li>
						<li>Уточнение и обновление</li>
						<li>Использование и передача</li>
						<li>Уничтожение при достижении целей обработки</li>
					</ul>
				</section>

				<section className="mb-6">
					<h2 className="text-xl font-semibold mb-3 text-[#022359]">5. Срок обработки персональных данных</h2>
					<p className="text-gray-700">
						Персональные данные хранятся до достижения целей обработки или до момента отзыва согласия 
						пользователем, если иное не предусмотрено законодательством РФ.
					</p>
				</section>

				<section className="mb-6">
					<h2 className="text-xl font-semibold mb-3 text-[#022359]">6. Меры защиты персональных данных</h2>
					<p className="text-gray-700 mb-2">
						При обработке персональных данных принимаются следующие меры защиты:
					</p>
					<ul className="list-disc pl-6 text-gray-700">
						<li>Использование защищённых каналов связи</li>
						<li>Ограничение доступа к персональным данным</li>
						<li>Применение средств криптографической защиты</li>
						<li>Регулярный контроль безопасности</li>
					</ul>
				</section>

				<section className="mb-6">
					<h2 className="text-xl font-semibold mb-3 text-[#022359]">7. Права субъекта персональных данных</h2>
					<p className="text-gray-700 mb-2">
						Субъект персональных данных имеет право:
					</p>
					<ul className="list-disc pl-6 text-gray-700">
						<li>Получить информацию о своих персональных данных</li>
						<li>Требовать уточнения, блокирования или уничтожения данных</li>
						<li>Отозвать согласие на обработку персональных данных</li>
						<li>Защитить свои права в судебном порядке</li>
					</ul>
				</section>

				<section className="mb-6">
					<h2 className="text-xl font-semibold mb-3 text-[#022359]">8. Контакты</h2>
					<p className="text-gray-700">
						По вопросам обработки персональных данных обращайтесь по адресу:
						г. Мытищи, Ново-Мытищинский проспект, дом 5, корпус 1
					</p>
				</section>
			</div>
		</div>
	);
}
