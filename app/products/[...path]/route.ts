import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import fsp from "fs/promises";
import path from "path";

export const runtime = "nodejs";

function getMimeType(filePath: string): string {
	const ext = path.extname(filePath).toLowerCase();
	switch (ext) {
		case ".webp": return "image/webp";
		case ".jpg":
		case ".jpeg": return "image/jpeg";
		case ".png": return "image/png";
		case ".svg": return "image/svg+xml";
		case ".gif": return "image/gif";
		case ".txt": return "text/plain; charset=utf-8";
		default: return "application/octet-stream";
	}
}

export async function GET(_req: NextRequest, ctx: { params: { path?: string[] } }) {
	const segments = ctx.params.path ?? [];
	if (segments.length === 0) {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}

	// Base directory for product images
	const baseDir = process.env.PRODUCTS_DIR
		? process.env.PRODUCTS_DIR
		: path.join(process.cwd(), "public", "products");

	// Normalize and strictly confine within baseDir (prevent path traversal)
	const requestedRel = path.join(...segments);
	const absPath = path.resolve(baseDir, requestedRel);
	if (!absPath.startsWith(path.resolve(baseDir) + path.sep) && absPath !== path.resolve(baseDir)) {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}

	try {
		const stat = await fsp.stat(absPath);
		if (!stat.isFile()) {
			return NextResponse.json({ error: "Not found" }, { status: 404 });
		}
	} catch {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}

	const mime = getMimeType(absPath);

	// Stream or read file
	// Simple and reliable: read into Buffer (files небольшие, изображения товаров)
	const data = await fsp.readFile(absPath);
	return new NextResponse(data, {
		status: 200,
		headers: {
			"Content-Type": mime,
			// Можно настроить кеширование по желанию. Пока без агрессивного кеша:
			"Cache-Control": "private, no-cache, no-store, must-revalidate",
			"Pragma": "no-cache",
			"Expires": "0",
		},
	});
}


