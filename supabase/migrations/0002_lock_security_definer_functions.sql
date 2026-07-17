-- Advisors: SECURITY DEFINER functions não devem ser RPC público.
-- handle_new_user: só o trigger usa — ninguém executa via API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Helpers de RLS: precisam de EXECUTE para authenticated (policies rodam com
-- privilégio do usuário da query), mas não para anon.
-- Warning residual do linter para authenticated é aceito: as funções só
-- devolvem dados do próprio usuário logado (papel e workspaces próprios).
revoke execute on function public.papel_atual() from public, anon;
revoke execute on function public.eh_staff() from public, anon;
revoke execute on function public.meus_workspaces() from public, anon;
grant execute on function public.papel_atual() to authenticated;
grant execute on function public.eh_staff() to authenticated;
grant execute on function public.meus_workspaces() to authenticated;
