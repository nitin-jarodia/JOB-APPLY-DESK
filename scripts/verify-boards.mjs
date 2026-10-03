/**
 * Re-checks every board token in src/lib/jobs/boards.ts against its provider's
 * public JSON endpoint. Read-only: it never posts anything.
 *
 *   node scripts/verify-boards.mjs
 */
import { readFile } from "node:fs/promises";

const UA = "ApplyDesk/0.1 (personal local job desk; read-only public JSON feeds)";

const source = await readFile(new URL("../src/lib/jobs/boards.ts", import.meta.url), "utf8");

function tokensFor(constName) {
  const block = source.split(`export const ${constName}`)[1]?.split("];")[0] ?? "";
  return [...block.matchAll(/token:\s*"([^"]+)",\s*company:\s*"([^"]+)"/g)].map((m) => ({
    token: m[1],
    company: m[2],
  }));
}

const providers = [
  {
    name: "greenhouse",
    boards: tokensFor("GREENHOUSE_BOARDS"),
    url: (t) => `https://boards-api.greenhouse.io/v1/boards/${t}/jobs?content=true`,
    count: (d) => (Array.isArray(d?.jobs) ? d.jobs.length : null),
  },
  {
    name: "lever",
    boards: tokensFor("LEVER_BOARDS"),
    url: (t) => `https://api.lever.co/v0/postings/${t}?mode=json`,
    count: (d) => (Array.isArray(d) ? d.length : null),
  },
  {
    name: "ashby",
    boards: tokensFor("ASHBY_BOARDS"),
    url: (t) => `https://api.ashbyhq.com/posting-api/job-board/${t}`,
    count: (d) => (Array.isArray(d?.jobs) ? d.jobs.length : null),
  },
];

let bad = 0;
for (const provider of providers) {
  console.log(`\n${provider.name} (${provider.boards.length} boards)`);
  for (const board of provider.boards) {
    try {
      const res = await fetch(provider.url(board.token), {
        headers: { "User-Agent": UA, Accept: "application/json" },
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) {
        bad++;
        console.log(`  FAIL ${board.company.padEnd(14)} HTTP ${res.status}`);
        continue;
      }
      const count = provider.count(await res.json());
      if (count === null) {
        bad++;
        console.log(`  FAIL ${board.company.padEnd(14)} unexpected shape`);
      } else if (count === 0) {
        bad++;
        console.log(`  FAIL ${board.company.padEnd(14)} 0 published jobs`);
      } else {
        console.log(`  ok   ${board.company.padEnd(14)} ${count} published jobs`);
      }
    } catch (error) {
      bad++;
      console.log(`  FAIL ${board.company.padEnd(14)} ${String(error).slice(0, 60)}`);
    }
  }
}

console.log(bad === 0 ? "\nAll boards verified." : `\n${bad} board(s) need attention.`);
process.exit(bad === 0 ? 0 : 1);
