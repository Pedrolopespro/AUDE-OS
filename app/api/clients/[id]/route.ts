import { ensureDatabase } from "../../../../db/runtime";

const paymentStatuses = new Set(["confirm", "paid", "overdue"]);

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const payload = (await request.json()) as { paymentStatus?: string };

    if (!payload.paymentStatus || !paymentStatuses.has(payload.paymentStatus)) {
      return Response.json({ error: "Status financeiro inválido." }, { status: 400 });
    }

    const db = await ensureDatabase();
    await db
      .prepare("UPDATE clients SET payment_status = ? WHERE id = ?")
      .bind(payload.paymentStatus, id)
      .run();

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Não foi possível atualizar o cliente.",
      },
      { status: 500 },
    );
  }
}
