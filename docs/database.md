# Database migrations

The app uses `DATABASE_URL`. Migrations prefer `DATABASE_URL_UNPOOLED` and reject pooled connections. Keep both URLs pointed at the same Neon branch and database.

By default, Drizzle loads environment files with Next.js's loader, including `.env.local`. The default mode is development; set `NODE_ENV=production` when using production-specific environment files. Values supplied by the shell or CI take precedence.

After checking which database your environment targets, apply the committed migrations:

```sh
npm run db:migrate
```

To explicitly use a separate environment file without loading `.env.local`:

```sh
DOTENV_CONFIG_PATH=.env.familytree-dev npm run db:migrate
```

An explicit `DATABASE_URL_UNPOOLED` or `DATABASE_URL` overrides file values. A missing explicitly selected file fails rather than silently falling back to the app database.

Generate new migration files with `npm run db:generate`. Test migrations on an isolated Neon branch before applying them to production. Starting Next.js or configuring Neon Auth does not apply application migrations.

Run the environment-selection regression tests with:

```sh
npm run test:db-config
```
