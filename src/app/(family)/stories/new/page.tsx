import { StoryEditor } from "@/components/story-editor/story-editor";
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) { const query = await searchParams; return <StoryEditor subjectId={typeof query.person === "string" ? query.person : undefined} />; }
