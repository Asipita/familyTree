import { loadEnvConfig } from "@next/env";
import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Keep explicit CLI/CI targets ahead of connection strings from local files.
const suppliedUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (process.env.DOTENV_CONFIG_PATH) {
  const result = config({ path: process.env.DOTENV_CONFIG_PATH, quiet: true });
  if (result.error) throw new Error("The requested migration environment file could not be loaded.");
} else {
  loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");
}

const databaseUrl = suppliedUrl || process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("Set DATABASE_URL_UNPOOLED or DATABASE_URL before running migrations.");
if (new URL(databaseUrl).hostname.includes("-pooler")) {
  throw new Error("Migrations require a direct connection. Set DATABASE_URL_UNPOOLED for the intended database.");
}

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
