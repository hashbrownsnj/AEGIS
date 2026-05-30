import { useEffect, useRef, useState } from "react";
import { endpoints, ApiError } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import { Card, Field, SectionHeader, Spinner } from "@/components/ui/Primitives";
import { useAuth } from "@/contexts/AuthContext";

const ROLES = ["admin", "physician", "nurse", "ems", "dispatcher", "operations_manager"] as const;
type Role = typeof ROLES[number];

const ROLE_COLORS: Record<Role, string> = {
  admin: "text-red-400 bg-red-400/10 border-red-500/20",
  physician: "text-sky-400 bg-sky-400/10 border-sky-500/20",
  nurse: "text-emerald-400 bg-emerald-400/10 border-emerald-500/20",
  ems: "text-orange-400 bg-orange-400/10 border-orange-500/20",
  dispatcher: "text-violet-400 bg-violet-400/10 border-violet-500/20",
  operations_manager: "text-amber-400 bg-amber-400/10 border-amber-500/20",
};

const CSV_TEMPLATE = `name,email,password,role,department
Jane Smith,jane.smith@hospital.org,SecurePass123!,physician,Emergency Department
Bob Jones,bob.jones@hospital.org,SecurePass123!,nurse,Emergency Department`;

export default function Settings() {
  const { user: me } = useAuth();
  const { data: settings, loading: settingsLoading, reload: reloadSettings } = useAsync(endpoints.settings, []);
  const { data: users, loading: usersLoading, reload: reloadUsers } = useAsync(endpoints.users, []);
  const [form, setForm] = useState<any>({});
  const [settingsSaved, setSettingsSaved] = useState(false);

  // New user form
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "", role: "nurse" as Role, department: "Emergency Department" });
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Edit user
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [editError, setEditError] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  // CSV import
  const fileRef = useRef<HTMLInputElement>(null);
  const [csvResult, setCsvResult] = useState<any>(null);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvLoading, setCsvLoading] = useState(false);

  useEffect(() => { if (settings) setForm(settings); }, [settings]);

  async function saveSettings() {
    await endpoints.saveSettings(form);
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2500);
    reloadSettings();
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    setCreating(true);
    try {
      await endpoints.createUser(newUser);
      setNewUser({ name: "", email: "", password: "", role: "nurse", department: "Emergency Department" });
      reloadUsers();
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : "Failed to create user");
    } finally {
      setCreating(false);
    }
  }

  function startEdit(u: any) {
    setEditingId(u._id);
    setEditForm({ name: u.name, role: u.role, department: u.department ?? "", active: u.active, password: "" });
    setEditError(null);
  }

  async function saveEdit(id: string) {
    setEditSaving(true);
    setEditError(null);
    try {
      const payload: any = { name: editForm.name, role: editForm.role, department: editForm.department, active: editForm.active };
      if (editForm.password) payload.password = editForm.password;
      await endpoints.updateUser(id, payload);
      setEditingId(null);
      reloadUsers();
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : "Failed to save");
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDeleteUser(id: string, email: string) {
    if (!confirm(`Delete ${email}? This cannot be undone.`)) return;
    await endpoints.deleteUser(id);
    reloadUsers();
  }

  async function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvError(null);
    setCsvResult(null);
    setCsvLoading(true);
    try {
      const text = await file.text();
      const result = await endpoints.importUsersCsv(text);
      setCsvResult(result);
      reloadUsers();
    } catch (err) {
      setCsvError(err instanceof ApiError ? err.message : "CSV import failed");
    } finally {
      setCsvLoading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function downloadTemplate() {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "aegis_users_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (settingsLoading) return <Spinner />;

  return (
    <div className="grid gap-6">
      <SectionHeader
        title="Settings"
        subtitle="Hospital metadata, capacity policy, and user management."
      />

      {/* Hospital settings */}
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <h2 className="font-black text-slate-200">Hospital metadata and policy</h2>
          <div className="mt-4 grid gap-3">
            <Field label="Hospital name">
              <input className="input" value={form.hospitalName || ""} onChange={(e) => setForm({ ...form, hospitalName: e.target.value })} />
            </Field>
            <Field label="Unit name">
              <input className="input" value={form.unitName || ""} onChange={(e) => setForm({ ...form, unitName: e.target.value })} />
            </Field>
            <Field label="Total beds">
              <input className="input" type="number" value={form.capacity?.totalBeds || 0} onChange={(e) => setForm({ ...form, capacity: { ...form.capacity, totalBeds: Number(e.target.value) } })} />
            </Field>
            <Field label="Theme">
              <select className="input" value={form.theme || "dark"} onChange={(e) => setForm({ ...form, theme: e.target.value })}>
                <option value="dark">dark</option>
                <option value="light">light</option>
                <option value="system">system</option>
              </select>
            </Field>
            <button className="btn btn-primary" onClick={saveSettings}>
              {settingsSaved ? "✓ Saved" : "Save settings"}
            </button>
          </div>
        </Card>

        {/* Create user */}
        <Card>
          <h2 className="font-black text-slate-200">Create user</h2>
          <form onSubmit={handleCreateUser} className="mt-4 grid gap-3">
            <Field label="Full name">
              <input className="input" placeholder="Jane Smith" required value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} />
            </Field>
            <Field label="Email">
              <input className="input" type="email" placeholder="jane@hospital.org" required value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} />
            </Field>
            <Field label="Password" hint="Minimum 12 characters">
              <input className="input" type="password" placeholder="••••••••••••" required minLength={12} value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Role">
                <select className="input" value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value as Role })}>
                  {ROLES.map((r) => <option key={r} value={r}>{r.replace("_", " ")}</option>)}
                </select>
              </Field>
              <Field label="Department">
                <input className="input" placeholder="Emergency Department" value={newUser.department} onChange={(e) => setNewUser({ ...newUser, department: e.target.value })} />
              </Field>
            </div>
            {createError && <div className="rounded-lg border border-red-500/20 bg-red-500/8 px-3 py-2 text-xs text-red-400">{createError}</div>}
            <button className="btn btn-primary" type="submit" disabled={creating}>
              {creating ? "Creating…" : "Create user"}
            </button>
          </form>
        </Card>
      </div>

      {/* CSV import */}
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-black text-slate-200">Bulk import from CSV</h2>
            <p className="mt-1 text-xs text-slate-500">Upload a CSV with columns: <code className="font-mono text-slate-400">name, email, password, role, department</code></p>
          </div>
          <button className="btn btn-ghost text-xs" onClick={downloadTemplate}>↓ Download template</button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="btn btn-primary cursor-pointer">
            {csvLoading ? "Importing…" : "Choose CSV file"}
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="sr-only" onChange={handleCsvUpload} disabled={csvLoading} />
          </label>
        </div>
        {csvError && <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/8 px-3 py-2 text-xs text-red-400">{csvError}</div>}
        {csvResult && (
          <div className="mt-4 grid gap-3">
            <div className="flex gap-4 text-xs font-bold">
              <span className="text-emerald-400">✓ {csvResult.summary.created} created</span>
              <span className="text-amber-400">⊘ {csvResult.summary.skipped} skipped</span>
              <span className="text-red-400">✕ {csvResult.summary.errors} errors</span>
            </div>
            {csvResult.results.filter((r: any) => r.status !== "created").length > 0 && (
              <div className="grid gap-1">
                {csvResult.results.filter((r: any) => r.status !== "created").map((r: any) => (
                  <div key={r.row} className={`rounded-md px-3 py-1.5 text-xs ${r.status === "error" ? "bg-red-500/8 text-red-400" : "bg-amber-500/8 text-amber-400"}`}>
                    Row {r.row} ({r.email}): {r.reason}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* User list */}
      <Card>
        <h2 className="font-black text-slate-200">All users</h2>
        {usersLoading ? <Spinner /> : !users?.length ? (
          <p className="mt-4 text-xs text-slate-500">No users yet.</p>
        ) : (
          <div className="mt-4 grid gap-2">
            {users.map((u: any) => (
              <div key={u._id} className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
                {editingId === u._id ? (
                  <div className="grid gap-3">
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Name">
                        <input className="input" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                      </Field>
                      <Field label="Department">
                        <input className="input" value={editForm.department} onChange={(e) => setEditForm({ ...editForm, department: e.target.value })} />
                      </Field>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Role">
                        <select className="input" value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}>
                          {ROLES.map((r) => <option key={r} value={r}>{r.replace("_", " ")}</option>)}
                        </select>
                      </Field>
                      <Field label="Status">
                        <select className="input" value={editForm.active ? "active" : "inactive"} onChange={(e) => setEditForm({ ...editForm, active: e.target.value === "active" })}>
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </Field>
                    </div>
                    <Field label="New password" hint="Leave blank to keep current password">
                      <input className="input" type="password" placeholder="••••••••••••" minLength={12} value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} />
                    </Field>
                    {editError && <div className="rounded-lg border border-red-500/20 bg-red-500/8 px-3 py-2 text-xs text-red-400">{editError}</div>}
                    <div className="flex gap-2">
                      <button className="btn btn-primary text-xs" onClick={() => saveEdit(u._id)} disabled={editSaving}>{editSaving ? "Saving…" : "Save"}</button>
                      <button className="btn btn-ghost text-xs" onClick={() => setEditingId(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-200">{u.name}</span>
                        {!u.active && <span className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-slate-700/50 text-slate-500">Inactive</span>}
                        {u.email === me?.email && <span className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-sky-500/10 text-sky-400">You</span>}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500">{u.email}{u.department ? ` · ${u.department}` : ""}</div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${ROLE_COLORS[u.role as Role] ?? "text-slate-400 bg-slate-400/10 border-slate-500/20"}`}>
                        {u.role.replace("_", " ")}
                      </span>
                      <button className="btn btn-ghost text-xs" onClick={() => startEdit(u)}>Edit</button>
                      {u.email !== me?.email && (
                        <button className="btn text-xs text-red-400 hover:bg-red-500/10 border-transparent" onClick={() => handleDeleteUser(u._id, u.email)}>Delete</button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
