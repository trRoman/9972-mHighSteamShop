import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentAdmin } from "@/lib/auth";
import path from "path";
import fs from "fs";
import crypto from "crypto";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
	if (!getCurrentAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	const id = Number(params.id);
	if (!id) return NextResponse.json({ error: "Bad request" }, { status: 400 });
	const form = await req.formData();
	const file = form.get("file") as File | null;
	if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

	// Пытаемся динамически импортировать sharp; если отсутствует на сервере — продолжим без сжатия
	const SHARP_PKG = "sharp";
	let sharp: any = null;
	try {
		// Используем переменную, чтобы избежать статического резолва на этапе сборки
		sharp = (await import(/* webpackIgnore: true */ SHARP_PKG)).default;
	} catch {}

	const arrayBuffer = await file.arrayBuffer();
	const buffer = Buffer.from(arrayBuffer);

	// Корневая папка хранения изображений: можно задать через ENV (PRODUCTS_DIR)
	const publicDir = process.env.PRODUCTS_DIR
		? process.env.PRODUCTS_DIR
		: path.join(process.cwd(), "public", "products");
	if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
	// generate content hash to make a unique filename per upload
	const hash = crypto.createHash("sha1").update(buffer).digest("hex").slice(0, 10);
	// Стандартизируем хранилище под WebP
	let fileName = `${id}-${hash}.webp`;
	let filePath = path.join(publicDir, fileName);

	// cleanup old files for this product id to prevent stale assets
	try {
		for (const f of fs.readdirSync(publicDir)) {
			if ((f.startsWith(`${id}-`) || f === `${id}.jpg` || f === `${id}.png` || f === `${id}.webp`) && f !== fileName) {
				try { fs.unlinkSync(path.join(publicDir, f)); } catch {}
			}
		}
	} catch {}

	// Пишем файл: сначала пытаемся через sharp, при любой ошибке — надёжный fallback на обычную запись
	let wrote = false;
	if (sharp) {
		try {
			// Оптимизация через sharp: ресайз до разумного максимума и сохранение в WebP (качество 80)
			// Сохраняем ориентацию, не увеличиваем малые изображения
			await sharp(buffer)
				.rotate()
				.resize({ width: 1600, height: 1200, fit: "inside", withoutEnlargement: true })
				.webp({ quality: 80 })
				.toFile(filePath);
			wrote = true;
		} catch {
			// игнорируем и перейдём к резервной записи
		}
	}
	if (!wrote) {
		// Резервный путь: сохраняем файл в исходном формате и расширении
		const mt = (file.type || "").toLowerCase();
		const origExt = mt.includes("png") ? "png" : mt.includes("webp") ? "webp" : "jpg";
		fileName = `${id}-${hash}.${origExt}`;
		filePath = path.join(publicDir, fileName);
		fs.writeFileSync(filePath, buffer); // без оптимизации
		wrote = true;
	}

	// final URL: unique path (no query needed)
	const imageUrl = `/products/${fileName}`;

	const db = getDb();
	db.prepare("UPDATE products SET image = ? WHERE id = ?").run(imageUrl, id);
	return NextResponse.json({ ok: true, image: imageUrl });
}


