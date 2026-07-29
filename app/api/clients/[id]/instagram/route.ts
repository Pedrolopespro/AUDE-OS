import { connectorRequest } from "@/lib/connector";

async function proxy(
  method: "GET" | "POST" | "DELETE",
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const response = await connectorRequest(
      `/api/internal/clients/${encodeURIComponent(id)}/instagram`,
      { method },
    );
    const data = await response.json();
    return Response.json(data, { status: response.status });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "O portal de conexão não respondeu.",
      },
      { status: 502 },
    );
  }
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return proxy("GET", context);
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return proxy("POST", context);
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return proxy("DELETE", context);
}
