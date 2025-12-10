import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "./db";
import crypto from "crypto";
import bcrypt from "bcryptjs";

const SESSION_COOKIE = "session";

export async function loginHandler(req: NextRequest) {
	const db = getDb();
	const body = await req.json().catch(() => null) as { email?: string; password?: string } | null;
	if (!body || !body.email || !body.password) {
		return NextResponse.json({ error: "Email и пароль обязательны" }, { status: 400 });
	}
	const admin = db.prepare("SELECT id, email, password_hash FROM admins WHERE email = ?").get(body.email) as { id: number; email: string; password_hash: string } | undefined;
	if (!admin) {
		return NextResponse.json({ error: "Неверный email или пароль" }, { status: 401 });
	}
	const ok = await bcrypt.compare(body.password, admin.password_hash);
	if (!ok) {
		return NextResponse.json({ error: "Неверный email или пароль" }, { status: 401 });
	}
	const token = crypto.randomUUID();
	const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7 дней
	db.prepare("INSERT INTO sessions (admin_id, token, expires_at) VALUES (?, ?, ?)").run(admin.id, token, expires.toISOString());
	const res = NextResponse.json({ ok: true });
	res.cookies.set(SESSION_COOKIE, token, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "strict",
		path: "/",
		expires
	});
	return res;
}

export function getCurrentAdmin(req: NextRequest) {
	const db = getDb();
	const token = req.cookies.get(SESSION_COOKIE)?.value;
	if (!token) return null;
	const row = db.prepare(`
		SELECT a.id, a.email
		FROM sessions s
		JOIN admins a ON a.id = s.admin_id
		WHERE s.token = ? AND s.expires_at > datetime('now')
	`).get(token) as { id: number; email: string } | undefined;
	return row ?? null;
}

export function logoutHandler(req: NextRequest) {
	const db = getDb();
	const token = req.cookies.get(SESSION_COOKIE)?.value;
	const res = NextResponse.json({ ok: true });
	if (token) {
		db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
		res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", expires: new Date(0) });
	}
	return res;
}

export function getCurrentAdminFromCookies() {
	const db = getDb();
	const token = cookies().get(SESSION_COOKIE)?.value;
	if (!token) return null;
	const row = db.prepare(`
		SELECT a.id, a.email
		FROM sessions s
		JOIN admins a ON a.id = s.admin_id
		WHERE s.token = ? AND s.expires_at > datetime('now')
	`).get(token) as { id: number; email: string } | undefined;
	return row ?? null;
}


