import { getDatabase } from "@/db/runtime";
import { requireMetaConfiguration } from "@/lib/config";
import { verifyMetaSignedRequest } from "@/lib/crypto";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const signedRequest = String(formData.get("signed_request") ?? "");
    const { appSecret } = await requireMetaConfiguration();
    const { userId } = await verifyMetaSignedRequest(signedRequest, appSecret);
    const db = await getDatabase();

    await db
      .prepare("DELETE FROM instagram_connections WHERE instagram_user_id = ?")
      .bind(userId)
      .run();

    return Response.json({ success: true });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível processar a desautorização.",
      },
      { status: 400 },
    );
  }
}
