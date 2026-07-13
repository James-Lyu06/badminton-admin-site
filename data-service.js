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

  function functionEndpoint(name) {
    return `${config.SUPABASE_URL.replace(/\/$/, "")}/functions/v1/${encodeURIComponent(name)}`;
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

  function hasContact(value) {
    return Boolean(value && typeof value === "object" && Object.values(value).some(Boolean));
  }

  function redactPrivateFields(value) {
    if (Array.isArray(value)) return value.map(redactPrivateFields);
    if (!value || typeof value !== "object") return value;
    return Object.fromEntries(Object.entries(value)
      .filter(([key]) => !/(contact|name|email|phone|wechat|whatsapp|instagram)/i.test(key))
      .map(([key, item]) => [key, redactPrivateFields(item)]));
  }

  function anonymizeSubmission(submission) {
    return {
      createdAt: submission.createdAt,
      language: submission.language,
      contactProvided: hasContact(submission.answers?.contact),
      answers: redactPrivateFields(submission.answers || {})
    };
  }

  async function askAi(question, submissions, questions) {
    if (!isSupabaseConfigured()) throw new Error("Supabase is not configured.");
    const functionName = config.AI_FUNCTION_NAME || "ai-assistant";
    let response;
    try {
      response = await fetch(functionEndpoint(functionName), {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          question,
          questions: questions.map(item => ({ id: item.id, label: item.label })),
          submissions: submissions.slice(0, 100).map(anonymizeSubmission)
        })
      });
    } catch {
      throw new Error("The AI service is not deployed or reachable.");
    }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || `AI request failed (${response.status}).`);
    if (!payload.answer) throw new Error("The AI service returned an empty answer.");
    return payload.answer;
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

  return { askAi, deleteSubmission, escapeHtml, formatAnswer, isSupabaseConfigured, listSubmissions };
})();

