import Link from "next/link";
import { SearchXIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function JobNotFound() {
  return (
    <main className="mx-auto w-full max-w-3xl grow px-4 py-16 sm:px-6">
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <SearchXIcon className="size-6 text-muted-foreground" aria-hidden />
          <h1 className="font-heading text-base font-medium">Posting not in the cache</h1>
          <p className="max-w-md text-sm text-muted-foreground">
            This posting is not in the last fetch. It may have been dropped when
            the list was refreshed, or the link may be from an older run.
          </p>
          <Button asChild size="sm" className="mt-2">
            <Link href="/jobs">Back to all jobs</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
