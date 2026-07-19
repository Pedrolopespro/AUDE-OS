-- Fase de operação: tabelas projeto e conhecimento (abas do Workspace)

create table public.projeto (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspace (id) on delete cascade,
  nome text not null,
  tipo text not null default 'campanha' check (tipo in ('funil', 'campanha', 'site', 'outro')),
  status text not null default 'ativo' check (status in ('ativo', 'pausado', 'concluido')),
  descricao text,
  created_at timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table public.conhecimento (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspace (id) on delete cascade,
  titulo text not null,
  tipo text not null default 'briefing' check (tipo in ('briefing', 'acesso', 'decisao', 'outro')),
  conteudo text,
  criado_por uuid references public.usuario (id),
  created_at timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

alter table public.projeto enable row level security;
alter table public.conhecimento enable row level security;

-- staff opera; cliente lê o próprio workspace
create policy projeto_staff_all on public.projeto for all to authenticated
  using (public.eh_staff()) with check (public.eh_staff());
create policy projeto_self_select on public.projeto for select to authenticated
  using (workspace_id in (select public.meus_workspaces()));

create policy conhecimento_staff_all on public.conhecimento for all to authenticated
  using (public.eh_staff()) with check (public.eh_staff());
create policy conhecimento_self_select on public.conhecimento for select to authenticated
  using (workspace_id in (select public.meus_workspaces()));
