import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentAdmin } from "@/lib/auth";
import path from "path";
import fs from "fs";
import crypto from "crypto";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
	if (!getCurrentAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	const id = Number(params.id);
	if (!id) return NextResponse.json({ error: "Bad request" }, { status: 400 });
	const form = await req.formData();
	const file = form.get("file") as File | null;
	if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

	// lazy import sharp to avoid bundling issues
	const sharp = (await import("sharp")).default;

	const arrayBuffer = await file.arrayBuffer();
	const buffer = Buffer.from(arrayBuffer);

	const publicDir = path.join(process.cwd(), "public", "products");
	if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
	// generate content hash to make a unique filename per upload
	const hash = crypto.createHash("sha1").update(buffer).digest("hex").slice(0, 10);
	// Стандартизируем хранилище под WebP
	const fileName = `${id}-${hash}.webp`;
	const filePath = path.join(publicDir, fileName);

	// cleanup old files for this product id to prevent stale assets
	try {
		for (const f of fs.readdirSync(publicDir)) {
			if ((f.startsWith(`${id}-`) || f === `${id}.jpg` || f === `${id}.png` || f === `${id}.webp`) && f !== fileName) {
				try { fs.unlinkSync(path.join(publicDir, f)); } catch {}
			}
		}
	} catch {}

	// Оптимизация: ресайз до разумного максимума и сохранение в WebP (качество 80)
	// Сохраняем ориентацию, не увеличиваем малые изображения
	await sharp(buffer)
		.rotate()
		.resize({ width: 1600, height: 1200, fit: "inside", withoutEnlargement: true })
		.webp({ quality: 80 })
		.toFile(filePath);

	// final URL: unique path (no query needed)
	const imageUrl = `/products/${fileName}`;

	const db = getDb();
	db.prepare("UPDATE products SET image = ? WHERE id = ?").run(imageUrl, id);
	return NextResponse.json({ ok: true, image: imageUrl });
}


