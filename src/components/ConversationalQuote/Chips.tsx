import { humanizeSku, skuDesc } from "@/lib/pricing/uiMap";
import { SKU_RESPONSIVE } from "@/lib/pricing/catalog";

export function Chips({
  suggested,
  forcedIds,
  selectedIds,
  onToggle,
}: {
  suggested: string[];
  forcedIds: string[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}) {
  const isChecked = (id: string) =>
    selectedIds.includes(id) || forcedIds.includes(id);
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onToggle(SKU_RESPONSIVE)}
        className={`chip ${
          isChecked(SKU_RESPONSIVE) ? "ring-1 ring-black" : ""
        }`}
        title="La web se adapta a móvil, tablet y ordenador."
      >
        <input type="checkbox" readOnly checked={isChecked(SKU_RESPONSIVE)} />
        Diseño adaptable (móvil/tablet/PC) – recomendado
      </button>
      {suggested.map((id) => (
        <button
          key={id}
          type="button"
          onClick={() => onToggle(id)}
          className={`chip ${isChecked(id) ? "ring-1 ring-black" : ""}`}
          title={skuDesc(id)}
        >
          <input type="checkbox" readOnly checked={isChecked(id)} />
          {humanizeSku(id)}
        </button>
      ))}
    </div>
  );
}
