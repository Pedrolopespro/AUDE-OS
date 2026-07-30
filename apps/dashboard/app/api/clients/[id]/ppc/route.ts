import { NextResponse } from "next/server";
import { ensureDatabase } from "@/db/runtime";
import {
  accessErrorResponse,
  requireAppUser,
  requireClientManagement,
  requireClientView,
} from "@/lib/access";
import { googleAdsCredentialsConfigured } from "@/lib/google-ads";

export const runtime = "edge";

const MCC_SETTING_KEY = "google_ads_mcc_customer_id";

function normalizeCustomerId(value: unknown) {
  return String(value ?? "").replace(/\D/g, "");
}

function isValidCustomerId(value: string) {
  return /^\d{10}$/.test(value);
}

async function readPpcConfiguration(clientId: string) {
  const db = await ensureDatabase();
  const [setting, account, apiConfigured] = await Promise.all([
    db
      .prepare("SELECT value FROM agency_settings WHERE key = ? LIMIT 1")
      .bind(MCC_SETTING_KEY)
      .first<{ value: string }>(),
    db
      .prepare(
        `SELECT
          client_id as clientId,
          customer_id as customerId,
          account_name as accountName,
          status,
          currency_code as currencyCode,
          time_zone as timeZone,
          linked_at as linkedAt,
          last_synced_at as lastSyncedAt,
          updated_at as updatedAt
        FROM ppc_google_ads_accounts
        WHERE client_id = ?
        LIMIT 1`,
      )
      .bind(clientId)
      .first<{
        clientId: string;
        customerId: string;
        accountName: string | null;
        status: string;
        currencyCode: string | null;
        timeZone: string | null;
        linkedAt: string | null;
        lastSyncedAt: string | null;
        updatedAt: string;
      }>(),
    googleAdsCredentialsConfigured(),
  ]);

  return {
    provider: "google_ads",
    mode: "read_only",
    managerCustomerId: setting?.value ?? "",
    account: account ?? null,
    apiConfigured,
    readyToSync: Boolean(setting?.value && account && apiConfigured),
  };
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const user = await requireAppUser(request);
    requireClientView(user, id);
    return NextResponse.json(await readPpcConfiguration(id));
  } catch (error) {
    return accessErrorResponse(error, "Não foi possível carregar o PAINEL PPC.");
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const user = await requireAppUser(request);
    requireClientManagement(user);

    const body = (await request.json()) as {
      managerCustomerId?: string;
      customerId?: string;
    };
    const managerCustomerId = normalizeCustomerId(body.managerCustomerId);
    const customerId = normalizeCustomerId(body.customerId);

    if (!isValidCustomerId(managerCustomerId) || !isValidCustomerId(customerId)) {
      return NextResponse.json(
        { error: "Informe os IDs do MCC e da conta do cliente com 10 dígitos." },
        { status: 400 },
      );
    }

    if (managerCustomerId === customerId) {
      return NextResponse.json(
        { error: "O MCC e a conta do cliente precisam ter IDs diferentes." },
        { status: 400 },
      );
    }

    const db = await ensureDatabase();
    const client = await db
      .prepare("SELECT id FROM clients WHERE id = ? LIMIT 1")
      .bind(id)
      .first<{ id: string }>();

    if (!client) {
      return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });
    }

    await db.batch([
      db
        .prepare(
          `INSERT INTO agency_settings (key, value, updated_at)
           VALUES (?, ?, CURRENT_TIMESTAMP)
           ON CONFLICT(key) DO UPDATE SET
             value = excluded.value,
             updated_at = CURRENT_TIMESTAMP`,
        )
        .bind(MCC_SETTING_KEY, managerCustomerId),
      db
        .prepare(
          `INSERT INTO ppc_google_ads_accounts (
             client_id, customer_id, status, updated_at
           )
           VALUES (?, ?, 'pending_link', CURRENT_TIMESTAMP)
           ON CONFLICT(client_id) DO UPDATE SET
             customer_id = excluded.customer_id,
             status = 'pending_link',
             account_name = NULL,
             currency_code = NULL,
             time_zone = NULL,
             linked_at = NULL,
             last_synced_at = NULL,
             updated_at = CURRENT_TIMESTAMP`,
        )
        .bind(id, customerId),
    ]);

    return NextResponse.json({
      ok: true,
      requestId: crypto.randomUUID(),
      configuration: await readPpcConfiguration(id),
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("UNIQUE constraint failed")
    ) {
      return NextResponse.json(
        { error: "Essa conta Google Ads já está vinculada a outro cliente." },
        { status: 409 },
      );
    }
    return accessErrorResponse(error, "Não foi possível salvar a configuração.");
  }
}
