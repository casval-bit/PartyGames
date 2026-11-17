-- Heavy is the Crown : les amis (carte de joueur publique, demandes et amitiés).
-- À coller UNE FOIS dans Supabase > SQL Editor > New query > Run. Sans danger si on le relance.
-- La présence en ligne et les invitations passent par Realtime (canal « tcg-online ») : rien à créer pour elles.

-- Carte de joueur : ce que les autres voient (pseudo, code ami, photo, cadre, bannière, niveau). Jamais l'adresse e-mail.
create table if not exists public.tcg_players (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  code       text        not null unique check (code ~ '^[A-Z0-9]{6,10}$'),
  pseudo     text        not null default '' check (char_length(pseudo) <= 16),
  look       jsonb       not null default '{}'::jsonb check (pg_column_size(look) < 1000),
  seen_at    timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.tcg_players enable row level security;
drop policy if exists "joueurs : lire (connecté)" on public.tcg_players;
drop policy if exists "joueurs : créer le sien"   on public.tcg_players;
drop policy if exists "joueurs : modifier le sien" on public.tcg_players;
-- tout joueur connecté peut chercher les autres (par pseudo ou code ami) ; chacun ne crée et ne modifie que la sienne
create policy "joueurs : lire (connecté)"   on public.tcg_players for select to authenticated using (true);
create policy "joueurs : créer le sien"     on public.tcg_players for insert to authenticated with check (auth.uid() = user_id);
create policy "joueurs : modifier le sien"  on public.tcg_players for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Amitiés : a demande, b reçoit ; « pending » jusqu'à ce que b accepte. Une seule ligne par paire de joueurs.
create table if not exists public.tcg_friends (
  a          uuid        not null references auth.users (id) on delete cascade,
  b          uuid        not null references auth.users (id) on delete cascade,
  status     text        not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  primary key (a, b),
  check (a <> b)
);
create unique index if not exists tcg_friends_paire on public.tcg_friends (least(a, b), greatest(a, b));
alter table public.tcg_friends enable row level security;
drop policy if exists "amis : voir les siens" on public.tcg_friends;
drop policy if exists "amis : demander"      on public.tcg_friends;
drop policy if exists "amis : accepter"      on public.tcg_friends;
drop policy if exists "amis : retirer"       on public.tcg_friends;
create policy "amis : voir les siens" on public.tcg_friends for select to authenticated using (auth.uid() = a or auth.uid() = b);
create policy "amis : demander"       on public.tcg_friends for insert to authenticated with check (auth.uid() = a and status = 'pending');
create policy "amis : accepter"       on public.tcg_friends for update to authenticated using (auth.uid() = b) with check (auth.uid() = b and status = 'accepted');
create policy "amis : retirer"        on public.tcg_friends for delete to authenticated using (auth.uid() = a or auth.uid() = b);
