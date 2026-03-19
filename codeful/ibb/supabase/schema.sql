-- Enable UUID generation
create extension if not exists "pgcrypto";

-- Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  name text,
  phone text,
  role text default 'customer' check (role in ('customer','merchant','admin')),
  location text default 'Kano, Nigeria',
  created_at timestamp with time zone default now()
);

-- Merchant invites (admin/merchant -> merchant)
create table if not exists public.merchant_invites (
  id uuid primary key default gen_random_uuid(),
  inviter_id uuid references public.profiles(id) on delete set null,
  email text not null,
  role text default 'merchant' check (role in ('merchant','admin')),
  status text default 'pending' check (status in ('pending','accepted','revoked')),
  created_at timestamp with time zone default now(),
  accepted_at timestamp with time zone
);

create unique index if not exists merchant_invites_email_pending_idx
  on public.merchant_invites (lower(email))
  where status = 'pending';

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
declare
  invite_record record;
  role_to_set text;
begin
  select * into invite_record
  from public.merchant_invites
  where lower(email) = lower(new.email)
    and status = 'pending'
  order by created_at desc
  limit 1;

  role_to_set := coalesce(invite_record.role, new.raw_user_meta_data->>'role', 'customer');

  insert into public.profiles (id, name, phone, role, location)
  values (
    new.id,
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'phone',
    role_to_set,
    'Kano, Nigeria'
  )
  on conflict (id) do update
  set name = excluded.name,
      phone = excluded.phone,
      role = excluded.role;

  if invite_record.id is not null then
    update public.merchant_invites
    set status = 'accepted',
        accepted_at = now()
    where id = invite_record.id;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Merchant applications
create table if not exists public.merchant_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  business_name text,
  address text,
  status text default 'pending' check (status in ('pending','approved','rejected')),
  notes text,
  created_at timestamp with time zone default now()
);

-- Shops
create table if not exists public.shops (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete cascade,
  name text not null,
  slug text unique,
  description text,
  address text,
  logo_url text,
  status text default 'draft' check (status in ('draft','active','suspended')),
  created_at timestamp with time zone default now()
);

alter table public.shops add column if not exists address text;

-- Products
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid references public.shops(id) on delete cascade,
  name text not null,
  price integer not null,
  original_price integer,
  badge text,
  swatch text,
  yards text,
  origin text,
  category text,
  description text,
  stock integer default 0,
  status text default 'draft' check (status in ('draft','published')),
  created_at timestamp with time zone default now()
);

-- Product images
create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  url text not null,
  sort_order integer default 0
);

-- Orders
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  status text default 'pending' check (status in ('pending','paid','processing','shipped','delivered','cancelled')),
  payment_status text default 'unpaid' check (payment_status in ('unpaid','paid','refunded','failed')),
  currency text default 'NGN',
  subtotal integer default 0,
  delivery_fee integer default 0,
  discount integer default 0,
  total integer default 0,
  customer_name text,
  customer_phone text,
  delivery_address text,
  delivery_city text,
  payment_ref text,
  created_at timestamp with time zone default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  shop_id uuid references public.shops(id) on delete set null,
  qty integer not null default 1,
  price integer not null default 0,
  total integer not null default 0,
  selected_image_url text,
  selected_image_id uuid references public.product_images(id) on delete set null,
  created_at timestamp with time zone default now()
);

create table if not exists public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  old_status text,
  new_status text,
  old_payment_status text,
  new_payment_status text,
  changed_by uuid references public.profiles(id) on delete set null,
  note text,
  created_at timestamp with time zone default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  provider text default 'fincra',
  reference text,
  pay_code text,
  status text default 'pending',
  amount integer default 0,
  currency text default 'NGN',
  raw jsonb,
  created_at timestamp with time zone default now()
);

-- RLS
alter table public.profiles enable row level security;
alter table public.merchant_invites enable row level security;
alter table public.merchant_applications enable row level security;
alter table public.shops enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;
alter table public.payments enable row level security;

-- Profiles policies
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

-- Merchant invites policies
drop policy if exists "invites_select_inviter" on public.merchant_invites;
create policy "invites_select_inviter"
  on public.merchant_invites for select
  using (auth.uid() = inviter_id);

drop policy if exists "invites_select_admin" on public.merchant_invites;
create policy "invites_select_admin"
  on public.merchant_invites for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "invites_insert_admin_or_merchant" on public.merchant_invites;
create policy "invites_insert_admin_or_merchant"
  on public.merchant_invites for insert
  with check (
    auth.uid() = inviter_id
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','merchant'))
  );

drop policy if exists "invites_update_inviter_or_admin" on public.merchant_invites;
create policy "invites_update_inviter_or_admin"
  on public.merchant_invites for update
  using (
    auth.uid() = inviter_id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Merchant applications policies
drop policy if exists "merchant_apply_insert_own" on public.merchant_applications;
create policy "merchant_apply_insert_own"
  on public.merchant_applications for insert
  with check (auth.uid() = user_id);

drop policy if exists "merchant_apply_select_own" on public.merchant_applications;
create policy "merchant_apply_select_own"
  on public.merchant_applications for select
  using (auth.uid() = user_id);

-- Shops policies
drop policy if exists "shops_select_public" on public.shops;
create policy "shops_select_public"
  on public.shops for select
  using (true);

drop policy if exists "shops_insert_owner" on public.shops;
create policy "shops_insert_owner"
  on public.shops for insert
  with check (auth.uid() = owner_id);

drop policy if exists "shops_update_owner" on public.shops;
create policy "shops_update_owner"
  on public.shops for update
  using (auth.uid() = owner_id);

-- Products policies
drop policy if exists "products_select_public" on public.products;
create policy "products_select_public"
  on public.products for select
  using (true);

drop policy if exists "products_insert_owner" on public.products;
create policy "products_insert_owner"
  on public.products for insert
  with check (exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid()));

drop policy if exists "products_update_owner" on public.products;
create policy "products_update_owner"
  on public.products for update
  using (exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid()));

drop policy if exists "products_delete_owner" on public.products;
create policy "products_delete_owner"
  on public.products for delete
  using (exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid()));

-- Product images policies
drop policy if exists "product_images_select_public" on public.product_images;
create policy "product_images_select_public"
  on public.product_images for select
  using (true);

drop policy if exists "product_images_insert_owner" on public.product_images;
create policy "product_images_insert_owner"
  on public.product_images for insert
  with check (exists (
    select 1
    from public.products p
    join public.shops s on s.id = p.shop_id
    where p.id = product_id and s.owner_id = auth.uid()
  ));

drop policy if exists "product_images_update_owner" on public.product_images;
create policy "product_images_update_owner"
  on public.product_images for update
  using (exists (
    select 1
    from public.products p
    join public.shops s on s.id = p.shop_id
    where p.id = product_id and s.owner_id = auth.uid()
  ));

drop policy if exists "product_images_delete_owner" on public.product_images;
create policy "product_images_delete_owner"
  on public.product_images for delete
  using (exists (
    select 1
    from public.products p
    join public.shops s on s.id = p.shop_id
    where p.id = product_id and s.owner_id = auth.uid()
  ));

-- Orders policies
create or replace function public.is_merchant_order(order_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.order_items oi
    join public.shops s on s.id = oi.shop_id
    where oi.order_id = order_id and s.owner_id = auth.uid()
  );
$$;

drop policy if exists "orders_select_own" on public.orders;
create policy "orders_select_own"
  on public.orders for select
  using (auth.uid() = user_id);

drop policy if exists "orders_select_merchant" on public.orders;
create policy "orders_select_merchant"
  on public.orders for select
  using (public.is_merchant_order(orders.id));

drop policy if exists "orders_insert_own" on public.orders;
create policy "orders_insert_own"
  on public.orders for insert
  with check (auth.uid() = user_id);

drop policy if exists "orders_update_own" on public.orders;
create policy "orders_update_own"
  on public.orders for update
  using (auth.uid() = user_id);

drop policy if exists "orders_update_merchant" on public.orders;
create policy "orders_update_merchant"
  on public.orders for update
  using (public.is_merchant_order(orders.id));

-- Order items policies
drop policy if exists "order_items_select_own" on public.order_items;
create policy "order_items_select_own"
  on public.order_items for select
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));

drop policy if exists "order_items_select_merchant" on public.order_items;
create policy "order_items_select_merchant"
  on public.order_items for select
  using (exists (
    select 1
    from public.shops s
    where s.id = shop_id and s.owner_id = auth.uid()
  ));

drop policy if exists "order_items_insert_own" on public.order_items;
create policy "order_items_insert_own"
  on public.order_items for insert
  with check (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));

-- Order status history policies
drop policy if exists "order_status_history_select_own" on public.order_status_history;
create policy "order_status_history_select_own"
  on public.order_status_history for select
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));

drop policy if exists "order_status_history_select_merchant" on public.order_status_history;
create policy "order_status_history_select_merchant"
  on public.order_status_history for select
  using (public.is_merchant_order(order_id));

drop policy if exists "order_status_history_insert_allowed" on public.order_status_history;
create policy "order_status_history_insert_allowed"
  on public.order_status_history for insert
  with check (
    auth.uid() is not null
    and (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
      or public.is_merchant_order(order_id))
  );

-- Payments policies
drop policy if exists "payments_select_own" on public.payments;
create policy "payments_select_own"
  on public.payments for select
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));

drop policy if exists "payments_select_merchant" on public.payments;
create policy "payments_select_merchant"
  on public.payments for select
  using (public.is_merchant_order(order_id));

drop policy if exists "payments_insert_own" on public.payments;
create policy "payments_insert_own"
  on public.payments for insert
  with check (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));

-- Status history trigger
create or replace function public.log_order_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (coalesce(new.status,'') <> coalesce(old.status,'') or coalesce(new.payment_status,'') <> coalesce(old.payment_status,'')) then
    insert into public.order_status_history (order_id, old_status, new_status, old_payment_status, new_payment_status, changed_by)
    values (new.id, old.status, new.status, old.payment_status, new.payment_status, auth.uid());
  end if;
  return new;
end;
$$;

drop trigger if exists orders_status_history on public.orders;
create trigger orders_status_history
  after update on public.orders
  for each row execute procedure public.log_order_status_change();

-- Storage policies (shop logos)
drop policy if exists "shop_logos_public_read" on storage.objects;
create policy "shop_logos_public_read"
  on storage.objects for select
  using (bucket_id = 'shop-logos');

drop policy if exists "shop_logos_owner_insert" on storage.objects;
create policy "shop_logos_owner_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'shop-logos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "shop_logos_owner_update" on storage.objects;
create policy "shop_logos_owner_update"
  on storage.objects for update
  using (
    bucket_id = 'shop-logos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "shop_logos_owner_delete" on storage.objects;
create policy "shop_logos_owner_delete"
  on storage.objects for delete
  using (
    bucket_id = 'shop-logos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "product_images_update_owner" on public.product_images;
create policy "product_images_update_owner"
  on public.product_images for update
  using (exists (
    select 1
    from public.products p
    join public.shops s on s.id = p.shop_id
    where p.id = product_id and s.owner_id = auth.uid()
  ));

drop policy if exists "product_images_delete_owner" on public.product_images;
create policy "product_images_delete_owner"
  on public.product_images for delete
  using (exists (
    select 1
    from public.products p
    join public.shops s on s.id = p.shop_id
    where p.id = product_id and s.owner_id = auth.uid()
  ));

-- Storage policies (product-images bucket)
drop policy if exists "product_images_read_public" on storage.objects;
create policy "product_images_read_public"
  on storage.objects for select
  using (bucket_id = 'product-images');

drop policy if exists "product_images_insert_owner" on storage.objects;
create policy "product_images_insert_owner"
  on storage.objects for insert
  with check (
    bucket_id = 'product-images'
    and auth.role() = 'authenticated'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists "product_images_update_owner" on storage.objects;
create policy "product_images_update_owner"
  on storage.objects for update
  using (
    bucket_id = 'product-images'
    and auth.role() = 'authenticated'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists "product_images_delete_owner" on storage.objects;
create policy "product_images_delete_owner"
  on storage.objects for delete
  using (
    bucket_id = 'product-images'
    and auth.role() = 'authenticated'
    and split_part(name, '/', 1) = auth.uid()::text
  );
