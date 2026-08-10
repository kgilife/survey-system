import { useRef, useState } from "react";
import { allocationTotal, normalizePoint } from "./questionLogic";
export { ADVANCED_OPTION_TYPES } from "./questionLogic";

const Field = ({ label, children }) => (
  <div className="field">
    <label>{label}</label>
    {children}
  </div>
);
const number = (v, fallback = 0) =>
  Number.isFinite(Number(v)) ? Number(v) : fallback;
export function AdvancedEditor({ q, onChange }) {
  const cfg = q.config || {},
    setCfg = (next) => onChange({ ...q, config: { ...cfg, ...next } });
  if (q.type === "star_rating")
    return (
      <div className="row">
        <Field label="最高星數">
          <input
            type="number"
            min="2"
            max="10"
            className="input"
            value={cfg.max || 5}
            onChange={(e) => setCfg({ max: number(e.target.value, 5) })}
          />
        </Field>
      </div>
    );
  if (q.type === "allocation")
    return (
      <div className="row">
        <Field label="目標總數">
          <input
            type="number"
            className="input"
            value={cfg.target ?? 100}
            onChange={(e) => setCfg({ target: number(e.target.value, 100) })}
          />
        </Field>
        <Field label="單位">
          <input
            className="input"
            value={cfg.unit || "%"}
            onChange={(e) => setCfg({ unit: e.target.value })}
          />
        </Field>
      </div>
    );
  if (q.type === "ranking")
    return (
      <Field label="最多排序數量（0 代表全部）">
        <input
          type="number"
          min="0"
          className="input"
          value={cfg.rankLimit || 0}
          onChange={(e) => setCfg({ rankLimit: number(e.target.value) })}
        />
      </Field>
    );
  if (q.type === "image_choice")
    return (
      <label>
        <input
          type="checkbox"
          checked={cfg.multiple === true}
          onChange={(e) => setCfg({ multiple: e.target.checked })}
        />{" "}
        允許多選
      </label>
    );
  if (q.type === "heatmap")
    return (
      <Field label="底圖網址">
        <input
          className="input"
          value={cfg.imageUrl || ""}
          onChange={(e) => setCfg({ imageUrl: e.target.value })}
        />
      </Field>
    );
  if (q.type === "text_highlight")
    return (
      <Field label="要標記的原文">
        <textarea
          className="input"
          value={cfg.text || ""}
          onChange={(e) =>
            setCfg({ text: e.target.value, textVersion: String(Date.now()) })
          }
        />
      </Field>
    );
  if (q.type === "terms")
    return (
      <Field label="條款內容">
        <textarea
          className="input"
          value={cfg.terms || ""}
          onChange={(e) =>
            setCfg({ terms: e.target.value, version: String(Date.now()) })
          }
        />
      </Field>
    );
  if (q.type === "inventory")
    return (
      <p className="muted small">
        在各選項右側設定初始庫存；修改初始值時會依差額調整剩餘庫存。
      </p>
    );
  if (q.type === "cascading")
    return (
      <p className="muted small">
        選項格式：第一層填「縣市」，第二層填「縣市 / 行政區」。
      </p>
    );
  if (q.type === "location")
    return (
      <p className="muted small">
        填答者可使用裝置定位，或手動輸入地址與座標。
      </p>
    );
  if (q.type === "maxdiff")
    return (
      <p className="muted small">
        填答者會從此組選項各選一個「最偏好」與「最不偏好」。
      </p>
    );
  return null;
}

export function AdvancedOptionFields({ q, index, onChange }) {
  const o = q.options[index],
    update = (patch) =>
      onChange({
        ...q,
        options: q.options.map((x, i) =>
          i === index ? { ...x, ...patch } : x,
        ),
      });
  return (
    <>
      {q.type === "image_choice" && (
        <input
          className="input"
          style={{ flex: 1 }}
          placeholder="圖片網址"
          value={o.imageUrl || ""}
          onChange={(e) => update({ imageUrl: e.target.value })}
        />
      )}{" "}
      {q.type === "inventory" && (
        <input
          type="number"
          min="0"
          className="input"
          style={{ width: 130 }}
          placeholder="庫存"
          value={o.stock ?? 0}
          onChange={(e) => update({ stock: number(e.target.value) })}
        />
      )}
    </>
  );
}

function ImageChoice({ q, value, onChange, disabled }) {
  const vals = Array.isArray(value) ? value : [],
    multiple = q.config?.multiple === true;
  return (
    <div className="image-choice-grid">
      {q.options.map((o) => {
        const selected = multiple ? vals.includes(o.value) : value === o.value;
        return (
          <button
            type="button"
            disabled={disabled}
            key={o.value}
            className={"image-choice " + (selected ? "selected" : "")}
            onClick={() =>
              onChange(
                multiple
                  ? selected
                    ? vals.filter((x) => x !== o.value)
                    : [...vals, o.value]
                  : o.value,
              )
            }
          >
            {o.imageUrl ? (
              <img src={o.imageUrl} alt={o.label} />
            ) : (
              <div className="image-placeholder">無圖片</div>
            )}
            <span>{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
function Stars({ q, value, onChange, disabled }) {
  const max = number(q.config?.max, 5);
  return (
    <div className="stars" aria-label="星級評分">
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
        <button
          type="button"
          disabled={disabled}
          aria-label={`${n} 星`}
          key={n}
          className={n <= number(value) ? "active" : ""}
          onClick={() => onChange(n)}
        >
          ★
        </button>
      ))}
      <span>{value ? `${value} / ${max}` : "尚未評分"}</span>
    </div>
  );
}
function Cascading({ q, value, onChange, disabled }) {
  const selected = Array.isArray(value) ? value : [],
    paths = q.options.map((o) =>
      String(o.label || o.value)
        .split("/")
        .map((x) => x.trim()),
    ),
    levels = Math.max(1, ...paths.map((x) => x.length));
  return (
    <div className="row">
      {Array.from({ length: levels }, (_, level) => {
        const choices = [
          ...new Set(
            paths
              .filter((p) =>
                p.slice(0, level).every((x, i) => x === selected[i]),
              )
              .map((p) => p[level])
              .filter(Boolean),
          ),
        ];
        return (
          <select
            key={level}
            className="input"
            disabled={disabled || (level > 0 && !selected[level - 1])}
            value={selected[level] || ""}
            onChange={(e) =>
              onChange([...selected.slice(0, level), e.target.value])
            }
          >
            <option value="">請選擇</option>
            {choices.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        );
      })}
    </div>
  );
}
function Ranking({ q, value, onChange, disabled }) {
  const ranked = Array.isArray(value) ? value : q.options.map((o) => o.value),
    limit = number(q.config?.rankLimit);
  const move = (i, d) => {
    const a = [...ranked],
      to = i + d;
    if (to < 0 || to >= a.length) return;
    [a[i], a[to]] = [a[to], a[i]];
    onChange(a);
  };
  return (
    <ol className="ranking">
      {ranked.map((id, i) => {
        const o = q.options.find((x) => x.value === id) || { label: id };
        return (
          <li key={id}>
            <span>{o.label}</span>
            <div>
              <button
                type="button"
                disabled={disabled || i === 0}
                onClick={() => move(i, -1)}
              >
                ↑
              </button>
              <button
                type="button"
                disabled={disabled || i === ranked.length - 1}
                onClick={() => move(i, 1)}
              >
                ↓
              </button>
            </div>
            {limit > 0 && i < limit && <b>第 {i + 1} 名</b>}
          </li>
        );
      })}
    </ol>
  );
}
function Allocation({ q, value, onChange, disabled }) {
  const vals = value && typeof value === "object" ? value : {},
    target = number(q.config?.target, 100),
    sum = allocationTotal(vals);
  return (
    <div className="stack">
      {q.options.map((o) => (
        <Field key={o.value} label={o.label}>
          <input
            type="number"
            min="0"
            className="input"
            disabled={disabled}
            value={vals[o.value] ?? 0}
            onChange={(e) =>
              onChange({ ...vals, [o.value]: number(e.target.value) })
            }
          />
        </Field>
      ))}
      <div className={"allocation-total " + (sum === target ? "ok" : "bad")}>
        目前總計：{sum} / {target}
        {q.config?.unit || "%"}
      </div>
    </div>
  );
}
function Inventory({ q, value, onChange, disabled }) {
  const vals = value && typeof value === "object" ? value : {};
  return (
    <div className="stack">
      {q.options.map((o) => (
        <div className="row spread inventory-row" key={o.value}>
          <div>
            <strong>{o.label}</strong>
            <div className="muted small">剩餘 {o.remaining ?? 0}</div>
          </div>
          <input
            type="number"
            min="0"
            max={o.remaining + number(vals[o.value])}
            className="input"
            style={{ width: 110 }}
            disabled={disabled || (o.remaining <= 0 && !vals[o.value])}
            value={vals[o.value] ?? 0}
            onChange={(e) =>
              onChange({ ...vals, [o.value]: number(e.target.value) })
            }
          />
        </div>
      ))}
    </div>
  );
}
function Heatmap({ q, value, onChange, disabled }) {
  const ref = useRef();
  const points = Array.isArray(value) ? value : [];
  return (
    <div
      ref={ref}
      className="heatmap"
      onClick={(e) => {
        if (disabled || !q.config?.imageUrl) return;
        const r = ref.current.getBoundingClientRect();
        onChange([
          ...points,
          normalizePoint(
            e.clientX - r.left,
            e.clientY - r.top,
            r.width,
            r.height,
          ),
        ]);
      }}
    >
      {q.config?.imageUrl ? (
        <img src={q.config.imageUrl} alt={q.title} />
      ) : (
        <div className="image-placeholder">尚未設定底圖</div>
      )}
      {points.map((p, i) => (
        <i key={i} style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }} />
      ))}
      {points.length > 0 && (
        <button
          type="button"
          disabled={disabled}
          className="btn secondary heatmap-clear"
          onClick={(e) => {
            e.stopPropagation();
            onChange([]);
          }}
        >
          清除熱點
        </button>
      )}
    </div>
  );
}
function Highlight({ q, value, onChange, disabled }) {
  const text = q.config?.text || "",
    ranges = Array.isArray(value) ? value : [],
    [mode, setMode] = useState("positive"),
    ref = useRef();
  function mark() {
    const sel = getSelection();
    if (
      disabled ||
      !sel ||
      sel.isCollapsed ||
      !ref.current.contains(sel.anchorNode)
    )
      return;
    const pre = document.createRange();
    pre.selectNodeContents(ref.current);
    pre.setEnd(sel.anchorNode, sel.anchorOffset);
    const start = pre.toString().length,
      end = start + sel.toString().length;
    onChange([
      ...ranges,
      { start, end, sentiment: mode, textVersion: q.config?.textVersion || "" },
    ]);
    sel.removeAllRanges();
  }
  return (
    <div className="stack">
      <div className="row">
        <button
          type="button"
          className={"btn " + (mode === "positive" ? "primary" : "secondary")}
          onClick={() => setMode("positive")}
        >
          喜歡
        </button>
        <button
          type="button"
          className={"btn " + (mode === "negative" ? "danger" : "secondary")}
          onClick={() => setMode("negative")}
        >
          反感
        </button>
        <button
          type="button"
          className="btn ghost"
          onClick={() => onChange([])}
        >
          清除
        </button>
      </div>
      <div ref={ref} className="highlight-text" onMouseUp={mark}>
        {text}
      </div>
      <div className="small muted">已標記 {ranges.length} 段文字</div>
    </div>
  );
}
function MaxDiff({ q, value, onChange, disabled }) {
  const v = value || {};
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>最偏好</th>
            <th>項目</th>
            <th>最不偏好</th>
          </tr>
        </thead>
        <tbody>
          {q.options.map((o) => (
            <tr key={o.value}>
              <td>
                <input
                  type="radio"
                  name={q.id + "best"}
                  disabled={disabled || v.worst === o.value}
                  checked={v.best === o.value}
                  onChange={() => onChange({ ...v, best: o.value })}
                />
              </td>
              <td>{o.label}</td>
              <td>
                <input
                  type="radio"
                  name={q.id + "worst"}
                  disabled={disabled || v.best === o.value}
                  checked={v.worst === o.value}
                  onChange={() => onChange({ ...v, worst: o.value })}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function Location({ value, onChange, disabled }) {
  const v = value || {};
  function locate() {
    navigator.geolocation?.getCurrentPosition(
      (p) =>
        onChange({ ...v, lat: p.coords.latitude, lng: p.coords.longitude }),
      () => alert("無法取得定位，請確認瀏覽器權限。"),
    );
  }
  return (
    <div className="stack">
      <Field label="地址">
        <input
          className="input"
          disabled={disabled}
          value={v.address || ""}
          onChange={(e) => onChange({ ...v, address: e.target.value })}
        />
      </Field>
      <div className="row">
        <input
          type="number"
          step="any"
          className="input"
          placeholder="緯度"
          disabled={disabled}
          value={v.lat ?? ""}
          onChange={(e) => onChange({ ...v, lat: e.target.value })}
        />
        <input
          type="number"
          step="any"
          className="input"
          placeholder="經度"
          disabled={disabled}
          value={v.lng ?? ""}
          onChange={(e) => onChange({ ...v, lng: e.target.value })}
        />
        <button
          type="button"
          className="btn secondary"
          disabled={disabled}
          onClick={locate}
        >
          取得目前位置
        </button>
      </div>
      {v.lat && v.lng && (
        <>
          <iframe
            title="定位地圖"
            className="map-frame"
            loading="lazy"
            src={`https://maps.google.com/maps?q=${encodeURIComponent(v.lat + "," + v.lng)}&z=16&output=embed`}
          />
          <a
            target="_blank"
            rel="noreferrer"
            href={`https://www.google.com/maps?q=${v.lat},${v.lng}`}
          >
            在 Google Maps 查看
          </a>
        </>
      )}
    </div>
  );
}
function Terms({ q, value, onChange, disabled }) {
  const v = value || {},
    [bottom, setBottom] = useState(false);
  return (
    <div className="stack">
      <div
        className="terms-box"
        onScroll={(e) => {
          const x = e.currentTarget;
          if (x.scrollTop + x.clientHeight >= x.scrollHeight - 4)
            setBottom(true);
        }}
      >
        {q.config?.terms || "尚未設定條款內容"}
      </div>
      <label>
        <input
          type="checkbox"
          disabled={disabled || (!bottom && !v.accepted)}
          checked={v.accepted === true}
          onChange={(e) =>
            onChange({
              accepted: e.target.checked,
              termsVersion: q.config?.version || "",
              acceptedAt: e.target.checked ? new Date().toISOString() : "",
            })
          }
        />{" "}
        我已詳閱並同意（請先捲動至最底）
      </label>
    </div>
  );
}

export function AdvancedQuestion({ q, value, onChange, disabled }) {
  const props = { q, value, onChange, disabled };
  if (q.type === "image_choice") return <ImageChoice {...props} />;
  if (q.type === "star_rating") return <Stars {...props} />;
  if (q.type === "cascading") return <Cascading {...props} />;
  if (q.type === "ranking") return <Ranking {...props} />;
  if (q.type === "allocation") return <Allocation {...props} />;
  if (q.type === "inventory") return <Inventory {...props} />;
  if (q.type === "heatmap") return <Heatmap {...props} />;
  if (q.type === "text_highlight") return <Highlight {...props} />;
  if (q.type === "maxdiff") return <MaxDiff {...props} />;
  if (q.type === "location") return <Location {...props} />;
  if (q.type === "terms") return <Terms {...props} />;
  return null;
}
