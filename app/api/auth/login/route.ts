import { loginHandler } from "@/lib/auth";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
	return loginHandler(req);
}


