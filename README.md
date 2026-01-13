# Employee Management System (React + Supabase)

This is a **simple Employee Management System** built with:

- React (JavaScript only, created with Vite)
- HTML + CSS (no Tailwind, no PostCSS setup from you)
- Supabase for **authentication** and **database**

It is designed to be **easy to understand** and good for your resume.

## Roles and features

- **Employee**
	- Can log in
	- Can see their own employee profile (name, email, role, status)

- **Manager**
	- Can log in
	- Can see the list of all employees
	- Can **create** new employees
	- Can **update** existing employees (name, email, role, status)

There is no delete in this version to keep things simple.

## Supabase setup

1. Go to Supabase and create a new project.
2. In the SQL editor, create two tables.

### 1) profiles table

Link each auth user to a role (employee or manager):

```sql
create table profiles (
	id uuid primary key references auth.users (id) on delete cascade,
	full_name text,
	role text not null default 'employee', -- 'employee' or 'manager'
	created_at timestamp with time zone default now()
);

alter table profiles enable row level security;

create policy "Public profiles are viewable by logged in users" on profiles
	for select using (auth.role() = 'authenticated');

create policy "Users can update their own profile" on profiles
	for update using (auth.uid() = id);
```

### 2) employees table

Basic employee records:

```sql
create table employees (
	id uuid primary key,
	full_name text not null,
	email text not null unique,
	role text not null default 'employee', -- 'employee' or 'manager'
	status text not null default 'active', -- 'active' or 'inactive'
	created_at timestamp with time zone default now()
);

alter table employees enable row level security;

create policy "Employees readable by logged in users" on employees
	for select using (auth.role() = 'authenticated');

create policy "Only managers can modify employees" on employees
	for insert, update using (
		exists (
			select 1 from profiles
			where profiles.id = auth.uid() and profiles.role = 'manager'
		)
	);
```

You can keep this exactly as-is to start.

## Create demo users

1. In Supabase **Authentication → Users**, create at least two users:
	 - One **employee** user
	 - One **manager** user
2. For each new user, insert a row into `profiles` with the same `id` and the correct `role`.
3. For the employee user, also insert a row into `employees` with the **same email** and their basic details.

## Environment variables

In the project root, create a file named `.env.local` and add:

```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

You can find these values in Supabase under **Project Settings → API**.

Restart the dev server after you add or change this file.

## Run the project

```bash
npm install
npm run dev
```

Then open the URL shown in the terminal (usually `http://localhost:5173`).

Use the email and password of your demo users you created in Supabase.

## Where the important code is

- Main React entry: `src/main.jsx`
- App logic (login, dashboards, forms): `src/App.jsx`
- Supabase client setup: `src/supabaseClient.js`
- Styling: `src/index.css` and `src/App.css`

You can walk through `src/App.jsx` from top to bottom to understand:

1. How login works (`handleLogin`, `handleLogout`)
2. How the app decides if the user is a **manager** or **employee** (profile role)
3. How managers load and save employees
4. How employees see their own profile

This is intentionally small and focused so you can explain every part in an interview.
