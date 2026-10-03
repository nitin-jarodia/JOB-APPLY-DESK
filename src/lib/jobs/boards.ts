/**
 * Board tokens are only listed here after a real GET against the provider's
 * public JSON endpoint returned published jobs. Tokens that 404 were dropped.
 * Re-verify with `npm run verify:boards` before adding to these lists.
 */

export type Board = { token: string; company: string };

export const GREENHOUSE_BOARDS: Board[] = [
  { token: "groww", company: "Groww" },
  { token: "druva", company: "Druva" },
  { token: "netskope", company: "Netskope" },
  { token: "databricks", company: "Databricks" },
  { token: "stripe", company: "Stripe" },
  { token: "twilio", company: "Twilio" },
  { token: "gitlab", company: "GitLab" },
  { token: "mongodb", company: "MongoDB" },
  { token: "elastic", company: "Elastic" },
  { token: "datadog", company: "Datadog" },
  { token: "coinbase", company: "Coinbase" },
  { token: "samsara", company: "Samsara" },
  { token: "zscaler", company: "Zscaler" },
  { token: "rubrik", company: "Rubrik" },
  { token: "anthropic", company: "Anthropic" },
  { token: "okta", company: "Okta" },
  { token: "newrelic", company: "New Relic" },
  { token: "sumologic", company: "Sumo Logic" },
  { token: "turing", company: "Turing" },
];

export const LEVER_BOARDS: Board[] = [
  { token: "paytm", company: "Paytm" },
  { token: "meesho", company: "Meesho" },
  { token: "matillion", company: "Matillion" },
];

export const ASHBY_BOARDS: Board[] = [
  { token: "openai", company: "OpenAI" },
  { token: "cursor", company: "Cursor" },
  { token: "atlan", company: "Atlan" },
];

/**
 * Himalayas' public search ignores `limit` and `offset`, and changing `query`
 * returns the same page, so only `country` and `seniority` actually vary the
 * result set. Running more keyword variants would just refetch identical rows,
 * so this is kept to the two combinations that differ.
 */
export const HIMALAYAS_QUERIES: { query: string; country?: string; seniority: string }[] = [
  { query: "software engineer", country: "India", seniority: "Entry-level" },
  { query: "software engineer intern", seniority: "Entry-level" },
];
