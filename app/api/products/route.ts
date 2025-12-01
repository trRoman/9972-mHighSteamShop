import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(req: NextRequest) {
	const { searchParams } = new URL(req.url);
	const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
	const limit = Math.max(1, Math.min(50, Number(searchParams.get("limit") ?? "10")));
	const sortParam = searchParams.get("sort");
	const category = searchParams.get("category"); // slug

	// Перемешивание товаров между визитами: используем seed из cookie (сеансовый)
	let seedStr = req.cookies.get("visit_seed")?.value;
	if (!seedStr) {
		seedStr = String(Math.floor(1000 + Math.random() * 1_000_000));
	}
	const seedNum = Number(seedStr) || 123457;
	const randomOrderExpr = `((p.id * ${seedNum}) % 1000003)`;

	const db = getDb();
	// Если явная сортировка не запрошена — применяем детерминированное перемешивание по seed
	let orderBy = `${randomOrderExpr} ASC`;
	if (sortParam) {
		const sort = String(sortParam);
		orderBy = "p.price ASC";
		if (sort === "price_desc") orderBy = "p.price DESC";
		else if (sort === "rating") orderBy = "p.rating DESC";
		else if (sort === "name") orderBy = "p.name ASC";
	}

	// Если категория не выбрана, показываем товары категории по умолчанию первыми
	const fullOrderBy = category ? orderBy : `c.is_default DESC, ${orderBy}`;

	const where: string[] = [];
	const params: any[] = [];
	if (category) {
		where.push("c.slug = ?");
		params.push(category);
	}
	const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

	const totalRow = db.prepare(
		`SELECT COUNT(1) as cnt
		 FROM products p
		 JOIN categories c ON c.id = p.category_id
		 ${whereSql}`
	).get(...params) as { cnt: number };

	const offset = (page - 1) * limit;
	const rows = db.prepare(
		`SELECT 
		 p.id, 
		 p.name, 
		 p.description, 
		 p.price, 
		 (SELECT COUNT(DISTINCT oi.order_id) FROM order_items oi WHERE oi.product_id = p.id) AS rating,
		 p.image, 
		 c.slug as category
		 FROM products p
		 JOIN categories c ON c.id = p.category_id
		 ${whereSql}
		 ORDER BY ${fullOrderBy}
		 LIMIT ? OFFSET ?`
	).all(...params, limit, offset) as Array<{
		id: number; name: string; description: string; price: number; rating: number; image: string; category: string;
	}>;

	const res = NextResponse.json({
		items: rows,
		total: totalRow.cnt,
		page,
		limit,
		hasMore: offset + rows.length < totalRow.cnt
	});
	// Если cookie с seed отсутствовал — устанавливаем (сеансовая cookie)
	if (!req.cookies.get("visit_seed")) {
		res.cookies.set("visit_seed", seedStr, {
			httpOnly: true,
			sameSite: "lax",
			path: "/"
		});
	}
	return res;
}


