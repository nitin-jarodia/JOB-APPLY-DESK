/**
 * Job ids carry their source and the provider's own identifier, and Himalayas
 * uses a full URL as that identifier. Slashes cannot go in a route segment, so
 * every job gets a readable slug with a short stable hash appended.
 */

function fnv1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(36);
}

function slugifyWords(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
}

export function jobSlug(job: { id: string; title: string; company: string }): string {
  const words = slugifyWords(`${job.company} ${job.title}`);
  const hash = fnv1a(job.id);
  return words ? `${words}-${hash}` : hash;
}
