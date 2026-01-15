-- Create profiles table
create table profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email_notify boolean default true,
  wechat_webhook text,
  notify_days integer[] default array[30, 7, 1]
);

alter table profiles enable row level security;
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);

-- Create assets table
create table assets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  type text not null, -- 'U-Key', 'CA', 'Domain', 'Server'
  expiry_date date not null,
  renewal_method text,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table assets enable row level security;
create policy "Users can view own assets" on assets for select using (auth.uid() = user_id);
create policy "Users can insert own assets" on assets for insert with check (auth.uid() = user_id);
create policy "Users can update own assets" on assets for update using (auth.uid() = user_id);
create policy "Users can delete own assets" on assets for delete using (auth.uid() = user_id);

-- Create a trigger to create a profile entry when a new user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
