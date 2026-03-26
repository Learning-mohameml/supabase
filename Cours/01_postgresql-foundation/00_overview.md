# Chapter 01 — PostgreSQL Foundation

## What you'll learn

Build a solid PostgreSQL foundation by working directly with the database via `psql`. No Supabase yet — just raw SQL and PostgreSQL-specific features.

## Prerequisites

- Basic SQL knowledge (you already know MySQL)
- Docker installed on your machine

## Sections

| # | Section | Status | Priority | Link |
|---|---------|--------|----------|------|
| 01 | Setup & psql | Done | Essential | [01_setup-and-psql.md](./01_setup-and-psql.md) |
| 02 | MySQL vs PostgreSQL | Done | Essential | [02_mysql-vs-postgresql.md](./02_mysql-vs-postgresql.md) |
| 03 | Types & Domains | Done | Essential | [03_types-and-domains.md](./03_types-and-domains.md) |
| 04 | Schemas & Tables | Done | Essential | [04_schemas-and-tables.md](./04_schemas-and-tables.md) |
| 05 | CRUD Operations | Done | Essential | [05_crud-operations.md](./05_crud-operations.md) |
| 06 | Relations & Joins | Done | Essential | [06_relations-and-joins.md](./06_relations-and-joins.md) |
| 07 | Indexes & Performance | Skipped | Later | 07_indexes-and-performance.md |
| 08 | Views & CTEs | Skipped | Later | 08_views-and-ctes.md |
| 09 | Functions & Triggers | Done | Essential | [09_functions-and-triggers.md](./09_functions-and-triggers.md) |
| 10 | Transactions & Concurrency | Skipped | Later | 10_transactions-and-concurrency.md |
| 11 | Extensions | Done | Essential | [11_extensions.md](./11_extensions.md) |

> **Skipped sections** (07, 08, 10) can be revisited in Phase 2 or when needed. They are not blocking for Supabase development.


## SQL Cheat Sheet


### DDL — Data Definition Language

| Command  | Description            | Example                            |
| -------- | ---------------------- | ---------------------------------- |
| CREATE   | Create database/table  | `CREATE TABLE users (id INT);`     |
| ALTER    | Modify structure       | `ALTER TABLE users ADD name TEXT;` |
| DROP     | Delete table/database  | `DROP TABLE users;`                |
| TRUNCATE | Delete all rows (fast) | `TRUNCATE TABLE users;`            |

### DML — Data Manipulation Language

| Command | Description | Example                         |
| ------- | ----------- | ------------------------------- |
| INSERT  | Add data    | `INSERT INTO users VALUES (1);` |
| UPDATE  | Modify data | `UPDATE users SET name='Ali';`  |
| DELETE  | Remove data | `DELETE FROM users WHERE id=1;` |


### DQL — Data Query Language

| Command | Description | Example                |
| ------- | ----------- | ---------------------- |
| SELECT  | Read data   | `SELECT * FROM users;` |



### DCL — Data Control Language

| Command | Description        | Example                              |
| ------- | ------------------ | ------------------------------------ |
| GRANT   | Give permissions   | `GRANT SELECT ON users TO user1;`    |
| REVOKE  | Remove permissions | `REVOKE SELECT ON users FROM user1;` |


### TCL — Transaction Control Language

| Command  | Description       | Example     |
| -------- | ----------------- | ----------- |
| BEGIN    | Start transaction | `BEGIN;`    |
| COMMIT   | Save changes      | `COMMIT;`   |
| ROLLBACK | Undo changes      | `ROLLBACK;` |


### Pro tip 

Quand tu codes un backend :

* endpoints CRUD → **DML + DQL**
* migrations → **DDL**
* sécurité → **DCL**
* logique critique (finance) → **TCL**

