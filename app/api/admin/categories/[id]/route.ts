import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentAdmin } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
	if (!getCurrentAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	const id = Number(params.id);
	if (!id) return NextResponse.json({ error: "Bad request" }, { status: 400 });
	const body = await req.json().catch(() => null) as { slug?: string; name?: string; is_default?: boolean } | null;
	if (!body) return NextResponse.json({ error: "Bad request" }, { status: 400 });
	const db = getDb();
	if (body.slug !== undefined) {
		const slug = body.slug.trim().toLowerCase();
		if (!/^[a-z0-9-]+$/.test(slug)) return NextResponse.json({ error: "Неверный slug" }, { status: 400 });
		try {
			db.prepare("UPDATE categories SET slug = ? WHERE id = ?").run(slug, id);
		} catch {
			return NextResponse.json({ error: "Slug уже существует" }, { status: 400 });
		}
	}
	if (body.name !== undefined) {
		db.prepare("UPDATE categories SET name = ? WHERE id = ?").run(body.name.trim(), id);
	}
	if (body.is_default === true) {
		// set this category as the only default
		db.exec("BEGIN");
		try {
			db.exec(`UPDATE categories SET is_default = 0`);
			db.prepare(`UPDATE categories SET is_default = 1 WHERE id = ?`).run(id);
			db.exec("COMMIT");
		} catch {
			db.exec("ROLLBACK");
			return NextResponse.json({ error: "Не удалось установить категорию по умолчанию" }, { status: 400 });
		}
	}
	return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
	if (!getCurrentAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	const id = Number(params.id);
	if (!id) return NextResponse.json({ error: "Bad request" }, { status: 400 });
	const db = getDb();
	// Block delete if there are products
	const row = db.prepare("SELECT COUNT(1) as c FROM products WHERE category_id = ?").get(id) as { c: number };
	if (row.c > 0) {
		return NextResponse.json({ error: "В категории есть товары. Удалите/перенесите товары прежде чем удалять категорию." }, { status: 400 });
	}
	// if deleting default, reassign default to the first available category after deletion
	const wasDefault = db.prepare("SELECT is_default FROM categories WHERE id = ?").get(id) as { is_default?: number } | undefined;
	db.prepare("DELETE FROM categories WHERE id = ?").run(id);
	if (wasDefault && wasDefault.is_default === 1) {
		db.exec(`
			UPDATE categories SET is_default = 0;
			UPDATE categories SET is_default = 1 WHERE id = (SELECT id FROM categories ORDER BY id ASC LIMIT 1);
		`);
	}
	return NextResponse.json({ ok: true });
}


