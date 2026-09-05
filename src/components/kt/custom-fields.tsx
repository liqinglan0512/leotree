import type { CustomFieldDef } from "@/lib/knowledge-tree/types";

export function CustomFields({
  defs,
  values,
  onChange,
}: {
  defs: CustomFieldDef[];
  values: Record<string, unknown>;
  onChange: (id: string, value: unknown) => void;
}) {
  if (!defs.length) return null;
  const groups: Array<{ name: string; items: CustomFieldDef[] }> = [];
  for (const def of defs) {
    const name = def.group || "";
    const last = groups[groups.length - 1];
    if (!last || last.name !== name) groups.push({ name, items: [def] });
    else last.items.push(def);
  }
  return (
    <>
      {groups.map((g) => (
        <div key={g.name || "default"} className={g.items.length > 1 ? "form-grid" : undefined}>
          {g.items.map((def) => (
            <Field key={def.id} def={def} value={values[def.id]} onChange={onChange} />
          ))}
        </div>
      ))}
    </>
  );
}

function Field({
  def,
  value,
  onChange,
}: {
  def: CustomFieldDef;
  value: unknown;
  onChange: (id: string, value: unknown) => void;
}) {
  if (def.type === "checkbox") {
    return (
      <label style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 8, color: "var(--ink)" }}>
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(def.id, e.target.checked)}
        />
        {def.label}
      </label>
    );
  }
  if (def.type === "radio") {
    return (
      <div className="field">
        {def.label}
        <div className="radios">
          {(def.options || []).map((opt) => (
            <label key={opt.value}>
              <input
                type="radio"
                name={def.id}
                checked={String(value ?? "") === opt.value}
                onChange={() => onChange(def.id, opt.value)}
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>
    );
  }
  if (def.type === "multiselect") {
    const set = new Set(Array.isArray(value) ? (value as string[]) : []);
    return (
      <div className="field">
        {def.label}
        <div className="chips">
          {(def.options || []).map((opt) => (
            <button
              type="button"
              key={opt.value}
              className={`chip ${set.has(opt.value) ? "on" : ""}`}
              onClick={() => {
                const next = new Set(set);
                if (next.has(opt.value)) next.delete(opt.value);
                else next.add(opt.value);
                onChange(def.id, Array.from(next));
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    );
  }
  if (def.type === "select") {
    return (
      <label>
        {def.label}
        <select value={String(value ?? "")} onChange={(e) => onChange(def.id, e.target.value)}>
          {(def.options || []).map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
    );
  }
  if (def.type === "textarea") {
    return (
      <label>
        {def.label}
        <textarea
          value={String(value ?? "")}
          placeholder={def.placeholder}
          onChange={(e) => onChange(def.id, e.target.value)}
        />
      </label>
    );
  }
  return (
    <label>
      {def.label}
      <input
        type="text"
        value={String(value ?? "")}
        placeholder={def.placeholder}
        onChange={(e) => onChange(def.id, e.target.value)}
      />
    </label>
  );
}
