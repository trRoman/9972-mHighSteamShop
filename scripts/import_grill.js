"use strict";

const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

function main() {
	// Путь к БД
	const dataDir = path.join(process.cwd(), "data");
	const dbPath = path.join(dataDir, "shop.db");
	if (!fs.existsSync(dbPath)) {
		console.error("Файл БД не найден:", dbPath);
		process.exit(1);
	}

	// Путь к данным
	const jsonPath = path.join(process.cwd(), "data", "import", "grill.json");
	if (!fs.existsSync(jsonPath)) {
		console.error("Файл с данными не найден:", jsonPath);
		process.exit(1);
	}

	/** @type {{ category_id?: string | number, category?: string | number, items: Array<{ name: string, description: string | number | null, price: number, image_url?: string }> }} */
	const payload = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
	const items = Array.isArray(payload.items) ? payload.items : [];
	if (items.length === 0) {
		console.error("Пустой список items в JSON");
		process.exit(1);
	}

	const db = new Database(dbPath);
	db.pragma("journal_mode = WAL");

	// Определение категории: допускаем category_id (id), category (id или slug)
	let categoryId = null;
	const rawCat = payload.category_id ?? payload.category;
	if (rawCat === undefined) {
		console.error("Укажите category_id или category (id или slug) в JSON");
		process.exit(1);
	}
	if (typeof rawCat === "number" || (typeof rawCat === "string" && /^\d+$/.test(rawCat.trim()))) {
		const num = Number(rawCat);
		if (Number.isFinite(num) && num > 0) {
			categoryId = num;
		}
	} else if (typeof rawCat === "string") {
		const bySlug = db.prepare("SELECT id FROM categories WHERE slug = ?").get(rawCat.trim().toLowerCase());
		if (bySlug && bySlug.id) categoryId = bySlug.id;
	}
	if (!Number.isFinite(categoryId) || categoryId <= 0) {
		console.error("Некорректная категория. Укажите числовой id или существующий slug в поле category/category_id.");
		process.exit(1);
	}

	// Проверим наличие категории
	const category = db.prepare("SELECT id, slug FROM categories WHERE id = ?").get(categoryId);
	if (!category || !category.id) {
		console.error("Категория с id =", categoryId, "не найдена в БД");
		process.exit(1);
	}

	// Подготовленные выражения
	const findExisting = db.prepare("SELECT id FROM products WHERE name = ? AND category_id = ?");
	const insertStmt = db.prepare(`
		INSERT INTO products (name, description, price, rating, image, category_id)
		VALUES (?, ?, ?, 0, ?, ?)
	`);
	const updateStmt = db.prepare(`
		UPDATE products SET name = ?, description = ?, price = ?, image = ?
		WHERE id = ?
	`);

	let inserted = 0;
	let updated = 0;
	const tx = db.transaction(() => {
		for (const raw of items) {
			const name = String(raw.name || "").trim();
			if (!name) continue;
			const priceNum = Math.max(0, Math.floor(Number(raw.price || 0)));
			// Описание: число -> "<число> г", null/undefined -> ""
			let description = raw.description;
			if (typeof description === "number" && Number.isFinite(description)) {
				description = `${description} г`;
			} else if (description == null) {
				description = "";
			} else {
				description = String(description);
			}
			// Картинка: разрешаем только пути в /products/
			let image = String(raw.image_url || "").trim();
			if (!image.startsWith("/products/")) {
				image = `/products/${category.slug || "grill"}.svg`;
			}

			const existing = findExisting.get(name, categoryId);
			if (existing && existing.id) {
				updateStmt.run(name, description, priceNum, image, existing.id);
				updated++;
			} else {
				insertStmt.run(name, description, priceNum, image, categoryId);
				inserted++;
			}
		}
	});

	try {
		tx();
	} catch (e) {
		console.error("Ошибка при вставке данных:", e);
		process.exit(1);
	}

	console.log(`Готово. Добавлено: ${inserted}, обновлено: ${updated}. Категория id=${categoryId}.`);
}

main();


