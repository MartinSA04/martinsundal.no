import { getCollection, type CollectionEntry } from "astro:content";

/** Projects in IDX order, which is the order the home index renders them in. */
export async function orderedProjects(): Promise<
  CollectionEntry<"projects">[]
> {
  const all = await getCollection("projects");
  return all.sort((a, b) => a.data.index - b.data.index);
}
