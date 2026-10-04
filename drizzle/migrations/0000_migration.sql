
create type public.app_role as enum ('admin','moderator','user');
create type public.account_type as enum ('worker','employer');

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique,
  account_type public.account_type not null default 'worker',
  full_name text not null default '',
  headline text,
  trade text,
  city text,
  bio text,
  experience_years int default 0,
  daily_rate int,
  phone text,
  skills text[] not null default '{}',
  available boolean not null default true,
  verified boolean not null default false,
  company_name text,
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.profiles (trade);
create index on public.profiles (city);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null,
  unique (user_id, role)
);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id=_user_id and role=_role) $$;

create or replace function public.my_profile_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.profiles where user_id = auth.uid() limit 1 $$;

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  posted_by uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  company text,
  trade text not null,
  city text not null,
  description text not null,
  pay_min int, pay_max int,
  pay_unit text not null default 'day',
  job_type text not null default 'full_time',
  experience_min int default 0,
  skills text[] not null default '{}',
  status text not null default 'open',
  created_at timestamptz not null default now()
);
create index on public.jobs (trade); create index on public.jobs (city); create index on public.jobs (status);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  applicant_id uuid not null references public.profiles(id) on delete cascade,
  cover_note text,
  status text not null default 'submitted',
  created_at timestamptz not null default now(),
  unique (job_id, applicant_id)
);

create table public.tool_listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  category text not null,
  description text not null,
  city text not null,
  listing_type text not null default 'rent',
  price int not null,
  price_unit text not null default 'day',
  deposit int default 0,
  condition text default 'good',
  available boolean not null default true,
  created_at timestamptz not null default now()
);
create index on public.tool_listings (category); create index on public.tool_listings (city);

create table public.rentals (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.tool_listings(id) on delete cascade,
  renter_id uuid not null references public.profiles(id) on delete cascade,
  start_date date not null, end_date date not null,
  note text,
  status text not null default 'requested',
  created_at timestamptz not null default now()
);

create table public.communities (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text not null,
  trade text,
  created_at timestamptz not null default now()
);

create table public.community_members (
  community_id uuid not null references public.communities(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (community_id, profile_id)
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  created_at timestamptz not null default now()
);
create index on public.posts (community_id, created_at desc);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  primary key (post_id, profile_id)
);

create table public.saved_items (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  item_type text not null,
  item_id uuid not null,
  created_at timestamptz not null default now(),
  unique (profile_id, item_type, item_id)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text,
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  profile_a uuid not null references public.profiles(id) on delete cascade,
  profile_b uuid not null references public.profiles(id) on delete cascade,
  last_message_at timestamptz not null default now(),
  unique (profile_a, profile_b)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

-- grants
grant select on public.profiles, public.jobs, public.tool_listings, public.communities, public.community_members, public.posts, public.comments, public.post_likes to anon;
grant select, insert, update, delete on public.profiles, public.jobs, public.applications, public.tool_listings, public.rentals, public.communities, public.community_members, public.posts, public.comments, public.post_likes, public.saved_items, public.notifications, public.conversations, public.messages to authenticated;
grant select on public.user_roles to authenticated;
grant all on public.profiles, public.user_roles, public.jobs, public.applications, public.tool_listings, public.rentals, public.communities, public.community_members, public.posts, public.comments, public.post_likes, public.saved_items, public.notifications, public.conversations, public.messages to service_role;

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.jobs enable row level security;
alter table public.applications enable row level security;
alter table public.tool_listings enable row level security;
alter table public.rentals enable row level security;
alter table public.communities enable row level security;
alter table public.community_members enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.post_likes enable row level security;
alter table public.saved_items enable row level security;
alter table public.notifications enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

create policy "own roles" on public.user_roles for select to authenticated using (user_id = auth.uid());

create policy "profiles public" on public.profiles for select using (true);
create policy "profiles insert own" on public.profiles for insert to authenticated with check (user_id = auth.uid());
create policy "profiles update own" on public.profiles for update to authenticated using (user_id = auth.uid());

create policy "jobs public" on public.jobs for select using (true);
create policy "jobs insert" on public.jobs for insert to authenticated with check (posted_by = public.my_profile_id());
create policy "jobs update" on public.jobs for update to authenticated using (posted_by = public.my_profile_id() or public.has_role(auth.uid(),'admin'));
create policy "jobs delete" on public.jobs for delete to authenticated using (posted_by = public.my_profile_id() or public.has_role(auth.uid(),'admin'));

create policy "apps read" on public.applications for select to authenticated using (
  applicant_id = public.my_profile_id() or exists (select 1 from public.jobs j where j.id = job_id and j.posted_by = public.my_profile_id()));
create policy "apps insert" on public.applications for insert to authenticated with check (applicant_id = public.my_profile_id());
create policy "apps update" on public.applications for update to authenticated using (
  applicant_id = public.my_profile_id() or exists (select 1 from public.jobs j where j.id = job_id and j.posted_by = public.my_profile_id()));
create policy "apps delete" on public.applications for delete to authenticated using (applicant_id = public.my_profile_id());

create policy "listings public" on public.tool_listings for select using (true);
create policy "listings insert" on public.tool_listings for insert to authenticated with check (owner_id = public.my_profile_id());
create policy "listings update" on public.tool_listings for update to authenticated using (owner_id = public.my_profile_id());
create policy "listings delete" on public.tool_listings for delete to authenticated using (owner_id = public.my_profile_id() or public.has_role(auth.uid(),'admin'));

create policy "rentals read" on public.rentals for select to authenticated using (
  renter_id = public.my_profile_id() or exists (select 1 from public.tool_listings l where l.id = listing_id and l.owner_id = public.my_profile_id()));
create policy "rentals insert" on public.rentals for insert to authenticated with check (renter_id = public.my_profile_id());
create policy "rentals update" on public.rentals for update to authenticated using (
  renter_id = public.my_profile_id() or exists (select 1 from public.tool_listings l where l.id = listing_id and l.owner_id = public.my_profile_id()));

create policy "communities public" on public.communities for select using (true);
create policy "communities admin" on public.communities for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create policy "members public" on public.community_members for select using (true);
create policy "members join" on public.community_members for insert to authenticated with check (profile_id = public.my_profile_id());
create policy "members leave" on public.community_members for delete to authenticated using (profile_id = public.my_profile_id());

create policy "posts public" on public.posts for select using (true);
create policy "posts insert" on public.posts for insert to authenticated with check (author_id = public.my_profile_id());
create policy "posts update" on public.posts for update to authenticated using (author_id = public.my_profile_id());
create policy "posts delete" on public.posts for delete to authenticated using (author_id = public.my_profile_id() or public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'moderator'));

create policy "comments public" on public.comments for select using (true);
create policy "comments insert" on public.comments for insert to authenticated with check (author_id = public.my_profile_id());
create policy "comments delete" on public.comments for delete to authenticated using (author_id = public.my_profile_id() or public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'moderator'));

create policy "likes public" on public.post_likes for select using (true);
create policy "likes insert" on public.post_likes for insert to authenticated with check (profile_id = public.my_profile_id());
create policy "likes delete" on public.post_likes for delete to authenticated using (profile_id = public.my_profile_id());

create policy "saved own" on public.saved_items for all to authenticated using (profile_id = public.my_profile_id()) with check (profile_id = public.my_profile_id());

create policy "notif read" on public.notifications for select to authenticated using (profile_id = public.my_profile_id());
create policy "notif update" on public.notifications for update to authenticated using (profile_id = public.my_profile_id());
create policy "notif delete" on public.notifications for delete to authenticated using (profile_id = public.my_profile_id());

create policy "conv read" on public.conversations for select to authenticated using (public.my_profile_id() in (profile_a, profile_b));
create policy "conv insert" on public.conversations for insert to authenticated with check (public.my_profile_id() in (profile_a, profile_b));
create policy "conv update" on public.conversations for update to authenticated using (public.my_profile_id() in (profile_a, profile_b));

create policy "msg read" on public.messages for select to authenticated using (exists (select 1 from public.conversations c where c.id = conversation_id and public.my_profile_id() in (c.profile_a, c.profile_b)));
create policy "msg insert" on public.messages for insert to authenticated with check (sender_id = public.my_profile_id() and exists (select 1 from public.conversations c where c.id = conversation_id and public.my_profile_id() in (c.profile_a, c.profile_b)));

-- auto profile on signup
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id, full_name, account_type)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
          coalesce((new.raw_user_meta_data->>'account_type')::public.account_type, 'worker'));
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- notification triggers
create or replace function public.notify_application() returns trigger language plpgsql security definer set search_path = public as $$
declare j record; n text;
begin
  select * into j from public.jobs where id = new.job_id;
  select full_name into n from public.profiles where id = new.applicant_id;
  insert into public.notifications (profile_id, title, body, link)
  values (j.posted_by, 'New application', n || ' applied for ' || j.title, '/dashboard');
  return new;
end $$;
create trigger on_application after insert on public.applications for each row execute function public.notify_application();

create or replace function public.notify_application_status() returns trigger language plpgsql security definer set search_path = public as $$
declare t text;
begin
  if new.status is distinct from old.status then
    select title into t from public.jobs where id = new.job_id;
    insert into public.notifications (profile_id, title, body, link)
    values (new.applicant_id, 'Application ' || new.status, 'Your application for ' || t || ' is now ' || new.status, '/jobs/' || new.job_id);
  end if;
  return new;
end $$;
create trigger on_application_status after update on public.applications for each row execute function public.notify_application_status();

create or replace function public.notify_rental() returns trigger language plpgsql security definer set search_path = public as $$
declare l record;
begin
  select * into l from public.tool_listings where id = new.listing_id;
  if tg_op = 'INSERT' then
    insert into public.notifications (profile_id, title, body, link) values (l.owner_id, 'Rental request', 'Someone wants to rent ' || l.title, '/dashboard');
  elsif new.status is distinct from old.status then
    insert into public.notifications (profile_id, title, body, link) values (new.renter_id, 'Rental ' || new.status, l.title || ' request is ' || new.status, '/marketplace/' || l.id);
  end if;
  return new;
end $$;
create trigger on_rental after insert or update on public.rentals for each row execute function public.notify_rental();

create or replace function public.notify_message() returns trigger language plpgsql security definer set search_path = public as $$
declare c record; other uuid;
begin
  select * into c from public.conversations where id = new.conversation_id;
  other := case when c.profile_a = new.sender_id then c.profile_b else c.profile_a end;
  update public.conversations set last_message_at = now() where id = c.id;
  insert into public.notifications (profile_id, title, body, link) values (other, 'New message', left(new.body, 80), '/messages?c=' || c.id);
  return new;
end $$;
create trigger on_message after insert on public.messages for each row execute function public.notify_message();

alter publication supabase_realtime add table public.messages;

-- SAMPLE DATA (development data, is_sample = true)
insert into public.profiles (id, account_type, full_name, headline, trade, city, bio, experience_years, daily_rate, skills, verified, is_sample, company_name) values
('00000000-0000-0000-0000-000000000001','worker','Ravi Teja Kondapalli','Licensed electrician — residential & shop wiring','Electrician','Vijayawada','Fourteen years wiring homes and small commercial units around Benz Circle and Patamata. Comfortable with three-phase panels and inverter installs.',14,1200,'{"House wiring","Panel boards","Inverter install","Earthing"}',true,true,null),
('00000000-0000-0000-0000-000000000002','worker','Lakshmi Prasanna Gadde','Plumber — bathroom fitting & leak repair','Plumber','Guntur','Handle CPVC/UPVC lines, concealed fittings and overhead tank connections. Available weekends.',8,900,'{"CPVC","Concealed fitting","Leak detection"}',true,true,null),
('00000000-0000-0000-0000-000000000003','worker','Mohammed Imran','MIG/TIG welder, fabrication','Welder','Visakhapatnam','Worked at port-side fabrication yards. Gate, grill and structural steel work.',11,1100,'{"MIG","TIG","Structural steel","Gates & grills"}',false,true,null),
('00000000-0000-0000-0000-000000000004','worker','Srinivas Rao Bandi','Carpenter — modular kitchens & wardrobes','Carpenter','Hyderabad','Plywood and laminate modular work, site measurement to finish.',9,1000,'{"Modular kitchen","Wardrobes","Laminate"}',true,true,null),
('00000000-0000-0000-0000-000000000005','worker','Anitha Kumari','Split AC installation & servicing','AC Technician','Bengaluru','Installs and gas top-ups for split and window units. Own vacuum pump.',6,950,'{"Split AC","Gas charging","PCB repair"}',false,true,null),
('00000000-0000-0000-0000-000000000006','worker','Venkatesh Murugan','Heavy vehicle driver, LMV + HMV licence','Driver','Chennai','Long-haul and city delivery. Clean licence record.',12,850,'{"HMV","Route planning","Loading"}',true,true,null),
('00000000-0000-0000-0000-000000000007','worker','Naga Babu Pothuri','Mason — brickwork & plastering','Mason','Amaravati','Residential construction crew lead, 6-person team available.',16,950,'{"Brickwork","Plastering","Tiling"}',false,true,null),
('00000000-0000-0000-0000-000000000008','worker','Suresh Yadav','CNC machine operator','Machine Operator','Hyderabad','VMC/CNC lathe operation, Fanuc controls, reading drawings.',5,800,'{"CNC lathe","Fanuc","Drawing reading"}',false,true,null),
('00000000-0000-0000-0000-000000000011','employer','Sri Sai Constructions','Residential builder','', 'Vijayawada','Building G+4 apartments across Vijayawada.',0,null,'{}',true,true,'Sri Sai Constructions'),
('00000000-0000-0000-0000-000000000012','employer','Coastal Fabricators','Steel fabrication unit','', 'Visakhapatnam','Fabrication for port and industrial clients.',0,null,'{}',false,true,'Coastal Fabricators'),
('00000000-0000-0000-0000-000000000013','employer','CoolAir Services','AC sales & service','', 'Bengaluru','Service contracts across east Bengaluru.',0,null,'{}',true,true,'CoolAir Services');

insert into public.jobs (posted_by, title, company, trade, city, description, pay_min, pay_max, pay_unit, job_type, experience_min, skills) values
('00000000-0000-0000-0000-000000000011','Site electrician for G+4 apartment','Sri Sai Constructions','Electrician','Vijayawada','Full electrical work for a 20-flat block in Gunadala: conduit laying, DB fitting, final wiring. Materials supplied. Site is 2 km from bus stand.',1000,1300,'day','contract',3,'{"House wiring","Panel boards"}'),
('00000000-0000-0000-0000-000000000011','Masons needed — 3 positions','Sri Sai Constructions','Mason','Vijayawada','Brickwork and internal plastering for ongoing project. Daily payment on Saturday. Tea and lunch provided.',850,1000,'day','full_time',2,'{"Brickwork","Plastering"}'),
('00000000-0000-0000-0000-000000000012','TIG welder for SS piping','Coastal Fabricators','Welder','Visakhapatnam','Stainless steel pipe welding for food processing client. Must pass a test weld on day one.',28000,35000,'month','full_time',4,'{"TIG"}'),
('00000000-0000-0000-0000-000000000012','Helper — fabrication shop','Coastal Fabricators','Welder','Visakhapatnam','Grinding, cutting and material handling. Training on MIG provided.',14000,16000,'month','full_time',0,'{"Grinding"}'),
('00000000-0000-0000-0000-000000000013','AC service technician (summer season)','CoolAir Services','AC Technician','Bengaluru','March–June contract. Two-wheeler required; fuel allowance paid. Servicing split units in Whitefield and KR Puram.',22000,26000,'month','contract',1,'{"Split AC","Gas charging"}'),
('00000000-0000-0000-0000-000000000013','Plumber for office fit-out','CoolAir Services','Plumber','Bengaluru','Pantry and washroom plumbing for a 3-floor office fit-out. 3-week job.',900,1100,'day','contract',3,'{"CPVC","Concealed fitting"}'),
('00000000-0000-0000-0000-000000000011','Carpenter — door frames & shutters','Sri Sai Constructions','Carpenter','Guntur','Fix door frames and flush shutters across 12 units. Piece rate also negotiable.',900,1100,'day','contract',2,'{"Door fitting"}'),
('00000000-0000-0000-0000-000000000012','Delivery driver (LMV)','Coastal Fabricators','Driver','Visakhapatnam','Deliver fabricated parts to clients within 60 km. Tata Ace provided.',16000,19000,'month','full_time',2,'{"LMV"}');

insert into public.tool_listings (owner_id, title, category, description, city, listing_type, price, price_unit, deposit, condition) values
('00000000-0000-0000-0000-000000000001','Bosch GBH 2-26 rotary hammer','Power tools','SDS-plus hammer drill with 3 bits. Good for chasing walls for conduit.','Vijayawada','rent',250,'day',2000,'good'),
('00000000-0000-0000-0000-000000000003','Inverter MIG welding machine 250A','Welding','Works on single phase. Comes with torch and earth clamp; wire not included.','Visakhapatnam','rent',600,'day',5000,'good'),
('00000000-0000-0000-0000-000000000007','Concrete mixer — half bag','Construction','Diesel half-bag mixer, recently serviced. Transport within Amaravati at extra cost.','Amaravati','rent',1500,'day',10000,'fair'),
('00000000-0000-0000-0000-000000000005','Vacuum pump + manifold gauge set','HVAC','Dual-stage pump with R32/R410 gauges.','Bengaluru','rent',400,'day',3000,'like_new'),
('00000000-0000-0000-0000-000000000004','Makita circular saw 7"','Power tools','Used for two years, new blade fitted.','Hyderabad','sell',4500,'once',0,'good'),
('00000000-0000-0000-0000-000000000007','Aluminium scaffolding set (6 m)','Construction','Two towers with wheels and planks.','Guntur','rent',800,'day',8000,'good');

insert into public.communities (slug, name, description, trade) values
('electricians-ap','Electricians of Andhra','Wiring standards, panel questions and job leads for electricians across AP.','Electrician'),
('welders-network','Welders Network','Techniques, machine advice and fabrication work.','Welder'),
('ac-technicians','AC & Refrigeration Techs','Gas types, troubleshooting and seasonal work.','AC Technician'),
('construction-crews','Construction Crews','Masons, carpenters and site leads coordinating work.','Mason');

insert into public.posts (community_id, author_id, title, body)
select id, '00000000-0000-0000-0000-000000000001', 'Which RCCB rating do you use for bathrooms?', 'Clients keep asking. I use 30mA for wet areas. Anyone using 10mA for geyser circuits?' from public.communities where slug='electricians-ap';
insert into public.posts (community_id, author_id, title, body)
select id, '00000000-0000-0000-0000-000000000003', 'Argon prices in Vizag this month', 'Paid ₹2,400 for a refill near Gajuwaka. Is that normal now?' from public.communities where slug='welders-network';
insert into public.posts (community_id, author_id, title, body)
select id, '00000000-0000-0000-0000-000000000005', 'R32 units — brazing tips', 'Sharing my nitrogen purge setup for R32 installs, ask anything.' from public.communities where slug='ac-technicians';
insert into public.posts (community_id, author_id, title, body)
select id, '00000000-0000-0000-0000-000000000007', 'Need 2 masons in Amaravati next week', 'Plastering work, 10 days. Message me.' from public.communities where slug='construction-crews';
