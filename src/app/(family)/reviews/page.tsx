import { ReviewsPage } from "@/components/family/pages";
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) { const query = await searchParams; return <ReviewsPage initialStory={typeof query.story === "string" ? query.story : undefined} />; }
