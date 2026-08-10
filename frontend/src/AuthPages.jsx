import { useState } from "react";
import { api, adminSession } from "./api";

const go = (path) => {
  location.hash = path;
};
const ErrorBox = ({ error }) =>
  error ? <div className="alert error">{error.message || error}</div> : null;
const Field = ({ label, children }) => (
  <div className="field">
    <label>{label}</label>
    {children}
  </div>
);

export function LoginPage({ Header }) {
  const [form, setForm] = useState({ email: "", password: "" }),
    [error, setError] = useState(null),
    [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await api.adminLogin(form);
      adminSession.set(r.data);
      go("/admin");
    } catch (x) {
      setError(x);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="shell">
      <Header />
      <form className="narrow card stack" onSubmit={submit}>
        <div>
          <span className="badge">管理後台</span>
          <h1>登入</h1>
        </div>
        <ErrorBox error={error} />
        <Field label="Email">
          <input
            autoFocus
            className="input"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
        </Field>
        <Field label="密碼">
          <input
            type="password"
            className="input"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
        </Field>
        <button disabled={busy} className="btn primary">
          {busy ? "登入中…" : "登入"}
        </button>
        <div className="row spread">
          <button
            type="button"
            className="btn ghost"
            onClick={() => go("/register")}
          >
            建立帳號
          </button>
          <button
            type="button"
            className="btn ghost"
            onClick={() => go("/forgot-password")}
          >
            忘記密碼
          </button>
        </div>
      </form>
    </div>
  );
}
export function RegisterPage({ Header }) {
  const [form, setForm] = useState({
      email: "",
      password: "",
      confirmPassword: "",
    }),
    [error, setError] = useState(null),
    [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await api.register(form);
      adminSession.set(r.data);
      go("/admin");
    } catch (x) {
      setError(x);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="shell">
      <Header />
      <form className="narrow card stack" onSubmit={submit}>
        <h1>建立管理帳號</h1>
        <ErrorBox error={error} />
        <Field label="Email">
          <input
            type="email"
            className="input"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
        </Field>
        <Field label="密碼">
          <input
            type="password"
            className="input"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
        </Field>
        <Field label="確認密碼">
          <input
            type="password"
            className="input"
            value={form.confirmPassword}
            onChange={(e) =>
              setForm({ ...form, confirmPassword: e.target.value })
            }
            required
          />
        </Field>
        <button disabled={busy} className="btn primary">
          {busy ? "建立中…" : "註冊"}
        </button>
        <button
          type="button"
          className="btn ghost"
          onClick={() => go("/admin/login")}
        >
          返回登入
        </button>
      </form>
    </div>
  );
}
export function ForgotPage({ Header }) {
  const [email, setEmail] = useState(""),
    [message, setMessage] = useState(""),
    [error, setError] = useState(null);
  async function submit(e) {
    e.preventDefault();
    try {
      const r = await api.forgotPassword({ email });
      setMessage(r.message);
      setError(null);
    } catch (x) {
      setError(x);
    }
  }
  return (
    <div className="shell">
      <Header />
      <form className="narrow card stack" onSubmit={submit}>
        <h1>忘記密碼</h1>
        <p className="muted">輸入註冊 Email，重設連結將在 15 分鐘後失效。</p>
        <ErrorBox error={error} />
        {message && <div className="alert success">{message}</div>}
        <Field label="Email">
          <input
            type="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </Field>
        <button className="btn primary">寄送重設信</button>
        <button
          type="button"
          className="btn ghost"
          onClick={() => go("/admin/login")}
        >
          返回登入
        </button>
      </form>
    </div>
  );
}
export function ResetPage({ Header }) {
  const token =
    new URLSearchParams(location.hash.split("?")[1] || "").get("token") || "";
  const [form, setForm] = useState({ password: "", confirmPassword: "" }),
    [message, setMessage] = useState(""),
    [error, setError] = useState(null);
  async function submit(e) {
    e.preventDefault();
    try {
      const r = await api.resetPassword({ ...form, token });
      setMessage(r.message);
      setError(null);
    } catch (x) {
      setError(x);
    }
  }
  return (
    <div className="shell">
      <Header />
      <form className="narrow card stack" onSubmit={submit}>
        <h1>設定新密碼</h1>
        <ErrorBox error={error} />
        {message && <div className="alert success">{message}</div>}
        <Field label="新密碼">
          <input
            type="password"
            className="input"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
        </Field>
        <Field label="確認新密碼">
          <input
            type="password"
            className="input"
            value={form.confirmPassword}
            onChange={(e) =>
              setForm({ ...form, confirmPassword: e.target.value })
            }
            required
          />
        </Field>
        <button className="btn primary">更新密碼</button>
        {message && (
          <button
            type="button"
            className="btn secondary"
            onClick={() => go("/admin/login")}
          >
            前往登入
          </button>
        )}
      </form>
    </div>
  );
}
export function ProfilePage({ Header }) {
  const session = adminSession.get(),
    [form, setForm] = useState({
      name: session?.admin?.name || "",
      email: session?.admin?.email || "",
      password: "",
      confirmPassword: "",
    }),
    [message, setMessage] = useState(""),
    [error, setError] = useState(null);
  async function submit(e) {
    e.preventDefault();
    try {
      const r = await api.adminUpdateProfile({ token: session.token, ...form });
      const updated = { ...session, admin: r.data };
      adminSession.set(updated);
      setMessage("個人資料已更新");
      setError(null);
      setForm({ ...form, password: "", confirmPassword: "" });
    } catch (x) {
      setError(x);
    }
  }
  return (
    <div className="shell">
      <Header admin={session} />
      <main className="narrow card stack">
        <h1>個人資料</h1>
        <ErrorBox error={error} />
        {message && <div className="alert success">{message}</div>}
        <form className="stack" onSubmit={submit}>
          <Field label="顯示名稱">
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <Field label="Email／登入名稱">
            <input
              className="input"
              disabled={session?.admin?.email === "kgi"}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Field>
          <Field label="新密碼（不修改請留空）">
            <input
              type="password"
              className="input"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </Field>
          <Field label="確認新密碼">
            <input
              type="password"
              className="input"
              value={form.confirmPassword}
              onChange={(e) =>
                setForm({ ...form, confirmPassword: e.target.value })
              }
            />
          </Field>
          <button className="btn primary">儲存</button>
          <button
            type="button"
            className="btn ghost"
            onClick={() => go("/admin")}
          >
            返回專案
          </button>
        </form>
      </main>
    </div>
  );
}
