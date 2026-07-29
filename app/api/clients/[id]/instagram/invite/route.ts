import { ensureDatabase } from "@/db/runtime";
import { connectorRequest } from "@/lib/connector";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
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
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível gerar o convite.",
      },
      { status: 500 },
    );
  }
}
