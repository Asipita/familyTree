import { boolean, index, integer, pgTable, primaryKey, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

export const familyViews = pgTable("family_views", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerUserId: text("owner_user_id").notNull().unique(),
  viewerPersonId: text("viewer_person_id").notNull(),
  onboardingComplete: boolean("onboarding_complete").notNull().default(false),
  revision: integer("revision").notNull().default(0),
  ...timestamps,
});

export const people = pgTable("people", {
  viewId: uuid("view_id").notNull().references(() => familyViews.id, { onDelete: "cascade" }),
  id: text("id").notNull(),
  name: text("name").notNull(),
  born: text("born").notNull(),
  died: text("died"),
  living: boolean("living").notNull().default(true),
  biography: text("biography").notNull().default(""),
  biographyBy: text("biography_by"),
  accountUserId: text("account_user_id"),
  createdByUserId: text("created_by_user_id").notNull(),
  gender: text("gender"),
  ...timestamps,
}, (table) => [
  primaryKey({ columns: [table.viewId, table.id] }),
  unique("people_view_id_account_user_id").on(table.viewId, table.accountUserId),
]);

export const familyLinks = pgTable("family_links", {
  viewId: uuid("view_id").notNull().references(() => familyViews.id, { onDelete: "cascade" }),
  id: text("id").notNull(),
  kind: text("kind").notNull(),
  relation: text("relation"),
  complete: boolean("complete").notNull().default(true),
  fromPersonId: text("from_person_id").notNull(),
  toPersonId: text("to_person_id").notNull(),
  ...timestamps,
}, (table) => [primaryKey({ columns: [table.viewId, table.id] })]);

export const stories = pgTable("stories", {
  viewId: uuid("view_id").notNull().references(() => familyViews.id, { onDelete: "cascade" }),
  id: text("id").notNull(),
  subjectId: text("subject_id").notNull(),
  authorId: text("author_id").notNull(),
  title: text("title").notNull(),
  html: text("html").notNull(),
  source: text("source").notNull().default(""),
  status: text("status").notNull(),
  updated: text("updated").notNull(),
  ...timestamps,
}, (table) => [primaryKey({ columns: [table.viewId, table.id] })]);

export const storyReviews = pgTable("story_reviews", {
  id: uuid("id").defaultRandom().primaryKey(),
  viewId: uuid("view_id").notNull().references(() => familyViews.id, { onDelete: "cascade" }),
  storyId: text("story_id").notNull(),
  personId: text("person_id").notNull(),
  note: text("note").notNull(),
  decision: text("decision").notNull(),
  ...timestamps,
});

export const requests = pgTable("requests", {
  viewId: uuid("view_id").notNull().references(() => familyViews.id, { onDelete: "cascade" }),
  id: text("id").notNull(),
  kind: text("kind").notNull(),
  personId: text("person_id").notNull(),
  detail: text("detail").notNull(),
  status: text("status").notNull(),
  created: text("created").notNull(),
  ...timestamps,
}, (table) => [primaryKey({ columns: [table.viewId, table.id] })]);

export const familySettings = pgTable("family_settings", {
  viewId: uuid("view_id").primaryKey().references(() => familyViews.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  reviewNotifications: boolean("review_notifications").notNull().default(true),
  discoverable: boolean("discoverable").notNull().default(false),
  ...timestamps,
});

// A personal viewpoint into shared records, not a duplicate of someone's tree.
export const familyMembers = pgTable("family_members", {
  userId: text("user_id").primaryKey(),
  viewId: uuid("view_id").notNull().references(() => familyViews.id, { onDelete: "cascade" }),
  personId: text("person_id").notNull(),
  onboardingComplete: boolean("onboarding_complete").notNull().default(false),
  email: text("email").notNull(),
  reviewNotifications: boolean("review_notifications").notNull().default(true),
  discoverable: boolean("discoverable").notNull().default(false),
  ...timestamps,
}, table => [unique("family_members_view_person").on(table.viewId, table.personId), index("family_members_view").on(table.viewId)]);

export const invitations = pgTable("invitations", {
  id: uuid("id").defaultRandom().primaryKey(),
  viewId: uuid("view_id").notNull().references(() => familyViews.id, { onDelete: "cascade" }),
  personId: text("person_id").notNull(),
  invitedByUserId: text("invited_by_user_id").notNull(),
  email: text("email").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  acceptedByUserId: text("accepted_by_user_id"),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  ...timestamps,
}, table => [index("invitations_view_person").on(table.viewId, table.personId)]);
