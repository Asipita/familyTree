import { RecoveryScreen } from "@/components/auth/recovery";
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  return <RecoveryScreen mode="reset" token={typeof query.token === "string" ? query.token : undefined} />;
}
