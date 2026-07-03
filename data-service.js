const BadmintonData = (() => {
  const config = window.BADMINTON_CONFIG || {};
  const localKey = "badminton_submissions_local_demo_v1";

  function isSupabaseConfigured() {
    return Boolean(config.SUPABASE_URL && config.SUPABASE_ANON_KEY);
  }

  function endpoint(query = "") {
    const table = config.SUBMISSIONS_TABLE || "badminton_submissions";
    return `${config.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/${table}${query}`;
  }

  function headers(extra = {}) {
    return {
      apikey: config.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${config.SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      ...extra
    };
  }

  function normalizeRow(row) {
    return {
      id: row.id,
      createdAt: row.created_at || row.createdAt,
      questionnaireVersion: row.questionnaire_version || row.questionnaireVersion,
      language: row.language || "en",
      answers: row.answers || {}
    };
  }

  function localItems() {
    try { return JSON.parse(localStorage.getItem(localKey)) || []; }
    catch { return []; }
  }

  async function listSubmissions() {
    if (!isSupabaseConfigured()) {
      return localItems().filter(item => item.questionnaireVersion !== "questionnaire_config");
    }
    const response = await fetch(endpoint("?select=*&questionnaire_version=neq.questionnaire_config&order=created_at.desc"), { headers: headers() });
    if (!response.ok) throw new Error(await response.text());
    return (await response.json()).map(normalizeRow);
  }

  async function loadQuestionnaireConfig(fallbackSchema) {
    if (!isSupabaseConfigured()) {
      try { return JSON.parse(localStorage.getItem("badminton_questionnaire_schema")) || fallbackSchema; }
      catch { return fallbackSchema; }
    }
    const query = "?select=answers,created_at&questionnaire_version=eq.questionnaire_config&order=created_at.desc&limit=1";
    const response = await fetch(endpoint(query), { headers: headers() });
    if (!response.ok) throw new Error(await response.text());
    const rows = await response.json();
    return rows[0]?.answers?.schema || fallbackSchema;
  }

  async function saveQuestionnaireConfig(schema) {
    const payload = {
      id: `questionnaire_config_${Date.now()}`,
      created_at: new Date().toISOString(),
      questionnaire_version: "questionnaire_config",
      language: "en",
      answers: { schema }
    };
    if (!isSupabaseConfigured()) {
      localStorage.setItem("badminton_questionnaire_schema", JSON.stringify(schema, null, 2));
      return payload;
    }
    const response = await fetch(endpoint(), {
      method: "POST",
      headers: headers({ Prefer: "return=representation" }),
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(await response.text());
    return (await response.json())[0];
  }

  function formatAnswer(value) {
    if (Array.isArray(value)) return value.join("; ");
    if (value && typeof value === "object") return Object.values(value).filter(Boolean).join(" / ");
    return value ?? "";
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  return { escapeHtml, formatAnswer, isSupabaseConfigured, listSubmissions, loadQuestionnaireConfig, saveQuestionnaireConfig };
})();
