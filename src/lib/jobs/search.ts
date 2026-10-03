/**
 * Title and company only. The description is deliberately left out so that
 * searching "Stripe" does not return every posting that mentions payments.
 */
export function matchesSearch(
  job: { title: string; company: string },
  query: string,
): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const haystack = `${job.title} ${job.company}`.toLowerCase();
  return needle
    .split(/\s+/)
    .every((term) => haystack.includes(term));
}
