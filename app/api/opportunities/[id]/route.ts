import { ensureDatabase } from "../../../../db/runtime";

const allowedStages = new Set([
  "prospect",
  "meeting",
  "proposal",
  "closed",
  "lost",
]);
const allowedMeetingStatuses = new Set(["scheduled", "held", "cancelled"]);

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const payload = (await request.json()) as {
      stage?: string;
      meetingStatus?: string | null;
    };

    const stage = payload.stage;
    const meetingStatus = payload.meetingStatus;
    if (stage && !allowedStages.has(stage)) {
      return Response.json({ error: "Etapa comercial inválida." }, { status: 400 });
    }
    if (
      meetingStatus &&
      !allowedMeetingStatuses.has(meetingStatus)
    ) {
      return Response.json({ error: "Status da reunião inválido." }, { status: 400 });
    }

    const db = await ensureDatabase();
    if (stage) {
      await db
        .prepare(
          "UPDATE opportunities SET stage = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        )
        .bind(stage, id)
        .run();
    }
    if (meetingStatus !== undefined) {
      await db
        .prepare(
          "UPDATE opportunities SET meeting_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        )
        .bind(meetingStatus, id)
        .run();
    }

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Não foi possível atualizar a oportunidade.",
      },
      { status: 500 },
    );
  }
}
