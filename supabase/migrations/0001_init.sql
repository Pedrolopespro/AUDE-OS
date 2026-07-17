-- AUDE OS — MVP 0.1 — schema inicial
-- Inclui tabelas ativas do MVP + tabelas schema-only das fases futuras
-- (agencia, contrato, fatura, setor, squad, tarefa, historico).

-- ============================================================
-- AGENCIA (raiz multi-tenant — hoje uma linha só: AUDE)
-- ============================================================
create table public.agencia (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  plano text not null default 'interno',
  dominio text,
  created_at timestamptz not null default now()
);

insert into public.agencia (nome) values ('AUDE');

-- ============================================================
-- USUARIO (espelho de auth.users com papel)
-- ============================================================
create type public.papel_usuario as enum ('administrador', 'guardiao', 'cliente');

create table public.usuario (
  id uuid primary key references auth.users (id) on delete cascade,
  agencia_id uuid not null references public.agencia (id),
  nome text,
  email text not null unique,
  papel public.papel_usuario not null default 'cliente',
  created_at timestamptz not null default now()
);

-- ============================================================
-- CLIENTE
-- ============================================================
create table public.cliente (
  id uuid primary key default gen_random_uuid(),
  agencia_id uuid not null references public.agencia (id),
  nome text not null,
  segmento text,
  site text,
  status text not null default 'ativo'
    check (status in ('ativo', 'pausado', 'critico', 'encerrado')),
  -- responsável humano; null => responsabilidade do Agente Supervisor (fase 6)
  guardiao_id uuid references public.usuario (id),
  convite_email text,
  convite_status text not null default 'pendente'
    check (convite_status in ('pendente', 'enviado', 'aceito')),
  created_at timestamptz not null default now()
);

-- ============================================================
-- WORKSPACE (1:1 com cliente)
-- ============================================================
create table public.workspace (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null unique references public.cliente (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- vínculo usuário <-> workspace (guardião atende N, cliente vê só o seu)
create table public.usuario_workspace (
  usuario_id uuid not null references public.usuario (id) on delete cascade,
  workspace_id uuid not null references public.workspace (id) on delete cascade,
  primary key (usuario_id, workspace_id)
);

-- ============================================================
-- CONEXAO (adapters: google nativo | metricool)
-- ============================================================
create table public.conexao (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspace (id) on delete cascade,
  provedor text not null
    check (provedor in ('google_search_console', 'google_ga4', 'google_ads', 'metricool')),
  canal text
    check (canal in ('instagram', 'linkedin', 'meta_ads', 'google_maps')),
  status text not null default 'nao_conectado'
    check (status in ('conectado', 'expirado', 'erro', 'nao_conectado')),
  -- URL do site (GSC) ou property id (GA4)
  propriedade text,
  propriedade_nome text,
  -- refresh token cifrado (AES-256-GCM na aplicação); nunca exposto ao papel cliente
  credencial_cifrada text,
  conectado_por uuid references public.usuario (id),
  conectado_em timestamptz,
  atualizado_em timestamptz not null default now(),
  unique nulls not distinct (workspace_id, provedor, canal)
);

-- ============================================================
-- SNAPSHOT (card de resumo MVP; base de status calculado e elo tarefa↔resultado)
-- ============================================================
create table public.snapshot (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspace (id) on delete cascade,
  fonte text not null
    check (fonte in ('google_search_console', 'google_ga4', 'metricool')),
  metrica text not null,
  valor numeric not null,
  detalhe jsonb,
  data date not null default current_date,
  created_at timestamptz not null default now()
);

create index snapshot_workspace_data_idx on public.snapshot (workspace_id, fonte, metrica, data desc);

-- ============================================================
-- HISTORICO (timeline de eventos do workspace — auditoria simples)
-- ============================================================
create table public.historico (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspace (id) on delete cascade,
  evento text not null,
  detalhe jsonb,
  usuario_id uuid references public.usuario (id),
  created_at timestamptz not null default now()
);

-- ============================================================
-- SCHEMA-ONLY (fases futuras — sem tela, sem lógica no MVP)
-- ============================================================

-- financeiro
create table public.contrato (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null unique references public.cliente (id) on delete cascade,
  valor_mensal numeric,
  ciclo_cobranca text default 'mensal',
  status text not null default 'ativo' check (status in ('ativo', 'atrasado', 'cancelado')),
  data_inicio date,
  created_at timestamptz not null default now()
);

create table public.fatura (
  id uuid primary key default gen_random_uuid(),
  contrato_id uuid not null references public.contrato (id) on delete cascade,
  competencia date not null,
  valor numeric,
  status text not null default 'pendente' check (status in ('pendente', 'pago', 'atrasado')),
  created_at timestamptz not null default now()
);

-- setores & orquestração (fase 6 — Ruflo como serviço externo consumindo a fila)
create table public.setor (
  id uuid primary key default gen_random_uuid(),
  agencia_id uuid not null references public.agencia (id),
  nome text not null,
  responsavel_id uuid references public.usuario (id),
  created_at timestamptz not null default now()
);

create table public.squad (
  id uuid primary key default gen_random_uuid(),
  setor_id uuid not null references public.setor (id) on delete cascade,
  especialidade text not null,
  ferramenta text,
  status text not null default 'ativo' check (status in ('ativo', 'ocioso')),
  created_at timestamptz not null default now()
);

create table public.tarefa (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspace (id) on delete cascade,
  setor_id uuid references public.setor (id),
  squad_id uuid references public.squad (id),
  descricao text not null,
  status text not null default 'fila' check (status in ('fila', 'em_execucao', 'concluida', 'erro')),
  origem text not null default 'guardiao' check (origem in ('guardiao', 'automatico')),
  log_execucao jsonb,
  snapshot_antes_id uuid references public.snapshot (id),
  snapshot_depois_id uuid references public.snapshot (id),
  created_at timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- ============================================================
-- TRIGGER: cria usuario ao registrar no auth
--   1º usuário do sistema => administrador
--   e-mail convidado em cliente => papel cliente + vínculo com o workspace
--   demais => guardiao
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_agencia uuid;
  v_cliente record;
  v_papel public.papel_usuario;
  v_workspace uuid;
begin
  select id into v_agencia from public.agencia limit 1;

  select c.*, w.id as ws_id into v_cliente
  from public.cliente c
  join public.workspace w on w.cliente_id = c.id
  where lower(c.convite_email) = lower(new.email)
  limit 1;

  if v_cliente.id is not null then
    v_papel := 'cliente';
  elsif not exists (select 1 from public.usuario) then
    v_papel := 'administrador';
  else
    v_papel := 'guardiao';
  end if;

  insert into public.usuario (id, agencia_id, nome, email, papel)
  values (new.id, v_agencia, new.raw_user_meta_data ->> 'full_name', new.email, v_papel);

  if v_cliente.id is not null then
    insert into public.usuario_workspace (usuario_id, workspace_id)
    values (new.id, v_cliente.ws_id)
    on conflict do nothing;

    update public.cliente set convite_status = 'aceito' where id = v_cliente.id;
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- RLS
-- ============================================================
alter table public.agencia enable row level security;
alter table public.usuario enable row level security;
alter table public.cliente enable row level security;
alter table public.workspace enable row level security;
alter table public.usuario_workspace enable row level security;
alter table public.conexao enable row level security;
alter table public.snapshot enable row level security;
alter table public.historico enable row level security;
alter table public.contrato enable row level security;
alter table public.fatura enable row level security;
alter table public.setor enable row level security;
alter table public.squad enable row level security;
alter table public.tarefa enable row level security;

-- helpers
create or replace function public.papel_atual()
returns public.papel_usuario
language sql stable security definer set search_path = public
as $$ select papel from public.usuario where id = auth.uid() $$;

create or replace function public.eh_staff()
returns boolean
language sql stable security definer set search_path = public
as $$ select public.papel_atual() in ('administrador', 'guardiao') $$;

create or replace function public.meus_workspaces()
returns setof uuid
language sql stable security definer set search_path = public
as $$ select workspace_id from public.usuario_workspace where usuario_id = auth.uid() $$;

-- agencia: staff lê
create policy agencia_select on public.agencia for select to authenticated
  using (public.eh_staff());

-- usuario: cada um lê o próprio; staff lê todos
create policy usuario_select on public.usuario for select to authenticated
  using (id = auth.uid() or public.eh_staff());

-- cliente: staff tudo; cliente lê o próprio (via workspace vinculado)
create policy cliente_staff_all on public.cliente for all to authenticated
  using (public.eh_staff()) with check (public.eh_staff());
create policy cliente_self_select on public.cliente for select to authenticated
  using (id in (select w.cliente_id from public.workspace w where w.id in (select public.meus_workspaces())));

-- workspace: staff tudo; cliente lê o seu
create policy workspace_staff_all on public.workspace for all to authenticated
  using (public.eh_staff()) with check (public.eh_staff());
create policy workspace_self_select on public.workspace for select to authenticated
  using (id in (select public.meus_workspaces()));

-- usuario_workspace: staff tudo; usuário lê os próprios vínculos
create policy uw_staff_all on public.usuario_workspace for all to authenticated
  using (public.eh_staff()) with check (public.eh_staff());
create policy uw_self_select on public.usuario_workspace for select to authenticated
  using (usuario_id = auth.uid());

-- conexao: staff tudo; cliente lê status do seu workspace
create policy conexao_staff_all on public.conexao for all to authenticated
  using (public.eh_staff()) with check (public.eh_staff());
create policy conexao_self_select on public.conexao for select to authenticated
  using (workspace_id in (select public.meus_workspaces()));

-- credencial cifrada: nenhum papel do app lê a coluna (só service role)
revoke select on public.conexao from authenticated;
grant select (id, workspace_id, provedor, canal, status, propriedade, propriedade_nome, conectado_em, atualizado_em)
  on public.conexao to authenticated;

-- snapshot / historico: staff tudo; cliente lê do seu workspace
create policy snapshot_staff_all on public.snapshot for all to authenticated
  using (public.eh_staff()) with check (public.eh_staff());
create policy snapshot_self_select on public.snapshot for select to authenticated
  using (workspace_id in (select public.meus_workspaces()));

create policy historico_staff_all on public.historico for all to authenticated
  using (public.eh_staff()) with check (public.eh_staff());
create policy historico_self_select on public.historico for select to authenticated
  using (workspace_id in (select public.meus_workspaces()));

-- schema-only: staff only (sem tela no MVP, mas RLS já correta)
create policy contrato_staff_all on public.contrato for all to authenticated
  using (public.eh_staff()) with check (public.eh_staff());
create policy fatura_staff_all on public.fatura for all to authenticated
  using (public.eh_staff()) with check (public.eh_staff());
create policy setor_staff_all on public.setor for all to authenticated
  using (public.eh_staff()) with check (public.eh_staff());
create policy squad_staff_all on public.squad for all to authenticated
  using (public.eh_staff()) with check (public.eh_staff());
create policy tarefa_staff_all on public.tarefa for all to authenticated
  using (public.eh_staff()) with check (public.eh_staff());
