import { ensureDatabase } from "@/db/runtime";

const statuses = new Set([
  "draft",
  "production",
  "review",
  "approved",
  "scheduled",
  "published",
]);
const formats = new Set(["feed", "carousel", "reel", "story"]);
const channels = new Set(["instagram", "facebook", "linkedin"]);

type PostRow = {
  id: string;
  title: string;
  caption: string;
  scheduled_at: string;
  status: string;
  format: string;
  channels: string;
};

function mapPost(row: PostRow) {
  return {
    id: row.id,
    title: row.title,
    caption: row.caption,
    scheduledAt: row.scheduled_at,
    status: row.status,
    format: row.format,
    channels: JSON.parse(row.channels) as string[],
  };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const db = await ensureDatabase();
    const result = await db
      .prepare(`
        SELECT id, title, caption, scheduled_at, status, format, channels
        FROM social_posts
        WHERE client_id = ?
        ORDER BY scheduled_at ASC
      `)
      .bind(id)
      .all<PostRow>();

    return Response.json({ posts: (result.results ?? []).map(mapPost) });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível carregar o calendário.",
      },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id: clientId } = await context.params;
    const payload = (await request.json()) as {
      title?: string;
      caption?: string;
      scheduledAt?: string;
      status?: string;
      format?: string;
      channels?: string[];
    };

    const title = payload.title?.trim() ?? "";
    const scheduledAt = new Date(payload.scheduledAt ?? "");
    const status = payload.status ?? "draft";
    const format = payload.format ?? "feed";
    const selectedChannels = (payload.channels ?? []).filter((channel) =>
      channels.has(channel),
    );

    if (!title) {
      return Response.json({ error: "Informe o título do conteúdo." }, { status: 400 });
    }
    if (Number.isNaN(scheduledAt.getTime())) {
      return Response.json({ error: "Informe uma data válida." }, { status: 400 });
    }
    if (!statuses.has(status) || !formats.has(format) || !selectedChannels.length) {
      return Response.json(
        { error: "Formato, etapa ou canal inválido." },
        { status: 400 },
      );
    }

    const db = await ensureDatabase();
    const client = await db
      .prepare("SELECT id FROM clients WHERE id = ? LIMIT 1")
      .bind(clientId)
      .first<{ id: string }>();
    if (!client) {
      return Response.json({ error: "Cliente não encontrado." }, { status: 404 });
    }

    const post = {
      id: crypto.randomUUID(),
      title,
      caption: payload.caption?.trim() ?? "",
      scheduledAt: scheduledAt.toISOString(),
      status,
      format,
      channels: selectedChannels,
    };

    await db
      .prepare(`
        INSERT INTO social_posts
          (id, client_id, title, caption, scheduled_at, status, format, channels)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        post.id,
        clientId,
        post.title,
        post.caption,
        post.scheduledAt,
        post.status,
        post.format,
        JSON.stringify(post.channels),
      )
      .run();

    return Response.json({ post }, { status: 201 });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível criar o conteúdo.",
      },
      { status: 500 },
    );
  }
}
