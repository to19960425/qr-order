'use client';

type Category = { id: string; name: string };

type Props = {
  categories: Category[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function CategoryTabs({ categories, selectedId, onSelect }: Props) {
  if (categories.length === 0) return null;

  return (
    <div
      className="sticky top-14 z-10 overflow-x-auto border-b border-cafe-foreground/10 bg-cafe-background"
      style={{ scrollbarWidth: 'none' }}
    >
      <div className="flex min-w-max gap-1 px-3">
        {categories.map((c) => {
          const active = c.id === selectedId;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelect(c.id)}
              className={`whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors ${
                active
                  ? 'border-b-2 border-cafe-accent text-cafe-accent'
                  : 'border-b-2 border-transparent text-cafe-foreground/70 hover:text-cafe-foreground'
              }`}
            >
              {c.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
