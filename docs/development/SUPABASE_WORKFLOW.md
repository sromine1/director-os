# Supabase Development Workflow

DirectorOS manages database changes through version-controlled SQL migrations.
The hosted Supabase project is not used as the source of truth for schema design;
the files under `supabase/migrations/` are.

## Prerequisites

- Node.js 20 or later
- npm
- Docker Desktop, or another Docker-compatible container runtime

The npm scripts use Supabase CLI `2.109.1` explicitly so every developer and CI
run uses the same CLI version without requiring a global installation.

## Start the local stack

```bash
npm run db:start
```

The first start downloads the local Supabase container images and can take
several minutes. The command prints the local API URL, Studio URL, database URL,
and development keys.

Stop the stack without deleting local data:

```bash
npm run db:stop
```

## Rebuild the database

```bash
npm run db:reset
```

This command recreates the local database, applies every SQL file in
`supabase/migrations/` in timestamp order, and then runs `supabase/seed.sql`.
Local-only manual schema or data changes are discarded.

Use a reset whenever validating that the repository can recreate the database
from a clean state.

## Create a migration

```bash
npm run db:migration:new -- descriptive_name
```

Example:

```bash
npm run db:migration:new -- add_organizations
```

This creates a timestamped SQL file under `supabase/migrations/`. Edit that file
rather than making undocumented schema changes directly in the hosted project.

Migration rules:

1. Keep each migration focused on one logical change.
2. Prefer additive, backward-compatible changes before destructive changes.
3. Never commit secrets, production user IDs, or environment-specific IDs.
4. Make seed data deterministic and safe for local development.
5. Do not edit a migration after it has been applied to a shared environment;
   create a follow-up migration instead.

## Generate TypeScript database types

Start or reset the local stack first, then run:

```bash
npm run db:types
```

The generated file is written to:

```text
lib/supabase/database.types.ts
```

Commit the generated file whenever a migration changes the public database
contract. Do not hand-edit generated output; change the migration and regenerate.

## Validate migrations and generated types

```bash
npm run db:start
npm run db:validate
```

Validation performs a clean local reset, regenerates TypeScript types, and fails
when regeneration produces an uncommitted type diff.

Also run the application checks before opening a pull request:

```bash
npm run lint
npm run build
```

## Seed strategy

`supabase/seed.sql` contains only fictional, deterministic records needed to
exercise the current dashboard and brief-detail screens. Shared seeds must not
contain:

- production data
- real customer email addresses
- access tokens or API keys
- hosted Supabase project identifiers
- fixed authentication user IDs

Identity-specific users, Organizations, and Membership fixtures will be added
with the Identity Foundation schema. Where authentication records are needed,
local/test-only creation must remain separate from production bootstrap steps.

## Hosted project workflow

IDF-002 does not push migrations to production or alter production data. Linking
and deployment commands will be introduced with an explicit environment and
release process. Until then, do not run destructive reset commands against a
linked or remote database.

## Continuous integration target

CI should run against an isolated local Supabase stack and execute:

```bash
npm ci
npm run db:start
npm run db:validate
npm run lint
npm run build
```

No production credentials are required for migration validation.
