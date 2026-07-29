import { ensureDatabase } from "../../../db/runtime";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = await ensureDatabase();
    const [clientsResult, opportunitiesResult, goalsRow] = await Promise.all([
      db
        .prepare(`
          SELECT id, name, initials, services, contract_type AS contractType,
                 value, payment_status AS paymentStatus, color, active, created_at AS createdAt
          FROM clients
          WHERE active = 1
          ORDER BY created_at ASC
        `)
        .all(),
      db
        .prepare(`
          SELECT id, company, contact, phone, stage, meeting_status AS meetingStatus,
                 meeting_date AS meetingDate, estimated_value AS estimatedValue,
                 notes, created_at AS createdAt, updated_at AS updatedAt
          FROM opportunities
          ORDER BY created_at DESC
        `)
        .all(),
      db
        .prepare(`
          SELECT prospecting, meetings, closed_clients AS closedClients
          FROM goals WHERE id = 1
        `)
        .first(),
    ]);

    const clients = clientsResult.results.map((row) => ({
      ...row,
      services: JSON.parse(String(row.services || "[]")),
      active: Boolean(row.active),
    }));
    const opportunities = opportunitiesResult.results;

    return Response.json({
      clients,
      opportunities,
      goals: goalsRow ?? {
        prospecting: null,
        meetings: null,
        closedClients: null,
      },
    });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Não foi possível carregar o painel.",
      },
      { status: 500 },
    );
  }
}
