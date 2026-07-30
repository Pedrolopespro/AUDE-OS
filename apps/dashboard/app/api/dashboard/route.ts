import { ensureDatabase } from "../../../db/runtime";
import {
  accessErrorResponse,
  isAgencyLeader,
  requireAppUser,
} from "@/lib/access";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const currentUser = await requireAppUser(request);
    const agencyLeader = isAgencyLeader(currentUser);
    const db = await ensureDatabase();
    const [clientsResult, opportunitiesResult, goalsRow] = await Promise.all([
      db
        .prepare(`
          SELECT id, name, initials, services, contract_type AS contractType,
                 value, payment_status AS paymentStatus, color, active, created_at AS createdAt
          FROM clients
          WHERE active = 1
            AND (
              ? = 1 OR EXISTS (
                SELECT 1 FROM client_memberships membership
                WHERE membership.client_id = clients.id
                  AND membership.user_id = ?
              )
            )
          ORDER BY created_at ASC
        `)
        .bind(agencyLeader ? 1 : 0, currentUser.id)
        .all(),
      db
        .prepare(`
          SELECT id, company, contact, phone, stage, meeting_status AS meetingStatus,
                 meeting_date AS meetingDate, estimated_value AS estimatedValue,
                 notes, created_at AS createdAt, updated_at AS updatedAt
          FROM opportunities
          WHERE ? = 1
          ORDER BY created_at DESC
        `)
        .bind(agencyLeader ? 1 : 0)
        .all(),
      agencyLeader
        ? db
            .prepare(`
              SELECT prospecting, meetings, closed_clients AS closedClients
              FROM goals WHERE id = 1
            `)
            .first()
        : Promise.resolve(null),
    ]);

    const clients = clientsResult.results.map((row) => ({
      ...row,
      services: JSON.parse(String(row.services || "[]")),
      active: Boolean(row.active),
      value: agencyLeader ? Number(row.value) : 0,
      paymentStatus: agencyLeader ? row.paymentStatus : "confirm",
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
      currentUser,
    });
  } catch (error) {
    return accessErrorResponse(error, "Não foi possível carregar o painel.");
  }
}
