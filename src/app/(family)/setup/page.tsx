import { SetupPage } from "@/components/family/account-pages";
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) { const query = await searchParams; return <SetupPage claimId={typeof query.claim === "string" ? query.claim : undefined} />; }
