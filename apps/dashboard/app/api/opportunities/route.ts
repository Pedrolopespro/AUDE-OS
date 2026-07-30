import { ensureDatabase } from "../../../db/runtime";
import {
  accessErrorResponse,
  requireAppUser,
  requireClientManagement,
} from "@/lib/access";

const allowedStages = new Set([
  "prospect",
  "meeting",
  "proposal",
  "closed",
  "lost",
]);
const allowedMeetingStatuses = new Set(["scheduled", "held", "cancelled"]);

export async function POST(request: Request) {
  try {
    const currentUser = await requireAppUser(request);
    requireClientManagement(currentUser);
    const payload = (await request.json()) as {
      company?: string;
      contact?: string;
      phone?: string;
      stage?: string;
      meetingStatus?: string | null;
      meetingDate?: string | null;
      estimatedValue?: number | null;
      notes?: string;
    };

    const company = payload.company?.trim() ?? "";
    const stage = allowedStages.has(payload.stage ?? "")
      ? String(payload.stage)
      : "prospect";
    const meetingStatus =
      payload.meetingStatus && allowedMeetingStatuses.has(payload.meetingStatus)
        ? payload.meetingStatus
        : null;

    if (!company) {
      return Response.json({ error: "Informe a empresa ou contato." }, { status: 400 });
    }

    const opportunity = {
      id: crypto.randomUUID(),
      company,
      contact: payload.contact?.trim() ?? "",
      phone: payload.phone?.trim() ?? "",
      stage,
      meetingStatus,
      meetingDate: payload.meetingDate || null,
      estimatedValue:
        payload.estimatedValue == null ? null : Number(payload.estimatedValue),
      notes: payload.notes?.trim() ?? "",
    };

    const db = await ensureDatabase();
    await db
      .prepare(`
        INSERT INTO opportunities
          (id, company, contact, phone, stage, meeting_status, meeting_date, estimated_value, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        opportunity.id,
        opportunity.company,
        opportunity.contact,
        opportunity.phone,
        opportunity.stage,
        opportunity.meetingStatus,
        opportunity.meetingDate,
        opportunity.estimatedValue,
        opportunity.notes,
      )
      .run();

    return Response.json({ opportunity }, { status: 201 });
  } catch (error) {
    return accessErrorResponse(error, "Não foi possível cadastrar a oportunidade.");
  }
}
