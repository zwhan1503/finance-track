import { useState, useMemo, useEffect } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area } from "recharts";

// ─── Color Palette ─────────────────────────────────────────────────
const C = {
  bg: "#111318",
  card: "#1a1d24",
  cardBorder: "#2a2d35",
  surface: "#22252d",
  text: "#eef0f4",
  textMid: "#9ea3b0",
  textDim: "#5c6170",
  accent: "#3b82f6",
  accentLight: "#60a5fa",
  green: "#34d399",
  greenDim: "rgba(52,211,153,0.12)",
  red: "#f87171",
  redDim: "rgba(248,113,113,0.12)",
  white: "#ffffff",
};

const FONT = "'Fira Code', 'JetBrains Mono', 'Source Code Pro', monospace";

// ─── Categories ────────────────────────────────────────────────────
const CATEGORIES = [
  { name: "Groceries", icon: "🛒", color: "#34d399" },
  { name: "Fast Food", icon: "🍔", color: "#fb923c" },
  { name: "Electronics", icon: "💻", color: "#60a5fa" },
  { name: "Transportation", icon: "🚗", color: "#38bdf8" },
  { name: "Entertainment", icon: "🎬", color: "#f472b6" },
  { name: "Healthcare", icon: "💊", color: "#2dd4bf" },
  { name: "Shopping", icon: "🛍️", color: "#c084fc" },
  { name: "Utilities", icon: "💡", color: "#facc15" },
  { name: "Dining", icon: "🍽️", color: "#fb7185" },
  { name: "Other", icon: "📦", color: "#94a3b8" },
];

const getCat = (name) => CATEGORIES.find((c) => c.name === name) || CATEGORIES[9];

// ─── LocalStorage helpers ──────────────────────────────────────────
const STORAGE_KEY = "financeflow_expenses";
const BUDGET_KEY = "financeflow_budgets";

function loadExpenses() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) return JSON.parse(data);
  } catch (e) { /* ignore */ }
  return [];
}

function saveExpenses(expenses) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses)); } catch (e) { /* ignore */ }
}

function loadBudgets() {
  try {
    const data = localStorage.getItem(BUDGET_KEY);
    if (data) return JSON.parse(data);
  } catch (e) { /* ignore */ }
  return { weekly: 500, monthly: 2000 };
}

function saveBudgets(budgets) {
  try { localStorage.setItem(BUDGET_KEY, JSON.stringify(budgets)); } catch (e) { /* ignore */ }
}

// ─── Formatters ────────────────────────────────────────────────────
const fmtAUD = (v) => `$${Number(v).toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (iso) => new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
const fmtTime = (iso) => new Date(iso).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit", hour12: true });

// ─── Tooltips ──────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 8, padding: "8px 12px", fontFamily: FONT, fontSize: 12 }}>
      <p style={{ color: C.textDim, margin: 0 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || C.text, fontWeight: 600, margin: "3px 0 0" }}>
          {p.name}: {fmtAUD(p.value)}
        </p>
      ))}
    </div>
  );
};

// ─── Budget Bar ────────────────────────────────────────────────────
const BudgetBar = ({ spent, budget, label }) => {
  const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  const remaining = Math.max(budget - spent, 0);
  const over = spent > budget && budget > 0;
  const barColor = over ? C.red : pct > 80 ? "#facc15" : C.green;

  return (
    <div style={{ flex: "1 1 240px", minWidth: 200, background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 14, padding: "16px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 11, color: C.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: FONT }}>{label} Budget</span>
        {budget > 0 && (
          <span style={{ fontSize: 11, fontFamily: FONT, fontWeight: 600, color: over ? C.red : C.green }}>
            {over ? "OVER BUDGET" : `${fmtAUD(remaining)} left`}
          </span>
        )}
      </div>
      {budget > 0 ? (
        <>
          <div style={{ width: "100%", height: 8, background: C.surface, borderRadius: 4, overflow: "hidden" }}>
            <div style={{ width: `${pct}%`, height: "100%", background: barColor, borderRadius: 4, transition: "width 0.4s ease" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
            <span style={{ fontSize: 18, fontWeight: 700, fontFamily: FONT, color: C.text }}>{fmtAUD(spent)}</span>
            <span style={{ fontSize: 14, fontWeight: 500, fontFamily: FONT, color: C.textDim }}>of {fmtAUD(budget)}</span>
          </div>
        </>
      ) : (
        <p style={{ margin: "4px 0 0", fontSize: 12, color: C.textDim, fontFamily: FONT }}>Click "Set Budget" to add a limit</p>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════
// MAIN APP
// ════════════════════════════════════════════════════════════════════
export default function App() {
  const [expenses, setExpenses] = useState(() => loadExpenses());
  const [showModal, setShowModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0].name);
  const [amount, setAmount] = useState("");
  const [filter, setFilter] = useState("monthly");
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [chartType, setChartType] = useState("pie");
  const [toastMsg, setToastMsg] = useState("");

  const budgets = loadBudgets();
  const [weeklyBudget, setWeeklyBudget] = useState(budgets.weekly);
  const [monthlyBudget, setMonthlyBudget] = useState(budgets.monthly);
  const [tempWeekly, setTempWeekly] = useState(String(budgets.weekly));
  const [tempMonthly, setTempMonthly] = useState(String(budgets.monthly));

  // Persist expenses to localStorage on every change
  useEffect(() => { saveExpenses(expenses); }, [expenses]);

  const toast = (msg) => { setToastMsg(msg); setTimeout(() => setToastMsg(""), 2500); };

  // ─── Filtered Expenses ───────────────────────────────────────────
  const filteredExpenses = useMemo(() => {
    const now = new Date();
    let cutoff;
    if (filter === "daily") cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    else if (filter === "weekly") { cutoff = new Date(now); cutoff.setDate(cutoff.getDate() - 7); }
    else cutoff = new Date(now.getFullYear(), now.getMonth(), 1);

    let filtered = expenses.filter((e) => new Date(e.created_at) >= cutoff);
    if (searchTerm.trim()) {
      const s = searchTerm.toLowerCase();
      filtered = filtered.filter((e) => e.name.toLowerCase().includes(s) || e.category.toLowerCase().includes(s));
    }
    return filtered;
  }, [expenses, filter, searchTerm]);

  const weeklyTotal = useMemo(() => {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 7);
    return expenses.filter((e) => new Date(e.created_at) >= cutoff).reduce((s, e) => s + e.amount, 0);
  }, [expenses]);

  const monthlyTotal = useMemo(() => {
    const now = new Date();
    const cutoff = new Date(now.getFullYear(), now.getMonth(), 1);
    return expenses.filter((e) => new Date(e.created_at) >= cutoff).reduce((s, e) => s + e.amount, 0);
  }, [expenses]);

  const categoryData = useMemo(() => {
    const map = {};
    filteredExpenses.forEach((e) => { map[e.category] = (map[e.category] || 0) + e.amount; });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)), color: getCat(name).color }))
      .sort((a, b) => b.value - a.value);
  }, [filteredExpenses]);

  const dailyData = useMemo(() => {
    const map = {};
    filteredExpenses.forEach((e) => { const key = fmtDate(e.created_at); map[key] = (map[key] || 0) + e.amount; });
    return Object.entries(map).map(([date, total]) => ({ date, total: parseFloat(total.toFixed(2)) })).reverse();
  }, [filteredExpenses]);

  const totalSpent = useMemo(() => filteredExpenses.reduce((s, e) => s + e.amount, 0), [filteredExpenses]);

  // ─── Handlers ────────────────────────────────────────────────────
  const handleAdd = () => {
    if (!name.trim() || !amount || parseFloat(amount) <= 0) { toast("Please fill in all fields."); return; }
    const newExp = { id: crypto.randomUUID(), name: name.trim(), category, amount: parseFloat(parseFloat(amount).toFixed(2)), created_at: new Date().toISOString() };
    setExpenses((p) => [newExp, ...p]);
    setName(""); setAmount(""); setCategory(CATEGORIES[0].name); setShowModal(false);
    toast(`Added "${newExp.name}" — ${fmtAUD(newExp.amount)}`);
  };

  const handleDelete = (id) => { setExpenses((p) => p.filter((e) => e.id !== id)); setDeleteConfirm(null); toast("Expense removed."); };

  const handleClearAll = () => { setExpenses([]); setClearConfirm(false); setDeleteConfirm(null); toast("All expenses cleared."); };

  const handleSaveBudget = () => {
    const w = parseFloat(tempWeekly) || 0;
    const m = parseFloat(tempMonthly) || 0;
    setWeeklyBudget(w);
    setMonthlyBudget(m);
    saveBudgets({ weekly: w, monthly: m });
    setShowBudgetModal(false);
    toast("Budget updated!");
  };

  // ─── Pie Tooltip ─────────────────────────────────────────────────
  const PieTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0];
    const pct = totalSpent > 0 ? ((d.value / totalSpent) * 100).toFixed(1) : 0;
    return (
      <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 8, padding: "8px 12px", fontFamily: FONT, fontSize: 12 }}>
        <p style={{ color: d.payload.color, fontWeight: 600, margin: 0 }}>{d.name}</p>
        <p style={{ color: C.text, margin: "3px 0 0" }}>{fmtAUD(d.value)} · {pct}%</p>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════
  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: FONT, position: "relative" }}>
      <link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@300;400;500;600;700&display=swap" rel="stylesheet" />

      {/* Toast */}
      {toastMsg && (
        <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", zIndex: 9999, background: C.card, border: `1px solid ${C.green}44`, borderRadius: 10, padding: "10px 22px", color: C.green, fontSize: 12, fontWeight: 500, fontFamily: FONT, animation: "fadeIn .25s ease", whiteSpace: "nowrap" }}>
          {toastMsg}
        </div>
      )}

      {/* ── Header ─────────────────────────────────────────────────── */}
      <header style={{ padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${C.cardBorder}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22 }}>💰</span>
          <h1 style={{ margin: 0, fontSize: 17, fontWeight: 700, fontFamily: FONT, letterSpacing: "-0.03em" }}>FinanceFlow</h1>
          <span style={{ fontSize: 10, color: C.accent, background: `${C.accent}18`, padding: "2px 8px", borderRadius: 6, fontWeight: 600, fontFamily: FONT }}>AUD</span>
        </div>
      </header>

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "16px 16px 60px" }}>

        {/* ── Budget Bars ────────────────────────────────────────────── */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
          <BudgetBar spent={weeklyTotal} budget={weeklyBudget} label="Weekly" />
          <BudgetBar spent={monthlyTotal} budget={monthlyBudget} label="Monthly" />
          <button onClick={() => { setTempWeekly(String(weeklyBudget)); setTempMonthly(String(monthlyBudget)); setShowBudgetModal(true); }}
            style={{ alignSelf: "stretch", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 20px", background: C.card, border: `1px dashed ${C.cardBorder}`, borderRadius: 14, color: C.textDim, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: FONT, transition: "all .15s", minHeight: 70 }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accentLight; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.cardBorder; e.currentTarget.style.color = C.textDim; }}
          >
            ⚙ Set Budget
          </button>
        </div>

        {/* ── Summary Cards ──────────────────────────────────────────── */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
          <div style={{ flex: "1 1 160px", minWidth: 140, background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 14, padding: "16px 20px" }}>
            <p style={{ margin: 0, fontSize: 10, color: C.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>Total Spent</p>
            <p style={{ margin: "6px 0 0", fontSize: 24, fontWeight: 700, color: C.green }}>{fmtAUD(totalSpent)}</p>
            <p style={{ margin: "3px 0 0", fontSize: 11, color: C.textDim }}>{filteredExpenses.length} transaction{filteredExpenses.length !== 1 ? "s" : ""} · {filter}</p>
          </div>
          <div style={{ flex: "1 1 160px", minWidth: 140, background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 14, padding: "16px 20px" }}>
            <p style={{ margin: 0, fontSize: 10, color: C.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>Top Category</p>
            {categoryData[0] ? (
              <>
                <p style={{ margin: "6px 0 0", fontSize: 16, fontWeight: 700, color: C.text }}>{getCat(categoryData[0].name).icon} {categoryData[0].name}</p>
                <p style={{ margin: "2px 0 0", fontSize: 13, color: categoryData[0].color, fontWeight: 600 }}>{fmtAUD(categoryData[0].value)}</p>
              </>
            ) : <p style={{ margin: "6px 0 0", color: C.textDim, fontSize: 12 }}>No data</p>}
          </div>
          <div style={{ flex: "1 1 160px", minWidth: 140, background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 14, padding: "16px 20px" }}>
            <p style={{ margin: 0, fontSize: 10, color: C.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>Average</p>
            <p style={{ margin: "6px 0 0", fontSize: 22, fontWeight: 700, color: C.text }}>
              {filteredExpenses.length ? fmtAUD(totalSpent / filteredExpenses.length) : "$0.00"}
            </p>
          </div>
        </div>

        {/* ── Filter + Search + Add ──────────────────────────────────── */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16, alignItems: "center" }}>
          <div style={{ display: "flex", background: C.card, borderRadius: 10, border: `1px solid ${C.cardBorder}`, overflow: "hidden" }}>
            {["daily", "weekly", "monthly"].map((f) => (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: "9px 16px", fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer",
                fontFamily: FONT, textTransform: "capitalize", transition: "all .15s",
                background: filter === f ? `${C.accent}20` : "transparent",
                color: filter === f ? C.accentLight : C.textDim,
              }}>
                {f}
              </button>
            ))}
          </div>

          <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search..." style={{ ...inputStyle, flex: "1 1 140px", minWidth: 120 }} />

          <button onClick={() => setShowModal(true)} style={{ ...btnPrimary, padding: "9px 20px", display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
            <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Add
          </button>
        </div>

        {/* ── Charts ─────────────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 12, marginBottom: 16 }}>
          {/* Category Chart */}
          <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 14, padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: C.textMid }}>By Category</h3>
              <div style={{ display: "flex", gap: 3 }}>
                {["pie", "bar"].map((t) => (
                  <button key={t} onClick={() => setChartType(t)} style={{
                    padding: "4px 12px", fontSize: 11, fontWeight: 500, borderRadius: 6, border: "none", cursor: "pointer",
                    fontFamily: FONT, textTransform: "capitalize",
                    background: chartType === t ? `${C.accent}20` : C.surface,
                    color: chartType === t ? C.accentLight : C.textDim,
                  }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            {categoryData.length === 0 ? (
              <div style={{ height: 240, display: "flex", alignItems: "center", justifyContent: "center", color: C.textDim, fontSize: 12 }}>No data for this period</div>
            ) : chartType === "pie" ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={85} paddingAngle={1} strokeWidth={0} startAngle={90} endAngle={-270}>
                      {categoryData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px", justifyContent: "center" }}>
                  {categoryData.map((d) => {
                    const pct = totalSpent > 0 ? ((d.value / totalSpent) * 100).toFixed(1) : 0;
                    return (
                      <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, padding: "2px 0" }}>
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: d.color, flexShrink: 0 }} />
                        <span style={{ color: C.textMid }}>{d.name}</span>
                        <span style={{ color: C.textDim, fontSize: 10 }}>{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={categoryData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.cardBorder} />
                  <XAxis dataKey="name" tick={{ fill: C.textDim, fontSize: 9, fontFamily: FONT }} axisLine={false} tickLine={false} angle={-30} textAnchor="end" height={50} />
                  <YAxis tick={{ fill: C.textDim, fontSize: 10, fontFamily: FONT }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="value" name="Spent" radius={[5, 5, 0, 0]}>
                    {categoryData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Spending Over Time */}
          <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 14, padding: 20 }}>
            <h3 style={{ margin: "0 0 14px", fontSize: 13, fontWeight: 600, color: C.textMid }}>Spending Over Time</h3>
            {dailyData.length === 0 ? (
              <div style={{ height: 240, display: "flex", alignItems: "center", justifyContent: "center", color: C.textDim, fontSize: 12 }}>No data for this period</div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={dailyData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="aGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={C.accent} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={C.accent} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.cardBorder} />
                  <XAxis dataKey="date" tick={{ fill: C.textDim, fontSize: 10, fontFamily: FONT }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: C.textDim, fontSize: 10, fontFamily: FONT }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="total" name="Total" stroke={C.accent} strokeWidth={2} fill="url(#aGrad)" dot={{ fill: C.accent, r: 3, strokeWidth: 0 }} activeDot={{ r: 5, fill: C.accentLight }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* ── Transactions ───────────────────────────────────────────── */}
        <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 14, overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.cardBorder}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: C.textMid }}>Transactions</h3>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 11, color: C.textDim }}>{filteredExpenses.length} items</span>
              {expenses.length > 0 && (
                clearConfirm ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 11, color: C.red, fontFamily: FONT }}>Clear all?</span>
                    <button onClick={handleClearAll} style={{ background: C.redDim, color: C.red, border: `1px solid ${C.red}40`, borderRadius: 5, padding: "3px 10px", fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: FONT }}>Yes</button>
                    <button onClick={() => setClearConfirm(false)} style={{ background: C.surface, color: C.textMid, border: `1px solid ${C.cardBorder}`, borderRadius: 5, padding: "3px 10px", fontSize: 10, fontWeight: 500, cursor: "pointer", fontFamily: FONT }}>No</button>
                  </div>
                ) : (
                  <button onClick={() => setClearConfirm(true)} style={{ background: C.surface, color: C.textDim, border: `1px solid ${C.cardBorder}`, borderRadius: 6, padding: "4px 12px", fontSize: 11, cursor: "pointer", fontFamily: FONT, transition: "all .12s" }}
                    onMouseEnter={(ev) => { ev.currentTarget.style.background = C.redDim; ev.currentTarget.style.color = C.red; ev.currentTarget.style.borderColor = `${C.red}40`; }}
                    onMouseLeave={(ev) => { ev.currentTarget.style.background = C.surface; ev.currentTarget.style.color = C.textDim; ev.currentTarget.style.borderColor = C.cardBorder; }}
                  >
                    Clear All
                  </button>
                )
              )}
            </div>
          </div>

          {/* Mobile-friendly card list */}
          <div style={{ maxHeight: 480, overflowY: "auto" }}>
            {filteredExpenses.length === 0 ? (
              <div style={{ padding: 36, textAlign: "center", color: C.textDim }}>
                <p style={{ fontSize: 28, margin: "0 0 6px" }}>📭</p>
                <p style={{ margin: 0, fontSize: 12 }}>No expenses found. Tap "+ Add" to start tracking!</p>
              </div>
            ) : (
              filteredExpenses.map((e) => {
                const meta = getCat(e.category);
                return (
                  <div key={e.id} style={{ padding: "12px 20px", borderBottom: `1px solid ${C.cardBorder}33`, display: "flex", alignItems: "center", gap: 12, transition: "background .12s" }}
                    onMouseEnter={(ev) => (ev.currentTarget.style.background = C.surface)}
                    onMouseLeave={(ev) => (ev.currentTarget.style.background = "transparent")}
                  >
                    {/* Icon */}
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: meta.color + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
                      {meta.icon}
                    </div>

                    {/* Name + Category + Time */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 600, fontSize: 13, color: C.text }}>{e.name}</span>
                        <span style={{ background: meta.color + "18", color: meta.color, padding: "1px 7px", borderRadius: 5, fontWeight: 500, fontSize: 10 }}>{e.category}</span>
                      </div>
                      <div style={{ fontSize: 10, color: C.textDim, marginTop: 2 }}>
                        {fmtDate(e.created_at)} · {fmtTime(e.created_at)}
                      </div>
                    </div>

                    {/* Amount */}
                    <span style={{ fontWeight: 700, fontSize: 14, color: C.green, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>{fmtAUD(e.amount)}</span>

                    {/* Remove */}
                    <span style={{ flexShrink: 0 }}>
                      {deleteConfirm === e.id ? (
                        <div style={{ display: "flex", gap: 4 }}>
                          <button onClick={() => handleDelete(e.id)} style={{ background: C.redDim, color: C.red, border: `1px solid ${C.red}40`, borderRadius: 5, padding: "3px 8px", fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: FONT }}>Yes</button>
                          <button onClick={() => setDeleteConfirm(null)} style={{ background: C.surface, color: C.textMid, border: `1px solid ${C.cardBorder}`, borderRadius: 5, padding: "3px 8px", fontSize: 10, fontWeight: 500, cursor: "pointer", fontFamily: FONT }}>No</button>
                        </div>
                      ) : (
                        <button onClick={() => setDeleteConfirm(e.id)} style={{ background: C.surface, color: C.textDim, border: `1px solid ${C.cardBorder}`, borderRadius: 6, padding: "4px 10px", fontSize: 10, cursor: "pointer", fontFamily: FONT, transition: "all .12s" }}
                          onMouseEnter={(ev) => { ev.currentTarget.style.background = C.redDim; ev.currentTarget.style.color = C.red; ev.currentTarget.style.borderColor = `${C.red}40`; }}
                          onMouseLeave={(ev) => { ev.currentTarget.style.background = C.surface; ev.currentTarget.style.color = C.textDim; ev.currentTarget.style.borderColor = C.cardBorder; }}
                        >
                          ✕
                        </button>
                      )}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>

      {/* ═══ ADD EXPENSE MODAL ═══════════════════════════════════════ */}
      {showModal && (
        <div onClick={() => setShowModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 1000 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 480, background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: "16px 16px 0 0", padding: "24px 20px 32px", maxHeight: "85vh", overflowY: "auto", animation: "slideUp .25s ease" }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: C.cardBorder, margin: "0 auto 18px" }} />
            <h2 style={{ margin: "0 0 18px", fontSize: 17, fontWeight: 700, fontFamily: FONT, color: C.text }}>New Expense</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={labelStyle}>Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Woolworths" style={inputStyle} autoFocus />
              </div>
              <div>
                <label style={labelStyle}>Category</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {CATEGORIES.map((c) => (
                    <button key={c.name} onClick={() => setCategory(c.name)} style={{
                      padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 500, cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 4, fontFamily: FONT,
                      transition: "all .12s", border: "1px solid",
                      background: category === c.name ? c.color + "20" : C.surface,
                      color: category === c.name ? c.color : C.textMid,
                      borderColor: category === c.name ? c.color + "44" : C.cardBorder,
                    }}>
                      {c.icon} {c.name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={labelStyle}>Amount (AUD)</label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: C.green, fontWeight: 600, fontSize: 14 }}>$</span>
                  <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="0.00" type="text" inputMode="decimal" style={{ ...inputStyle, paddingLeft: 28, fontSize: 16 }} />
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: "12px 0", borderRadius: 10, border: `1px solid ${C.cardBorder}`, background: C.surface, color: C.textMid, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: FONT }}>Cancel</button>
              <button onClick={handleAdd} style={{ ...btnPrimary, flex: 1, padding: "12px 0", fontSize: 13 }}>Add Expense</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ SET BUDGET MODAL ════════════════════════════════════════ */}
      {showBudgetModal && (
        <div onClick={() => setShowBudgetModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 1000 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 480, background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: "16px 16px 0 0", padding: "24px 20px 32px", animation: "slideUp .25s ease" }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: C.cardBorder, margin: "0 auto 18px" }} />
            <h2 style={{ margin: "0 0 18px", fontSize: 17, fontWeight: 700, fontFamily: FONT, color: C.text }}>Set Budget</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={labelStyle}>Weekly Budget (AUD)</label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: C.green, fontWeight: 600, fontSize: 14 }}>$</span>
                  <input value={tempWeekly} onChange={(e) => setTempWeekly(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="0.00" type="text" inputMode="decimal" style={{ ...inputStyle, paddingLeft: 28, fontSize: 16 }} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Monthly Budget (AUD)</label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: C.green, fontWeight: 600, fontSize: 14 }}>$</span>
                  <input value={tempMonthly} onChange={(e) => setTempMonthly(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="0.00" type="text" inputMode="decimal" style={{ ...inputStyle, paddingLeft: 28, fontSize: 16 }} />
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
              <button onClick={() => setShowBudgetModal(false)} style={{ flex: 1, padding: "12px 0", borderRadius: 10, border: `1px solid ${C.cardBorder}`, background: C.surface, color: C.textMid, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: FONT }}>Cancel</button>
              <button onClick={handleSaveBudget} style={{ ...btnPrimary, flex: 1, padding: "12px 0", fontSize: 13 }}>Save Budget</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translate(-50%, -8px); } to { opacity: 1; transform: translate(-50%, 0); } }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${C.cardBorder}; border-radius: 3px; }
        ::placeholder { color: ${C.textDim}; }
        input:focus { outline: none; border-color: ${C.accent}88 !important; }
      `}</style>
    </div>
  );
}

// ─── Shared Styles ─────────────────────────────────────────────────
const inputStyle = {
  width: "100%", boxSizing: "border-box", padding: "10px 12px",
  background: C.surface, border: `1px solid ${C.cardBorder}`, borderRadius: 8,
  color: C.text, fontSize: 13, fontFamily: FONT, transition: "border-color .15s",
};

const labelStyle = {
  display: "block", marginBottom: 5, fontSize: 10, fontWeight: 600,
  color: C.textDim, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: FONT,
};

const btnPrimary = {
  background: C.accent, color: C.white, border: "none", borderRadius: 10,
  fontWeight: 600, cursor: "pointer", fontFamily: FONT, transition: "all .15s",
};
