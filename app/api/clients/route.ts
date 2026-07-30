import { ensureDatabase } from "../../../db/runtime";
import {
  accessErrorResponse,
  requireAppUser,
  requireClientManagement,
} from "@/lib/access";

const allowedServices = new Set([
  "Social media",
  "Tráfego",
  "Site",
  "Sistemas",
  "Lançamento",
]);

function makeId(name: string) {
  const base = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 42);
  return `${base || "cliente"}-${crypto.randomUUID().slice(0, 6)}`;
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

export async function POST(request: Request) {
  try {
    const currentUser = await requireAppUser(request);
    requireClientManagement(currentUser);
    const payload = (await request.json()) as {
      name?: string;
      services?: string[];
      contractType?: "fixed" | "percentage";
      value?: number;
    };

    const name = payload.name?.trim() ?? "";
    const services = (payload.services ?? []).filter((service) =>
      allowedServices.has(service),
    );
    const contractType =
      payload.contractType === "percentage" ? "percentage" : "fixed";
    const value = Number(payload.value);

    if (!name) {
      return Response.json({ error: "Informe o nome do cliente." }, { status: 400 });
    }
    if (!services.length) {
      return Response.json(
        { error: "Selecione pelo menos um serviço." },
        { status: 400 },
      );
    }
    if (!Number.isFinite(value) || value < 0) {
      return Response.json(
        { error: "Informe um valor de contrato válido." },
        { status: 400 },
      );
    }

    const id = makeId(name);
    const client = {
      id,
      name,
      initials: initials(name),
      services,
      contractType,
      value,
      paymentStatus: "confirm",
      color: "#4866ed",
      active: true,
    };

    const db = await ensureDatabase();
    await db
      .prepare(`
        INSERT INTO clients
          (id, name, initials, services, contract_type, value, payment_status, color, active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
      `)
      .bind(
        client.id,
        client.name,
        client.initials,
        JSON.stringify(client.services),
        client.contractType,
        client.value,
        client.paymentStatus,
        client.color,
      )
      .run();

    return Response.json({ client }, { status: 201 });
  } catch (error) {
    return accessErrorResponse(error, "Não foi possível cadastrar o cliente.");
  }
}
