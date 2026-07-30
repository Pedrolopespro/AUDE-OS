import { connectorJson } from "@/lib/connector";
import {
  accessErrorResponse,
  requireAppUser,
  requireClientView,
  requireContentManagement,
} from "@/lib/access";

async function proxy(
  method: "GET" | "POST" | "DELETE",
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const currentUser = await requireAppUser(request);
    if (method === "GET") requireClientView(currentUser, id);
    else requireContentManagement(currentUser, id);
    const { data, status } = await connectorJson<Record<string, unknown>>(
      `/api/internal/clients/${encodeURIComponent(id)}/instagram`,
      { method },
    );
    return Response.json(data, { status });
  } catch (error) {
    const response = accessErrorResponse(
      error,
      "O portal de conexão não respondeu.",
    );
    return response.status === 500
      ? Response.json(
          { error: "O portal de conexão não respondeu." },
          { status: 502 },
        )
      : response;
  }
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return proxy("GET", request, context);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return proxy("POST", request, context);
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return proxy("DELETE", request, context);
}
