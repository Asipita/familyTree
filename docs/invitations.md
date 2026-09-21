# Node invitations and shared family views

## Try it

1. Click a living, unclaimed person whose profile you created, then **Invite to FamilyTree**.
2. Enter their email and create a link. Copy and share it privately; the application does not send invitation emails yet.
3. The recipient opens the link and signs up or signs in using that email. The invitation survives the signup/sign-in handoff.
4. If their email is unverified, the join screen offers a verification code through Neon Auth. Once verified, accepting attaches their account to the existing person and opens the tree without creating a duplicate or repeating onboarding.
5. Both accounts now read the same people, connections, biographies, and stories, with a different viewer node highlighted.

The link expires after seven days. Creating a replacement revokes earlier pending links for that person. The inviter can revoke pending invitations from **Invite family**. Raw invitation tokens are returned only at creation; only their SHA-256 hashes are stored.

## Permissions

- A claimed person controls their own name and basic profile, even if another member created the node.
- The original creator can edit an unclaimed person's basic profile. Once claimed, that control passes to the person represented.
- A member can create connected people and invite living, unclaimed people they created.
- All members can write biographies and stories about other people in their connected tree, regardless of who created those profiles.
- No one can write/edit their own biography or stories about themselves. A story's author controls their contribution; a different, non-subject relative can review it.
- Claiming never rewrites existing stories, biographies, authors, or creator attribution.

These checks run on the server, not just in the UI. Full-state saves use a locked transaction and a revision check; stale clients get a conflict rather than overwriting another member's changes. **Reload tree data** refreshes the shared state while leaving open forms in place. Review your draft before saving again.

## Existing accounts and tree merging

An account with an untouched, unfinished one-person starting point can claim an invitation. An account that already completed onboarding or built a tree is not silently moved or merged: acceptance returns an explanation and leaves both trees unchanged. Cross-tree merging is a separate workflow.

## Database and verification

Migration `0002` backfills creator attribution from each existing view's owner and creates one personal membership for each existing account. People and stories remain in their existing records. The legacy view/settings tables are retained; current per-account preferences live in `family_members`.

The application requires Node.js 22+ for its native WebSocket support. Interactive Neon transactions keep membership checks, row locks, claims, and writes atomic; read snapshots use the existing HTTP driver.

Run:

```sh
npm run test:invitations
npm run test:api
npm run test:workspace
npm run test:tree
npm run lint
npm run build
```

For database integration testing, migrate a disposable Neon branch first, then supply its URL explicitly:

```sh
FAMILYTREE_TEST_DATABASE_URL="<disposable-branch-url>" npm run test:invitations:integration
```

The integration test creates synthetic application identities, tests claiming/replay/revocation/expiry/shared edits/authorization/concurrency, and removes only its own fixture trees. It does not test email delivery. Verify Neon Auth email-code delivery with an inbox you control before a public launch.
