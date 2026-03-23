# Supabase Learning Repository

A structured learning repo for PostgreSQL and Supabase, with a practice project (todos app) in Next.js / TypeScript / shadcn / Supabase.

## Repository Structure

```
Cours/          # Theory — course materials (chapters + sections)
Practice/       # Scratch — throwaway SQL and code for learning exercises
Projects/todos/ # Real app — Next.js todos app with Supabase
```

### Practice folder

`Practice/` mirrors the chapter structure of `Cours/`. Files are named by section number:

```
Practice/
└── 01_postgresql-foundation/
    ├── 02_mysql-vs-pg.sql
    ├── 03_types.sql
    └── ...
```

- Scratch SQL and code for section exercises — not production code
- One sub-folder per chapter, one file per section (when needed)
- No need to create a file for every section — only when you practice

## Course Directory Conventions

### Naming

- **Folders**: `NN_kebab-case-name` (e.g., `01_cli-local-dev`, `04_auth`)
- **Files**: `NN_kebab-case-name.md` (e.g., `01_installation.md`, `03_migrations.md`)
- **Numbering**: two-digit prefix for ordering (`00_`, `01_`, `02_`, ...)
- **Language**: all folder and file names in English, lowercase

### Chapter structure

Each chapter is a numbered folder inside `Cours/`:

```
Cours/
└── NN_chapter-name/
    ├── 00_overview.md        # Required — chapter intro + mini TOC linking to sections
    ├── 01_section-name.md    # Section file
    ├── 02_section-name.md
    └── ...
```

- `00_overview.md` is **required** in every chapter. It contains:
  - What you'll learn (goals)
  - Prerequisites
  - Mini table of contents with links to each section file
- Sections are flat `.md` files numbered sequentially

### Sub-chapters

For multi-part topics (e.g., different auth methods), use sub-folders:

```
Cours/
└── 04_auth/
    ├── 00_overview.md
    ├── 01_auth-google/       # Sub-chapter (folder with its own numbered files)
    │   ├── 00_concepts.md
    │   ├── 01_setup-project.md
    │   └── ...
    └── 02_magic-link/
        ├── 00_concepts.md
        └── ...
```

Sub-chapters follow the same naming convention. Use sub-chapters only when a topic has multiple independent, multi-file parts.

### Roadmap

`Cours/Roadmap.md` is the master roadmap. It lists every chapter with its sections so you have a clear overview of the full learning path. Update it when adding new chapters or sections.

## Learning Workflow

This repo follows a **learn → implement → review → next** cycle:

```
┌─────────────────────────────────────────────────────┐
│  1. LEARN        Study the concept in Cours/        │
│                  (read or write course material)     │
│                                                     │
│  2. CONFIRM      User confirms understanding        │
│                                                     │
│  3. IMPLEMENT    User implements the related part   │
│                  in Projects/todos/                  │
│                                                     │
│  4. REVIEW       Claude reviews the implementation  │
│                  (correctness, security, patterns)   │
│                                                     │
│  5. NEXT         Move to the next course section    │
└─────────────────────────────────────────────────────┘
```

### Rules

- **Never skip ahead.** Do not implement project code before the related course section is understood.
- **Cours/ first, Projects/ second.** Course material teaches the concept; the project applies it.
- **User implements DB/Supabase code.** Claude generates UI but the user writes migrations, RLS policies, and Supabase configuration themselves. Claude provides guidance and reviews.
- **Review before moving on.** After the user implements a section, Claude reviews for correctness, security issues, and production best practices before proceeding.
- **One section at a time.** Stay focused — finish the current section's learn + implement cycle before starting the next one.

## Practice Project

All hands-on code goes in `Projects/todos/`. Course files may reference it but never contain application code. The todos app is built incrementally as you progress through the course.

## Writing Style

- Course files are written in English
- Use clear headings, code blocks, and tables
- Include practical examples and code snippets
- Security considerations should be highlighted where relevant
