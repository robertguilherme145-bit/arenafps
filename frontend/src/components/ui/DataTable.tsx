import type { ReactNode } from "react";

export type Column<T> = {
  header: string;
  cell: (item: T, index: number) => ReactNode;
  className?: string;
};

export function DataTable<T>({ columns, data, empty }: { columns: Column<T>[]; data: T[]; empty?: ReactNode }) {
  if (!data.length) {
    return empty ?? <div className="p-6 text-sm text-arena-muted">Nenhum registro encontrado.</div>;
  }

  return (
    <div className="overflow-x-auto scrollbar-thin">
      <table className="w-full min-w-[680px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-arena-line text-left text-xs uppercase tracking-[.14em] text-arena-muted">
            {columns.map((column) => (
              <th className={column.className ?? "px-4 py-3 font-semibold"} key={column.header}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr className="border-b border-arena-line/70 transition hover:bg-white/[.04]" key={index}>
              {columns.map((column) => (
                <td className={column.className ?? "px-4 py-4"} key={column.header}>
                  {column.cell(item, index)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
