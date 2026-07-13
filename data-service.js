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

  function isCurrentQuestionnaire(row) {
    const rowVersion = row.questionnaire_version || row.questionnaireVersion;
    const currentVersion = window.BADMINTON_SCHEMA?.version;
    return rowVersion !== "questionnaire_config" && (!currentVersion || rowVersion === currentVersion);
  }

  async function listSubmissions() {
    if (!isSupabaseConfigured()) return localItems().filter(isCurrentQuestionnaire);
    const response = await fetch(endpoint("?select=*&order=created_at.desc"), { headers: headers() });
    if (!response.ok) throw new Error(await response.text());
    return (await response.json()).filter(isCurrentQuestionnaire).map(normalizeRow);
  }

  async function deleteSubmission(id) {
    if (!id) throw new Error("Missing submission id.");
    if (!isSupabaseConfigured()) {
      const remaining = localItems().filter(item => item.id !== id);
      localStorage.setItem(localKey, JSON.stringify(remaining, null, 2));
      return true;
    }
    const response = await fetch(endpoint(`?id=eq.${encodeURIComponent(id)}`), {
      method: "DELETE",
      headers: headers({ Prefer: "return=minimal" })
    });
    if (!response.ok) throw new Error(await response.text());
    return true;
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

  return { deleteSubmission, escapeHtml, formatAnswer, isSupabaseConfigured, listSubmissions };
})();

