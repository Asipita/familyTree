import { InvitationsPage } from "@/components/family/account-pages";
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) { const query = await searchParams; return <InvitationsPage personId={typeof query.person === "string" ? query.person : undefined} />; }
