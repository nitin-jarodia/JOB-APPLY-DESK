export function BoundariesNote() {
  return (
    <section className="mt-10 rounded-xl border border-dashed border-border px-4 py-4 text-sm text-muted-foreground">
      <h2 className="mb-2 font-medium text-foreground">
        What this desk will not do
      </h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>
          It never submits an application on your behalf. It only reads public
          JSON feeds and shows you the employer&apos;s own posting URL to open
          yourself.
        </li>
        <li>
          It never logs into LinkedIn, Naukri, Indeed, Instahyre, Workday, or any
          other job site, and never posts to an applicant tracking
          system&apos;s apply endpoint.
        </li>
        <li>
          It never scrapes pages behind bot protection and never works around a
          CAPTCHA or an anti-bot check.
        </li>
        <li>
          It never invents an employer, date, skill, degree, CGPA, metric, or
          project. Tailoring can only reorder and reword facts from your
          profile.
        </li>
      </ul>
    </section>
  );
}
