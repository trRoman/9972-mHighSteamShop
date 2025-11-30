import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
	const db = getDb();
	const rows = db.prepare("SELECT id, slug, name, is_default FROM categories ORDER BY id ASC").all() as Array<{id:number; slug:string; name:string; is_default:number;}>;
	return NextResponse.json({ items: rows });
}


