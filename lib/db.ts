import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";

export type Category = {
	id: number;
	slug: string;
	name: string;
};

export type DbProduct = {
	id: number;
	name: string;
	description: string;
	price: number;
	rating: number;
	image: string;
	category_id: number;
};

let dbInstance: Database.Database | null = null;

export function getDb() {
	if (dbInstance) return dbInstance;
	const dataDir = path.join(process.cwd(), "data");
	if (!fs.existsSync(dataDir)) {
		fs.mkdirSync(dataDir, { recursive: true });
	}
	const dbPath = path.join(dataDir, "shop.db");
	dbInstance = new Database(dbPath);
	dbInstance.pragma("journal_mode = WAL");
	initSchema(dbInstance);
	return dbInstance;
}

function initSchema(db: Database.Database) {
	db.exec(`
		CREATE TABLE IF NOT EXISTS categories (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			slug TEXT UNIQUE NOT NULL,
			name TEXT NOT NULL
		);
		CREATE TABLE IF NOT EXISTS admins (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			email TEXT UNIQUE NOT NULL,
			password_hash TEXT NOT NULL
		);
		CREATE TABLE IF NOT EXISTS sessions (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			admin_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
			token TEXT UNIQUE NOT NULL,
			expires_at TEXT NOT NULL
		);
		CREATE TABLE IF NOT EXISTS products (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			description TEXT NOT NULL,
			price INTEGER NOT NULL,
			rating REAL NOT NULL,
			image TEXT NOT NULL,
			category_id INTEGER NOT NULL REFERENCES categories(id)
		);
		CREATE TABLE IF NOT EXISTS orders (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			created_at TEXT NOT NULL DEFAULT (datetime('now')),
			total_price INTEGER NOT NULL,
			client_token TEXT,
			expires_at TEXT,
			status TEXT DEFAULT 'ожидает',
			customer_name TEXT,
			customer_phone TEXT,
			customer_address TEXT
		);
		CREATE TABLE IF NOT EXISTS order_items (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
			product_id INTEGER NOT NULL REFERENCES products(id),
			quantity INTEGER NOT NULL,
			price INTEGER NOT NULL
		);
	`);
	ensureMigrationsTable(db);
	seed(db);
	migrateCategoriesDefault(db);
	migrateProducts4(db);
	finalizeProductsRename(db);
	migrateOrdersClientToken(db);
	migrateOrdersStatusCustomer(db);
	migrateOrderItemsChecked(db);
}

function ensureMigrationsTable(db: Database.Database) {
	db.exec(`
		CREATE TABLE IF NOT EXISTS schema_migrations (
			name TEXT PRIMARY KEY
		);
	`);
}

function hasMigration(db: Database.Database, name: string): boolean {
	const row = db.prepare("SELECT name FROM schema_migrations WHERE name = ?").get(name) as { name?: string } | undefined;
	return !!(row && row.name);
}

function markMigration(db: Database.Database, name: string) {
	db.prepare("INSERT OR IGNORE INTO schema_migrations (name) VALUES (?)").run(name);
}

function seed(db: Database.Database) {
	const countStmt = db.prepare("SELECT COUNT(1) as c FROM categories");
	const { c } = countStmt.get() as { c: number };
	if (c === 0) {
		const categories: Array<Omit<Category, "id">> = [
			{ slug: "grill", name: "Гриль" },
			{ slug: "fri", name: "Фри" },
			{ slug: "sauces", name: "Соусы" },
			{ slug: "beer", name: "Пиво" },
			{ slug: "drinks", name: "Напитки" },
		];
		const insertCat = db.prepare("INSERT INTO categories (slug, name) VALUES (?, ?)");
		for (const cat of categories) insertCat.run(cat.slug, cat.name);

		const getCatId = db.prepare("SELECT id FROM categories WHERE slug = ?");
		const insertProd = db.prepare(`
			INSERT INTO products (name, description, price, rating, image, category_id)
			VALUES (?, ?, ?, ?, ?, ?)
		`);

		function addProduct(catSlug: string, idx: number, baseName: string, basePrice: number) {
			const { id: categoryId } = getCatId.get(catSlug) as { id: number };
			const name = `${baseName} #${idx}`;
			const description = `Описание для ${baseName} №${idx}. Свежие ингредиенты, отличный вкус.`;
			const price = basePrice + (idx % 5) * 50;
			const rating = Math.round((3 + ((idx * 7) % 20) / 10) * 10) / 10; // 3.0 - 5.0
			const image = `/products/${catSlug}.svg`;
			insertProd.run(name, description, price, rating, image, categoryId);
		}

		for (let i = 1; i <= 25; i++) addProduct("grill", i, "Гриль", 450);
		for (let i = 1; i <= 25; i++) addProduct("fri", i, "Фри", 250);
		for (let i = 1; i <= 20; i++) addProduct("sauces", i, "Соус", 100);
		for (let i = 1; i <= 20; i++) addProduct("beer", i, "Пиво", 300);
		for (let i = 1; i <= 30; i++) addProduct("drinks", i, "Напиток", 200);
	}

	// seed admin (однократно, если отсутствует). Не перезаписывать существующий пароль.
	const adminEmail = process.env.ADMIN_EMAIL;
	const adminPassword = process.env.ADMIN_PASSWORD;
	const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH; // предпочтительно передавать готовый bcrypt-хэш
	if (adminEmail && (adminPassword || adminPasswordHash)) {
		const exists = db.prepare("SELECT 1 FROM admins WHERE email = ?").get(adminEmail) as { 1?: number } | undefined;
		if (!exists) {
			const hash = adminPasswordHash ?? bcrypt.hashSync(adminPassword as string, 12);
			db.prepare(`INSERT INTO admins (email, password_hash) VALUES (?, ?)`)
				.run(adminEmail, hash);
		}
	}

	// migrate existing remote images to local category placeholders
	db.exec(`
		UPDATE products
		SET image = '/products/' || (SELECT slug FROM categories c WHERE c.id = products.category_id) || '.svg'
		WHERE image LIKE 'http%';
	`);
}

function migrateProducts4(db: Database.Database) {
	if (hasMigration(db, "migrate_products4")) return;
	// if products4 doesn't exist - create it aligned with products schema and copy data
	const t = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='products4'").get() as { name?: string } | undefined;
	if (!t || !t.name) {
		db.exec(`
			CREATE TABLE IF NOT EXISTS products4 (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				name TEXT NOT NULL,
				description TEXT NOT NULL,
				price INTEGER NOT NULL,
				rating REAL NOT NULL DEFAULT 0,
				image TEXT NOT NULL,
				category_id INTEGER NOT NULL REFERENCES categories(id)
			);
			INSERT INTO products4 (id, name, description, price, rating, image, category_id)
			SELECT id, name, description, price, rating, image, category_id FROM products;
		`);
	} else {
		// ensure required columns exist
		const columns = db.prepare(`PRAGMA table_info('products4')`).all() as Array<{ name: string }>;
		const has = (col: string) => columns.some(c => c.name === col);
		if (!has("description")) db.exec(`ALTER TABLE products4 ADD COLUMN description TEXT NOT NULL DEFAULT ''`);
		if (!has("image")) db.exec(`ALTER TABLE products4 ADD COLUMN image TEXT NOT NULL DEFAULT ''`);
		if (!has("category_id")) db.exec(`ALTER TABLE products4 ADD COLUMN category_id INTEGER NOT NULL DEFAULT 1`);
		if (!has("rating")) db.exec(`ALTER TABLE products4 ADD COLUMN rating REAL NOT NULL DEFAULT 0`);

		// normalize images to local paths if they are remote urls
		// if category_id is present, try build from category slug; else fallback to drinks.svg
		db.exec(`
			UPDATE products4
			SET image = CASE
				WHEN EXISTS (SELECT 1 FROM categories c WHERE c.id = products4.category_id) 
				THEN '/products/' || (SELECT slug FROM categories c WHERE c.id = products4.category_id) || '.svg'
				ELSE '/products/drinks.svg'
			END
			WHERE image LIKE 'http%';
		`);
	}
	markMigration(db, "migrate_products4");
}

function finalizeProductsRename(db: Database.Database) {
	if (hasMigration(db, "finalize_products_rename")) return;
	// If products4 exists, drop original products and rename products4 -> products
	const p4 = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='products4'").get() as { name?: string } | undefined;
	if (p4 && p4.name === "products4") {
		// Drop original products to satisfy rename target
		db.exec(`DROP TABLE IF EXISTS products;`);
		db.exec(`ALTER TABLE products4 RENAME TO products;`);
	}
	markMigration(db, "finalize_products_rename");
}

function migrateOrdersClientToken(db: Database.Database) {
	if (hasMigration(db, "migrate_orders_client_token")) return;
	const columns = db.prepare(`PRAGMA table_info('orders')`).all() as Array<{ name: string }>;
	const hasClient = columns.some(c => c.name === "client_token");
	const hasExpires = columns.some(c => c.name === "expires_at");
	if (!hasClient) db.exec(`ALTER TABLE orders ADD COLUMN client_token TEXT`);
	if (!hasExpires) db.exec(`ALTER TABLE orders ADD COLUMN expires_at TEXT`);
	db.exec(`CREATE INDEX IF NOT EXISTS idx_orders_client_token ON orders(client_token)`);
	db.exec(`CREATE INDEX IF NOT EXISTS idx_orders_expires_at ON orders(expires_at)`);
	markMigration(db, "migrate_orders_client_token");
}

function migrateOrdersStatusCustomer(db: Database.Database) {
	if (hasMigration(db, "migrate_orders_status_customer")) return;
	const columns = db.prepare(`PRAGMA table_info('orders')`).all() as Array<{ name: string }>;
	const hasStatus = columns.some(c => c.name === "status");
	const hasName = columns.some(c => c.name === "customer_name");
	const hasPhone = columns.some(c => c.name === "customer_phone");
	const hasAddr = columns.some(c => c.name === "customer_address");
	if (!hasStatus) db.exec(`ALTER TABLE orders ADD COLUMN status TEXT DEFAULT 'ожидает'`);
	if (!hasName) db.exec(`ALTER TABLE orders ADD COLUMN customer_name TEXT`);
	if (!hasPhone) db.exec(`ALTER TABLE orders ADD COLUMN customer_phone TEXT`);
	if (!hasAddr) db.exec(`ALTER TABLE orders ADD COLUMN customer_address TEXT`);
	db.exec(`CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)`);
	markMigration(db, "migrate_orders_status_customer");
}

function migrateOrderItemsChecked(db: Database.Database) {
	if (hasMigration(db, "migrate_order_items_checked")) return;
	const columns = db.prepare(`PRAGMA table_info('order_items')`).all() as Array<{ name: string }>;
	const hasChecked = columns.some(c => c.name === "checked");
	if (!hasChecked) db.exec(`ALTER TABLE order_items ADD COLUMN checked INTEGER NOT NULL DEFAULT 0`);
	markMigration(db, "migrate_order_items_checked");
}

function migrateCategoriesDefault(db: Database.Database) {
	if (hasMigration(db, "migrate_categories_default")) return;
	const columns = db.prepare(`PRAGMA table_info('categories')`).all() as Array<{ name: string }>;
	const hasDefault = columns.some(c => c.name === "is_default");
	if (!hasDefault) {
		db.exec(`ALTER TABLE categories ADD COLUMN is_default INTEGER NOT NULL DEFAULT 0`);
	}
	// ensure exactly one default (set first category as default if none)
	const def = db.prepare(`SELECT id FROM categories WHERE is_default = 1 LIMIT 1`).get() as { id?: number } | undefined;
	if (!def || !def.id) {
		db.exec(`
			UPDATE categories SET is_default = 0;
			UPDATE categories SET is_default = 1 WHERE id = (SELECT id FROM categories ORDER BY id ASC LIMIT 1);
		`);
	}
	// partial unique index ensures only one default
	db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_single_default ON categories(is_default) WHERE is_default = 1`);
	markMigration(db, "migrate_categories_default");
}


