import { ensureDatabase } from "../../../db/runtime";

export async function PUT(request: Request) {
  try {
    const payload = (await request.json()) as {
      prospecting?: number | null;
      meetings?: number | null;
      closedClients?: number | null;
    };

    const values = [
      payload.prospecting,
      payload.meetings,
      payload.closedClients,
    ];
    if (
      values.some(
        (value) =>
          value !== null &&
          value !== undefined &&
          (!Number.isInteger(value) || value < 0),
      )
    ) {
      return Response.json(
        { error: "As metas devem ser números inteiros positivos." },
        { status: 400 },
      );
    }

    const db = await ensureDatabase();
    await db
      .prepare(`
        UPDATE goals
        SET prospecting = ?, meetings = ?, closed_clients = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = 1
      `)
      .bind(
        payload.prospecting ?? null,
        payload.meetings ?? null,
        payload.closedClients ?? null,
      )
      .run();

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Não foi possível salvar as metas.",
      },
      { status: 500 },
    );
  }
}
