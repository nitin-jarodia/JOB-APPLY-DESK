import { BoundariesNote } from "@/components/boundaries-note";
import { ProfileEditor } from "@/components/profile/profile-editor";

export const metadata = {
  title: "Profile · Job Apply Desk",
};

export default function ProfilePage() {
  return (
    <main className="mx-auto w-full max-w-5xl grow px-4 pb-16 sm:px-6">
      <header className="flex flex-col gap-2 py-6">
        <h1 className="font-heading text-xl font-semibold tracking-tight sm:text-2xl">
          Master resume
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Your master resume lives here. Everything is stored in a JSON file
          inside this project, so edits survive a refresh and a restart. Job
          search, scoring, and tailored resumes build on top of this page later.
        </p>
      </header>
      <ProfileEditor />
      <BoundariesNote />
    </main>
  );
}
