import { BoundariesNote } from "@/components/boundaries-note";
import { JobsBoard } from "@/components/jobs/jobs-board";

export const metadata = {
  title: "Jobs · Job Apply Desk",
};

export default function JobsPage() {
  return (
    <main className="mx-auto w-full max-w-5xl grow px-4 pb-16 sm:px-6">
      <header className="flex flex-col gap-2 py-6">
        <h1 className="font-heading text-xl font-semibold tracking-tight sm:text-2xl">
          Jobs
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Public JSON feeds only, read on demand. A posting is kept when it is
          open to someone in India and reads as an intern, new-grad, or junior
          software role. Every Apply link opens the original posting in a new
          tab so you apply yourself.
        </p>
      </header>
      <JobsBoard />
      <BoundariesNote />
    </main>
  );
}
