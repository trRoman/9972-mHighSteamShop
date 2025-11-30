import { getCurrentAdmin } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
	const admin = getCurrentAdmin(req);
	if (!admin) return NextResponse.json({ authenticated: false }, { status: 401 });
	return NextResponse.json({ authenticated: true, admin });
}


