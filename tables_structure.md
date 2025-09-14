## Tabela de empresas:
create table public.tenants (
  id uuid not null default gen_random_uuid (),
  name text not null,
  slug text not null,
  status text not null default 'trial'::text,
  trial_start_at timestamp with time zone not null default now(),
  trial_end_at timestamp with time zone not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint tenants_pkey primary key (id),
  constraint tenants_slug_key unique (slug),
  constraint tenants_status_check check (
    (
      status = any (
        array[
          'trial'::text,
          'active'::text,
          'past_due'::text,
          'canceled'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists tenants_status_idx on public.tenants using btree (status) TABLESPACE pg_default;

create index IF not exists tenants_trial_end_at_idx on public.tenants using btree (trial_end_at) TABLESPACE pg_default;

## Tabela de membros das empresas:
create table public.tenant_members (
  id uuid not null default gen_random_uuid (),
  tenant_id uuid not null,
  email public.citext not null,
  role text not null default 'member'::text,
  created_at timestamp with time zone not null default now(),
  constraint tenant_members_pkey primary key (id),
  constraint tenant_members_tenant_id_email_key unique (tenant_id, email),
  constraint tenant_members_tenant_id_fkey foreign KEY (tenant_id) references tenants (id) on delete CASCADE,
  constraint tenant_members_role_check check (
    (role = any (array['admin'::text, 'member'::text]))
  )
) TABLESPACE pg_default;

create index IF not exists tenant_members_tenant_id_idx on public.tenant_members using btree (tenant_id) TABLESPACE pg_default;

## Tabela de planilhas de uma empresa:
create table public.sheet_configs (
  id uuid not null default gen_random_uuid (),
  tenant_id uuid not null,
  sheet_id text not null,
  sheet_tab text not null default 'vendas'::text,
  header_row integer not null default 1,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint sheet_configs_pkey primary key (id),
  constraint sheet_configs_tenant_id_fkey foreign KEY (tenant_id) references tenants (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists sheet_configs_tenant_id_idx on public.sheet_configs using btree (tenant_id) TABLESPACE pg_default;

create table public.external_sheets (
  id uuid not null default gen_random_uuid (),
  tenant_id uuid not null,
  title character varying(255) not null,
  description text not null,
  link text not null,
  display_order integer not null default 0,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint tenant_sheets_pkey primary key (id)
) TABLESPACE pg_default;

create index IF not exists idx_tenant_sheets_tenant_id on public.external_sheets using btree (tenant_id) TABLESPACE pg_default;

create index IF not exists idx_tenant_sheets_active on public.external_sheets using btree (tenant_id, display_order) TABLESPACE pg_default;

create trigger update_tenant_sheets_updated_at BEFORE
update on external_sheets for EACH row
execute FUNCTION update_updated_at_column ();

create table public.column_mappings (
  id uuid not null default gen_random_uuid (),
  sheet_config_id uuid not null,
  logical_name text not null,
  sheet_column text not null,
  created_at timestamp with time zone not null default now(),
  constraint column_mappings_pkey primary key (id),
  constraint column_mappings_tenant_id_logical_name_key unique (sheet_config_id, logical_name),
  constraint column_mappings_sheet_config_id_fkey foreign KEY (sheet_config_id) references sheet_configs (id) on delete CASCADE,
  constraint column_mappings_logical_name_check check (
    (
      logical_name = any (
        array[
          'date'::text,
          'order_id'::text,
          'status'::text,
          'customer'::text,
          'customer_type'::text,
          'product'::text,
          'channel'::text,
          'quantity'::text,
          'cogs'::text,
          'value'::text,
          'packages'::text,
          'boxes'::text,
          'customer_name'::text,
          'first_purchase'::text,
          'last_purchase'::text,
          'orders'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists column_mappings_tenant_id_idx on public.column_mappings using btree (sheet_config_id) TABLESPACE pg_default;