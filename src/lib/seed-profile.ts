import type { Profile } from "./profile-schema";

/**
 * The seeded master resume. Every value here is supplied by the owner of this
 * desk and must never be embellished, re-dated, or expanded by the app.
 *
 * Phone and email are deliberately left as placeholders rather than real
 * values. This file is committed, so anything in it is public and reachable by
 * address scrapers, while `data/profile.json` is git-ignored. Fill both in on
 * the profile page after the first run; the saved copy stays on your machine.
 */
export const SEED_PROFILE: Profile = {
  contact: {
    name: "Nitin Jarodia",
    phone: "+91 00000 00000",
    email: "you@example.com",
    linkedin: "https://linkedin.com/in/nitin-jarodia-a081222a3",
    github: "https://github.com/nitin-jarodia",
    leetcode: "https://leetcode.com/u/nitin_jarodia016",
  },
  summary:
    "Final-year B.Tech student at IIIT Surat seeking software engineering roles. Builds full-stack applications with React, Next.js, FastAPI, PostgreSQL, and Docker, and reviews LLM outputs for factual accuracy, reasoning, and instruction following.",
  skillGroups: [
    {
      id: "languages",
      label: "Languages",
      skills: ["Python", "JavaScript", "TypeScript", "SQL", "C++"],
    },
    {
      id: "frameworks",
      label: "Frameworks",
      skills: ["React", "Next.js", "FastAPI", "REST APIs"],
    },
    {
      id: "ai-ml",
      label: "AI / ML",
      skills: [
        "scikit-learn",
        "Random Forest",
        "Sentence Transformers",
        "embeddings",
        "cosine similarity",
        "NLP",
        "LLM applications",
      ],
    },
    {
      id: "databases",
      label: "Databases",
      skills: ["PostgreSQL", "Redis", "SQLite"],
    },
    {
      id: "tools",
      label: "Tools",
      skills: [
        "Git",
        "GitHub",
        "GitHub Actions",
        "Docker",
        "Vercel",
        "Render",
      ],
    },
  ],
  experience: [
    {
      id: "xelronai",
      role: "AI Data Training Specialist",
      organization: "XelronAI & Airdawg Labs",
      location: "Remote",
      period: "Mar 2026 – Jun 2026",
      bullets: [
        "Reviewed multi-domain LLM answers for factual accuracy, instruction following, reasoning quality, and rubric compliance.",
        "Reproduced edge cases with ML engineers and documented recurring failure patterns in model behavior.",
        "Wrote evaluation guidelines that made scoring more consistent across reviewers.",
      ],
    },
  ],
  projects: [
    {
      id: "student-performance-tracker",
      name: "AI Student Performance Tracker",
      stack: [
        "React",
        "FastAPI",
        "PostgreSQL",
        "scikit-learn",
        "Gemini",
        "Redis",
        "Docker",
      ],
      bullets: [
        "Built a role-based analytics platform for admins, teachers, and students covering marks, attendance, reports, messaging, and academic risk.",
        "Classified students as Low, Medium, or High risk with a Random Forest model and a rule-based fallback on marks, attendance, trends, and failed subjects.",
        "Integrated Google Gemini for report drafts and a natural-language assistant that runs only validated SQLAlchemy actions, not model-written SQL.",
        "Shipped JWT refresh tokens in HttpOnly cookies, role-based access control, Alembic migrations, Redis caching, Docker, automated tests, and GitHub Actions CI.",
      ],
    },
    {
      id: "smart-hiring-resume-scorer",
      name: "Smart Hiring and Resume Scorer",
      stack: [
        "Next.js",
        "TypeScript",
        "FastAPI",
        "SQLite",
        "Sentence Transformers",
        "Docker",
      ],
      bullets: [
        "Built recruiter and candidate workflows for job posts, resume screening, ranking, applications, analytics, and interview scheduling.",
        "Ranked resumes against job descriptions with MiniLM embeddings, cosine similarity, and checks for skills, experience, education, and formatting.",
        "Added semantic candidate search over 384-dimensional MiniLM vectors, plus skill normalization, project-relevance scoring, evidence extraction, and heuristic fraud-risk flags.",
        "Implemented JWT authentication, bcrypt password hashing, role-based access control, SQLAlchemy, PDF and DOCX parsing, GitHub REST integration, and Docker.",
      ],
    },
  ],
  education: [
    {
      id: "iiit-surat",
      institution: "Indian Institute of Information Technology, Surat",
      location: "Surat, Gujarat",
      period: "2023 – 2027",
      degree:
        "Bachelor of Technology in Electronics and Communication Engineering",
      score: "CGPA: 6.73/10",
      coursework: [
        "Data Structures and Algorithms",
        "Object-Oriented Programming",
        "Database Management Systems",
        "Operating Systems",
        "Computer Networks",
      ],
    },
  ],
  achievements: [
    "Solved 450+ data structures and algorithms problems on LeetCode, Codeforces, and GeeksforGeeks.",
  ],
  preferences: {
    roleTypes: [
      "Software engineering internships",
      "New-grad roles",
      "Junior roles",
    ],
    roleFunctions: [
      "Full-stack",
      "Backend",
      "Frontend",
      "AI-application engineering",
    ],
    locations: [
      "Anywhere in India",
      "Remote roles open to India",
      "Worldwide-remote roles that do not exclude India",
    ],
    graduationYear: "2027",
    needsVisaSponsorshipInIndia: false,
    notes:
      "Final-year student graduating in 2027. Does not need visa sponsorship inside India.",
  },
};

export const PROFILE_SCHEMA_VERSION = 1;
