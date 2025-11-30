import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentAdmin } from "@/lib/auth";
import path from "path";
import fs from "fs";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
	if (!getCurrentAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	const id = Number(params.id);
	if (!id) return NextResponse.json({ error: "Bad request" }, { status: 400 });
	const form = await req.formData();
	const file = form.get("file") as File | null;
	if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

	const arrayBuffer = await file.arrayBuffer();
	const buffer = Buffer.from(arrayBuffer);

	const ext = (() => {
		const mt = file.type || "";
		if (mt.includes("png")) return "png";
		if (mt.includes("jpeg") || mt.includes("jpg")) return "jpg";
		if (mt.includes("webp")) return "webp";
		return "png";
	})();
	const publicDir = path.join(process.cwd(), "public", "products");
	if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
	const fileName = `${id}.${ext}`;
	const filePath = path.join(publicDir, fileName);
	fs.writeFileSync(filePath, buffer);
	const imageUrl = `/products/${fileName}`;

	const db = getDb();
	db.prepare("UPDATE products SET image = ? WHERE id = ?").run(imageUrl, id);
	return NextResponse.json({ ok: true, image: imageUrl });
}


