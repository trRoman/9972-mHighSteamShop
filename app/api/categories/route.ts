import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
	const db = getDb();
	const rows = db.prepare("SELECT id, slug, name FROM categories ORDER BY id ASC").all() as Array<{id:number; slug:string; name:string;}>;
	return NextResponse.json({ items: rows });
}


