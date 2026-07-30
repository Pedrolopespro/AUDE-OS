import { NextResponse } from "next/server";
import { ensureDatabase } from "@/db/runtime";
import {
  accessErrorResponse,
  requireAppUser,
  requireClientView,
} from "@/lib/access";
import {
  fetchGoogleAdsPerformance,
  GoogleAdsConfigurationError,
} from "@/lib/google-ads";

export const runtime = "edge";

function period(value: string | null): 7 | 30 | 90 {
  if (value === "7" || value === "90") return Number(value) as 7 | 90;
  return 30;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const user = await requireAppUser(request);
    requireClientView(user, id);

    const db = await ensureDatabase();
    const [setting, account] = await Promise.all([
      db
        .prepare(
          "SELECT value FROM agency_settings WHERE key = 'google_ads_mcc_customer_id' LIMIT 1",
        )
        .first<{ value: string }>(),
      db
        .prepare(
          "SELECT customer_id as customerId FROM ppc_google_ads_accounts WHERE client_id = ? LIMIT 1",
        )
        .bind(id)
        .first<{ customerId: string }>(),
    ]);

    if (!setting?.value || !account?.customerId) {
      return NextResponse.json(
        {
          error: "Cadastre o MCC da AUDE e a conta Google Ads deste cliente.",
          code: "configuration_required",
        },
        { status: 409 },
      );
    }

    const url = new URL(request.url);
    const performance = await fetchGoogleAdsPerformance({
      managerCustomerId: setting.value,
      customerId: account.customerId,
      days: period(url.searchParams.get("days")),
    });

    await db
      .prepare(
        `UPDATE ppc_google_ads_accounts
         SET account_name = ?,
             status = 'connected',
             currency_code = ?,
             time_zone = ?,
             linked_at = COALESCE(linked_at, CURRENT_TIMESTAMP),
             last_synced_at = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE client_id = ?`,
      )
      .bind(
        performance.accountName || null,
        performance.currencyCode,
        performance.timeZone,
        performance.syncedAt,
        id,
      )
      .run();

    return NextResponse.json({ connected: true, mode: "read_only", ...performance });
  } catch (error) {
    if (error instanceof GoogleAdsConfigurationError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }
    return accessErrorResponse(
      error,
      "Não foi possível consultar a performance do Google Ads.",
    );
  }
}
