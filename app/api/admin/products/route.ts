import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentAdmin } from "@/lib/auth";

export async function GET(req: NextRequest) {
	if (!getCurrentAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	const { searchParams } = new URL(req.url);
	const q = (searchParams.get("q") || "").trim();
	const category = (searchParams.get("category") || "").trim();
	const db = getDb();

	const where: string[] = [];
	const params: any[] = [];
	if (category) {
		where.push("c.slug = ?");
		params.push(category);
	}
	if (q) {
		// split into words and require all words to appear in name or description
		const words = q.split(/\s+/).filter(Boolean);
		for (const w of words) {
			where.push("(p.name LIKE ? OR p.description LIKE ?)");
			const like = `%${w}%`;
			params.push(like, like);
		}
	}
	const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

	const rows = db.prepare(
		`SELECT 
		 p.id, p.name, p.description, p.price, p.image,
		 c.slug as category_slug, c.name as category_name
		 FROM products p
		 JOIN categories c ON c.id = p.category_id
		 ${whereSql}
		 ORDER BY c.name ASC, p.id DESC`
	).all(...params);

	return NextResponse.json({ items: rows }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
	if (!getCurrentAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	const db = getDb();
	const body = await req.json().catch(() => null) as { name?: string; description?: string; price?: number; category_id?: number } | null;
	if (!body || !body.name || !body.description || typeof body.price !== "number" || !body.category_id) {
		return NextResponse.json({ error: "Bad request" }, { status: 400 });
	}
	// Получим категорию, чтобы сформировать placeholder-картинку и вернуть метаданные
	const cat = db.prepare("SELECT slug, name FROM categories WHERE id = ?").get(body.category_id) as { slug?: string; name?: string } | undefined;
	if (!cat || !cat.slug) {
		return NextResponse.json({ error: "Unknown category" }, { status: 400 });
	}
	const image = `/products/${cat.slug}.svg`;
	const price = Math.max(0, Math.floor(body.price));
	const info = db.prepare("INSERT INTO products (name, description, price, rating, image, category_id) VALUES (?, ?, ?, 0, ?, ?)").run(
		body.name, body.description, price, image, body.category_id
	);
	const id = Number(info.lastInsertRowid);
	return NextResponse.json({
		id,
		name: body.name,
		description: body.description,
		price,
		image,
		category_slug: cat.slug,
		category_name: cat.name ?? cat.slug
	}, { headers: { "Cache-Control": "no-store" } });
}


