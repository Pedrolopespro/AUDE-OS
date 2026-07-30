import { connectorJson } from "@/lib/connector";
import {
  accessErrorResponse,
  requireAppUser,
  requireClientView,
} from "@/lib/access";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const currentUser = await requireAppUser(request);
    requireClientView(currentUser, id);
    const source = new URL(request.url);
    const query = new URLSearchParams();
    if (source.searchParams.has("days")) {
      query.set("days", source.searchParams.get("days") ?? "30");
    }
    if (source.searchParams.get("refresh") === "1") query.set("refresh", "1");
    const suffix = query.size ? `?${query.toString()}` : "";
    const { data, status } = await connectorJson<Record<string, unknown>>(
      `/api/internal/clients/${encodeURIComponent(id)}/instagram/insights${suffix}`,
      {
        signal: AbortSignal.timeout(30_000),
      },
    );
    return Response.json(data, { status });
  } catch (error) {
    const response = accessErrorResponse(
      error,
      "Não foi possível carregar os insights do Instagram.",
    );
    return response.status === 500
      ? Response.json(
          { error: "Não foi possível carregar os insights do Instagram." },
          { status: 502 },
        )
      : response;
  }
}
