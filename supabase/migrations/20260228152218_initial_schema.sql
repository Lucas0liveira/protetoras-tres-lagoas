-- ============================================================
-- ENUMS
-- ============================================================

create type species_enum as enum ('canino', 'felino', 'outro');
create type sex_enum as enum ('macho', 'femea', 'indefinido');
create type animal_status_enum as enum (
  'resgatado', 'lar_temporario', 'disponivel', 'adotado', 'obito'
);
create type visit_type_enum as enum (
  'emergencia', 'rotina', 'retorno', 'cirurgia', 'outro'
);
create type exam_result_enum as enum (
  'reagente', 'nao_reagente', 'aguardando', 'inconclusivo'
);
create type return_reason_enum as enum (
  'incompatibilidade', 'mudanca', 'falecimento_adotante', 'alergia', 'outro'
);
create type user_role_enum as enum ('admin', 'volunteer');

-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================

create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text not null,
  role          user_role_enum not null default 'volunteer',
  phone         text,
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

-- auto-create profile row when a user signs up
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', new.email));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- CLINICS
-- ============================================================

create table clinics (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  phone       text,
  address     text,
  contact_vet text,
  notes       text,
  created_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

-- ============================================================
-- ANIMALS
-- ============================================================

create table animals (
  id                   uuid primary key default gen_random_uuid(),
  name                 text not null,
  species              species_enum not null,
  sex                  sex_enum not null default 'indefinido',
  breed                text,
  coat_description     text,

  -- rescue
  rescue_date          date not null,
  rescue_location      text,
  rescue_notes         text,
  status               animal_status_enum not null default 'resgatado',

  -- foster home (inline, no separate entity)
  foster_name          text,
  foster_phone         text,
  foster_since         date,

  -- audit
  created_by           uuid references profiles(id),
  updated_by           uuid references profiles(id),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  deleted_at           timestamptz
);

create index on animals(status);
create index on animals(species);

-- auto-update updated_at
create or replace function touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger animals_updated_at
  before update on animals
  for each row execute function touch_updated_at();

-- ============================================================
-- SANITARY PROTOCOLS (1:1 with animals)
-- ============================================================

create table sanitary_protocols (
  id                uuid primary key default gen_random_uuid(),
  animal_id         uuid not null unique references animals(id) on delete cascade,

  castrated         boolean not null default false,
  castration_date   date,

  vaccinated        boolean not null default false,
  vaccination_date  date,
  next_vaccine_date date,

  dewormed          boolean not null default false,
  deworming_date    date,

  bravecto_date     date,
  leish_collar_date date,

  notes             text,
  updated_at        timestamptz not null default now()
);

create trigger sanitary_updated_at
  before update on sanitary_protocols
  for each row execute function touch_updated_at();

-- auto-create sanitary_protocols when an animal is inserted
create or replace function handle_new_animal()
returns trigger as $$
begin
  insert into sanitary_protocols (animal_id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_animal_created
  after insert on animals
  for each row execute function handle_new_animal();

-- ============================================================
-- MEDICAL RECORDS
-- ============================================================

create table medical_records (
  id              uuid primary key default gen_random_uuid(),
  animal_id       uuid not null references animals(id) on delete cascade,
  clinic_id       uuid references clinics(id) on delete set null,

  visit_date      date not null,
  vet_name        text,
  visit_type      visit_type_enum not null default 'rotina',
  description     text not null,
  diagnosis       text,
  procedures      text,
  follow_up_notes text,
  follow_up_date  date,

  created_by      uuid references profiles(id),
  created_at      timestamptz not null default now()
);

create index on medical_records(animal_id);
create index on medical_records(visit_date);

-- ============================================================
-- EXAMS
-- ============================================================

create table exams (
  id                uuid primary key default gen_random_uuid(),
  medical_record_id uuid not null references medical_records(id) on delete cascade,

  exam_name         text not null,
  result            exam_result_enum not null default 'aguardando',
  result_detail     text,
  exam_date         date,
  result_date       date
);

create index on exams(medical_record_id);

-- ============================================================
-- MEDICATIONS
-- ============================================================

create table medications (
  id                uuid primary key default gen_random_uuid(),
  medical_record_id uuid not null references medical_records(id) on delete cascade,

  name              text not null,
  dosage            text,
  frequency         text,
  duration_days     int,
  start_date        date,
  notes             text
);

-- ============================================================
-- ADOPTANTS
-- ============================================================

create table adoptants (
  id                   uuid primary key default gen_random_uuid(),
  full_name            text not null,
  cpf                  text unique,
  rg                   text,
  phone                text not null,
  email                text,
  address_street       text,
  address_number       text,
  address_neighborhood text,
  address_city         text,
  notes                text,
  created_at           timestamptz not null default now(),
  deleted_at           timestamptz
);

-- ============================================================
-- ANIMAL ADOPTIONS (chain of custody)
-- ============================================================

create table animal_adoptions (
  id            uuid primary key default gen_random_uuid(),
  animal_id     uuid not null references animals(id) on delete cascade,
  adoptant_id   uuid not null references adoptants(id),

  adopted_at    date not null,
  termo_date    date,
  is_active     boolean not null default true,

  returned_at   date,
  return_reason return_reason_enum,
  return_notes  text,

  created_by    uuid references profiles(id),
  created_at    timestamptz not null default now()
);

create index on animal_adoptions(animal_id);
create index on animal_adoptions(adoptant_id);
-- enforce only one active adoption per animal at a time
create unique index on animal_adoptions(animal_id) where is_active = true;

-- ============================================================
-- ANIMAL PHOTOS
-- ============================================================

create table animal_photos (
  id           uuid primary key default gen_random_uuid(),
  animal_id    uuid not null references animals(id) on delete cascade,

  storage_path text not null,
  is_cover     boolean not null default false,
  caption      text,
  taken_at     date,

  uploaded_by  uuid references profiles(id),
  created_at   timestamptz not null default now()
);

create index on animal_photos(animal_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table profiles           enable row level security;
alter table animals            enable row level security;
alter table sanitary_protocols enable row level security;
alter table medical_records    enable row level security;
alter table exams              enable row level security;
alter table medications        enable row level security;
alter table clinics            enable row level security;
alter table adoptants          enable row level security;
alter table animal_adoptions   enable row level security;
alter table animal_photos      enable row level security;

-- helper: is the current user an authenticated active member?
create or replace function is_member()
returns boolean as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and active = true
  );
$$ language sql security definer stable;

-- helper: is the current user an admin?
create or replace function is_admin()
returns boolean as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin' and active = true
  );
$$ language sql security definer stable;

-- PROFILES: members can read all, update only their own; admin can do anything
create policy "members can read all profiles"
  on profiles for select using (is_member());

create policy "users can update own profile"
  on profiles for update using (auth.uid() = id);

create policy "admin full access to profiles"
  on profiles for all using (is_admin());

-- ALL OTHER TABLES: any active member can read and write; only admin can delete
do $$
declare
  t text;
begin
  foreach t in array array[
    'animals', 'sanitary_protocols', 'medical_records', 'exams',
    'medications', 'clinics', 'adoptants', 'animal_adoptions', 'animal_photos'
  ] loop
    execute format('
      create policy "members can read %I" on %I for select using (is_member());
      create policy "members can insert %I" on %I for insert with check (is_member());
      create policy "members can update %I" on %I for update using (is_member());
      create policy "admin can delete %I" on %I for delete using (is_admin());
    ', t, t, t, t, t, t, t, t);
  end loop;
end $$;