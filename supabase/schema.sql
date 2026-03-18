-- Users profile (extends Clerk auth)
create table if not exists profiles (
  id text primary key, -- Clerk user ID
  username text unique not null,
  name text,
  avatar_url text,
  bio text,
  birthday date,
  created_at timestamp with time zone default now()
);

-- Hints (the core content — things people want, need, are into)
create table if not exists hints (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references profiles(id) on delete cascade,
  content text not null,
  category text default 'general', -- general, want, need, dream, avoid
  created_at timestamp with time zone default now()
);

-- Follows
create table if not exists follows (
  follower_id text not null references profiles(id) on delete cascade,
  following_id text not null references profiles(id) on delete cascade,
  created_at timestamp with time zone default now(),
  primary key (follower_id, following_id)
);

-- Gift claims (buyer claims a recommendation so others don't duplicate)
create table if not exists claims (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id text not null references profiles(id) on delete cascade,
  gift_description text not null,
  claimer_session text not null,
  occasion text,
  created_at timestamp with time zone default now()
);

-- Profile visits (for "someone just visited your profile" notifications)
create table if not exists profile_visits (
  id uuid primary key default gen_random_uuid(),
  profile_user_id text not null references profiles(id) on delete cascade,
  visitor_session text not null,
  created_at timestamp with time zone default now()
);

-- RLS Policies
alter table profiles enable row level security;
alter table hints enable row level security;
alter table follows enable row level security;
alter table claims enable row level security;
alter table profile_visits enable row level security;

-- Profiles: anyone can read, only owner can write
create policy "Public profiles are viewable by everyone" on profiles for select using (true);
create policy "Users can insert their own profile" on profiles for insert with check (auth.uid()::text = id);
create policy "Users can update their own profile" on profiles for update using (auth.uid()::text = id);

-- Hints: anyone can read, only owner can write
create policy "Hints are viewable by everyone" on hints for select using (true);
create policy "Users can insert their own hints" on hints for insert with check (auth.uid()::text = user_id);
create policy "Users can delete their own hints" on hints for delete using (auth.uid()::text = user_id);

-- Follows: anyone can read
create policy "Follows are viewable by everyone" on follows for select using (true);
create policy "Users can follow others" on follows for insert with check (auth.uid()::text = follower_id);
create policy "Users can unfollow" on follows for delete using (auth.uid()::text = follower_id);

-- Claims: anyone can read and insert
create policy "Claims are viewable by everyone" on claims for select using (true);
create policy "Anyone can claim" on claims for insert with check (true);

-- Visits: anyone can insert, owner can read
create policy "Anyone can record a visit" on profile_visits for insert with check (true);
create policy "Profile owner can see visits" on profile_visits for select using (auth.uid()::text = profile_user_id);
