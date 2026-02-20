import { NextResponse } from "next/server";

export function apiError(
  message: string,
  status: number,
  headers?: Record<string, string>
) {
  return NextResponse.json({ error: message }, { status, headers });
}
