import { ensureDatabase } from "@/db/runtime";
import { connectorRequest } from "@/lib/connector";
import {
  accessErrorResponse,
  requireAppUser,
  requireContentManagement,
} from "@/lib/access";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const currentUser = await requireAppUser(request);
    requireContentManagement(currentUser, id);
    const db = await ensureDatabase();
    const client = await db
      .prepare("SELECT id, name FROM clients WHERE id = ? LIMIT 1")
      .bind(id)
      .first<{ id: string; name: string }>();
    if (!client) {
      return Response.json({ error: "Cliente não encontrado." }, { status: 404 });
    }

    const response = await connectorRequest("/api/internal/invitations", {
      method: "POST",
      body: JSON.stringify({
        clientId: client.id,
        clientName: client.name,
      }),
    });
    const data = await response.json();
    return Response.json(data, { status: response.status });
  } catch (error) {
    return accessErrorResponse(error, "Não foi possível gerar o convite.");
  }
}
