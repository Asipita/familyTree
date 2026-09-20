import { StoryPage } from "@/components/family/pages";
export default async function Page({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <StoryPage id={id} />; }
