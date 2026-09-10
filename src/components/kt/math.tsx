import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as Popover from "@radix-ui/react-popover";
import "katex/dist/katex.min.css";
import { hasMath, parseMathSegments } from "@/lib/math-text";

// KaTeX is loaded lazily so pages without formulas never pay for it.
type KatexModule = typeof import("katex");
let katexPromise: Promise<KatexModule> | null = null;
function loadKatex(): Promise<KatexModule> {
  katexPromise ??= import("katex");
  return katexPromise;
}

/** Renders one formula once KaTeX is available; shows the source until then. */
function MathSpan({ tex, display }: { tex: string; display: boolean }) {
  const [state, setState] = useState<{ html?: string; error?: boolean }>({});
  useEffect(() => {
    let alive = true;
    loadKatex()
      .then((k) => {
        if (!alive) return;
        try {
          setState({ html: k.renderToString(tex, { displayMode: display, throwOnError: true }) });
        } catch {
          setState({ error: true });
        }
      })
      .catch(() => {
        if (alive) setState({ error: true });
      });
    return () => {
      alive = false;
    };
  }, [tex, display]);
  if (state.error) return <code className="math-src math-bad">{display ? `$$${tex}$$` : `$${tex}$`}</code>;
  if (!state.html) return <code className="math-src">{display ? `$$${tex}$$` : `$${tex}$`}</code>;
  return <span className={display ? "math-block" : "math-inline"} dangerouslySetInnerHTML={{ __html: state.html }} />;
}

/** Text with $...$ / $$...$$ segments rendered as real math. */
export function MathText({ text }: { text: string }) {
  const segs = useMemo(() => parseMathSegments(text ?? ""), [text]);
  if (!segs.some((s) => s.kind !== "text")) return <>{text}</>;
  return (
    <>
      {segs.map((s, i) =>
        s.kind === "text" ? (
          <span key={i}>{s.value}</span>
        ) : (
          <MathSpan key={i} tex={s.tex} display={s.kind === "display"} />
        ),
      )}
    </>
  );
}

/** Click-to-insert LaTeX snippets. «…» marks the span selected after insertion. */
type Snippet = { label: string; tex: string; title?: string };

const PRIMARY: Snippet[] = [
  { label: "分数", tex: "\\frac{«a»}{b}", title: "分式 a/b" },
  { label: "平方", tex: "^{«2»}", title: "平方 x^{2}" },
  { label: "n次方", tex: "^{«n»}", title: "n 次幂 x^{n}" },
  { label: "下标", tex: "_{«n»}", title: "下标 x_{n}" },
  { label: "根号", tex: "\\sqrt{«x»}", title: "平方根 √x" },
  { label: "n次根", tex: "\\sqrt[«n»]{x}", title: "n 次根" },
  { label: "±", tex: "\\pm", title: "正负 ±" },
  { label: "×", tex: "\\times", title: "乘 ×" },
  { label: "÷", tex: "\\div", title: "除 ÷" },
  { label: "·", tex: "\\cdot", title: "点乘 ·" },
  { label: "求和", tex: "\\sum_{«i=1»}^{n}", title: "连加 Σ" },
  { label: "求积", tex: "\\prod_{«i=1»}^{n}", title: "连乘 Π" },
  { label: "积分", tex: "\\int_{«a»}^{b}", title: "积分 ∫" },
  { label: "极限", tex: "\\lim_{«x \\to 0»}", title: "极限 lim" },
  { label: "括号", tex: "\\left(«»\\right)", title: "自适应括号" },
  { label: "绝对值", tex: "\\left|«x»\\right|", title: "绝对值 |x|" },
];

const GROUPS: Array<{ name: string; items: Snippet[] }> = [
  {
    name: "希腊字母",
    items: [
      { label: "α", tex: "\\alpha" }, { label: "β", tex: "\\beta" }, { label: "γ", tex: "\\gamma" },
      { label: "δ", tex: "\\delta" }, { label: "ε", tex: "\\epsilon" }, { label: "ζ", tex: "\\zeta" },
      { label: "η", tex: "\\eta" }, { label: "θ", tex: "\\theta" }, { label: "κ", tex: "\\kappa" },
      { label: "λ", tex: "\\lambda" }, { label: "μ", tex: "\\mu" }, { label: "ν", tex: "\\nu" },
      { label: "ξ", tex: "\\xi" }, { label: "π", tex: "\\pi" }, { label: "ρ", tex: "\\rho" },
      { label: "σ", tex: "\\sigma" }, { label: "τ", tex: "\\tau" }, { label: "φ", tex: "\\phi" },
      { label: "ψ", tex: "\\psi" }, { label: "ω", tex: "\\omega" }, { label: "Γ", tex: "\\Gamma" },
      { label: "Δ", tex: "\\Delta" }, { label: "Θ", tex: "\\Theta" }, { label: "Λ", tex: "\\Lambda" },
      { label: "Σ", tex: "\\Sigma" }, { label: "Φ", tex: "\\Phi" }, { label: "Ω", tex: "\\Omega" },
    ],
  },
  {
    name: "关系与逻辑",
    items: [
      { label: "≠", tex: "\\neq" }, { label: "≤", tex: "\\leq" }, { label: "≥", tex: "\\geq" },
      { label: "≈", tex: "\\approx" }, { label: "≡", tex: "\\equiv" }, { label: "∝", tex: "\\propto" },
      { label: "∞", tex: "\\infty" }, { label: "∈", tex: "\\in" }, { label: "⊂", tex: "\\subset" },
      { label: "∪", tex: "\\cup" }, { label: "∩", tex: "\\cap" }, { label: "∅", tex: "\\emptyset" },
      { label: "→", tex: "\\to" }, { label: "⇒", tex: "\\Rightarrow" }, { label: "↔", tex: "\\leftrightarrow" },
    ],
  },
  {
    name: "函数",
    items: [
      { label: "sin", tex: "\\sin" }, { label: "cos", tex: "\\cos" }, { label: "tan", tex: "\\tan" },
      { label: "cot", tex: "\\cot" }, { label: "ln", tex: "\\ln" }, { label: "log", tex: "\\log" },
      { label: "exp", tex: "\\exp" }, { label: "max", tex: "\\max" }, { label: "min", tex: "\\min" },
      { label: "mod", tex: "\\bmod" }, { label: "eˣ", tex: "e^{«x»}" }, { label: "|x|", tex: "\\left|«x»\\right|" },
    ],
  },
  {
    name: "复合结构",
    items: [
      { label: "二项式", tex: "\\binom{«n»}{k}", title: "C(n,k)" },
      { label: "向量", tex: "\\vec{«v»}" },
      { label: "帽子", tex: "\\hat{«x»}" },
      { label: "均值", tex: "\\bar{«x»}" },
      { label: "矩阵", tex: "\\begin{pmatrix} «a» & b \\\\ c & d \\end{pmatrix}" },
      { label: "分段", tex: "\\begin{cases} «» \\end{cases}" },
    ],
  },
];

function PaletteBody({ insert, onPick }: { insert: (tex: string) => void; onPick?: () => void }) {
  const chip = (s: Snippet) => (
    <button
      key={s.label + s.tex}
      type="button"
      className="math-chip"
      title={s.title ?? s.tex}
      onClick={() => {
        insert(s.tex);
        onPick?.();
      }}
    >
      {s.label}
    </button>
  );
  return (
    <div className="math-palette">
      <div className="math-cat">常用</div>
      <div className="math-grid">{PRIMARY.map(chip)}</div>
      {GROUPS.map((g) => (
        <Fragment key={g.name}>
          <div className="math-cat">{g.name}</div>
          <div className="math-grid">{g.items.map(chip)}</div>
        </Fragment>
      ))}
      <p className="math-tip">点按插入到光标处，«选中部分」可直接输入替换。行内公式用 $…$ 包裹，独立公式用 $$…$$ 各占一行。</p>
    </div>
  );
}

/**
 * Textarea with a LaTeX palette and a live rendered preview.
 * variant="full" shows the always-on toolbar (node notes);
 * variant="compact" shows a single ƒ⁺ popover trigger (log fields).
 */
export function MathEditor({
  value,
  onChange,
  label,
  placeholder,
  rows,
  variant = "full",
  ariaLabel,
}: {
  value: string;
  onChange: (next: string) => void;
  label?: ReactNode;
  placeholder?: string;
  rows?: number;
  variant?: "full" | "compact";
  ariaLabel?: string;
}) {
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const pendingSel = useRef<[number, number] | null>(null);

  // restore caret/selection after the controlled value re-render
  useEffect(() => {
    const ta = taRef.current;
    if (ta && pendingSel.current) {
      const [a, b] = pendingSel.current;
      pendingSel.current = null;
      ta.focus();
      ta.setSelectionRange(a, b);
    }
  }, [value]);

  const insert = (tex: string) => {
    const ta = taRef.current;
    if (!ta) return;
    const s = ta.selectionStart ?? ta.value.length;
    const e = ta.selectionEnd ?? s;
    const open = tex.indexOf("«");
    const close = tex.lastIndexOf("»");
    const clean = tex.replace(/[«»]/g, "");
    pendingSel.current =
      open !== -1 && close > open ? [s + open, s + close - 1] : [s + clean.length, s + clean.length];
    onChange(ta.value.slice(0, s) + clean + ta.value.slice(e));
  };

  const preview = hasMath(value) ? (
    <div className="math-preview" aria-hidden="true">
      <span className="math-preview-cap">ƒ 实时预览</span>
      <MathText text={value} />
    </div>
  ) : null;

  const labelled = ariaLabel ?? (typeof label === "string" ? label : undefined);

  if (variant === "compact") {
    return (
      <div className="field math-field">
        <div className="math-field-hd">
          <span className="math-field-label">{label}</span>
          <Popover.Root>
            <Popover.Trigger asChild>
              <button type="button" className="math-pop-trigger" aria-label="插入公式">
                ƒ⁺ 公式
              </button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content className="math-sheet" align="end" sideOffset={6} collisionPadding={12} aria-label="插入公式">
                <PaletteBody insert={insert} />
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        </div>
        <textarea ref={taRef} aria-label={labelled} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
        {preview}
      </div>
    );
  }

  return (
    <div className="math-field">
      <div className="math-field-hd">
        <span className="math-field-label">{label}</span>
        <span className="math-hint">$…$ 行内 · $$…$$ 独立成行</span>
      </div>
      <div className="math-toolbar">
        {PRIMARY.map((s) => (
          <button key={s.tex} type="button" className="math-chip" title={s.title ?? s.tex} onClick={() => insert(s.tex)}>
            {s.label}
          </button>
        ))}
        <Popover.Root>
          <Popover.Trigger asChild>
            <button type="button" className="math-chip math-more">
              更多 ▾
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content className="math-sheet" align="start" sideOffset={6} collisionPadding={12} aria-label="更多公式符号">
              <PaletteBody insert={insert} />
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      </div>
      <textarea ref={taRef} aria-label={labelled} value={value} placeholder={placeholder} rows={rows} onChange={(e) => onChange(e.target.value)} />
      {preview}
    </div>
  );
}
