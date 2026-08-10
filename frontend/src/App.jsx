import { useState, useEffect, useMemo, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { api, adminSession, userSession } from "./api";
import {
  LoginPage,
  RegisterPage,
  ForgotPage,
  ResetPage,
  ProfilePage,
} from "./AuthPages";
import {
  AdvancedEditor,
  AdvancedOptionFields,
  AdvancedQuestion,
  ADVANCED_OPTION_TYPES,
} from "./AdvancedQuestions";

const toastEvent = new EventTarget();
window.toast = (message, type = "success") => {
  toastEvent.dispatchEvent(new CustomEvent("toast", { detail: { message, type } }));
};

export function ToastContainer() {
  const [toasts, setToasts] = useState([]);
  useEffect(() => {
    const handler = (e) => {
      const id = Date.now() + Math.random();
      setToasts((t) => [...t, { id, ...e.detail }]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000);
    };
    toastEvent.addEventListener("toast", handler);
    return () => toastEvent.removeEventListener("toast", handler);
  }, []);
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}

const TYPES = {
  short: "簡答",
  paragraph: "詳答",
  single: "單選題",
  checkbox: "核取方塊",
  dropdown: "下拉式選單",
  scale: "線性刻度",
  radio_grid: "單選方格",
  checkbox_grid: "核取方塊格",
  date: "日期",
  time: "時間",
  signature: "簽名題",
  multi_image: "檔案/圖片上傳",
  linked_multi: "連結型多選題",
  linked_short: "連結型簡答題",
  image_choice: "圖片選擇題",
  star_rating: "星級評分題",
  cascading: "巢狀選擇題",
  ranking: "項目排序題",
  allocation: "總計分配題",
  inventory: "限量／庫存題",
  heatmap: "熱點點擊題",
  text_highlight: "文字螢光筆題",
  maxdiff: "最大差異法題",
  location: "地圖定位題",
  terms: "條款同意題",
};
const TABS = [
  "專案設定",
  "使用者設定",
  "問卷設計",
  "填寫狀況",
  "回答資料",
  "統計分析",
  "庫存管理",
  "附件管理",
  "分享設定",
  "操作紀錄",
];
const go = (path) => {
  location.hash = path;
};
const fmt = (v) => (v ? new Date(v).toLocaleString("zh-TW") : "—");
const imageUrl = (url = "") => {
  const match = String(url).match(/[?&]id=([\w-]+)/);
  return match && String(url).includes("drive.google.com/uc") ? `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1600` : url;
};
function usePath() {
  const read = () => {
    if (location.hash.startsWith("#/")) return location.hash.slice(1);
    const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
    let pathname = location.pathname;
    if (base && pathname.startsWith(base)) {
      pathname = pathname.slice(base.length);
    }
    if (pathname && pathname !== "/" && pathname !== "") {
      return pathname.startsWith("/") ? pathname : "/" + pathname;
    }
    return "/";
  };
  const [p, setP] = useState(read);
  useEffect(() => {
    if (!location.hash.startsWith("#/") && p !== "/") {
      location.hash = "#" + p;
    }
    const h = () => setP(read());
    addEventListener("hashchange", h);
    addEventListener("popstate", h);
    return () => {
      removeEventListener("hashchange", h);
      removeEventListener("popstate", h);
    };
  }, [p]);
  return p;
}
function ErrorBox({ error }) {
  return error ? (
    <div className="alert error">{error.message || error}</div>
  ) : null;
}
function Header({ admin }) {
  return (
    <header className="topbar">
      <div className="brand" onClick={() => go(admin ? "/admin" : "/")}>
        <span className="brand-mark">問</span>問卷調查管理系統
      </div>
      {admin && (
        <div className="row">
          <button className="btn ghost" onClick={() => go("/profile")}>
            {admin.admin.name}
          </button>
          <button
            className="btn ghost"
            onClick={() => {
              adminSession.clear();
              go("/admin/login");
            }}
          >
            登出
          </button>
        </div>
      )}
    </header>
  );
}

export default function App() {
  const path = usePath();
  const project = path.match(/^\/admin\/projects\/([^/]+)/);
  const survey = path.match(/^\/survey\/([^/]+)(\/login)?$/);
  if (survey)
    return <Survey projectId={survey[1]} loginOnly={Boolean(survey[2])} />;
  if (path === "/admin/login") return <LoginPage Header={Header} />;
  if (path === "/register") return <RegisterPage Header={Header} />;
  if (path === "/forgot-password") return <ForgotPage Header={Header} />;
  if (path.startsWith("/reset-password")) return <><ResetPage Header={Header} /><ToastContainer /></>;
  if (path === "/profile") return <><ProfilePage Header={Header} /><ToastContainer /></>;
  if (project) return <><ProjectEditor projectId={project[1]} /><ToastContainer /></>;
  if (path.startsWith("/admin")) return <><Dashboard /><ToastContainer /></>;
  go("/admin/login");
  return <ToastContainer />;
}

function useAdmin() {
  const session = adminSession.get();
  useEffect(() => {
    if (!session) go("/admin/login");
  }, [session]);
  return session;
}
function Dashboard() {
  const admin = useAdmin(),
    [projects, setProjects] = useState([]),
    [error, setError] = useState(null),
    [creating, setCreating] = useState(false),
    [loading, setLoading] = useState(true);
  const load = async () => {
    if (!admin) return;
    setLoading(true);
    try {
      setProjects((await api.adminProjects({ token: admin.token })).data);
    } catch (x) {
      setError(x);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);
  async function create() {
    const name = prompt("請輸入問卷名稱");
    if (!name) return;
    setCreating(true);
    try {
      const r = await api.adminCreateProject({
        token: admin.token,
        project: { name },
      });
      go("/admin/projects/" + r.data.project_id);
    } catch (x) {
      setError(x);
    } finally {
      setCreating(false);
    }
  }
  if (!admin) return null;
  return (
    <div className="shell">
      <Header admin={admin} />
      <main className="page">
        <section className="hero">
          <div>
            <div className="small">歡迎回來，{admin.admin.name}</div>
            <h1>你的問卷專案</h1>
            <p>建立、發布、追蹤與匯出都集中在這裡。</p>
          </div>
          <button
            className="btn secondary"
            disabled={creating}
            onClick={create}
          >
            {creating ? "處理中…" : "＋ 新增專案"}
          </button>
        </section>
        <ErrorBox error={error} />
        {loading ? (
          <div className="alert">資料載入中，請稍候…</div>
        ) : (
          <div className="grid">
            {projects.map((p) => (
              <article className="card project-card" key={p.project_id}>
                <div className="row spread">
                  <span className="badge">{p.project_status}</span>
                  <span className="muted small">{p.project_id}</span>
                </div>
                <h2 className="title">{p.project_name}</h2>
                <div className="grid">
                  <div>
                    <span className="metric">{p.stats?.rate || 0}%</span>
                    <div className="muted small">填寫率</div>
                  </div>
                  <div>
                    <span className="metric">{p.stats?.submitted || 0}</span>
                    <div className="muted small">
                      已送出／{p.stats?.total || 0}
                    </div>
                  </div>
                </div>
                <div className="muted small">最後更新：{fmt(p.updated_at)}</div>
                <button
                  className="btn primary"
                  onClick={() => go("/admin/projects/" + p.project_id)}
                >
                  管理專案
                </button>
              </article>
            ))}
            {!projects.length && (
              <div className="card">
                <h2>尚無專案</h2>
                <p className="muted">
                  新增第一份問卷後，系統會自動建立私人 Drive 資料夾與 Google
                  Sheet。
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function ProjectEditor({ projectId }) {
  const admin = useAdmin(),
    [data, setData] = useState(null),
    [tab, setTab] = useState(TABS[0]),
    [error, setError] = useState(null),
    [busy, setBusy] = useState(false);
  const load = async () => {
    if (!admin) return;
    setBusy(true);
    try {
      setData((await api.adminProject({ token: admin.token, projectId })).data);
      setError(null);
    } catch (x) {
      setError(x);
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    load();
  }, [projectId]);
  if (!admin) return null;
  const ctx = {
    admin,
    projectId,
    data,
    setData,
    setError,
    reload: load,
    busy,
    setBusy,
  };
  return (
    <div className="shell">
      <Header admin={admin} />
      <main className="page">
        <div className="row spread">
          <div>
            <button className="btn ghost" onClick={() => go("/admin")}>
              ← 返回專案
            </button>
            <h1>{data?.project.project_name || "載入中…"}</h1>
          </div>
          {data && <span className="badge">{data.project.project_status}</span>}
        </div>
        <ErrorBox error={error} />
        {data && (
          <>
            <nav className="tabs">
              {TABS.map((t) => (
                <button
                  key={t}
                  className={"tab " + (tab === t ? "active" : "")}
                  onClick={() => setTab(t)}
                >
                  {t}
                </button>
              ))}
            </nav>
            <section className="card">
              {tab === "專案設定" && <Settings {...ctx} />}{" "}
              {tab === "使用者設定" && <Users {...ctx} />}{" "}
              {tab === "問卷設計" && <Builder {...ctx} />}{" "}
              {tab === "填寫狀況" && <Status {...ctx} />}{" "}
              {tab === "回答資料" && <Responses {...ctx} />}{" "}
              {tab === "統計分析" && <Stats {...ctx} />}{" "}
              {tab === "庫存管理" && <InventoryAdmin {...ctx} />}{" "}
              {tab === "附件管理" && <Attachments {...ctx} />}{" "}
              {tab === "分享設定" && <Share {...ctx} />}{" "}
              {tab === "操作紀錄" && <Logs {...ctx} />}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function Settings({ admin, projectId, data, reload, setError }) {
  const p = data.project,
    s = data.settings,
    [form, setForm] = useState({
      name: p.project_name,
      status: p.project_status,
      startDate: p.start_date || "",
      endDate: p.end_date || "",
      description: s.description || "",
      completionMessage: s.completion_message || "",
      showProgress: s.show_progress !== false,
    });
  const [saveStatus, setSaveStatus] = useState(""),
    initialRef = useRef(form);
  useEffect(() => {
    if (JSON.stringify(initialRef.current) === JSON.stringify(form)) return;
    setSaveStatus("儲存中...");
    const t = setTimeout(async () => {
      try {
        await api.adminUpdateProject({
          token: admin.token,
          projectId,
          project: form,
        });
        initialRef.current = form;
        setSaveStatus("已自動儲存");
      } catch (x) {
        setError(x);
        setSaveStatus("儲存失敗");
      }
    }, 1000);
    return () => clearTimeout(t);
  }, [form, admin.token, projectId, setError]);
  async function remove() {
    const text = prompt(
      `刪除會將整個專案資料夾移至垃圾桶。請輸入「${p.project_name}」確認：`,
    );
    if (text !== p.project_name) return;
    try {
      await api.adminDeleteProject({
        token: admin.token,
        projectId,
        confirmText: text,
      });
      go("/admin");
    } catch (x) {
      setError(x);
    }
  }
  async function clone() {
    const name = prompt(`請輸入複製專案的名稱：`, p.project_name + "（複製）");
    if (!name) return;
    try {
      const r = await api.adminCloneProject({
        token: admin.token,
        projectId,
        name,
      });
      go("/admin/projects/" + r.data.project_id);
    } catch (x) {
      setError(x);
    }
  }
  return (
    <div className="stack">
      <h2>專案設定</h2>
      <div className="grid">
        <Field label="問卷名稱">
          <input
            className="input"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </Field>
        <Field label="專案狀態">
          <select
            className="input"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          >
            {["草稿", "開放填寫", "停止填寫", "已截止", "已封存"].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </Field>
        <Field label="開放日期">
          <input
            type="datetime-local"
            className="input"
            value={form.startDate}
            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
          />
        </Field>
        <Field label="截止日期">
          <input
            type="datetime-local"
            className="input"
            value={form.endDate}
            onChange={(e) => setForm({ ...form, endDate: e.target.value })}
          />
        </Field>
      </div>
      <Field label="問卷說明">
        <textarea
          className="input"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </Field>
      <Field label="送出後訊息">
        <textarea
          className="input"
          value={form.completionMessage}
          onChange={(e) =>
            setForm({ ...form, completionMessage: e.target.value })
          }
        />
      </Field>
      <label>
        <input
          type="checkbox"
          checked={form.showProgress}
          onChange={(e) => setForm({ ...form, showProgress: e.target.checked })}
        />{" "}
        顯示填寫進度
      </label>
      <div className="row spread">
        <div className="row">
          <button className="btn danger" onClick={remove}>
            刪除專案
          </button>
          <button className="btn secondary" onClick={clone}>
            複製專案
          </button>
        </div>
        <span className="muted">{saveStatus}</span>
      </div>
    </div>
  );
}
function Field({ label, children }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  );
}

function Users({ admin, projectId, data, reload, setError }) {
  const [fields, setFields] = useState(
      data.fields.filter((f) => !["account", "password"].includes(f.field_key)),
    ),
    [labels, setLabels] = useState({
      account:
        data.fields.find((f) => f.field_key === "account")?.field_label ||
        "業務員代碼",
      password:
        data.fields.find((f) => f.field_key === "password")?.field_label ||
        "生日後四碼",
    }),
    [paste, setPaste] = useState("account\tpassword\t姓名\nA001\t0101\t王小明"),
    [mode, setMode] = useState("skip");
  const [saveStatus, setSaveStatus] = useState(""),
    initialRef = useRef({ fields, labels }),
    [importing, setImporting] = useState(false);
  const preview = useMemo(() => parsePaste(paste, fields), [paste, fields]);
  useEffect(() => {
    if (
      JSON.stringify(initialRef.current) === JSON.stringify({ fields, labels })
    )
      return;
    setSaveStatus("儲存中...");
    const t = setTimeout(async () => {
      try {
        await api.adminSaveUserFields({
          token: admin.token,
          projectId,
          accountLabel: labels.account,
          passwordLabel: labels.password,
          fields,
        });
        initialRef.current = { fields, labels };
        setSaveStatus("已自動儲存");
      } catch (x) {
        setError(x);
        setSaveStatus("儲存失敗");
      }
    }, 1000);
    return () => clearTimeout(t);
  }, [fields, labels, admin.token, projectId, setError]);
  async function importUsers() {
    if (importing) return;
    setImporting(true);
    try {
      await api.adminImportUsers({
        token: admin.token,
        projectId,
        users: preview.users,
        duplicateMode: mode,
      });
      await reload();
      window.toast("匯入完成", "success");
    } catch (x) {
      setError(x);
    } finally {
      setImporting(false);
    }
  }
  return (
    <div className="stack">
      <div className="row spread">
        <h2>使用者欄位</h2>
        <div className="row">
          <span className="muted">{saveStatus}</span>
          <button
            className="btn secondary"
            onClick={() =>
              setFields([
                ...fields,
                {
                  field_id: crypto.randomUUID(),
                  field_key: "field_" + (fields.length + 1),
                  field_label: "新欄位",
                  field_type: "text",
                  statistical_dimension: true,
                  active: true,
                },
              ])
            }
          >
            ＋ 自訂欄位
          </button>
        </div>
      </div>
      <div className="grid">
        <Field label="帳號顯示名稱">
          <input
            className="input"
            value={labels.account}
            onChange={(e) => setLabels({ ...labels, account: e.target.value })}
          />
        </Field>
        <Field label="密碼顯示名稱">
          <input
            className="input"
            value={labels.password}
            onChange={(e) => setLabels({ ...labels, password: e.target.value })}
          />
        </Field>
      </div>
      {fields.map((f, i) => (
        <div className="row" key={f.field_id}>
          <input
            className="input"
            style={{ flex: 1 }}
            value={f.field_key}
            onChange={(e) =>
              setFields(
                fields.map((x, j) =>
                  j === i ? { ...x, field_key: e.target.value } : x,
                ),
              )
            }
          />
          <input
            className="input"
            style={{ flex: 1 }}
            value={f.field_label}
            onChange={(e) =>
              setFields(
                fields.map((x, j) =>
                  j === i ? { ...x, field_label: e.target.value } : x,
                ),
              )
            }
          />
          <label>
            <input
              type="checkbox"
              checked={f.statistical_dimension !== false}
              onChange={(e) =>
                setFields(
                  fields.map((x, j) =>
                    j === i
                      ? { ...x, statistical_dimension: e.target.checked }
                      : x,
                  ),
                )
              }
            />
            統計
          </label>
          <button
            className="btn danger"
            onClick={() => setFields(fields.filter((_, j) => j !== i))}
          >
            刪除
          </button>
        </div>
      ))}
      <hr />
      <h2>Excel／TXT 批次貼上</h2>
      <p className="muted">
        第一列可使用 account、password 與自訂欄位名稱；Tab 分欄、換行分筆。
      </p>
      <textarea
        className="input"
        value={paste}
        onChange={(e) => setPaste(e.target.value)}
      />
      <div className="row">
        <select
          className="input"
          style={{ width: "auto" }}
          value={mode}
          onChange={(e) => setMode(e.target.value)}
        >
          <option value="skip">跳過重複</option>
          <option value="overwrite">覆蓋既有</option>
          <option value="updateNonBlank">僅更新非空白</option>
          <option value="cancel">遇重複則取消</option>
        </select>
        <span>{preview.users.length} 筆可匯入</span>
        <button
          className="btn primary"
          disabled={importing || !preview.users.length}
          onClick={importUsers}
        >
          {importing ? "處理中…" : "確認匯入"}
        </button>
      </div>
      <div className="row spread">
        <h3>使用者名單</h3>
        <ExportButtons
          admin={admin}
          projectId={projectId}
          buttons={[
            { kind: "users", label: "下載使用者名單" },
            { kind: "unsubmitted", label: "下載尚未填寫名單" },
          ]}
        />
      </div>
      <SimpleTable
        rows={data.users.map((u) => ({
          帳號: u.account,
          ...u.profile,
          狀態: u.status,
        }))}
      />
    </div>
  );
}
function parsePaste(text, fields) {
  const rows = text
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .map((r) => r.split("\t"));
  if (!rows.length) return { users: [] };
  const known = ["account", "password", ...fields.map((f) => f.field_key)],
    first = rows[0].map((x) => x.trim()),
    hasHeader = first.some((x) => known.includes(x)),
    headers = hasHeader ? first : known,
    body = hasHeader ? rows.slice(1) : rows;
  return {
    users: body
      .map((cols) => {
        const r = { profile: {} };
        headers.forEach((h, i) => {
          if (h === "account" || h === "password")
            r[h] = (cols[i] || "").trim();
          else r.profile[h] = (cols[i] || "").trim();
        });
        return r;
      })
      .filter((x) => x.account),
  };
}

function Builder({ admin, projectId, data, setData, setError }) {
  const [schema, setSchema] = useState(data.schema);
  const schemaRef = useRef(schema), pastRef = useRef([]), futureRef = useRef([]), coalesceRef = useRef({ key: "", time: 0 });
  const [historyState, setHistoryState] = useState({ undo: false, redo: false });
  const [saveStatus, setSaveStatus] = useState("");
  const [dragging, setDragging] = useState(null);
  const [notice, setNotice] = useState("");
  const [collapsedSections, setCollapsedSections] = useState({});
  const savedHashRef = useRef(JSON.stringify(schema));
  const savingRef = useRef(false), queuedSaveRef = useRef(null);
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const refreshHistory = () => setHistoryState({ undo: pastRef.current.length > 0, redo: futureRef.current.length > 0 });
  const commit = (updater, coalesceKey = "") => {
    const current = schemaRef.current, next = typeof updater === "function" ? updater(current) : updater;
    if (JSON.stringify(current) === JSON.stringify(next)) return;
    const now = Date.now(), sameTypingGroup = coalesceKey && coalesceRef.current.key === coalesceKey && now - coalesceRef.current.time < 800;
    if (!sameTypingGroup) pastRef.current.push(clone(current));
    if (pastRef.current.length > 100) pastRef.current.shift();
    coalesceRef.current = { key: coalesceKey, time: now };
    futureRef.current = [];
    schemaRef.current = next;
    setSchema(next);
    refreshHistory();
  };
  const undo = () => {
    const previous = pastRef.current.pop(); if (!previous) return;
    futureRef.current.push(clone(schemaRef.current)); schemaRef.current = previous; setSchema(previous); coalesceRef.current = { key: "", time: 0 }; refreshHistory(); setNotice("已復原上一個動作");
  };
  const redo = () => {
    const next = futureRef.current.pop(); if (!next) return;
    pastRef.current.push(clone(schemaRef.current)); schemaRef.current = next; setSchema(next); coalesceRef.current = { key: "", time: 0 }; refreshHistory(); setNotice("已重做下一個動作");
  };
  const newQuestion = (sectionId, type = "short", title = "新題目") => ({ id: "Q" + crypto.randomUUID().slice(0, 8), sectionId, type, title, description: "", required: false, options: [], validation: {}, config: {} });
  const addSection = () => commit((current) => ({ ...current, sections: [...current.sections, { id: "S" + crypto.randomUUID().slice(0, 6), title: "新區段", description: "", order: current.sections.length + 1 }] }));
  const addQuestion = (sectionId = schemaRef.current.sections[0]?.id, type = "short", title = "新題目") => commit((current) => ({ ...current, questions: [...current.questions, newQuestion(sectionId, type, title)] }));
  const moveQuestion = (questionId, sectionId, beforeId = null) => commit((current) => {
    const moving = current.questions.find((q) => q.id === questionId); if (!moving) return current;
    const groups = Object.fromEntries(current.sections.map((s) => [s.id, current.questions.filter((q) => q.sectionId === s.id && q.id !== questionId)]));
    const target = groups[sectionId] || (groups[sectionId] = []), index = beforeId ? target.findIndex((q) => q.id === beforeId) : -1;
    target.splice(index < 0 ? target.length : index, 0, { ...moving, sectionId });
    return { ...current, questions: current.sections.flatMap((s) => groups[s.id] || []) };
  });
  const moveSection = (sectionId, beforeId = null) => commit((current) => {
    const moving = current.sections.find((s) => s.id === sectionId); if (!moving || sectionId === beforeId) return current;
    const sections = current.sections.filter((s) => s.id !== sectionId), index = beforeId ? sections.findIndex((s) => s.id === beforeId) : -1;
    sections.splice(index < 0 ? sections.length : index, 0, moving);
    return { ...current, sections: sections.map((s, i) => ({ ...s, order: i + 1 })), questions: sections.flatMap((s) => current.questions.filter((q) => q.sectionId === s.id)) };
  });
  const persistQueued = async () => {
    if (savingRef.current) return; savingRef.current = true;
    while (queuedSaveRef.current) {
      const snapshot = queuedSaveRef.current; queuedSaveRef.current = null; setSaveStatus("儲存中...");
      try {
        const r = await api.adminSaveSchema({ token: admin.token, projectId, schema: snapshot });
        savedHashRef.current = JSON.stringify(snapshot);
        setData((current) => ({ ...current, schema: r.data }));
        setSaveStatus(queuedSaveRef.current ? "儲存中..." : "已自動儲存");
      } catch (x) { setError(x); setSaveStatus("儲存失敗"); queuedSaveRef.current = null; }
    }
    savingRef.current = false;
  };
  useEffect(() => {
    if (savedHashRef.current === JSON.stringify(schema)) return;
    setSaveStatus("等待儲存...");
    const t = setTimeout(() => { queuedSaveRef.current = clone(schema); persistQueued(); }, 900);
    return () => clearTimeout(t);
  }, [schema]);
  useEffect(() => {
    const onKey = (event) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      if (event.key.toLowerCase() === "z") { event.preventDefault(); if (event.shiftKey) redo(); else undo(); }
      else if (event.key.toLowerCase() === "y") { event.preventDefault(); redo(); }
    };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => { if (!notice) return; const t = setTimeout(() => setNotice(""), 3500); return () => clearTimeout(t); }, [notice]);
  return (
    <div className="stack">
      <div className="row spread builder-toolbar">
        <h2>問卷設計器</h2>
        <div className="row">
          <span className="muted">{saveStatus}</span>
          <button className="btn secondary" disabled={!historyState.undo} onClick={undo} title="上一步（Ctrl/⌘ + Z）">↶ 上一步</button>
          <button className="btn secondary" disabled={!historyState.redo} onClick={redo} title="下一步（Ctrl + Y／⌘ + Shift + Z）">↷ 下一步</button>
          <button className="btn secondary" onClick={addSection}>
            ＋ 區段
          </button>
        </div>
      </div>
      {notice && <div className="alert success row spread"><span>{notice}</span><button className="btn ghost" onClick={undo}>復原</button></div>}
      {schema.sections.map((s, i) => (
        <section className={`builder-section stack ${dragging?.id === s.id ? "dragging" : ""}`} key={s.id}
          onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); if (dragging?.type === "section") moveSection(dragging.id, s.id); else if (dragging?.type === "question") moveQuestion(dragging.id, s.id); setDragging(null); }}>
          <div className="row section-heading">
            <button className="drag-grip" draggable onDragStart={(e) => { e.stopPropagation(); setDragging({ type: "section", id: s.id }); e.dataTransfer.effectAllowed = "move"; }} onDragEnd={() => setDragging(null)} aria-label={`拖曳區段 ${i + 1}`} title="拖曳移動整個區段">⠿</button>
            <strong>區段 {i + 1}</strong>
            <input
              className="input"
              style={{ flex: 1 }}
              value={s.title}
              onChange={(e) => commit((current) => ({ ...current, sections: current.sections.map((x) => x.id === s.id ? { ...x, title: e.target.value } : x) }), `section:${s.id}:title`)}
            />
            <div className="row" style={{ gap: 5 }}>
              <button className="btn ghost" disabled={i === 0} onClick={() => moveSection(s.id, schema.sections[i - 1].id)}>↑ 上移</button>
              <button className="btn ghost" disabled={i === schema.sections.length - 1} onClick={() => moveSection(s.id, schema.sections[i + 2] ? schema.sections[i + 2].id : null)}>↓ 下移</button>
              <button className="btn ghost" onClick={() => setCollapsedSections(c => ({...c, [s.id]: !c[s.id]}))}>
                {collapsedSections[s.id] ? "展開所有題目" : "收縮所有題目"}
              </button>
            </div>
            {schema.sections.length > 1 && (
              <button className="btn danger" onClick={() => {
                const count = schemaRef.current.questions.filter((q) => q.sectionId === s.id).length;
                if (!confirm(`確定刪除「${s.title}」？${count ? `\n其中 ${count} 個項目會移到前一個可用區段，刪除後可按「上一步」復原。` : ""}`)) return;
                commit((current) => { const sections = current.sections.filter((x) => x.id !== s.id), target = sections[Math.max(0, i - 1)].id; return { ...current, sections: sections.map((x, index) => ({ ...x, order: index + 1 })), questions: current.questions.map((q) => q.sectionId === s.id ? { ...q, sectionId: target } : q) }; });
                setNotice(`已刪除「${s.title}」${count ? `，並移動 ${count} 個項目` : ""}`);
              }}>
                刪除區段
              </button>
            )}
          </div>
          <div className="section-items stack" style={{ display: collapsedSections[s.id] ? "none" : "grid" }}>
            {schema.questions.filter((q) => q.sectionId === s.id).map((q, localIndex, sectionQuestions) => (
              <div key={q.id} className={`question-drop ${dragging?.id === q.id ? "dragging" : ""}`} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); e.stopPropagation(); if (dragging?.type === "question") moveQuestion(dragging.id, s.id, q.id); setDragging(null); }}>
                <QuestionEditor q={q} sections={schema.sections} ctx={{ admin, projectId, data, setError }}
                  dragHandle={<button className="drag-grip" draggable onDragStart={(e) => { setDragging({ type: "question", id: q.id }); e.dataTransfer.effectAllowed = "move"; }} onDragEnd={() => setDragging(null)} aria-label={`拖曳題目 ${q.title}`} title="拖曳排序或移到其他區段">⠿</button>}
                  onChange={(v, key = "") => commit((current) => ({ ...current, questions: current.questions.map((x) => x.id === q.id ? v : x) }), key ? `question:${q.id}:${key}` : "")}
                  onSectionChange={(sectionId) => moveQuestion(q.id, sectionId)}
                  onMove={(d) => { const target = sectionQuestions[localIndex + d]; if (target) moveQuestion(q.id, s.id, d < 0 ? target.id : sectionQuestions[localIndex + d + 1]?.id || null); }}
                  onCopy={() => commit((current) => { const index = current.questions.findIndex((x) => x.id === q.id), questions = [...current.questions]; questions.splice(index + 1, 0, { ...clone(q), id: "Q" + crypto.randomUUID().slice(0, 8), title: q.title + "（複製）" }); return { ...current, questions }; })}
                  onDelete={() => { commit((current) => ({ ...current, questions: current.questions.filter((x) => x.id !== q.id) })); setNotice(`已刪除「${q.title}」`); }} />
              </div>
            ))}
            {!schema.questions.some((q) => q.sectionId === s.id) && <div className="empty-section">將題目拖曳到這裡，或使用下方按鈕新增</div>}
          </div>
          {!collapsedSections[s.id] && (
            <div className="row section-actions">
              <button className="btn secondary" onClick={() => addQuestion(s.id)}>＋ 題目</button>
              <button className="btn ghost" onClick={() => addQuestion(s.id, "heading", "新標題")}>＋ 標題與說明</button>
              <button className="btn ghost" onClick={() => addQuestion(s.id, "image_note", "新圖片說明")}>＋ 圖片說明</button>
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
function QuestionEditor({
  q,
  sections,
  onChange,
  onSectionChange,
  onMove,
  onCopy,
  onDelete,
  ctx,
  dragHandle,
}) {
  const [showLinked, setShowLinked] = useState(false);
  const [uploadState, setUploadState] = useState("");
  const uploadQuestionImage = async (file) => {
    if (!file) return "";
    setUploadState(`正在上傳「${file.name}」，請勿關閉頁面…`);
    try {
      const base64 = await new Promise((resolve, reject) => { const reader=new FileReader(); reader.onerror=reject; reader.onload=() => resolve(String(reader.result).split(",")[1]); reader.readAsDataURL(file); });
      const r = await api.adminQuestionImageUpload({token:ctx.admin.token,projectId:ctx.projectId,questionId:q.id,mimeType:file.type,base64});
      setUploadState("圖片上傳完成");
      return r.data.url;
    } catch (error) {
      setUploadState("上傳失敗，請重試");
      throw error;
    }
  };
  const optionType = [
    "single",
    "checkbox",
    "dropdown",
    "scale",
    "radio_grid",
    "checkbox_grid",
    ...ADVANCED_OPTION_TYPES.filter((type) => type !== "cascading"),
  ].includes(q.type);
  const isGrid = ["radio_grid", "checkbox_grid"].includes(q.type);
  const jumpable = ["single", "dropdown"].includes(q.type);
  return (
    <div className="question stack">
      <div className="row">
        {dragHandle}
        <input
          className="input"
          style={{ flex: 2 }}
          value={q.title}
          onChange={(e) => onChange({ ...q, title: e.target.value }, "title")}
        />
        {["heading", "image_note"].includes(q.type) ? (
          <div style={{ flex: 1, padding: "0 10px", color: "#666" }}>
            {q.type === "heading" ? "標題與說明" : "圖片說明"}
          </div>
        ) : (
          <select
            className="input"
            style={{ flex: 1 }}
            value={q.type}
            onChange={(e) => onChange({ ...q, type: e.target.value })}
          >
            {Object.entries(TYPES).map(([k, v]) => (
              <option value={k} key={k}>
                {v}
              </option>
            ))}
          </select>
        )}
        <select
          className="input"
          style={{ flex: 1 }}
          value={q.sectionId}
          onChange={(e) => onSectionChange(e.target.value)}
        >
          {sections.map((s) => (
            <option value={s.id} key={s.id}>
              {s.title}
            </option>
          ))}
        </select>
      </div>
      <textarea
        className="input"
        placeholder="題目說明"
        value={q.description || ""}
        onChange={(e) => onChange({ ...q, description: e.target.value }, "description")}
      />
      {["short", "linked_short"].includes(q.type) && (
        <select
          className="input"
          style={{ width: "auto" }}
          value={q.validation?.format || ""}
          onChange={(e) =>
            onChange({
              ...q,
              validation: { ...q.validation, format: e.target.value },
            })
          }
        >
          <option value="">無格式限制</option>
          <option value="number">數字格式</option>
          <option value="email">Email 格式</option>
          <option value="phone">電話格式</option>
        </select>
      )}
      {optionType && !isGrid && (
        <div className="stack">
          {(q.options || []).map((o, i) => (
            <div className="row" key={i}>
              <input
                className="input"
                style={{ flex: 1 }}
                value={o.label || o.value}
                onChange={(e) =>
                  onChange({
                    ...q,
                    options: q.options.map((x, j) =>
                      j === i
                        ? { ...x, value: e.target.value, label: e.target.value }
                        : x,
                    ),
                  })
                }
              />
              <AdvancedOptionFields q={q} index={i} onChange={onChange} uploadImage={uploadQuestionImage} />
              {jumpable && (
                <select
                  className="input"
                  style={{ flex: 1 }}
                  value={o.nextSectionId || ""}
                  onChange={(e) =>
                    onChange({
                      ...q,
                      options: q.options.map((x, j) =>
                        j === i ? { ...x, nextSectionId: e.target.value } : x,
                      ),
                    })
                  }
                >
                  <option value="">繼續下一個區段</option>
                  {sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      前往：{s.title}
                    </option>
                  ))}
                  <option value="SUBMIT">送出表單</option>
                </select>
              )}
              <button
                className="btn ghost danger"
                style={{ width: "auto" }}
                onClick={() =>
                  onChange({
                    ...q,
                    options: q.options.filter((_, j) => j !== i),
                  })
                }
              >
                ✖
              </button>
            </div>
          ))}
          <button
            className="btn secondary"
            style={{ alignSelf: "flex-start" }}
            onClick={() =>
              onChange({
                ...q,
                options: [
                  ...(q.options || []),
                  { value: "新選項", label: "新選項" },
                ],
              })
            }
          >
            ＋ 新增選項
          </button>
        </div>
      )}
      <AdvancedEditor q={q} onChange={onChange} uploadImage={uploadQuestionImage} />
      {uploadState && <div className={uploadState.includes("失敗") ? "alert error" : "alert"} role="status">{uploadState}</div>}
      {q.type === "linked_multi" && (
        <div className="stack">
          <button
            className="btn secondary"
            style={{ alignSelf: "flex-start" }}
            onClick={() => setShowLinked(!showLinked)}
          >
            {showLinked ? "隱藏連結型選項" : "編輯連結型選項"}
          </button>
          {showLinked && <LinkedEditor {...ctx} questionId={q.id} />}
        </div>
      )}
      {isGrid && (
        <div className="row">
          <textarea
            className="input"
            placeholder="列選項（每行一個）"
            style={{ flex: 1 }}
            value={(q.options || [])
              .map((o) => o.label || o.value || "")
              .join("\n")}
            onChange={(e) =>
              onChange({
                ...q,
                options: e.target.value
                  .split("\n")
                  .filter(Boolean)
                  .map((v) => ({ value: v, label: v })),
              })
            }
          />
          <textarea
            className="input"
            placeholder="欄選項（每行一個）"
            style={{ flex: 1 }}
            value={(q.config?.cols || []).join("\n")}
            onChange={(e) =>
              onChange({
                ...q,
                config: {
                  ...q.config,
                  cols: e.target.value.split("\n").filter(Boolean),
                },
              })
            }
          />
        </div>
      )}
      <div className="row spread">
        {!["heading", "image_note"].includes(q.type) ? (
          <label>
            <input
              type="checkbox"
              checked={q.required}
              onChange={(e) => onChange({ ...q, required: e.target.checked })}
            />{" "}
            必填
          </label>
        ) : (
          <div />
        )}
        <div className="row">
          <button className="btn ghost" onClick={() => onMove(-1)}>
            ↑
          </button>
          <button className="btn ghost" onClick={() => onMove(1)}>
            ↓
          </button>
          <button className="btn secondary" onClick={onCopy}>
            複製
          </button>
          <button className="btn danger" onClick={onDelete}>
            刪除
          </button>
        </div>
      </div>
    </div>
  );
}

function LinkedEditor({ admin, projectId, data, setError, questionId }) {
  const currentOptions = data.linkedOptions.filter(
    (x) => x.question_id === questionId,
  );
  const otherOptions = data.linkedOptions.filter(
    (x) => x.question_id !== questionId,
  );
  const [text, setText] = useState(
    currentOptions
      .map((x) => [x.account, x.option_value, x.option_label].join("\t"))
      .join("\n"),
  );
  const [saveStatus, setSaveStatus] = useState("");
  const initialRef = useRef(text);
  useEffect(() => {
    if (initialRef.current === text) return;
    setSaveStatus("儲存中...");
    const t = setTimeout(async () => {
      const newOptions = text
        .split(/\r?\n/)
        .filter(Boolean)
        .map((r, i) => {
          const [a, v, l] = r.split("\t");
          return {
            questionId,
            account: a,
            value: v,
            label: l || v,
            order: i + 1,
          };
        });
      const otherFormatted = otherOptions.map((x) => ({
        questionId: x.question_id,
        account: x.account,
        value: x.option_value,
        label: x.option_label,
        order: x.option_order,
        active: String(x.active) !== "false",
      }));
      const allOptions = [...otherFormatted, ...newOptions];
      try {
        await api.adminSaveLinkedOptions({
          token: admin.token,
          projectId,
          options: allOptions,
        });
        initialRef.current = text;
        setSaveStatus("已自動儲存");
        data.linkedOptions = allOptions.map((x) => ({
          question_id: x.questionId,
          account: x.account,
          option_value: x.value,
          option_label: x.label,
          option_order: x.order,
          active: x.active,
        }));
      } catch (x) {
        setError(x);
        setSaveStatus("儲存失敗");
      }
    }, 1000);
    return () => clearTimeout(t);
  }, [text, admin.token, projectId, questionId, setError, otherOptions, data]);
  return (
    <div
      className="stack"
      style={{ background: "#f9f9f9", padding: 10, borderRadius: 4 }}
    >
      <div className="row spread">
        <strong>連結型選項內容</strong>
        <span className="muted small">{saveStatus}</span>
      </div>
      <p className="muted small">每列格式：account [TAB] value [TAB] label</p>
      <textarea
        className="input"
        style={{ minHeight: 150 }}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
    </div>
  );
}
function Status({ admin, projectId, data }) {
  return (
    <div className="stack">
      <div className="row spread">
        <h2>填寫狀況</h2>
        <ExportButtons
          admin={admin}
          projectId={projectId}
          buttons={[{ kind: "status", label: "下載填寫狀態 CSV" }]}
        />
      </div>
      <div className="grid">
        <Metric label="全部使用者" value={data.project.stats.total} />
        <Metric label="已暫存" value={data.project.stats.draft} />
        <Metric label="已送出" value={data.project.stats.submitted} />
        <Metric label="填寫率" value={(data.project.stats.rate || 0) + "%"} />
      </div>
    </div>
  );
}
function Metric({ label, value }) {
  return (
    <div className="card">
      <div className="metric">{value}</div>
      <div className="muted">{label}</div>
    </div>
  );
}
function Responses({ admin, projectId, data }) {
  const [rows, setRows] = useState([]),
    [statuses, setStatuses] = useState([]),
    [error, setError] = useState(null),
    [editingAccount, setEditingAccount] = useState(null),
    [loading, setLoading] = useState(true);
  const load = () => {
    setLoading(true);
    api
      .adminResponses({ token: admin.token, projectId })
      .then((r) => {
        setRows(r.data.answers);
        setStatuses(r.data.statuses);
        setLoading(false);
      })
      .catch((e) => {
        setError(e);
        setLoading(false);
      });
  };
  useEffect(() => {
    load();
  }, []);
  if (editingAccount) {
    const userAnswers = {};
    rows
      .filter((a) => a.account === editingAccount)
      .forEach((a) => {
        try {
          userAnswers[a.question_id] = JSON.parse(a.answer_value);
        } catch {
          userAnswers[a.question_id] = a.answer_value;
        }
      });
    const userStatus = statuses.find((s) => s.account === editingAccount) || {
      account: editingAccount,
      status: "未填寫",
    };
    return (
      <AdminSurveyForm
        admin={admin}
        projectId={projectId}
        data={data}
        account={editingAccount}
        initialAnswers={userAnswers}
        initialStatus={userStatus}
        onBack={() => {
          setEditingAccount(null);
          load();
        }}
      />
    );
  }
  const displayRows = rows.map((r) => {
    const typeMap = {
      short: "簡答",
      paragraph: "詳答",
      single: "單選",
      checkbox: "多選",
      dropdown: "下拉",
      scale: "量表",
      radio_grid: "單選方陣",
      checkbox_grid: "多選方陣",
      date: "日期",
      time: "時間",
      number: "數字",
      email: "Email",
      phone: "電話",
      heading: "標題",
      image_note: "圖片",
      section: "區段",
      signature: "簽名",
      multi_image: "檔案/圖片上傳",
      linked_multi: "連結型多選",
      linked_short: "連結型簡答",
    };
    const q = data.schema.questions.find((x) => x.id === r.question_id) || {
      title: r.question_id,
      type: "未知",
    };
    return {
      帳號: r.account,
      問題: q.title,
      題型: typeMap[q.type] || q.type,
      回答內容: r.answer_display || r.answer_value,
      附件: r.attachment_ids,
      狀態: r.status,
      建立時間: fmt(r.created_at),
      最後更新: fmt(r.updated_at),
      送出時間: r.submitted_at ? fmt(r.submitted_at) : "",
      更新者: r.updated_by,
    };
  });
  return (
    <div className="stack">
      <div className="row spread">
        <h2>回答資料</h2>
        <ExportButtons
          admin={admin}
          projectId={projectId}
          buttons={[{ kind: "long", label: "下載完整回答資料" }]}
        />
      </div>
      <ErrorBox error={error} />
      {loading ? (
        <div className="alert">資料載入中，請稍候…</div>
      ) : (
        <SimpleTable
          rows={displayRows}
          renderAction={(r) => (
            <button
              className="btn secondary small"
              onClick={() => setEditingAccount(r["帳號"])}
            >
              編輯
            </button>
          )}
        />
      )}
    </div>
  );
}
function Stats({ admin, projectId, data }) {
  const [dimensions, setDimensions] = useState([]),
    [stats, setStats] = useState({ summary: data.project.stats, groups: [] }),
    [advanced, setAdvanced] = useState({ heatmaps: [], maxdiff: [] }),
    [loading, setLoading] = useState(false);
  const allowed = data.fields.filter(
    (f) =>
      f.field_key === "account" ||
      (String(f.statistical_dimension) === "true" &&
        f.field_key !== "password"),
  );
  async function load(next = dimensions) {
    setDimensions(next);
    setLoading(true);
    try {
      setStats(
        (
          await api.adminStats({
            token: admin.token,
            projectId,
            dimensions: next,
          })
        ).data,
      );
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { api.adminAdvancedAnalytics({token:admin.token,projectId}).then((r) => setAdvanced(r.data)); }, [projectId]);
  return (
    <div className="stack">
      <div className="row spread">
        <h2>統計分析</h2>
        <ExportButtons
          admin={admin}
          projectId={projectId}
          buttons={[{ kind: "stats", label: "下載統計結果", dims: dimensions }]}
        />
      </div>
      <div className="row">
        {allowed.map((f) => (
          <label key={f.field_key}>
            <input
              type="checkbox"
              disabled={loading}
              checked={dimensions.includes(f.field_key)}
              onChange={(e) =>
                load(
                  e.target.checked
                    ? [...dimensions, f.field_key]
                    : dimensions.filter((x) => x !== f.field_key),
                )
              }
            />
            {f.field_label}
          </label>
        ))}
      </div>
      <div className="grid">
        <Metric label="總人數" value={stats.summary.total} />
        <Metric label="曾登入" value={stats.summary.loggedIn} />
        <Metric label="已送出" value={stats.summary.submitted} />
        <Metric label="填寫率" value={stats.summary.rate + "%"} />
      </div>
      {loading ? (
        <div className="alert">資料載入中，請稍候…</div>
      ) : (
        <SimpleTable
          rows={stats.groups.map((g) =>
            Object.fromEntries([
              ...dimensions.map((d, i) => [d, g.values[i]]),
              ["使用者數", g.total],
              ["已送出", g.submitted],
              ["填寫率", g.rate + "%"],
            ]),
          )}
        />
      )}
      {advanced.heatmaps.map((h) => <div className="stack" key={h.questionId}><h3>{h.title}－多人熱點圖</h3><p className="muted">{h.responses} 份已送出回答，共 {h.points.length} 個熱點</p><div className="heatmap analytics-heatmap">{h.imageUrl && <img src={h.imageUrl} alt={h.title} />}{h.points.map((p,i) => <i key={i} style={{left:`${p.x*100}%`,top:`${p.y*100}%`}} />)}</div></div>)}
      {advanced.maxdiff.map((m) => <div className="stack" key={m.questionId}><h3>{m.title}－MaxDiff 相對效用</h3><SimpleTable rows={m.utilities.map((u) => ({選項:u.label, 最偏好次數:u.best, 最不偏好次數:u.worst, 顯示次數:u.shown, 相對效用:u.utility}))} /></div>)}
    </div>
  );
}
function InventoryAdmin({ admin, projectId, data }) {
  const [state, setState] = useState({ stock: [], transactions: [] });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const labels = Object.fromEntries(
    data.schema.questions.flatMap((q) =>
      (q.options || []).map((o) => [`${q.id}|${o.value}`, `${q.title}／${o.label}`]),
    ),
  );
  const load = async () => {
    try {
      setState((await api.adminInventory({ token: admin.token, projectId })).data);
      setError(null);
    } catch (e) { setError(e); }
  };
  useEffect(() => { load(); }, [projectId]);
  async function adjust(row) {
    const raw = prompt("調整數量（正數增加、負數減少）", "1");
    if (raw === null) return;
    const delta = Number(raw);
    if (!Number.isInteger(delta) || delta === 0) { window.toast("請輸入非零整數。", "error"); return; }
    setBusy(true);
    try {
      await api.adminAdjustInventory({ token: admin.token, projectId, questionId: row.question_id, optionValue: row.option_value, delta });
      await load();
    } catch (e) { setError(e); } finally { setBusy(false); }
  }
  return <div className="stack">
    <div className="row spread"><div><h2>庫存管理</h2><p className="muted">手動調整會留下完整異動紀錄；已送出回答改回暫存時會自動歸還。</p></div><button className="btn secondary" onClick={load}>重新整理</button></div>
    <ErrorBox error={error} />
    {!state.stock.length && <div className="alert"><strong>目前尚未建立庫存題。</strong><br />庫存管理用來限制活動名額、商品數量或預約時段。請先到「問卷設計」新增「限量／庫存題」，替各選項填入初始庫存並儲存；這裡就會顯示剩餘數量與每次增減紀錄。</div>}
    <SimpleTable rows={state.stock.map((r) => ({...r, 題目選項: labels[`${r.question_id}|${r.option_value}`] || `${r.question_id}／${r.option_value}`, 初始庫存: r.initial_stock, 剩餘庫存: r.remaining_stock}))} renderAction={(r) => <button className="btn secondary small" disabled={busy} onClick={() => adjust(r)}>調整</button>} />
    <h3>最近 1,000 筆異動</h3>
    <SimpleTable rows={state.transactions.map((r) => ({時間: fmt(r.created_at), 題目選項: labels[`${r.question_id}|${r.option_value}`] || `${r.question_id}／${r.option_value}`, 帳號或操作者: r.account, 原庫存: r.before_quantity, 異動: r.quantity_delta, 新庫存: r.after_quantity, 原因: r.action}))} />
  </div>;
}

function ExportButtons({ admin, projectId, buttons }) {
  const [downloading, setDownloading] = useState(null);
  async function download(kind, dims) {
    if (downloading) return;
    setDownloading(kind);
    try {
      const r = await api.adminExport({
        token: admin.token,
        projectId,
        kind,
        dimensions: dims,
      });
      const bstr = atob(r.data.base64);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const blob = new Blob([u8arr], { type: r.data.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = r.data.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      window.toast("下載成功", "success");
    } catch (x) {
      window.toast(x.message, "error");
    } finally {
      setDownloading(null);
    }
  }
  return (
    <div className="row">
      {buttons.map((b) => (
        <button
          key={b.kind}
          className="btn secondary small"
          disabled={downloading === b.kind}
          onClick={() => download(b.kind, b.dims)}
        >
          {downloading === b.kind ? "下載中…" : b.label}
        </button>
      ))}
    </div>
  );
}
function Attachments({ admin, projectId }) {
  const [rows, setRows] = useState([]),
    [loading, setLoading] = useState(true);
  const load = () => {
    setLoading(true);
    api
      .adminAttachments({ token: admin.token, projectId })
      .then((r) => {
        setRows(r.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };
  useEffect(() => {
    load();
  }, []);
  return (
    <div className="stack">
      <div className="row spread">
        <h2>附件管理</h2>
        <ExportButtons
          admin={admin}
          projectId={projectId}
          buttons={[{ kind: "attachments", label: "下載附件清單" }]}
        />
      </div>
      {loading ? (
        <div className="alert">資料載入中，請稍候…</div>
      ) : (
        <SimpleTable
          rows={rows.map((r) => ({
            帳號: r.account,
            題目: r.question_id,
            類型: r.attachment_type,
            檔名: r.file_name,
            大小: Math.round(r.file_size / 1024) + " KB",
            上傳時間: fmt(r.uploaded_at),
          }))}
        />
      )}
    </div>
  );
}
function Share({ data }) {
  const getShareUrl = () => {
    const raw = data.project.login_url;
    if (raw) {
      if (raw.includes("#/survey/")) return raw;
      if (raw.includes("/survey/"))
        return raw.replace(/\/survey\//, "/#/survey/");
      return `${raw.replace(/\/$/, "")}/#/survey/${data.project.project_id}/login`;
    }
    return `${location.origin}${import.meta.env.BASE_URL}#/survey/${data.project.project_id}/login`;
  };
  const url = getShareUrl();
  return (
    <div className="stack">
      <h2>分享設定</h2>
      <div className="row">
        <input className="input" style={{ flex: 1 }} readOnly value={url} />
        <button
          className="btn primary"
          onClick={() => navigator.clipboard.writeText(url)}
        >
          複製網址
        </button>
      </div>
      <div style={{ width: 220, padding: 20, background: "#fff" }}>
        <QRCodeSVG value={url} size={180} />
      </div>
      <a className="btn secondary" href={url} target="_blank" rel="noreferrer">
        預覽登入頁
      </a>
    </div>
  );
}
function Logs({ admin, projectId }) {
  const [rows, setRows] = useState([]),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    api
      .adminLogs({ token: admin.token, projectId })
      .then((r) => {
        setRows(r.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);
  return (
    <div className="stack">
      <h2>操作紀錄</h2>
      {loading ? (
        <div className="alert">資料載入中，請稍候…</div>
      ) : (
        <SimpleTable rows={rows} />
      )}
    </div>
  );
}
function SimpleTable({ rows = [], renderAction }) {
  if (!rows.length) return <div className="alert">目前沒有資料。</div>;
  const heads = Object.keys(rows[0]);
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {heads.map((h) => (
              <th key={h}>{h}</th>
            ))}
            {renderAction && <th>操作</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {heads.map((h) => (
                <td key={h}>
                  {typeof r[h] === "object"
                    ? JSON.stringify(r[h])
                    : String(r[h] ?? "")}
                </td>
              ))}
              {renderAction && <td>{renderAction(r)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Survey({ projectId, loginOnly }) {
  const session = userSession.get(projectId);
  if (loginOnly || !session) return <><SurveyLogin projectId={projectId} /><ToastContainer /></>;
  return <><SurveyForm projectId={projectId} session={session} /><ToastContainer /></>;
}
function SurveyLogin({ projectId }) {
  const [meta, setMeta] = useState(null),
    [form, setForm] = useState({ account: "", password: "" }),
    [error, setError] = useState(null),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    api
      .respondentProject({ projectId })
      .then((r) => setMeta(r.data))
      .catch(setError);
  }, [projectId]);
  async function login(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await api.respondentLogin({ projectId, ...form });
      userSession.set(projectId, r.data);
      go(`/survey/${projectId}`);
    } catch (x) {
      setError(x);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="shell">
      <Header />
      <form className="narrow card stack" onSubmit={login}>
        <span className="badge">{meta?.status || "問卷登入"}</span>
        <h1>{meta?.name || "載入問卷…"}</h1>
        <p className="muted">{meta?.description}</p>
        <ErrorBox error={error} />
        <Field label={meta?.accountLabel || "帳號"}>
          <input
            className="input"
            autoComplete="username"
            value={form.account}
            onChange={(e) => setForm({ ...form, account: e.target.value })}
          />
        </Field>
        <Field label={meta?.passwordLabel || "密碼"}>
          <input
            type="password"
            className="input"
            autoComplete="current-password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </Field>
        <button className="btn primary" disabled={busy}>
          {busy ? "登入中…" : "登入填寫"}
        </button>
      </form>
    </div>
  );
}

function SurveyForm({ projectId, session }) {
  const [data, setData] = useState(null),
    [errorMsg, setErrorMsg] = useState("");
  useEffect(() => {
    api
      .respondentSurvey({ token: session.token, projectId })
      .then((r) => setData(r.data))
      .catch((e) => {
        setErrorMsg(e.message);
        if (e.code === "UNAUTHORIZED") {
          userSession.clear(projectId);
          go(`/survey/${projectId}/login`);
        }
      });
  }, []);
  if (!data) {
    if (errorMsg)
      return (
        <div className="survey card stack">
          <h2>發生錯誤</h2>
          <div className="alert error">{errorMsg}</div>
          <button
            className="btn primary"
            onClick={() => go(`/survey/${projectId}/login`)}
          >
            重新登入
          </button>
        </div>
      );
    return <div className="survey card">載入中…</div>;
  }
  return (
    <SurveyUI
      projectId={projectId}
      data={data}
      initialAnswers={data.answers || {}}
      onLogout={() => {
        userSession.clear(projectId);
        go(`/survey/${projectId}/login`);
      }}
      onSave={async (answers, submit, rev) => {
        const action = submit ? "respondentSubmit" : "respondentSave";
        return await api[action]({
          token: session.token,
          projectId,
          answers,
          revision: rev,
        });
      }}
      uploadFn={async (file, questionId, type, seq) => {
        return await api.respondentUpload({
          token: session.token,
          projectId,
          questionId,
          type,
          mimeType: file.type,
          base64: file.base64,
          sequence: seq,
        });
      }}
      downloadFn={async (attachmentId) => {
        return await api.attachmentDownload({
          token: session.token,
          projectId,
          attachmentId,
          role: "respondent",
        });
      }}
      deleteFn={async (attachmentId) => {
        return await api.respondentDeleteAttachment({
          token: session.token,
          projectId,
          attachmentId,
        });
      }}
    />
  );
}
function AdminSurveyForm({
  admin,
  projectId,
  data,
  account,
  initialAnswers,
  initialStatus,
  onBack,
}) {
  const respondentData = {
    project: {
      id: data.project.project_id,
      name: data.project.project_name,
      status: data.project.project_status,
      description: data.settings.description || "",
      completionMessage: data.settings.completion_message || "",
      showProgress: data.settings.show_progress !== false,
      writable: true,
    },
    schema: data.schema,
    linkedOptions: data.linkedOptions,
    status: initialStatus,
    revision: "",
  };
  return (
    <div className="shell" style={{ background: "#f4f7fb", padding: "20px 0" }}>
      <div className="survey" style={{ marginBottom: 10 }}>
        <button className="btn secondary" onClick={onBack}>
          ← 返回列表
        </button>
      </div>
      <SurveyUI
        projectId={projectId}
        data={respondentData}
        initialAnswers={initialAnswers}
        adminAccount={account}
        onLogout={onBack}
        onSave={async (answers, submit) => {
          return await api.adminUpdateResponse({
            token: admin.token,
            projectId,
            account,
            answers,
            status: submit ? "已送出" : "已暫存",
          });
        }}
        uploadFn={async (file, questionId, type, seq) => {
          return await api.adminUpload({
            token: admin.token,
            projectId,
            account,
            questionId,
            type,
            mimeType: file.type,
            base64: file.base64,
            sequence: seq,
          });
        }}
        downloadFn={async (attachmentId) => {
          return await api.attachmentDownload({
            token: admin.token,
            projectId,
            attachmentId,
            role: "admin",
          });
        }}
        deleteFn={async (attachmentId) => {
          return await api.adminDeleteAttachment({
            token: admin.token,
            projectId,
            attachmentId,
          });
        }}
      />
    </div>
  );
}
function SurveyUI({
  projectId,
  data,
  initialAnswers,
  adminAccount,
  onLogout,
  onSave,
  uploadFn,
  downloadFn,
  deleteFn,
}) {
  const [answers, setAnswers] = useState(initialAnswers || {}),
    [history, setHistory] = useState([0]),
    [errors, setErrors] = useState({}),
    [errorSummary, setErrorSummary] = useState([]),
    [busy, setBusy] = useState(false),
    [showThankYou, setShowThankYou] = useState(false);
  const sections = [...data.schema.sections].sort((a, b) => a.order - b.order),
    section = history[history.length - 1],
    current = sections[section],
    questions = data.schema.questions.filter((q) => q.sectionId === current.id),
    writable = data.project.writable;
  const change = (id, v) => {
    setAnswers({ ...answers, [id]: v });
    setErrors({ ...errors, [id]: undefined });
    setErrorSummary([]);
  };
  const getNextSection = () => {
    let jump = "";
    data.schema.questions
      .filter(
        (q) =>
          q.sectionId === current.id &&
          (q.type === "single" || q.type === "dropdown"),
      )
      .forEach((q) => {
        const val = answers[q.id],
          opt = (q.options || []).find((o) => String(o.value) === String(val));
        if (opt && opt.nextSectionId && !jump) jump = opt.nextSectionId;
      });
    if (jump === "SUBMIT") return sections.length;
    if (jump) {
      const nextIndex = sections.findIndex((s) => s.id === jump);
      if (nextIndex > section) return nextIndex;
    }
    return section + 1;
  };
  const nextIndex = getNextSection(),
    isSubmit = nextIndex >= sections.length;

  const validateCurrentPage = () => {
    const errs = {};
    const msgs = [];
    questions.forEach((q) => {
      if (q.type === "heading" || q.type === "image_note") return;
      const val = answers[q.id];
      let isBlank = val === undefined || val === null || val === "";
      if (Array.isArray(val)) isBlank = val.length === 0;
      else if (typeof val === "object" && val !== null) isBlank = Object.keys(val).length === 0;
      
      if (q.required && isBlank) {
        errs[q.id] = "此為必填題";
        msgs.push(`「${q.title}」為必填題`);
        return;
      }
      
      if (!isBlank && q.validation?.format) {
        const str = String(val);
        if (q.validation.format === "email" && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(str)) {
          errs[q.id] = "格式錯誤（請輸入有效的 Email）";
          msgs.push(`「${q.title}」Email 格式錯誤`);
        }
        if (q.validation.format === "phone" && !/^[0-9\-+() ]+$/.test(str)) {
          errs[q.id] = "格式錯誤（請輸入有效的電話號碼）";
          msgs.push(`「${q.title}」電話格式錯誤`);
        }
        if (q.validation.format === "number" && isNaN(Number(str))) {
          errs[q.id] = "格式錯誤（請輸入數字）";
          msgs.push(`「${q.title}」必須為數字`);
        }
      }
    });

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      setErrorSummary(msgs);
      const first = Object.keys(errs)[0];
      setTimeout(() => document.getElementById("q-" + first)?.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
      window.toast("部分題目尚未完成或格式錯誤", "error");
      return false;
    }
    setErrors({});
    setErrorSummary([]);
    return true;
  };

  async function persist(submit) {
    setBusy(true);
    setErrorSummary([]);
    try {
      const r = await onSave(answers, submit, data.revision);
      setData({
        ...data,
        revision: r.data?.revision || "",
        status: r.data?.status || data.status,
      });
      if (submit) {
        setShowThankYou(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      window.toast(r.message || "已暫存，您可以稍後再回來繼續填寫", "success");
      setErrors({});
    } catch (e) {
      if (e.details) {
        const map = {};
        const msgs = [];
        e.details.forEach((x) => {
          map[x.questionId] = x.message;
          const qTitle = data.schema.questions.find(q => q.id === x.questionId)?.title || "題目";
          msgs.push(`「${qTitle}」${x.message}`);
        });
        setErrors(map);
        const first = e.details[0]?.questionId;
        const errQ = data.schema.questions.find(q => q.id === first);
        if (errQ && errQ.sectionId !== current.id) {
           const errSecIdx = sections.findIndex(s => s.id === errQ.sectionId);
           if (errSecIdx >= 0) setHistory(prev => [...prev, errSecIdx]);
        }
        setTimeout(() => document.getElementById("q-" + first)?.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
        setErrorSummary(msgs);
        window.toast("部分題目尚未完成或格式錯誤", "error");
      } else {
        window.toast(e.message || "發生錯誤，請檢查是否有未填寫的必填題。", "error");
      }
    } finally {
      setBusy(false);
    }
  }
  const setData = (d) => {
    Object.assign(data, d);
  };
  return (
    <div className="survey stack">
      <section className="survey-head">
        <div className="row spread">
          <div className="row">
            <span className="badge">{data.status.status || "未填寫"}</span>
            {adminAccount && (
              <span
                className="badge"
                style={{ background: "#fff0ee", color: "#b42318" }}
              >
                管理員代填：{adminAccount}
              </span>
            )}
          </div>
          <button
            className="btn ghost"
            style={{ color: "white" }}
            onClick={onLogout}
          >
            {adminAccount ? "關閉" : "登出"}
          </button>
        </div>
        <h1>{data.project.name}</h1>
        <p>{data.project.description}</p>
        {data.project.showProgress && (
          <div className="progress">
            <div
              style={{ width: `${(history.length / sections.length) * 100}%` }}
            />
          </div>
        )}
      </section>
      {!writable && !showThankYou && (
        <div className="alert error">
          本問卷已截止，目前僅能查看先前填寫內容。
        </div>
      )}
      {errorSummary.length > 0 && !showThankYou && (
        <div className="alert error error-banner">
          <strong>請修正以下錯誤：</strong>
          <ul>
            {errorSummary.map((msg, idx) => (
              <li key={idx}>{msg}</li>
            ))}
          </ul>
        </div>
      )}
      {showThankYou ? (
        <section className="card stack thank-you-screen fade-in">
          <div className="thank-you-icon">✓</div>
          <h2>感謝您的填寫！</h2>
          <p>{data.project.completionMessage || "您的問卷已經成功送出，我們會盡快處理您的回覆。"}</p>
          {adminAccount && (
            <button className="btn secondary" onClick={onLogout} style={{ alignSelf: "center", marginTop: 20 }}>
              返回管理介面
            </button>
          )}
        </section>
      ) : (
        <section className="card stack">
        <div>
          <span className="small muted">
            第 {section + 1}／{sections.length} 區
          </span>
          <h2>{current.title}</h2>
          <p className="muted">{current.description}</p>
        </div>
        {questions.map((q) => (
          <Question
            key={q.id}
            q={q}
            value={answers[q.id]}
            onChange={(v) => change(q.id, v)}
            error={errors[q.id]}
            disabled={!writable}
            uploadFn={uploadFn}
            downloadFn={downloadFn}
            deleteFn={deleteFn}
            projectId={projectId}
          />
        ))}
        <div className="section-nav">
          <div className="row">
            <button
              className="btn secondary"
              disabled={history.length <= 1}
              onClick={() => setHistory(history.slice(0, -1))}
            >
              上一頁
            </button>
            <button
              className="btn secondary"
              disabled={busy || !writable}
              onClick={() => persist(false)}
            >
              暫存
            </button>
          </div>
          {!isSubmit ? (
            <button
              className="btn primary"
              onClick={() => {
                if (validateCurrentPage()) setHistory([...history, nextIndex]);
              }}
            >
              下一頁
            </button>
          ) : (
            <button
              className="btn primary"
              disabled={busy || !writable}
              onClick={() => {
                if (validateCurrentPage()) persist(true);
              }}
            >
              {adminAccount ? "送出並覆蓋" : "送出問卷"}
            </button>
          )}
        </div>
      </section>
    )}
  </div>
);
}
function Question({
  q,
  value,
  onChange,
  error,
  disabled,
  uploadFn,
  downloadFn,
  deleteFn,
  projectId,
}) {
  if (q.type === "heading" || q.type === "image_note")
    return (
      <div className="stack">
        <h3>{q.title}</h3>
        <p className="muted">{q.description}</p>
        {q.type === "image_note" && q.config?.imageUrl && (
          <img className="question-note-image" src={imageUrl(q.config.imageUrl)} alt={q.title || "圖片說明"} />
        )}
      </div>
    );
  const common = {
    className: "input",
    disabled,
    value: value ?? "",
    onChange: (e) => onChange(e.target.value),
  };
  let input;
  if (q.type === "paragraph") input = <textarea {...common} />;
  else if (q.type === "linked_short") {
    const vals = typeof value === "object" && value !== null ? value : {};
    input = (
      <div className="stack">
        {(q.options || []).map((o) => (
          <Field key={o.value} label={o.label}>
            <input
              className="input"
              disabled={disabled}
              value={vals[o.value] ?? ""}
              onChange={(e) => onChange({ ...vals, [o.value]: e.target.value })}
            />
          </Field>
        ))}
      </div>
    );
  } else if (
    ["short", "email", "phone", "number", "date", "time"].includes(q.type)
  ) {
    const typeMap = {
      email: "email",
      number: "number",
      date: "date",
      time: "time",
    };
    const inputType =
      typeMap[q.type] || typeMap[q.validation?.format] || "text";
    input = <input type={inputType} {...common} />;
  } else if (q.type === "dropdown")
    input = (
      <select {...common}>
        <option value="">請選擇</option>
        {q.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  else if (q.type === "single")
    input = (
      <div className="stack">
        {q.options.map((o) => (
          <label key={o.value}>
            <input
              type="radio"
              disabled={disabled}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
            />{" "}
            {o.label}
          </label>
        ))}
      </div>
    );
  else if (["checkbox", "linked_multi"].includes(q.type)) {
    const vals = Array.isArray(value) ? value : [];
    input = (
      <div className="stack">
        {q.options.map((o) => (
          <label key={o.value}>
            <input
              type="checkbox"
              disabled={disabled}
              checked={vals.includes(o.value)}
              onChange={(e) =>
                onChange(
                  e.target.checked
                    ? [...vals, o.value]
                    : vals.filter((x) => x !== o.value),
                )
              }
            />{" "}
            {o.label}
          </label>
        ))}
      </div>
    );
  } else if (q.type === "scale") {
    const min = q.config?.min || 1;
    let max = q.config?.max || 5;
    const opts = q.options || [];
    if (opts.length > 0) {
      max = Math.max(min, min + opts.length - 1);
    }
    input = (
      <div className="stack">
        <input
          type="range"
          min={min}
          max={max}
          disabled={disabled}
          value={value || min}
          onChange={(e) => onChange(e.target.value)}
        />
        {opts.length > 0 && (
          <div className="row spread" style={{ fontSize: '0.85em', color: '#666', marginTop: 5 }}>
            {opts.map((o, i) => (
              <span key={i} style={{ textAlign: 'center', flex: 1 }}>{o.label || o.value}</span>
            ))}
          </div>
        )}
      </div>
    );
  } else if (["radio_grid", "checkbox_grid"].includes(q.type)) {
    const cols = q.config?.cols || [],
      isRadio = q.type === "radio_grid",
      vals = typeof value === "object" && value !== null ? value : {};
    input = (
      <div className="table-wrap">
        <table className="grid-table">
          <thead>
            <tr>
              <th></th>
              {cols.map((c) => (
                <th key={c}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {q.options.map((r) => (
              <tr key={r.value}>
                <td>{r.label}</td>
                {cols.map((c) => (
                  <td key={c} style={{ textAlign: "center" }}>
                    <input
                      type={isRadio ? "radio" : "checkbox"}
                      name={q.id + "_" + r.value}
                      disabled={disabled}
                      checked={
                        isRadio
                          ? vals[r.value] === c
                          : (vals[r.value] || []).includes(c)
                      }
                      onChange={(e) => {
                        if (isRadio) onChange({ ...vals, [r.value]: c });
                        else {
                          const rv = vals[r.value] || [];
                          onChange({
                            ...vals,
                            [r.value]: e.target.checked
                              ? [...rv, c]
                              : rv.filter((x) => x !== c),
                          });
                        }
                      }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  } else if (q.type === "signature")
    input = (
      <Signature
        disabled={disabled}
        value={value}
        onChange={onChange}
        uploadFn={uploadFn}
        downloadFn={downloadFn}
        questionId={q.id}
      />
    );
  else if (q.type === "multi_image")
    input = (
      <Images
        disabled={disabled}
        value={value}
        onChange={onChange}
        uploadFn={uploadFn}
        downloadFn={downloadFn}
        deleteFn={deleteFn}
        questionId={q.id}
        max={q.config?.maxFiles || 5}
      />
    );
  else if (TYPES[q.type])
    input = (
      <AdvancedQuestion
        q={q}
        value={value}
        onChange={onChange}
        disabled={disabled}
      />
    );
  else input = <input {...common} />;
  return (
    <div
      id={"q-" + q.id}
      className={"question stack " + (error ? "q-error" : "")}
    >
      <div>
        <strong>
          {q.title} {q.required && <span className="required">*</span>}
        </strong>
        {q.description && <div className="muted small">{q.description}</div>}
      </div>
      {input}
      {error && <div className="required small">{error}</div>}
    </div>
  );
}
function Signature({
  disabled,
  value,
  onChange,
  uploadFn,
  downloadFn,
  questionId,
}) {
  const ref = useRef(),
    drawing = useRef(false),
    historyRef = useRef([]),
    [preview, setPreview] = useState(""),
    [uploading, setUploading] = useState(false);
  useEffect(() => {
    if (value && value.attachmentId)
      downloadFn(value.attachmentId)
        .then((r) =>
          setPreview(`data:${r.data.mimeType};base64,${r.data.base64}`),
        )
        .catch(console.error);
    else setPreview("");
  }, [value, downloadFn]);
  useEffect(() => {
    if (preview) return;
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d"),
      ratio = devicePixelRatio || 1;
    c.width = c.clientWidth * ratio;
    c.height = c.clientHeight * ratio;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
  }, [preview]);
  const point = (e) => {
    const r = ref.current.getBoundingClientRect(),
      p = e.touches?.[0] || e;
    return { x: p.clientX - r.left, y: p.clientY - r.top };
  };
  const start = (e) => {
    if (disabled || preview) return;
    drawing.current = true;
    const ctx = ref.current.getContext("2d"),
      p = point(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    historyRef.current.push(
      ctx.getImageData(0, 0, ref.current.width, ref.current.height),
    );
  };
  const move = (e) => {
    if (!drawing.current) return;
    e.preventDefault();
    const p = point(e),
      ctx = ref.current.getContext("2d");
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  };
  async function upload() {
    setUploading(true);
    try {
      const base64 = ref.current.toDataURL("image/png").split(",")[1], r = await uploadFn({ type: "image/png", base64 }, questionId, "signature");
      onChange(r.data);
      window.toast("簽名上傳成功！請記得點擊「暫存」或「送出」來儲存整份問卷。", "success");
    } catch (error) { window.toast(error.message, "error"); }
    finally { setUploading(false); }
  }
  return (
    <div className="stack">
      {preview ? (
        <div style={{ position: "relative" }}>
          <img
            src={preview}
            style={{ width: "100%", border: "1px solid #ddd" }}
          />
          <button
            className="btn secondary"
            style={{ position: "absolute", top: 10, right: 10 }}
            disabled={disabled}
            onClick={() => {
              onChange("");
              setPreview("");
            }}
          >
            重簽
          </button>
        </div>
      ) : (
        <canvas
          ref={ref}
          className="signature"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={() => (drawing.current = false)}
        />
      )}
      {!preview && (
        <div className="row">
          <button
            className="btn secondary"
            disabled={disabled}
            onClick={() =>
              ref.current
                .getContext("2d")
                .clearRect(0, 0, ref.current.width, ref.current.height)
            }
          >
            清除
          </button>
          <button
            className="btn secondary"
            disabled={disabled || !historyRef.current.length}
            onClick={() =>
              ref.current
                .getContext("2d")
                .putImageData(historyRef.current.pop(), 0, 0)
            }
          >
            復原
          </button>
          <button className="btn primary" disabled={disabled || uploading} onClick={upload}>
            {uploading ? "簽名上傳中，請稍候…" : "確認簽名"}
          </button>
        </div>
      )}
    </div>
  );
}
function Images({
  disabled,
  value,
  onChange,
  uploadFn,
  downloadFn,
  deleteFn,
  questionId,
  max,
}) {
  const vals = Array.isArray(value) ? value : [], [uploading, setUploading] = useState("");
  async function pick(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (files.length + vals.length > max)
      return window.toast(`最多 ${max} 個檔案`, "error");
    for (const file of files) {
      if (
        !["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(
          file.type,
        )
      )
        return window.toast("僅支援 JPG, PNG, WEBP, PDF 格式", "error");
      if (file.size > 5 * 1024 * 1024) return window.toast(`${file.name} 超過 5 MB`, "error");
    }
    let currentFiles = [...vals];
    const uploaded = [];
    try { for (let index=0; index<files.length; index++) { const file=files[index];
      setUploading(`正在上傳 ${index + 1} / ${files.length}：${file.name}`);
      const base64 = await new Promise((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(String(r.result).split(",")[1]);
          r.onerror = reject;
          r.readAsDataURL(file);
        }),
        res = await uploadFn(
          { type: file.type, base64 },
          questionId,
          "file",
          currentFiles.length + 1,
        );
      uploaded.push(res.data);
    }
    onChange([...vals, ...uploaded]);
    } catch(error) { window.toast(error.message, "error"); } finally { setUploading(""); e.target.value=""; }
  }
  return (
    <div className="stack">
      <label className="dropzone">
        {uploading || `選擇檔案（單檔 5 MB，最多 ${max} 個）`}
        <input
          hidden
          type="file"
          multiple
          disabled={disabled || Boolean(uploading)}
          onChange={pick}
        />
      </label>
      {files.map((f) => (
        <ImageItem
          key={f.attachmentId}
          f={f}
          disabled={disabled}
          downloadFn={downloadFn}
          onDelete={async () => {
            await deleteFn(f.attachmentId);
            onChange(files.filter((x) => x.attachmentId !== f.attachmentId));
          }}
        />
      ))}
    </div>
  );
}
function ImageItem({ f, disabled, downloadFn, onDelete }) {
  const [src, setSrc] = useState(""),
    [mime, setMime] = useState("");
  useEffect(() => {
    downloadFn(f.attachmentId)
      .then((r) => {
        setMime(r.data.mimeType);
        if (r.data.mimeType.startsWith("image/"))
          setSrc(`data:${r.data.mimeType};base64,${r.data.base64}`);
      })
      .catch(console.error);
  }, [f.attachmentId, downloadFn]);
  return (
    <div className="row spread card" style={{ padding: 10 }}>
      <div className="row">
        {src ? (
          <img
            src={src}
            style={{
              width: 60,
              height: 60,
              objectFit: "cover",
              borderRadius: 4,
            }}
          />
        ) : (
          <div
            style={{
              width: 60,
              height: 60,
              background: "#eee",
              borderRadius: 4,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              color: "#999",
            }}
          >
            {mime ? "檔案" : "讀取中"}
          </div>
        )}
        <span style={{ marginLeft: 10 }}>{f.fileName}</span>
      </div>
      <button className="btn danger" disabled={disabled} onClick={onDelete}>
        刪除
      </button>
    </div>
  );
}
