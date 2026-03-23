# Setup & psql

## Goal

Run a PostgreSQL server locally via Docker and connect to it with `psql`. Learn the essential `psql` meta-commands to navigate databases, tables, and schemas.

---

## 1. Run PostgreSQL with Docker

Instead of installing PostgreSQL directly on your system, use Docker. It's cleaner and matches the workflow you'll use later with Supabase CLI.

```bash
docker run --name pg-learn \
  -e POSTGRES_USER=admin \
  -e POSTGRES_PASSWORD=secret \
  -e POSTGRES_DB=learn \
  -p 5432:5432 \
  -d postgres:17
```

What each flag does:

| Flag | Purpose |
|------|---------|
| `--name pg-learn` | Name the container so you can reference it later |
| `-e POSTGRES_USER=admin` | Create a superuser named `admin` |
| `-e POSTGRES_PASSWORD=secret` | Set the password (local dev only — never use weak passwords in production) |
| `-e POSTGRES_DB=learn` | Create a default database named `learn` |
| `-p 5432:5432` | Map container port 5432 to host port 5432 |
| `-d` | Run in the background (detached) |
| `postgres:17` | Use PostgreSQL 17 (latest stable) |

### Manage the container

```bash
# Stop the container
docker stop pg-learn

# Start it again (data persists)
docker start pg-learn

# Remove it completely (data lost)
docker rm -f pg-learn
```

> **Note:** Data persists between `stop`/`start`. If you want persistent data even after `docker rm`, add a volume: `-v pgdata:/var/lib/postgresql/data`.

---

## 2. Connect with psql

`psql` is the official PostgreSQL command-line client. It's the equivalent of `mysql` for MySQL.

### Option A — psql from inside the container (no local install needed)

```bash
docker exec -it pg-learn psql -U admin -d learn
```

### Option B — psql installed locally

If you have `psql` installed on your host machine:

```bash
psql -h localhost -p 5432 -U admin -d learn
```

You'll see a prompt like:

```
learn=#
```

The `=#` means you're connected as a superuser. A regular user sees `=>`.

### Connection string format

PostgreSQL also supports a single connection URL (you'll see this a lot with Supabase):

```bash
psql "postgresql://admin:secret@localhost:5432/learn"
```

Format: `postgresql://USER:PASSWORD@HOST:PORT/DATABASE`

---

## 3. Essential psql Meta-Commands

Meta-commands start with `\` and are not SQL — they're `psql`-specific shortcuts. These are your daily tools.

### Navigation

| Command | What it does | MySQL equivalent |
|---------|-------------|-----------------|
| `\l` | List all databases | `SHOW DATABASES;` |
| `\c dbname` | Connect to a different database | `USE dbname;` |
| `\dt` | List tables in current schema | `SHOW TABLES;` |
| `\dt schema.*` | List tables in a specific schema | — |
| `\d tablename` | Describe a table (columns, types, constraints) | `DESCRIBE tablename;` |
| `\dn` | List schemas | — (MySQL doesn't have schemas) |
| `\du` | List users/roles | `SELECT user, host FROM mysql.user;` |
| `\df` | List functions | `SHOW FUNCTION STATUS;` |
| `\di` | List indexes | `SHOW INDEX FROM tablename;` |
| `\dv` | List views | `SHOW TABLES;` (views mixed with tables in MySQL) |

### Display & Formatting

| Command | What it does |
|---------|-------------|
| `\x` | Toggle expanded display (vertical output, useful for wide rows) |
| `\x auto` | Auto-switch between table and expanded based on width |
| `\timing` | Toggle query execution time display |
| `\pset pager off` | Disable pager (no `-- More --` prompts) |

### Execution

| Command | What it does |
|---------|-------------|
| `\i filename.sql` | Execute a SQL file |
| `\e` | Open the last query in your `$EDITOR` |
| `\g` | Re-execute the last query |
| `\s` | Show command history |

### Help & Exit

| Command | What it does |
|---------|-------------|
| `\?` | Help for meta-commands |
| `\h CREATE TABLE` | SQL syntax help for a specific command |
| `\q` | Quit psql |

---

## 4. Your First Queries

Try these to verify everything works:

```sql
-- Check PostgreSQL version
SELECT version();

-- Check current user
SELECT current_user;

-- Check current database
SELECT current_database();

-- Check the current time (PostgreSQL is timezone-aware by default)
SELECT now();

-- List all schemas (public is the default)
SELECT schema_name FROM information_schema.schemata;
```

---

## 5. Key Difference from MySQL

| Concept | MySQL | PostgreSQL |
|---------|-------|------------|
| **String quotes** | `"string"` or `'string'` | `'string'` only — double quotes are for **identifiers** (table/column names) |
| **Default schema** | No schemas, just databases | `public` schema in every database |
| **Case sensitivity** | Table names are case-sensitive on Linux | Identifiers are **lowercased** unless double-quoted |
| **Semicolons** | Required to execute | Required to execute |
| **Comments** | `-- comment` or `/* */` | Same: `-- comment` or `/* */` |

> **Important:** In PostgreSQL, `"MyTable"` and `mytable` are different things. Unquoted identifiers are always folded to lowercase. Best practice: **always use lowercase snake_case** and never quote identifiers.

---

## 6. psql Configuration (Optional)

Create a `~/.psqlrc` file to set your preferred defaults:

```sql
-- ~/.psqlrc
\x auto
\timing
\pset null '(null)'
\pset pager off
```

This will:
- Auto-switch to expanded display when output is wide
- Show query timing after each query
- Display `(null)` instead of blank for NULL values
- Disable the pager

---

## Practice

1. Start the Docker container and connect with `psql`
2. Run `\l` to list databases — you should see `learn`
3. Run `\dn` to list schemas — you should see `public`
4. Run `SELECT version();` to confirm PostgreSQL 17
5. Run `\timing` then `SELECT pg_sleep(1);` — confirm timing shows ~1 second
6. Try `\x auto` then `SELECT * FROM pg_stat_activity LIMIT 3;` — see expanded display
7. Quit with `\q`

Once you're comfortable navigating with `psql`, you're ready for the next section.
