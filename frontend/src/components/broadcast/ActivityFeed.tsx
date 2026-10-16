import { Link } from "react-router-dom";
import type { FeedItem } from "../../lib/activityFeed";
import { cn } from "../../utils/cn";

const highlightColor: Record<FeedItem["kind"], string> = {
  result: "text-cyan-300",
  open: "text-arena-amber",
  champion: "text-arena-success"
};

export function ActivityFeed({ items }: { items: FeedItem[] }) {
  if (!items.length) return null;
  return (
    <section aria-label="Acontecendo na Arena Camp" className="border-y border-arena-line bg-arena-panel2">
      <ul className="mx-auto flex max-w-[1500px] flex-wrap gap-2 px-4 py-3 lg:px-8">
        {items.map((item) => (
          <li key={item.key}>
            <Link className="inline-flex max-w-full items-center gap-1.5 border border-arena-line bg-arena-panel px-3 py-1.5 text-sm hover:border-arena-muted" to={item.href}>
              <strong className={cn("truncate font-bold", highlightColor[item.kind])}>{item.highlight}</strong>
              <span className="truncate text-arena-text">{item.text}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
