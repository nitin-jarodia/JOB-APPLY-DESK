/**
 * A small, hand-maintained vocabulary of technologies that show up in software
 * job postings.
 *
 * Matching is deliberately conservative. Every alias here has to survive being
 * run against thousands of lines of marketing copy in real job descriptions, so
 * ambiguous surface forms are left out on purpose rather than risking a false
 * claim about what someone knows. Cases worth remembering:
 *
 * - bare `go` is excluded because the English verb is everywhere
 * - bare `spring` is excluded because intern postings say "Spring 2026"
 * - bare `rest` is excluded because "the rest of the team" is not an API
 * - bare `ml` is excluded because of millilitres and stray initialisms
 * - `Render` (the host) is excluded because "render" is routine frontend prose
 */

export type SkillFamily =
  | "language"
  | "frontend"
  | "backend"
  | "database"
  | "ai"
  | "devops"
  | "cloud"
  | "mobile"
  | "data"
  | "testing"
  | "practice";

export type CanonicalSkill = {
  id: string;
  label: string;
  family: SkillFamily;
  /** Lowercase surface forms. Longer ones are matched first. */
  aliases: string[];
};

export const CANONICAL_SKILLS: CanonicalSkill[] = [
  /* -------------------------------- languages ------------------------------- */
  { id: "python", label: "Python", family: "language", aliases: ["python", "python3"] },
  {
    id: "javascript",
    label: "JavaScript",
    family: "language",
    aliases: ["javascript", "ecmascript", "es6", "js"],
  },
  { id: "typescript", label: "TypeScript", family: "language", aliases: ["typescript"] },
  { id: "cpp", label: "C++", family: "language", aliases: ["c++", "cpp"] },
  { id: "c", label: "C", family: "language", aliases: ["c programming", "c language"] },
  { id: "java", label: "Java", family: "language", aliases: ["java"] },
  { id: "csharp", label: "C#", family: "language", aliases: ["c#", "c sharp"] },
  {
    id: "golang",
    label: "Go",
    family: "language",
    aliases: ["golang", "go programming", "go language", "go developer"],
  },
  { id: "ruby", label: "Ruby", family: "language", aliases: ["ruby"] },
  { id: "php", label: "PHP", family: "language", aliases: ["php"] },
  { id: "rust", label: "Rust", family: "language", aliases: ["rust"] },
  { id: "scala", label: "Scala", family: "language", aliases: ["scala"] },
  { id: "elixir", label: "Elixir", family: "language", aliases: ["elixir"] },
  { id: "shell", label: "Shell scripting", family: "language", aliases: ["bash", "shell scripting", "powershell"] },

  /* -------------------------------- frontend -------------------------------- */
  { id: "react", label: "React", family: "frontend", aliases: ["react", "react.js", "reactjs"] },
  { id: "nextjs", label: "Next.js", family: "frontend", aliases: ["next.js", "nextjs"] },
  { id: "vue", label: "Vue", family: "frontend", aliases: ["vue", "vue.js", "vuejs"] },
  { id: "angular", label: "Angular", family: "frontend", aliases: ["angular", "angularjs"] },
  { id: "svelte", label: "Svelte", family: "frontend", aliases: ["svelte", "sveltekit"] },
  { id: "redux", label: "Redux", family: "frontend", aliases: ["redux"] },
  { id: "html", label: "HTML", family: "frontend", aliases: ["html", "html5"] },
  { id: "css", label: "CSS", family: "frontend", aliases: ["css", "css3"] },
  { id: "tailwind", label: "Tailwind CSS", family: "frontend", aliases: ["tailwind", "tailwindcss"] },
  { id: "sass", label: "Sass", family: "frontend", aliases: ["sass", "scss"] },
  { id: "webpack", label: "Webpack", family: "frontend", aliases: ["webpack"] },
  { id: "vite", label: "Vite", family: "frontend", aliases: ["vite"] },
  {
    id: "accessibility",
    label: "Web accessibility",
    family: "frontend",
    // Bare "accessibility" is excluded: postings use it for hiring
    // accommodations far more often than for WCAG work.
    aliases: ["web accessibility", "accessible design", "a11y", "wcag"],
  },
  {
    id: "responsive-design",
    label: "Responsive design",
    family: "frontend",
    aliases: ["responsive design", "responsive web", "cross-browser"],
  },

  /* --------------------------------- backend -------------------------------- */
  { id: "nodejs", label: "Node.js", family: "backend", aliases: ["node.js", "nodejs", "node js"] },
  { id: "express", label: "Express", family: "backend", aliases: ["express.js", "expressjs"] },
  { id: "fastapi", label: "FastAPI", family: "backend", aliases: ["fastapi", "fast api"] },
  { id: "django", label: "Django", family: "backend", aliases: ["django"] },
  { id: "flask", label: "Flask", family: "backend", aliases: ["flask"] },
  {
    id: "spring",
    label: "Spring",
    family: "backend",
    aliases: ["spring boot", "springboot", "spring framework", "spring mvc"],
  },
  { id: "rails", label: "Ruby on Rails", family: "backend", aliases: ["ruby on rails", "rails"] },
  { id: "laravel", label: "Laravel", family: "backend", aliases: ["laravel"] },
  { id: "dotnet", label: ".NET", family: "backend", aliases: [".net", "dotnet", "asp.net"] },
  {
    id: "rest",
    label: "REST APIs",
    family: "backend",
    aliases: ["rest api", "rest apis", "restful", "rest endpoints", "rest services", "rest integration"],
  },
  { id: "graphql", label: "GraphQL", family: "backend", aliases: ["graphql"] },
  { id: "grpc", label: "gRPC", family: "backend", aliases: ["grpc"] },
  {
    id: "microservices",
    label: "Microservices",
    family: "backend",
    aliases: ["microservice", "microservices", "service-oriented architecture"],
  },
  { id: "kafka", label: "Kafka", family: "backend", aliases: ["kafka"] },
  { id: "rabbitmq", label: "RabbitMQ", family: "backend", aliases: ["rabbitmq"] },
  { id: "celery", label: "Celery", family: "backend", aliases: ["celery"] },
  { id: "websockets", label: "WebSockets", family: "backend", aliases: ["websocket", "websockets"] },
  {
    id: "sqlalchemy",
    label: "SQLAlchemy",
    family: "backend",
    aliases: ["sqlalchemy", "alembic"],
  },

  /* -------------------------------- databases ------------------------------- */
  { id: "sql", label: "SQL", family: "database", aliases: ["sql"] },
  {
    id: "postgresql",
    label: "PostgreSQL",
    family: "database",
    aliases: ["postgresql", "postgres", "postgre sql"],
  },
  { id: "mysql", label: "MySQL", family: "database", aliases: ["mysql", "mariadb"] },
  { id: "sqlite", label: "SQLite", family: "database", aliases: ["sqlite"] },
  { id: "mongodb", label: "MongoDB", family: "database", aliases: ["mongodb", "mongo"] },
  { id: "redis", label: "Redis", family: "database", aliases: ["redis"] },
  { id: "dynamodb", label: "DynamoDB", family: "database", aliases: ["dynamodb"] },
  { id: "cassandra", label: "Cassandra", family: "database", aliases: ["cassandra"] },
  {
    id: "elasticsearch",
    label: "Elasticsearch",
    family: "database",
    aliases: ["elasticsearch", "opensearch"],
  },
  { id: "snowflake", label: "Snowflake", family: "database", aliases: ["snowflake"] },
  { id: "bigquery", label: "BigQuery", family: "database", aliases: ["bigquery"] },
  { id: "prisma", label: "Prisma", family: "database", aliases: ["prisma"] },

  /* ----------------------------------- AI ----------------------------------- */
  {
    id: "machine-learning",
    label: "Machine learning",
    family: "ai",
    aliases: ["machine learning", "ml engineering", "ml models", "ml pipelines", "supervised learning"],
  },
  { id: "deep-learning", label: "Deep learning", family: "ai", aliases: ["deep learning", "neural network", "neural networks"] },
  { id: "nlp", label: "NLP", family: "ai", aliases: ["nlp", "natural language processing"] },
  {
    id: "llm",
    label: "LLM applications",
    family: "ai",
    // "Generative AI" folds in here rather than standing alone. Split apart,
    // a posting saying "generative AI" produced a gap for someone whose
    // resume already says "LLM applications", which is the same work.
    aliases: [
      "llm",
      "llms",
      "large language model",
      "large language models",
      "generative ai",
      "gen ai",
      "genai",
      "ai applications",
      "ai-powered",
    ],
  },
  { id: "pytorch", label: "PyTorch", family: "ai", aliases: ["pytorch", "torch"] },
  { id: "tensorflow", label: "TensorFlow", family: "ai", aliases: ["tensorflow", "keras"] },
  { id: "scikit-learn", label: "scikit-learn", family: "ai", aliases: ["scikit-learn", "scikit learn", "sklearn"] },
  { id: "pandas", label: "pandas", family: "ai", aliases: ["pandas"] },
  { id: "numpy", label: "NumPy", family: "ai", aliases: ["numpy"] },
  {
    id: "embeddings",
    label: "Embeddings",
    family: "ai",
    aliases: ["embedding", "embeddings", "sentence transformers", "cosine similarity", "minilm"],
  },
  {
    id: "vector-search",
    label: "Vector search",
    family: "ai",
    aliases: ["vector database", "vector search", "pinecone", "weaviate", "faiss", "pgvector"],
  },
  { id: "rag", label: "Retrieval-augmented generation", family: "ai", aliases: ["retrieval-augmented", "retrieval augmented", "rag pipeline"] },
  { id: "prompt-engineering", label: "Prompt engineering", family: "ai", aliases: ["prompt engineering", "prompt design"] },
  { id: "langchain", label: "LangChain", family: "ai", aliases: ["langchain", "llamaindex"] },
  { id: "huggingface", label: "Hugging Face", family: "ai", aliases: ["hugging face", "huggingface", "transformers library"] },
  { id: "computer-vision", label: "Computer vision", family: "ai", aliases: ["computer vision", "opencv", "image recognition"] },
  { id: "mlops", label: "MLOps", family: "ai", aliases: ["mlops", "model deployment", "model serving"] },
  {
    id: "model-evaluation",
    label: "Model evaluation",
    family: "ai",
    // "annotation" is excluded because Java and typing use the same word.
    aliases: ["model evaluation", "evaluation guidelines", "data annotation", "rubric", "red teaming", "human feedback", "rlhf"],
  },
  { id: "random-forest", label: "Random Forest", family: "ai", aliases: ["random forest", "decision tree", "xgboost"] },

  /* --------------------------------- devops --------------------------------- */
  { id: "docker", label: "Docker", family: "devops", aliases: ["docker", "containerization", "containerisation"] },
  { id: "kubernetes", label: "Kubernetes", family: "devops", aliases: ["kubernetes", "k8s", "helm"] },
  { id: "terraform", label: "Terraform", family: "devops", aliases: ["terraform"] },
  { id: "ansible", label: "Ansible", family: "devops", aliases: ["ansible", "puppet", "chef configuration"] },
  { id: "jenkins", label: "Jenkins", family: "devops", aliases: ["jenkins"] },
  {
    id: "github-actions",
    label: "GitHub Actions",
    family: "devops",
    aliases: ["github actions"],
  },
  {
    id: "ci-cd",
    label: "CI/CD",
    family: "devops",
    aliases: ["ci/cd", "cicd", "continuous integration", "continuous delivery", "continuous deployment", "gitlab ci", "circleci"],
  },
  { id: "linux", label: "Linux", family: "devops", aliases: ["linux", "unix"] },
  { id: "nginx", label: "Nginx", family: "devops", aliases: ["nginx"] },
  { id: "observability", label: "Observability", family: "devops", aliases: ["prometheus", "grafana", "datadog", "observability", "opentelemetry"] },

  /* ---------------------------------- cloud --------------------------------- */
  { id: "aws", label: "AWS", family: "cloud", aliases: ["aws", "amazon web services"] },
  { id: "gcp", label: "Google Cloud", family: "cloud", aliases: ["gcp", "google cloud"] },
  { id: "azure", label: "Azure", family: "cloud", aliases: ["azure"] },
  { id: "serverless", label: "Serverless", family: "cloud", aliases: ["serverless", "aws lambda", "cloud functions"] },
  { id: "vercel", label: "Vercel", family: "cloud", aliases: ["vercel", "netlify"] },

  /* --------------------------------- mobile --------------------------------- */
  { id: "android", label: "Android", family: "mobile", aliases: ["android", "jetpack compose"] },
  { id: "ios", label: "iOS", family: "mobile", aliases: ["ios", "swiftui", "objective-c"] },
  { id: "swift", label: "Swift", family: "mobile", aliases: ["swift"] },
  { id: "kotlin", label: "Kotlin", family: "mobile", aliases: ["kotlin"] },
  { id: "react-native", label: "React Native", family: "mobile", aliases: ["react native"] },
  { id: "flutter", label: "Flutter", family: "mobile", aliases: ["flutter", "dart"] },

  /* ---------------------------------- data ---------------------------------- */
  { id: "spark", label: "Spark", family: "data", aliases: ["spark", "pyspark", "hadoop"] },
  { id: "airflow", label: "Airflow", family: "data", aliases: ["airflow", "dagster", "prefect"] },
  { id: "dbt", label: "dbt", family: "data", aliases: ["dbt"] },
  { id: "etl", label: "ETL pipelines", family: "data", aliases: ["etl", "elt", "data pipeline", "data pipelines", "data warehouse"] },
  { id: "bi", label: "BI dashboards", family: "data", aliases: ["tableau", "power bi", "looker"] },

  /* --------------------------------- testing -------------------------------- */
  { id: "unit-testing", label: "Automated testing", family: "testing", aliases: ["unit test", "unit tests", "unit testing", "automated tests", "automated testing", "test coverage", "tdd"] },
  { id: "pytest", label: "pytest", family: "testing", aliases: ["pytest"] },
  { id: "jest", label: "Jest", family: "testing", aliases: ["jest", "vitest"] },
  { id: "e2e-testing", label: "End-to-end testing", family: "testing", aliases: ["cypress", "playwright", "selenium", "end-to-end testing"] },

  /* -------------------------------- practice -------------------------------- */
  { id: "git", label: "Git", family: "practice", aliases: ["git"] },
  { id: "github", label: "GitHub", family: "practice", aliases: ["github", "gitlab", "bitbucket"] },
  { id: "agile", label: "Agile", family: "practice", aliases: ["agile", "scrum", "kanban"] },
  {
    id: "algorithms",
    label: "Data structures and algorithms",
    family: "practice",
    // "problem solving" is excluded: it appears in almost every posting and
    // would add a constant to every score without separating anything.
    aliases: ["data structures", "algorithms", "leetcode", "competitive programming"],
  },
  { id: "oop", label: "Object-oriented programming", family: "practice", aliases: ["object-oriented", "object oriented", "oop"] },
  { id: "system-design", label: "System design", family: "practice", aliases: ["system design", "distributed systems", "scalable systems", "high availability"] },
  { id: "operating-systems", label: "Operating systems", family: "practice", aliases: ["operating systems"] },
  { id: "networking", label: "Computer networking", family: "practice", aliases: ["computer networks", "networking protocols", "tcp/ip"] },
  { id: "databases-theory", label: "Database management", family: "practice", aliases: ["database management", "dbms", "query optimization", "database design"] },
  {
    id: "auth",
    label: "Authentication and access control",
    family: "practice",
    aliases: ["authentication", "authorization", "oauth", "jwt", "role-based access", "rbac", "bcrypt"],
  },
  { id: "security", label: "Application security", family: "practice", aliases: ["application security", "secure coding", "penetration testing", "owasp"] },
  {
    id: "embedded",
    label: "Embedded systems",
    family: "practice",
    // Bare "embedded" is excluded: "embedded in the team" is common prose.
    aliases: ["embedded systems", "embedded c", "firmware", "rtos", "microcontroller", "verilog", "vhdl", "vlsi"],
  },
];

const SKILLS_BY_ID = new Map(CANONICAL_SKILLS.map((skill) => [skill.id, skill]));

export function getSkill(id: string): CanonicalSkill | undefined {
  return SKILLS_BY_ID.get(id);
}

/**
 * Alias characters that must not sit directly beside a match. Without this,
 * `sql` matches inside `postgresql` and `git` matches inside `github`.
 */
const LEFT_BOUNDARY = "(?<![a-z0-9+#._-])";
const RIGHT_BOUNDARY = "(?![a-z0-9+#_-])";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

type CompiledAlias = { skillId: string; pattern: RegExp; length: number };

/**
 * Longest alias first so that `react native` is consumed before `react` and
 * `machine learning` before `learning`.
 */
const COMPILED_ALIASES: CompiledAlias[] = CANONICAL_SKILLS.flatMap((skill) =>
  skill.aliases.map((alias) => ({
    skillId: skill.id,
    length: alias.length,
    pattern: new RegExp(`${LEFT_BOUNDARY}${escapeRegExp(alias)}${RIGHT_BOUNDARY}`, "g"),
  })),
).sort((a, b) => b.length - a.length);

export type SkillHit = {
  id: string;
  label: string;
  family: SkillFamily;
  count: number;
};

/** Never appears in real text, so a masked span can never be matched again. */
const MASK = "\u0000";

export function normalizeForMatching(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\s+/g, " ");
}

/**
 * Finds every known skill mentioned in a block of text. Matched spans are
 * blanked out as they are consumed, so a single mention is only ever credited
 * to one skill.
 */
export function findSkills(text: string): Map<string, SkillHit> {
  const hits = new Map<string, SkillHit>();
  if (!text) return hits;

  let working = normalizeForMatching(text);

  for (const alias of COMPILED_ALIASES) {
    alias.pattern.lastIndex = 0;
    const spans: [number, number][] = [];
    let match: RegExpExecArray | null;
    while ((match = alias.pattern.exec(working)) !== null) {
      spans.push([match.index, match.index + match[0].length]);
      if (match[0].length === 0) alias.pattern.lastIndex += 1;
    }
    if (spans.length === 0) continue;

    const skill = SKILLS_BY_ID.get(alias.skillId);
    if (!skill) continue;

    const existing = hits.get(skill.id);
    if (existing) {
      existing.count += spans.length;
    } else {
      hits.set(skill.id, {
        id: skill.id,
        label: skill.label,
        family: skill.family,
        count: spans.length,
      });
    }

    let masked = "";
    let cursor = 0;
    for (const [start, end] of spans) {
      masked += working.slice(cursor, start) + MASK.repeat(end - start);
      cursor = end;
    }
    working = masked + working.slice(cursor);
  }

  return hits;
}
