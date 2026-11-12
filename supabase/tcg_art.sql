-- Party Hub · Trône des Mondes : illustrations de cartes partagées entre amis.
-- À coller UNE FOIS dans Supabase > SQL Editor > New query > Run. Sans danger si on le relance.
-- Sans cette table, les illustrations choisies restent seulement sur le téléphone qui les a ajoutées.

create table if not exists public.tcg_art (
  card_id    text primary key check (char_length(card_id) between 3 and 60),
  img        text not null check (char_length(img) < 400000 and img ~ '^data:image/(jpeg|webp|png);base64,'),  -- image au format carte (~40 Ko)
  by_user    uuid default auth.uid() references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.tcg_art enable row level security;

-- Tout le monde voit les illustrations ; seuls les joueurs connectés à un compte peuvent en ajouter, changer ou retirer.
drop policy if exists "art : lire"      on public.tcg_art;
drop policy if exists "art : ajouter"   on public.tcg_art;
drop policy if exists "art : modifier"  on public.tcg_art;
drop policy if exists "art : retirer"   on public.tcg_art;
create policy "art : lire"     on public.tcg_art for select using (true);
create policy "art : ajouter"  on public.tcg_art for insert to authenticated with check (true);
create policy "art : modifier" on public.tcg_art for update to authenticated using (true) with check (true);
create policy "art : retirer"  on public.tcg_art for delete to authenticated using (true);
