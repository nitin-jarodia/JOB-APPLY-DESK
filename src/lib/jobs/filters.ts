import type { LocationFit } from "./types";

const INDIA_PLACES =
  /\b(india|indian|bharat|bengaluru|bangalore|hyderabad|pune|mumbai|bombay|new delhi|delhi|ncr|gurgaon|gurugram|noida|chennai|madras|kolkata|calcutta|ahmedabad|jaipur|indore|kochi|cochin|trivandrum|thiruvananthapuram|coimbatore|nagpur|surat|vadodara|chandigarh|bhubaneswar|mysuru|mysore|visakhapatnam|mohali|gandhinagar)\b/i;

const WORLDWIDE =
  /\b(worldwide|world wide|anywhere|global|globally|fully remote|remote - global|remote \(global\)|international|any location|location independent|work from anywhere)\b/i;

/** Regions that are India-inclusive when a posting names a broad area. */
const INDIA_INCLUSIVE_REGIONS = /\b(apac|asia[- ]pacific|asia|emea\s*\(.*india.*\)|south asia)\b/i;

/** Regions that clearly do not contain India, used when reading exclusion clauses. */
const NON_INDIA_REGIONS =
  /\b(united states|u\.?s\.?a?\b|us only|usa only|canada|canadian|mexico|brazil|argentina|colombia|latam|latin america|americas|north america|northern america|emea|europe|european|eu\b|uk\b|united kingdom|england|ireland|germany|france|spain|portugal|poland|netherlands|israel|australia|new zealand|japan|singapore|philippines|indonesia|vietnam|thailand|malaysia|korea|china|taiwan|hong kong|africa|nigeria|kenya|south africa|dubai|uae|saudi|qatar)\b/i;

/** Words that describe how a role is worked rather than where. */
const WORK_MODE_WORDS =
  /\b(remote|remotely|hybrid|on.?site|in.?office|work from home|wfh|flexible|distributed|full.?time|part.?time|permanent|contract|intern(?:ship)?|office|based)\b/gi;

const EXCLUSION_PHRASES = [
  /must (?:be (?:located|based|residing|a resident)|reside|live) in\b/i,
  /must be (?:legally )?(?:authorized|authorised|eligible) to work in\b/i,
  /(?:require|requires|requiring) (?:work )?authorization in\b/i,
  /only (?:accepting|considering) (?:candidates|applicants) (?:located |based |residing )?in\b/i,
  /(?:candidates|applicants) must be (?:located|based) in\b/i,
  /this (?:role|position) is (?:only )?open to (?:candidates|applicants|residents) (?:located |based |in )\b/i,
  /we (?:are )?(?:can )?only (?:hire|employ)\b/i,
];

const SENIOR_TITLE =
  /\b(senior|sr\.?|staff|principal|distinguished|fellow|lead|leader|leading|head|director|vp|vice president|chief|architect|manager|mgr|supervisor|expert)\b/i;

/**
 * Numeric and roman level markers that mean "above entry level":
 * "Software Engineer 3", "SDE 2", "Engineer II", "(L3)".
 */
const SENIOR_LEVEL =
  /(?:\b(?:l|lvl|level)\s*-?\s*[2-9]\b)|(?:\b(?:engineer|developer|sde|swe|programmer|scientist|analyst)\s*[-–—]?\s*(?:[2-9]|i{2,3}|iv|vi?)\b)/i;

const SOFTWARE_TITLE =
  /\b(software|engineer|engineering|developer|development|sde|sdet|swe|programmer|full.?stack|back.?end|front.?end|web dev|webdev|platform|infrastructure|devops|site reliability|sre)\b/i;

/** Roles that match SOFTWARE_TITLE by accident or are a different discipline. */
const OFF_TARGET_TITLE =
  /\b(sales|account|pre.?sales|solutions?|field|customer|client|success|support|recruit|recruiting|recruiter|talent|sourcer|marketing|growth marketing|content|copywriter|writer|editor|designer|design|ux|ui designer|hr\b|people ops|finance|accounting|audit|legal|counsel|compliance|operations|mechanical|electrical|electronics hardware|civil|chemical|industrial|biomedical|aerospace|automotive|manufacturing|process|hardware|firmware|embedded|asic|vlsi|rf\b|network engineer|security engineer|soc analyst|qa contributor|annotat|labeler|labelling|tutor|teacher|trainer|nurse|driver|warehouse|picker|technician|teleca|chat specialist|virtual assistant|bookkeep|business development|representative|\bbdr\b|\bsdr\b|analyst|consultant|advocate|evangelist|partnerships?|procurement|payroll|administrative|executive)\b/i;

const JUNIOR_TITLE =
  /\b(intern|interns|internship|new.?grad|newgrad|grad\b|graduate|campus|trainee|traineeship|apprentice|apprenticeship|junior|jr\.?|entry.?level|entry level|associate|fresher|early career|earlycareer|rotational|sde.?[-\s]?(?:1|i)\b|swe.?[-\s]?(?:1|i)\b|engineer.?[-\s]?(?:1|i)\b|developer.?[-\s]?(?:1|i)\b|level.?[-\s]?1\b|l1\b|campus hire|university)\b/i;

const JUNIOR_DESCRIPTION =
  /\b(new grad|new.grad|recent graduate|final year|final.year|graduating in|campus hire|university hire|entry.level|fresher|no prior experience|0\s*[-–to]+\s*[12]\s*years?|internship program)\b/i;

export type LocationInput = {
  /** Human readable location text from the source. */
  text: string;
  /** Hard country allow-list when the source provides one (Himalayas). */
  countries?: string[];
  /** UTC offsets the role allows, when the source provides them (Himalayas). */
  timezones?: number[];
  remoteFlag?: boolean;
  description?: string;
};

export type LocationVerdict =
  | { ok: true; fit: LocationFit; isRemote: boolean; reason: string }
  | { ok: false; reason: string };

const INDIA_UTC_OFFSET = 5.5;

function descriptionExcludesIndia(description: string | undefined): string | null {
  if (!description) return null;
  for (const phrase of EXCLUSION_PHRASES) {
    const match = phrase.exec(description);
    if (!match) continue;
    // Look at the clause right after the phrase: if it names India, it is an
    // inclusion rather than an exclusion.
    const tail = description.slice(match.index, match.index + 240);
    if (INDIA_PLACES.test(tail) || INDIA_INCLUSIVE_REGIONS.test(tail)) continue;
    if (NON_INDIA_REGIONS.test(tail)) {
      return tail.replace(/\s+/g, " ").slice(0, 120);
    }
  }
  return null;
}

export function classifyLocation(input: LocationInput): LocationVerdict {
  const text = (input.text ?? "").trim();
  const remoteFlag = Boolean(input.remoteFlag) || /\bremote\b/i.test(text);

  if (input.countries && input.countries.length > 0) {
    const hasIndia = input.countries.some((country) => INDIA_PLACES.test(country));
    if (!hasIndia) {
      return {
        ok: false,
        reason: `restricted to ${input.countries.slice(0, 3).join(", ")}`,
      };
    }
    return {
      ok: true,
      fit: remoteFlag ? "remote-india" : "india",
      isRemote: remoteFlag,
      reason: "country list includes India",
    };
  }

  if (input.timezones && input.timezones.length > 0 && !input.timezones.includes(INDIA_UTC_OFFSET)) {
    return { ok: false, reason: "timezone window excludes IST (UTC+5:30)" };
  }

  const excluded = descriptionExcludesIndia(input.description);

  if (INDIA_PLACES.test(text)) {
    return {
      ok: true,
      fit: remoteFlag ? "remote-india" : "india",
      isRemote: remoteFlag,
      reason: "location names India",
    };
  }

  if (!text && !remoteFlag) {
    return { ok: false, reason: "no location given" };
  }

  const indiaInclusive = INDIA_INCLUSIVE_REGIONS.test(text);
  if (indiaInclusive) {
    if (excluded) {
      return { ok: false, reason: `description excludes India: "${excluded}"` };
    }
    return { ok: true, fit: "remote-india", isRemote: true, reason: "region includes India" };
  }

  // Anything left over after removing work-mode words is a place name. A remote
  // role is only treated as open worldwide when it names no place at all, so
  // "Remote - Colombia" is rejected rather than read as global.
  const placeResidue = text
    .replace(WORK_MODE_WORDS, " ")
    .replace(/[(),./|–—-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const explicitlyWorldwide = WORLDWIDE.test(text);
  const bareRemote = remoteFlag && placeResidue.length === 0;

  if (explicitlyWorldwide || bareRemote) {
    if (excluded) {
      return { ok: false, reason: `description excludes India: "${excluded}"` };
    }
    return {
      ok: true,
      fit: "worldwide-remote",
      isRemote: true,
      reason: explicitlyWorldwide
        ? "posted as worldwide remote"
        : "remote with no country restriction",
    };
  }

  return { ok: false, reason: `scoped to ${text.slice(0, 60) || "an unnamed place"}` };
}

/**
 * Smallest number of years of experience the posting asks for, or null when it
 * never says. Ranges contribute their lower bound.
 */
export function minimumYearsRequired(description: string): number | null {
  if (!description) return null;
  const windowed = description.slice(0, 12000);
  const patterns = [
    // "1-3 years", "1 year to 3 years", "2 to 4 years" — the lower bound wins.
    /(\d{1,2})\s*(?:\+|plus)?\s*years?\s*(?:[-–—]|to)\s*(?:\d{1,2})\s*\+?\s*years?/gi,
    /(\d{1,2})\s*(?:\+|plus)?\s*(?:[-–—]|to)\s*(?:\d{1,2})\s*\+?\s*years?/gi,
    /(\d{1,2})\s*\+\s*years?/gi,
    /(?:minimum|at least|min\.?)\s*(?:of\s*)?(\d{1,2})\s*\+?\s*years?/gi,
    /(\d{1,2})\s*years?\s+(?:of\s+)?(?:relevant\s+|professional\s+|industry\s+|hands.on\s+)?experience/gi,
  ];
  const found: number[] = [];
  for (const pattern of patterns) {
    for (const match of windowed.matchAll(pattern)) {
      const lower = Number.parseInt(match[1], 10);
      if (Number.isFinite(lower) && lower >= 0 && lower <= 30) found.push(lower);
    }
  }
  if (found.length === 0) return null;
  return Math.min(...found);
}

export type SeniorityInput = {
  title: string;
  description: string;
  /** Seniority labels the source already assigned, e.g. Himalayas. */
  sourceSeniority?: string[];
};

export type SeniorityVerdict = { ok: true; reason: string } | { ok: false; reason: string };

export function classifySeniority(input: SeniorityInput): SeniorityVerdict {
  const title = (input.title ?? "").trim();
  if (!title) return { ok: false, reason: "no title" };

  if (OFF_TARGET_TITLE.test(title)) {
    return { ok: false, reason: "title is not a software engineering role" };
  }
  if (!SOFTWARE_TITLE.test(title)) {
    return { ok: false, reason: "title is not a software engineering role" };
  }

  // "Associate" alone is junior, but "Associate Director" is not, so the
  // senior word is checked first and wins.
  const seniorMatch = SENIOR_TITLE.exec(title);
  if (seniorMatch) {
    return { ok: false, reason: `title says "${seniorMatch[0]}"` };
  }
  const levelMatch = SENIOR_LEVEL.exec(title);
  if (levelMatch) {
    return { ok: false, reason: `title is level "${levelMatch[0].trim()}"` };
  }

  const description = input.description ?? "";
  const minYears = minimumYearsRequired(description);
  if (minYears !== null && minYears > 2) {
    return { ok: false, reason: `asks for ${minYears}+ years of experience` };
  }

  // A posting has to actively signal early career. Merely failing to mention
  // seniority is not enough, or every mid-level role would qualify.
  if (JUNIOR_TITLE.test(title)) {
    return { ok: true, reason: "title names an early-career role" };
  }
  if ((input.sourceSeniority ?? []).some((level) => /entry|intern|junior|graduate/i.test(level))) {
    return { ok: true, reason: "source marks it entry-level" };
  }
  if (JUNIOR_DESCRIPTION.test(description)) {
    return { ok: true, reason: "description targets new graduates" };
  }

  return { ok: false, reason: "no early-career signal in title or description" };
}
