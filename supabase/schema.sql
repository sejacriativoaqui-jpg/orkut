-- ============================================================
-- ORKUT — schema completo (tabelas + índices + triggers + RLS)
-- Rode este arquivo inteiro no SQL Editor do seu projeto Supabase.
-- ============================================================

create extension if not exists "uuid-ossp";

-- ------------------------------------------------------------
-- TABELAS
-- ------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  name text not null,
  email text not null,
  birthdate date not null,
  avatar_url text,
  cover_url text,
  city text default '',
  state text default '',
  country text default 'Brasil',
  status text default 'online' check (status in ('online','ausente','ocupado','invisivel')),
  bio text default '',
  quem_sou_eu text default '',
  interesses text default '',
  filmes text default '',
  musica text default '',
  livros text default '',
  esportes text default '',
  relacionamento text default '',
  profissao text default '',
  profile_complete boolean default false,
  is_admin boolean default false,
  is_suspended boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint username_format check (username ~ '^[a-z0-9_]{3,20}$')
);
create index idx_profiles_username on public.profiles(username);

create table public.user_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  perfil_publico boolean default true,
  permitir_solicitacoes boolean default true,
  permitir_recados boolean default true,
  mostrar_visitantes boolean default true,
  mostrar_nascimento boolean default true,
  mostrar_cidade boolean default true,
  mostrar_amigos boolean default true
);

create table public.friend_requests (
  id uuid primary key default uuid_generate_v4(),
  from_user uuid references public.profiles(id) on delete cascade,
  to_user uuid references public.profiles(id) on delete cascade,
  status text default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz default now(),
  unique (from_user, to_user)
);
create index idx_freq_to on public.friend_requests(to_user, status);
create index idx_freq_from on public.friend_requests(from_user, status);

create table public.friendships (
  id uuid primary key default uuid_generate_v4(),
  user_a uuid references public.profiles(id) on delete cascade,
  user_b uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique (user_a, user_b)
);
create index idx_friendships_a on public.friendships(user_a);
create index idx_friendships_b on public.friendships(user_b);

create table public.communities (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  name text not null,
  description text default '',
  image_url text,
  cover_url text,
  category text default 'Geral',
  creator_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);
create index idx_communities_category on public.communities(category);

create table public.community_members (
  id uuid primary key default uuid_generate_v4(),
  community_id uuid references public.communities(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  joined_at timestamptz default now(),
  unique (community_id, user_id)
);
create index idx_commembers_community on public.community_members(community_id);
create index idx_commembers_user on public.community_members(user_id);

create table public.posts (
  id uuid primary key default uuid_generate_v4(),
  author_id uuid references public.profiles(id) on delete cascade,
  community_id uuid references public.communities(id) on delete cascade,
  title text,
  text text,
  image_url text,
  created_at timestamptz default now()
);
create index idx_posts_author on public.posts(author_id, created_at desc);
create index idx_posts_community on public.posts(community_id, created_at desc);

create table public.post_likes (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid references public.posts(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique (post_id, user_id)
);
create index idx_likes_post on public.post_likes(post_id);

create table public.comments (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid references public.posts(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete cascade,
  text text not null,
  created_at timestamptz default now()
);
create index idx_comments_post on public.comments(post_id, created_at);

create table public.scraps (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid references public.profiles(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete cascade,
  text text not null,
  created_at timestamptz default now()
);
create index idx_scraps_profile on public.scraps(profile_id, created_at desc);

create table public.testimonials (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid references public.profiles(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete cascade,
  text text not null,
  approved boolean default false,
  created_at timestamptz default now()
);
create index idx_testimonials_profile on public.testimonials(profile_id, created_at desc);

create table public.albums (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid references public.profiles(id) on delete cascade,
  name text not null,
  description text default '',
  cover_url text,
  privacy text default 'public' check (privacy in ('public','friends','private')),
  created_at timestamptz default now()
);

create table public.photos (
  id uuid primary key default uuid_generate_v4(),
  album_id uuid references public.albums(id) on delete cascade,
  owner_id uuid references public.profiles(id) on delete cascade,
  url text not null,
  created_at timestamptz default now()
);
create index idx_photos_album on public.photos(album_id);

create table public.notifications (
  id uuid primary key default uuid_generate_v4(),
  recipient_id uuid references public.profiles(id) on delete cascade,
  type text not null,
  from_user_id uuid references public.profiles(id) on delete set null,
  text text not null,
  read boolean default false,
  created_at timestamptz default now()
);
create index idx_notifs_recipient on public.notifications(recipient_id, read, created_at desc);

create table public.profile_visits (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid references public.profiles(id) on delete cascade,
  visitor_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now()
);
create index idx_visits_profile on public.profile_visits(profile_id, created_at desc);

create table public.blocks (
  id uuid primary key default uuid_generate_v4(),
  blocker_id uuid references public.profiles(id) on delete cascade,
  blocked_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique (blocker_id, blocked_id)
);

create table public.reports (
  id uuid primary key default uuid_generate_v4(),
  reporter_id uuid references public.profiles(id) on delete set null,
  target_type text not null,
  target_id text,
  target_label text,
  reason text not null,
  detail text,
  resolved boolean default false,
  created_at timestamptz default now()
);

create table public.daily_quotes (
  id serial primary key,
  text text not null
);

-- ------------------------------------------------------------
-- FUNÇÃO AUXILIAR: is_admin()
-- ------------------------------------------------------------
create or replace function public.is_admin()
returns boolean language sql stable security definer as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- ------------------------------------------------------------
-- FUNÇÃO AUXILIAR: is_blocked() — bypassa RLS da tabela blocks
-- (necessário porque um usuário não enxerga, via RLS normal, as
-- linhas de "blocks" em que ELE é o bloqueado, só as que ele criou)
-- ------------------------------------------------------------
create or replace function public.is_blocked(a uuid, b uuid)
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  );
$$;

grant execute on function public.is_blocked(uuid, uuid) to authenticated;

-- ------------------------------------------------------------
-- FUNÇÃO PÚBLICA: checar username disponível (para o form de cadastro)
-- ------------------------------------------------------------
create or replace function public.is_username_available(u text)
returns boolean language sql stable security definer as $$
  select not exists (select 1 from public.profiles where username = lower(u));
$$;
grant execute on function public.is_username_available(text) to anon, authenticated;

-- ------------------------------------------------------------
-- TRIGGER: criar profile automaticamente ao cadastrar (auth.users)
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  v_birthdate date;
  v_age int;
  v_is_first boolean;
begin
  v_birthdate := (new.raw_user_meta_data->>'birthdate')::date;
  v_age := extract(year from age(v_birthdate));
  if v_birthdate is null or v_age < 18 then
    raise exception 'É preciso ter 18 anos ou mais para se cadastrar.';
  end if;

  select (count(*) = 0) into v_is_first from public.profiles;

  insert into public.profiles (id, username, name, email, birthdate, is_admin)
  values (
    new.id,
    lower(new.raw_user_meta_data->>'username'),
    new.raw_user_meta_data->>'name',
    new.email,
    v_birthdate,
    v_is_first
  );

  insert into public.user_settings (user_id) values (new.id);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- TRIGGERS: notificações + amizade automática
-- ------------------------------------------------------------

create or replace function public.notify(p_recipient uuid, p_type text, p_from uuid, p_text text)
returns void language plpgsql security definer as $$
begin
  if p_recipient is null or p_recipient = p_from then return; end if;
  insert into public.notifications (recipient_id, type, from_user_id, text)
  values (p_recipient, p_type, p_from, p_text);
end;
$$;

create or replace function public.trg_friend_request_insert()
returns trigger language plpgsql security definer as $$
begin
  perform public.notify(new.to_user, 'friend_request', new.from_user,
    (select name from public.profiles where id = new.from_user) || ' enviou uma solicitação de amizade.');
  return new;
end;
$$;
create trigger on_friend_request_insert
  after insert on public.friend_requests
  for each row execute function public.trg_friend_request_insert();

create or replace function public.trg_friend_request_accept()
returns trigger language plpgsql security definer as $$
begin
  if new.status = 'accepted' and old.status <> 'accepted' then
    insert into public.friendships (user_a, user_b)
    values (least(new.from_user, new.to_user), greatest(new.from_user, new.to_user))
    on conflict do nothing;
    perform public.notify(new.from_user, 'friend_accept', new.to_user,
      (select name from public.profiles where id = new.to_user) || ' aceitou sua solicitação de amizade!');
  end if;
  return new;
end;
$$;
create trigger on_friend_request_update
  after update on public.friend_requests
  for each row execute function public.trg_friend_request_accept();

create or replace function public.trg_scrap_insert()
returns trigger language plpgsql security definer as $$
begin
  perform public.notify(new.profile_id, 'scrap', new.author_id,
    (select name from public.profiles where id = new.author_id) || ' deixou um recado para você.');
  return new;
end;
$$;
create trigger on_scrap_insert after insert on public.scraps
  for each row execute function public.trg_scrap_insert();

create or replace function public.trg_testimonial_insert()
returns trigger language plpgsql security definer as $$
begin
  perform public.notify(new.profile_id, 'testimonial', new.author_id,
    (select name from public.profiles where id = new.author_id) || ' escreveu um depoimento para você.');
  return new;
end;
$$;
create trigger on_testimonial_insert after insert on public.testimonials
  for each row execute function public.trg_testimonial_insert();

create or replace function public.trg_testimonial_approve()
returns trigger language plpgsql security definer as $$
begin
  if new.approved = true and old.approved = false then
    perform public.notify(new.author_id, 'testimonial_approved', new.profile_id, 'Seu depoimento foi aprovado!');
  end if;
  return new;
end;
$$;
create trigger on_testimonial_update after update on public.testimonials
  for each row execute function public.trg_testimonial_approve();

create or replace function public.trg_like_insert()
returns trigger language plpgsql security definer as $$
declare v_author uuid;
begin
  select author_id into v_author from public.posts where id = new.post_id;
  perform public.notify(v_author, 'like', new.user_id,
    (select name from public.profiles where id = new.user_id) || ' curtiu seu post.');
  return new;
end;
$$;
create trigger on_like_insert after insert on public.post_likes
  for each row execute function public.trg_like_insert();

create or replace function public.trg_comment_insert()
returns trigger language plpgsql security definer as $$
declare v_author uuid;
begin
  select author_id into v_author from public.posts where id = new.post_id;
  perform public.notify(v_author, 'comment', new.author_id,
    (select name from public.profiles where id = new.author_id) || ' comentou no seu post.');
  return new;
end;
$$;
create trigger on_comment_insert after insert on public.comments
  for each row execute function public.trg_comment_insert();

-- unfriend automático + remoção de pedidos quando alguém bloqueia
create or replace function public.trg_block_insert()
returns trigger language plpgsql security definer as $$
begin
  delete from public.friendships
    where (user_a = new.blocker_id and user_b = new.blocked_id)
       or (user_a = new.blocked_id and user_b = new.blocker_id);
  delete from public.friend_requests
    where (from_user = new.blocker_id and to_user = new.blocked_id)
       or (from_user = new.blocked_id and to_user = new.blocker_id);
  return new;
end;
$$;
create trigger on_block_insert after insert on public.blocks
  for each row execute function public.trg_block_insert();

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.friend_requests enable row level security;
alter table public.friendships enable row level security;
alter table public.communities enable row level security;
alter table public.community_members enable row level security;
alter table public.posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.comments enable row level security;
alter table public.scraps enable row level security;
alter table public.testimonials enable row level security;
alter table public.albums enable row level security;
alter table public.photos enable row level security;
alter table public.notifications enable row level security;
alter table public.profile_visits enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;
alter table public.daily_quotes enable row level security;

-- profiles
create policy "profiles: leitura pública" on public.profiles for select using (true);
create policy "profiles: autoedição" on public.profiles for update using (auth.uid() = id);
create policy "profiles: admin edita qualquer perfil" on public.profiles for update using (public.is_admin());

-- IMPORTANTE: a policy de select acima é "using (true)" (necessário para permitir
-- que qualquer pessoa veja perfis públicos). Para não vazar e-mails de todo mundo
-- pela API pública, restringimos por COLUNA quais campos ficam visíveis:
revoke select on public.profiles from anon, authenticated;
grant select (
  id, username, name, birthdate, avatar_url, cover_url, city, state, country, status,
  bio, quem_sou_eu, interesses, filmes, musica, livros, esportes, relacionamento, profissao,
  profile_complete, is_admin, is_suspended, created_at, updated_at
) on public.profiles to anon, authenticated;
-- (a coluna "email" fica de fora do grant acima — de propósito.
--  o próprio usuário lê seu e-mail via supabase.auth (sessão), não pela tabela;
--  o admin lê e-mails via a função abaixo, que verifica is_admin() no servidor.)

create or replace function public.admin_list_profiles()
returns setof public.profiles language sql stable security definer as $$
  select * from public.profiles where (select public.is_admin());
$$;
grant execute on function public.admin_list_profiles() to authenticated;

-- user_settings
create policy "settings: leitura pública" on public.user_settings for select using (true);
create policy "settings: autoedição" on public.user_settings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- friend_requests
create policy "freq: ver os próprios" on public.friend_requests for select using (auth.uid() in (from_user, to_user));
create policy "freq: enviar" on public.friend_requests for insert with check (
  auth.uid() = from_user
  and not public.is_blocked(from_user, to_user)
);
create policy "freq: responder/cancelar" on public.friend_requests for update using (auth.uid() in (from_user, to_user));
create policy "freq: excluir" on public.friend_requests for delete using (auth.uid() in (from_user, to_user));

-- friendships (inserts só via trigger/SECURITY DEFINER)
create policy "friendships: leitura pública" on public.friendships for select using (true);
create policy "friendships: desfazer amizade" on public.friendships for delete using (auth.uid() in (user_a, user_b));

-- communities
create policy "communities: leitura pública" on public.communities for select using (true);
create policy "communities: criar" on public.communities for insert with check (auth.uid() = creator_id);
create policy "communities: editar/excluir" on public.communities for update using (auth.uid() = creator_id or public.is_admin());
create policy "communities: excluir" on public.communities for delete using (auth.uid() = creator_id or public.is_admin());

-- community_members
create policy "commembers: leitura pública" on public.community_members for select using (true);
create policy "commembers: entrar" on public.community_members for insert with check (auth.uid() = user_id);
create policy "commembers: sair" on public.community_members for delete using (auth.uid() = user_id or public.is_admin());

-- posts
create policy "posts: leitura pública" on public.posts for select using (true);
create policy "posts: criar" on public.posts for insert with check (
  auth.uid() = author_id
  and (community_id is null or exists (select 1 from public.community_members where community_id = posts.community_id and user_id = auth.uid()))
);
create policy "posts: excluir" on public.posts for delete using (auth.uid() = author_id or public.is_admin());

-- post_likes
create policy "likes: leitura pública" on public.post_likes for select using (true);
create policy "likes: curtir" on public.post_likes for insert with check (auth.uid() = user_id);
create policy "likes: descurtir" on public.post_likes for delete using (auth.uid() = user_id);

-- comments
create policy "comments: leitura pública" on public.comments for select using (true);
create policy "comments: comentar" on public.comments for insert with check (auth.uid() = author_id);
create policy "comments: excluir" on public.comments for delete using (auth.uid() = author_id or public.is_admin());

-- scraps
create policy "scraps: leitura pública" on public.scraps for select using (true);
create policy "scraps: publicar" on public.scraps for insert with check (
  auth.uid() = author_id
  and exists (select 1 from public.user_settings where user_id = scraps.profile_id and permitir_recados = true)
  and not public.is_blocked(profile_id, author_id)
);
create policy "scraps: excluir" on public.scraps for delete using (auth.uid() in (profile_id, author_id) or public.is_admin());

-- testimonials
create policy "testimonials: leitura pública" on public.testimonials for select using (true);
create policy "testimonials: escrever" on public.testimonials for insert with check (auth.uid() = author_id);
create policy "testimonials: aprovar (dono)" on public.testimonials for update using (auth.uid() = profile_id);
create policy "testimonials: excluir" on public.testimonials for delete using (auth.uid() in (profile_id, author_id) or public.is_admin());

-- albums / photos
create policy "albums: leitura pública" on public.albums for select using (true);
create policy "albums: gerenciar" on public.albums for all using (auth.uid() = owner_id or public.is_admin()) with check (auth.uid() = owner_id);
create policy "photos: leitura pública" on public.photos for select using (true);
create policy "photos: gerenciar" on public.photos for all using (auth.uid() = owner_id or public.is_admin()) with check (auth.uid() = owner_id);

-- notifications (insert só via trigger)
create policy "notifs: ver as próprias" on public.notifications for select using (auth.uid() = recipient_id);
create policy "notifs: marcar como lida" on public.notifications for update using (auth.uid() = recipient_id);

-- profile_visits
create policy "visits: dono ou visitante vê" on public.profile_visits for select using (auth.uid() in (profile_id, visitor_id) or public.is_admin());
create policy "visits: registrar visita" on public.profile_visits for insert with check (auth.uid() = visitor_id);

-- blocks
create policy "blocks: ver os próprios" on public.blocks for select using (auth.uid() = blocker_id);
create policy "blocks: bloquear" on public.blocks for insert with check (auth.uid() = blocker_id);
create policy "blocks: desbloquear" on public.blocks for delete using (auth.uid() = blocker_id);

-- reports
create policy "reports: criar" on public.reports for insert with check (auth.uid() = reporter_id);
create policy "reports: admin vê e resolve" on public.reports for select using (public.is_admin());
create policy "reports: admin resolve" on public.reports for update using (public.is_admin());

-- daily_quotes (leitura pública, sem escrita pelo cliente)
create policy "quotes: leitura pública" on public.daily_quotes for select using (true);
