import { useState, useEffect, useCallback, useRef } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, AreaChart, Area,
  ReferenceLine,
} from "recharts";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

const PLATFORM_COLORS = {
  X: "#e2e8f0",
  Instagram: "#f97316",
  Facebook: "#3b82f6",
  TikTok: "#ec4899",
  Threads: "#a78bfa",
};
const PLATFORM_ICONS = { X: "X", Instagram: "O", Facebook: "f", TikTok: "T", Threads: "@" };

const sentimentColor = (v) => {
  if (v < -0.3) return "#ef4444";
  if (v < -0.05) return "#f97316";
  if (v < 0.1) return "#eab308";
  if (v < 0.3) return "#84cc16";
  return "#22c55e";
};

const sentimentLabel = (v) => {
  if (v < -0.3) return "Muy negativo";
  if (v < -0.05) return "Negativo";
  if (v < 0.1) return "Neutro";
  if (v < 0.3) return "Positivo";
  return "Muy positivo";
};

async function apiFetch(path) {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`API ${path} -> ${res.status}`);
  return res.json();
}

const Spinner = () => (
  <span style={{ color: "#475569", fontSize: 13 }}>Cargando...</span>
);

const GlowBadge = ({ value }) => (
  <span style={{
    display: "inline-block", padding: "2px 10px", borderRadius: 12,
    background: sentimentColor(value) + "22", color: sentimentColor(value),
    border: `1px solid ${sentimentColor(value)}44`, fontSize: 11, fontWeight: 700,
  }}>
    {sentimentLabel(value)}
  </span>
);

const MetricCard = ({ label, value, sub, accent, loading }) => (
  <div style={{
    background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
    border: `1px solid ${accent || "#334155"}`,
    borderRadius: 12, padding: "18px 20px",
    boxShadow: accent ? `0 0 20px ${accent}18` : "none",
    flex: 1, minWidth: 140,
  }}>
    <div style={{ color: "#64748b", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>{label}</div>
    <div style={{ color: accent || "#f1f5f9", fontSize: 26, fontWeight: 800, lineHeight: 1 }}>
      {loading ? <Spinner /> : value}
    </div>
    {sub && <div style={{ color: "#475569", fontSize: 12, marginTop: 6 }}>{sub}</div>}
  </div>
);

const PostCard = ({ post }) => {
  const col = PLATFORM_COLORS[post.platform] || "#94a3b8";
  const sent = typeof post.sentiment === "number" ? post.sentiment : 0;
  return (
    <div style={{
      background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10,
      padding: "12px 16px", marginBottom: 10, borderLeft: `3px solid ${col}`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, flexWrap: "wrap", gap: 4 }}>
        <span style={{ color: col, fontSize: 12, fontWeight: 700 }}>{post.platform}</span>
        <span style={{ color: "#475569", fontSize: 11 }}>@{post.user}</span>
        <span style={{ color: "#334155", fontSize: 10 }}>{post.date}</span>
        <GlowBadge value={sent} />
      </div>
      <div style={{ color: "#cbd5e1", fontSize: 13, lineHeight: 1.5 }}>{post.content}</div>
    </div>
  );
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, padding: "10px 14px" }}>
      <div style={{ color: "#94a3b8", fontSize: 12, marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || "#f1f5f9", fontSize: 13 }}>
          {p.name}: <strong>{typeof p.value === "number" ? p.value.toFixed(3) : p.value}</strong>
        </div>
      ))}
    </div>
  );
};

const ErrorBanner = ({ msg }) => (
  <div style={{
    background: "#1c0a0a", border: "1px solid #7f1d1d", borderRadius: 8,
    padding: "10px 16px", color: "#fca5a5", fontSize: 12, marginBottom: 16,
  }}>
    Error: {msg}
  </div>
);

const SCENARIO_COLORS = ["#94a3b8", "#ef4444", "#f97316", "#22c55e"];

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState(0);
  const [status, setStatus] = useState(null);
  const [history, setHistory] = useState([]);
  const [feed, setFeed] = useState([]);
  const [wordfreq, setWordfreq] = useState([]);
  const [scenarios, setScenarios] = useState([]);
  const [filter, setFilter] = useState("Todos");
  const [loading, setLoading] = useState({ status: true, history: true, feed: true, wordfreq: true, scenarios: true });
  const [updating, setUpdating] = useState(false);
  const [errors, setErrors] = useState({});
  const pollRef = useRef(null);

  const setErr = (key, msg) => setErrors(e => ({ ...e, [key]: msg }));
  const setLoad = (key, val) => setLoading(l => ({ ...l, [key]: val }));

  const loadStatus = useCallback(async () => {
    try { setStatus(await apiFetch("/api/status")); }
    catch (e) { setErr("status", e.message); }
    finally { setLoad("status", false); }
  }, []);

  const loadHistory = useCallback(async () => {
    try { const d = await apiFetch("/api/sentiment-series?days=30"); setHistory(d.series || []); }
    catch (e) { setErr("history", e.message); }
    finally { setLoad("history", false); }
  }, []);

  const loadFeed = useCallback(async () => {
    try { const d = await apiFetch("/api/feed?limit=30"); setFeed(d.posts || []); }
    catch (e) { setErr("feed", e.message); }
    finally { setLoad("feed", false); }
  }, []);

  const loadWordfreq = useCallback(async () => {
    try { const d = await apiFetch("/api/wordfreq?days=7"); setWordfreq(d.word_freq || []); }
    catch (e) { setErr("wordfreq", e.message); }
    finally { setLoad("wordfreq", false); }
  }, []);

  const loadScenarios = useCallback(async () => {
    try { const d = await apiFetch("/api/scenarios"); setScenarios(d.scenarios || []); }
    catch (e) { setErr("scenarios", e.message); }
    finally { setLoad("scenarios", false); }
  }, []);

  useEffect(() => {
    loadStatus(); loadHistory(); loadFeed(); loadWordfreq(); loadScenarios();
    pollRef.current = setInterval(loadStatus, 30000);
    return () => clearInterval(pollRef.current);
  }, []);

  const handleUpdate = async () => {
    setUpdating(true);
    try {
      await fetch(`${API_BASE}/api/update`, { method: "POST" });
      const currentTs = status?.last_update;
      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++;
        const d = await apiFetch("/api/status").catch(() => null);
        if (!d) return;
        if (d.last_update !== currentTs || attempts > 24) {
          clearInterval(poll);
          setUpdating(false);
          await Promise.all([loadStatus(), loadHistory(), loadFeed(), loadWordfreq()]);
        }
      }, 5000);
    } catch (e) {
      setErr("update", e.message);
      setUpdating(false);
    }
  };

  const avgSentiment = history.length
    ? parseFloat((history.slice(-7).reduce((s, d) => s + (d.sentiment || 0), 0) / Math.min(history.length, 7)).toFixed(3))
    : 0;

  const platformDist = ["X", "Instagram", "Facebook", "TikTok", "Threads"].map(p => ({
    name: p, value: history.slice(-7).reduce((s, d) => s + (d[p] || 0), 0),
  })).filter(p => p.value > 0);

  const filteredPosts = filter === "Todos" ? feed : feed.filter(p => p.platform === filter);
  const tabs = ["Feed Multi-Red", "Tendencias", "Escenarios Electorales", "Palabras Clave"];

  return (
    <div style={{
      minHeight: "100vh", background: "#020817",
      fontFamily: "'DM Mono', 'IBM Plex Mono', monospace",
      color: "#e2e8f0", padding: "24px 28px",
    }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: "0.18em", color: "#dc2626", textTransform: "uppercase", marginBottom: 6 }}>
              AGENTE MONITOR ACTIVO - VOTO CERA / ANDALUCIA 2026
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0, color: "#f1f5f9" }}>
              PSOE CERA - Inteligencia Electoral Multi-Redes
            </h1>
            <div style={{ color: "#475569", fontSize: 12, marginTop: 4 }}>
              X - Instagram - Facebook - TikTok - Datos en tiempo real
            </div>
          </div>
          <button onClick={handleUpdate} disabled={updating} style={{
            background: updating ? "#1e293b" : "linear-gradient(135deg, #dc2626, #991b1b)",
            border: "none", borderRadius: 8, color: "#fff", padding: "10px 20px",
            fontSize: 13, fontWeight: 700, cursor: updating ? "not-allowed" : "pointer",
            boxShadow: updating ? "none" : "0 0 20px #dc262640",
          }}>
            {updating ? "Scrapeando... (~60s)" : "ACTUALIZAR DATOS"}
          </button>
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 20, flexWrap: "wrap" }}>
          <MetricCard label="Ultima actualizacion" value={status?.last_update ? status.last_update.slice(11, 19) : "--"} sub={status?.last_update?.slice(0, 10)} accent="#334155" loading={loading.status} />
          <MetricCard label="Sentimiento 7d" value={avgSentiment > 0 ? `+${avgSentiment}` : String(avgSentiment)} sub={sentimentLabel(avgSentiment)} accent={sentimentColor(avgSentiment)} loading={loading.history} />
          <MetricCard label="Entradas en historico" value={status?.total_entries ?? "--"} sub="registros guardados" accent="#1d4ed8" loading={loading.status} />
          <MetricCard label="Plataformas" value={status?.platforms_active || 4} sub="activas" accent="#7c3aed" loading={loading.status} />
          <MetricCard label="Alerta" value={avgSentiment < -0.15 ? "ALTA" : "BAJA"} sub={avgSentiment < -0.15 ? "Narrativa negativa dominante" : "Sin anomalias"} accent={avgSentiment < -0.15 ? "#dc2626" : "#16a34a"} loading={loading.history} />
        </div>
      </div>

      {errors.update && <ErrorBanner msg={errors.update} />}

      <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "1px solid #1e293b" }}>
        {tabs.map((t, i) => (
          <button key={i} onClick={() => setActiveTab(i)} style={{
            background: "none", border: "none", padding: "10px 18px",
            color: activeTab === i ? "#f1f5f9" : "#475569",
            fontSize: 13, cursor: "pointer", fontFamily: "inherit",
            borderBottom: activeTab === i ? "2px solid #dc2626" : "2px solid transparent",
            fontWeight: activeTab === i ? 700 : 400,
          }}>{t}</button>
        ))}
      </div>

      {activeTab === 0 && (
        <div>
          {errors.feed && <ErrorBanner msg={errors.feed} />}
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            {["Todos", "X", "Instagram", "Facebook", "TikTok"].map(p => (
              <button key={p} onClick={() => setFilter(p)} style={{
                background: filter === p ? (PLATFORM_COLORS[p] || "#dc2626") + "22" : "#0f172a",
                border: `1px solid ${filter === p ? (PLATFORM_COLORS[p] || "#dc2626") : "#1e293b"}`,
                borderRadius: 20, color: filter === p ? (PLATFORM_COLORS[p] || "#dc2626") : "#64748b",
                padding: "5px 14px", fontSize: 12, cursor: "pointer", fontFamily: "inherit",
              }}>{p}</button>
            ))}
            <span style={{ color: "#334155", fontSize: 12, lineHeight: "28px" }}>{filteredPosts.length} posts</span>
          </div>
          {loading.feed ? <Spinner /> : filteredPosts.length === 0 ? (
            <div style={{ color: "#475569", textAlign: "center", padding: 40 }}>
              Sin datos. Pulsa ACTUALIZAR DATOS para iniciar el primer scrape.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(420px, 1fr))", gap: 10 }}>
              {filteredPosts.map((p, i) => <PostCard key={i} post={p} />)}
            </div>
          )}
        </div>
      )}

      {activeTab === 1 && (
        <div>
          {errors.history && <ErrorBanner msg={errors.history} />}
          {loading.history ? <Spinner /> : history.length === 0 ? (
            <div style={{ color: "#475569", textAlign: "center", padding: 40 }}>Sin historico. Ejecuta al menos un scrape primero.</div>
          ) : (
            <>
              <div style={{ color: "#94a3b8", fontSize: 12, marginBottom: 12 }}>SENTIMIENTO COMBINADO - ULTIMOS 30 DIAS</div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={history} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#dc2626" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" tick={{ fill: "#475569", fontSize: 10 }} tickLine={false} />
                  <YAxis tick={{ fill: "#475569", fontSize: 10 }} tickLine={false} domain={[-1, 1]} />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={0} stroke="#334155" strokeDasharray="4 4" />
                  <Area type="monotone" dataKey="sentiment" stroke="#dc2626" strokeWidth={2} fill="url(#sg)" dot={false} name="Sentimiento" />
                </AreaChart>
              </ResponsiveContainer>

              <div style={{ color: "#94a3b8", fontSize: 12, margin: "24px 0 12px" }}>VOLUMEN POR PLATAFORMA - ULTIMOS 14 DIAS</div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={history.slice(-14)} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" tick={{ fill: "#475569", fontSize: 9 }} tickLine={false} />
                  <YAxis tick={{ fill: "#475569", fontSize: 10 }} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {Object.entries(PLATFORM_COLORS).map(([p, c]) => <Bar key={p} dataKey={p} stackId="a" fill={c} />)}
                </BarChart>
              </ResponsiveContainer>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 24 }}>
                <div>
                  <div style={{ color: "#94a3b8", fontSize: 12, marginBottom: 12 }}>DISTRIBUCION 7D</div>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={platformDist} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" paddingAngle={3}>
                        {platformDist.map((e, i) => <Cell key={i} fill={PLATFORM_COLORS[e.name] || "#64748b"} />)}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <div style={{ color: "#94a3b8", fontSize: 12, marginBottom: 12 }}>RADAR DE COBERTURA</div>
                  <ResponsiveContainer width="100%" height={180}>
                    <RadarChart data={platformDist}>
                      <PolarGrid stroke="#1e293b" />
                      <PolarAngleAxis dataKey="name" tick={{ fill: "#475569", fontSize: 10 }} />
                      <Radar name="Posts" dataKey="value" stroke="#dc2626" fill="#dc2626" fillOpacity={0.2} />
                      <Tooltip content={<CustomTooltip />} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 2 && (
        <div>
          {errors.scenarios && <ErrorBanner msg={errors.scenarios} />}
          <div style={{ marginBottom: 20, color: "#64748b", fontSize: 13, borderLeft: "3px solid #dc2626", paddingLeft: 12 }}>
            Proyecciones Andalucia 2026 - Impacto del voto CERA (Argentina) como variable diferencial.
          </div>
          {loading.scenarios ? <Spinner /> : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={scenarios} layout="vertical" margin={{ left: 10, right: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                  <XAxis type="number" tick={{ fill: "#475569", fontSize: 10 }} domain={[0, 70]} />
                  <YAxis type="category" dataKey="escenario" width={210} tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="pp" name="PP" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="psoe" name="PSOE" fill="#dc2626" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="vox" name="Vox" fill="#16a34a" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12, marginTop: 24 }}>
                {scenarios.map((s, i) => (
                  <div key={i} style={{ background: "#0f172a", border: `1px solid ${SCENARIO_COLORS[i]}44`, borderRadius: 10, padding: 16, position: "relative" }}>
                    <div style={{ position: "absolute", top: 12, right: 12, background: SCENARIO_COLORS[i] + "22", color: SCENARIO_COLORS[i], border: `1px solid ${SCENARIO_COLORS[i]}44`, borderRadius: 12, padding: "2px 10px", fontSize: 12, fontWeight: 700 }}>{s.prob}%</div>
                    <div style={{ color: "#f1f5f9", fontSize: 13, fontWeight: 700, marginBottom: 10 }}>{s.escenario}</div>
                    <div style={{ display: "flex", gap: 16, fontSize: 12 }}>
                      <div><span style={{ color: "#64748b" }}>PP:</span> <strong style={{ color: "#3b82f6" }}>{s.pp}</strong></div>
                      <div><span style={{ color: "#64748b" }}>PSOE:</span> <strong style={{ color: "#dc2626" }}>{s.psoe}</strong></div>
                      <div><span style={{ color: "#64748b" }}>Vox:</span> <strong style={{ color: "#16a34a" }}>{s.vox}</strong></div>
                    </div>
                    <div style={{ marginTop: 8, fontSize: 11, color: s.necesita_vox ? "#f97316" : "#22c55e" }}>
                      {s.necesita_vox ? "PP necesita pacto Vox" : "PP mayoria sin Vox"}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 3 && (
        <div>
          {errors.wordfreq && <ErrorBanner msg={errors.wordfreq} />}
          <div style={{ color: "#94a3b8", fontSize: 12, marginBottom: 16 }}>FRECUENCIA DE TERMINOS - ULTIMOS 7 DIAS</div>
          {loading.wordfreq ? <Spinner /> : wordfreq.length === 0 ? (
            <div style={{ color: "#475569" }}>Sin datos de frecuencia. Ejecuta un scrape primero.</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={wordfreq} layout="vertical" margin={{ left: 20, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis type="number" tick={{ fill: "#475569", fontSize: 10 }} />
                <YAxis type="category" dataKey="word" width={120} tick={{ fill: "#cbd5e1", fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="freq" name="Menciones" radius={[0, 4, 4, 0]}>
                  {wordfreq.map((_, i) => <Cell key={i} fill={`hsl(${220 - i * 10}, 75%, ${55 - i}%)`} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      <div style={{ marginTop: 32, paddingTop: 16, borderTop: "1px solid #1e293b", display: "flex", justifyContent: "space-between", fontSize: 11, color: "#334155", flexWrap: "wrap", gap: 8 }}>
        <span>TRC Campaigns - Agente PSOE CERA - Inteligencia Electoral Multi-Redes</span>
        <span>API: {API_BASE}</span>
      </div>
    </div>
  );
}
