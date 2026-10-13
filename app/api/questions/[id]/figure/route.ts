import fs from "fs/promises";
import { currentUser } from "@/lib/data";
import { questionFigurePath } from "@/lib/questions";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return new Response("Sign in required.", { status: 401 });
  const { id } = await params;
  if (!/^(quant|verbal)-\d{3}$/.test(id)) return new Response("Not found.", { status: 404 });
  try {
    const bytes = await fs.readFile(questionFigurePath(id));
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "private, no-cache",
      },
    });
  } catch {
    return new Response("Not found.", { status: 404 });
  }
}
