import { ensureDatabase } from "@/db/runtime";
import {
  accessErrorResponse,
  requireAppUser,
  requireContentManagement,
} from "@/lib/access";

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

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; postId: string }> },
) {
  try {
    const { id, postId } = await context.params;
    const currentUser = await requireAppUser(request);
    requireContentManagement(currentUser, id);
    const payload = (await request.json()) as {
      title?: string;
      caption?: string;
      scheduledAt?: string;
      status?: string;
      format?: string;
      channels?: string[];
    };

    if (!payload.status || !statuses.has(payload.status)) {
      return Response.json({ error: "Etapa inválida." }, { status: 400 });
    }

    const db = await ensureDatabase();
    const hasFullPost = payload.title != null;
    let result;

    if (hasFullPost) {
      const title = payload.title?.trim() ?? "";
      const scheduledAt = new Date(payload.scheduledAt ?? "");
      const format = payload.format ?? "";
      const selectedChannels = (payload.channels ?? []).filter((channel) =>
        channels.has(channel),
      );

      if (
        !title ||
        Number.isNaN(scheduledAt.getTime()) ||
        !formats.has(format) ||
        !selectedChannels.length
      ) {
        return Response.json(
          { error: "Revise o título, a data, o formato e os canais." },
          { status: 400 },
        );
      }

      result = await db
        .prepare(`
          UPDATE social_posts
          SET title = ?, caption = ?, scheduled_at = ?, status = ?,
              format = ?, channels = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND client_id = ?
        `)
        .bind(
          title,
          payload.caption?.trim() ?? "",
          scheduledAt.toISOString(),
          payload.status,
          format,
          JSON.stringify(selectedChannels),
          postId,
          id,
        )
        .run();
    } else {
      result = await db
        .prepare(`
          UPDATE social_posts
          SET status = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND client_id = ?
        `)
        .bind(payload.status, postId, id)
        .run();
    }

    if (!result.meta.changes) {
      return Response.json({ error: "Conteúdo não encontrado." }, { status: 404 });
    }

    const updated = await db
      .prepare(`
        SELECT id, title, caption, scheduled_at, status, format, channels
        FROM social_posts
        WHERE id = ? AND client_id = ?
      `)
      .bind(postId, id)
      .first<PostRow>();

    return Response.json({ ok: true, post: updated ? mapPost(updated) : null });
  } catch (error) {
    return accessErrorResponse(error, "Não foi possível atualizar o conteúdo.");
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string; postId: string }> },
) {
  try {
    const { id, postId } = await context.params;
    const currentUser = await requireAppUser(request);
    requireContentManagement(currentUser, id);
    const db = await ensureDatabase();
    const result = await db
      .prepare("DELETE FROM social_posts WHERE id = ? AND client_id = ?")
      .bind(postId, id)
      .run();

    if (!result.meta.changes) {
      return Response.json({ error: "Conteúdo não encontrado." }, { status: 404 });
    }

    return Response.json({ ok: true });
  } catch (error) {
    return accessErrorResponse(error, "Não foi possível excluir o conteúdo.");
  }
}
