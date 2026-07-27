import type { ReactNode } from "react";
import { SearchX } from "lucide-react";
import { Card, CardContent } from "./Card";

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <Card>
      <CardContent className="flex min-h-52 flex-col items-center justify-center text-center">
        <SearchX className="mb-4 h-9 w-9 text-arena-muted" />
        <h3 className="font-display text-lg font-semibold">{title}</h3>
        <p className="mt-2 max-w-md text-sm text-arena-muted">{description}</p>
        {action ? <div className="mt-5">{action}</div> : null}
      </CardContent>
    </Card>
  );
}
