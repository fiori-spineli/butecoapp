import { type NextRequest } from "next/server";
import { uploadImagem } from "@/lib/upload-route";

export async function POST(request: NextRequest) {
  return uploadImagem(request, "logos");
}
