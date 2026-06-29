-- ── profiles ──────────────────────────────────────────────────────────────────
create table if not exists profiles (
  id            uuid references auth.users on delete cascade primary key,
  username      text unique,
  bio           text,
  avatar_url    text,
  bg_id         text,
  custom_bg_url text,
  font_id       text,
  accent_color  text    default '#ffffff',
  animation_type text   default 'none',
  profile_song  jsonb,
  top8          jsonb   default '[]',
  created_at    timestamptz default now()
);

-- auto-create a profile row when a new user signs up
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id) values (new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ── posts ──────────────────────────────────────────────────────────────────────
create table if not exists posts (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid references profiles(id) on delete cascade not null,
  type       text check (type in ('image','video','text')) not null,
  uri        text,
  text       text,
  date       text,
  position   integer default 0,
  created_at timestamptz default now()
);

-- ── friendships ───────────────────────────────────────────────────────────────
create table if not exists friendships (
  id           uuid default gen_random_uuid() primary key,
  requester_id uuid references profiles(id) on delete cascade not null,
  addressee_id uuid references profiles(id) on delete cascade not null,
  status       text check (status in ('pending','accepted')) default 'pending',
  created_at   timestamptz default now(),
  unique(requester_id, addressee_id)
);

-- ── helper: shift post positions down when inserting at top ──────────────────
create or replace function increment_post_positions(uid uuid)
returns void language plpgsql security definer as $$
begin
  update posts set position = position + 1 where user_id = uid;
end;
$$;

-- ── Row Level Security ────────────────────────────────────────────────────────
alter table profiles    enable row level security;
alter table posts       enable row level security;
alter table friendships enable row level security;

-- profiles: anyone can read, only owner can update
create policy "profiles_select" on profiles for select using (true);
create policy "profiles_insert" on profiles for insert with check (auth.uid() = id);
create policy "profiles_update" on profiles for update using (auth.uid() = id);

-- posts: anyone can read, only owner can write
create policy "posts_select" on posts for select using (true);
create policy "posts_insert" on posts for insert with check (auth.uid() = user_id);
create policy "posts_update" on posts for update using (auth.uid() = user_id);
create policy "posts_delete" on posts for delete using (auth.uid() = user_id);

-- friendships: users can see their own, insert new ones, update their own
create policy "friendships_select" on friendships for select
  using (auth.uid() = requester_id or auth.uid() = addressee_id);
create policy "friendships_insert" on friendships for insert
  with check (auth.uid() = requester_id);
create policy "friendships_update" on friendships for update
  using (auth.uid() = addressee_id);
create policy "friendships_delete" on friendships for delete
  using (auth.uid() = requester_id or auth.uid() = addressee_id);
