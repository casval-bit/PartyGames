-- Party Hub : table des profils (niveau, stats, avatar) liés aux comptes e-mail.
-- À coller UNE FOIS dans Supabase > SQL Editor > New query > Run. Sans danger si on le relance.

create table if not exists public.profiles (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb       not null,                 -- le profil : { look, xp, stats, ach, history, seen }
  pseudo     text        not null default '',
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Chacun ne voit et ne modifie QUE sa propre ligne (auth.uid() = le compte connecté).
drop policy if exists "profil : lire le sien"        on public.profiles;
drop policy if exists "profil : créer le sien"       on public.profiles;
drop policy if exists "profil : modifier le sien"    on public.profiles;
create policy "profil : lire le sien"     on public.profiles for select using (auth.uid() = user_id);
create policy "profil : créer le sien"    on public.profiles for insert with check (auth.uid() = user_id);
create policy "profil : modifier le sien" on public.profiles for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- (pas de policy « delete » : l'appli ne supprime jamais de profil ; la ligne disparaît si le compte est supprimé)
