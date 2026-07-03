const config = window.BADMINTON_CONFIG || {};
const schema = window.BADMINTON_SCHEMA;
const responsesView = document.querySelector("#responsesView");
const summaryView = document.querySelector("#summaryView");
const toast = document.querySelector("#toast");
let submissions = [];

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2800);
}

function authReady() {
  const password = config.ADMIN_PASSWORD || "";
  if (!password) return true;
  return sessionStorage.getItem("badminton_admin_ok") === "true";
}

function renderAuth() {
  document.querySelector("#loginView").classList.toggle("hidden", authReady());
  document.querySelector("#dashboardView").classList.toggle("hidden", !authReady());
}

async function loadDashboard() {
  try {
    submissions = await BadmintonData.listSubmissions();
    renderStats();
    renderFilterFields();
    renderResponses();
    renderSummary();
    showToast(BadmintonData.isSupabaseConfigured() ? "Loaded online data." : "Demo mode: local browser data only.");
  } catch (error) {
    console.error(error);
    showToast("Failed to load submissions. Check config.js and Supabase settings.");
  }
}

function renderStats() {
  document.querySelector("#submissionTotal").textContent = submissions.length;
  document.querySelector("#contactTotal").textContent = submissions.filter(sub => {
    const contact = sub.answers.contact;
    return contact && (contact.name || contact.contact);
  }).length;
  const helpfulness = submissions.map(sub => Number(sub.answers.helpfulness)).filter(Number.isFinite);
  document.querySelector("#avgHelpfulness").textContent = helpfulness.length
    ? (helpfulness.reduce((sum, value) => sum + value, 0) / helpfulness.length).toFixed(1)
    : "-";
  document.querySelector("#latestSubmission").textContent = submissions.length
    ? new Date(submissions[0].createdAt).toLocaleDateString()
    : "-";
}

function renderFilterFields() {
  const field = document.querySelector("#filterField");
  const current = field.value;
  field.innerHTML = `<option value="">All fields</option>${schema.questions.map(question => (
    `<option value="${BadmintonData.escapeHtml(question.id)}">${BadmintonData.escapeHtml(question.label)}</option>`
  )).join("")}`;
  field.value = schema.questions.some(question => question.id === current) ? current : "";
  renderFilterValues();
}

function renderFilterValues() {
  const fieldId = document.querySelector("#filterField").value;
  const valueSelect = document.querySelector("#filterValue");
  const current = valueSelect.value;
  if (!fieldId) {
    valueSelect.innerHTML = `<option value="">Any value</option>`;
    return;
  }
  const values = [...new Set(submissions.flatMap(sub => answerValues(sub.answers[fieldId])).filter(Boolean))];
  valueSelect.innerHTML = `<option value="">Any value</option>${values.map(value => (
    `<option value="${BadmintonData.escapeHtml(value)}">${BadmintonData.escapeHtml(value)}</option>`
  )).join("")}`;
  valueSelect.value = values.includes(current) ? current : "";
}

function answerValues(value) {
  if (Array.isArray(value)) return value.map(String);
  if (value && typeof value === "object") return Object.values(value).filter(Boolean).map(String);
  return value ? [String(value)] : [];
}

function filteredSubmissions() {
  const search = document.querySelector("#searchResponses").value.trim().toLowerCase();
  const fieldId = document.querySelector("#filterField").value;
  const fieldValue = document.querySelector("#filterValue").value;
  return submissions.filter(sub => {
    const matchesSearch = !search || JSON.stringify(sub).toLowerCase().includes(search);
    const values = fieldId ? answerValues(sub.answers[fieldId]) : [];
    const matchesField = !fieldId || !fieldValue || values.includes(fieldValue);
    return matchesSearch && matchesField;
  });
}

function renderResponses() {
  const items = filteredSubmissions();
  if (!items.length) {
    responsesView.innerHTML = `<p class="muted">No submissions match the current view.</p>`;
    return;
  }
  responsesView.innerHTML = items.map(sub => {
    const rows = schema.questions.map(question => {
      const value = BadmintonData.formatAnswer(sub.answers[question.id]);
      return `<tr><th>${BadmintonData.escapeHtml(question.label)}</th><td>${BadmintonData.escapeHtml(value)}</td></tr>`;
    }).join("");
    return `<details class="submissionCard">
      <summary><span>${new Date(sub.createdAt).toLocaleString()}</span></summary>
      <table>${rows}</table>
    </details>`;
  }).join("");
}

function renderSummary() {
  const summary = buildAiStyleSummary(filteredSubmissions());
  summaryView.innerHTML = `
    <div class="summaryGrid">
      <article><h3>Key patterns</h3><ul>${summary.patterns.map(item => `<li>${BadmintonData.escapeHtml(item)}</li>`).join("")}</ul></article>
      <article><h3>Open-text signals</h3><ul>${summary.openText.map(item => `<li>${BadmintonData.escapeHtml(item)}</li>`).join("")}</ul></article>
      <article><h3>Suggested next actions</h3><ul>${summary.actions.map(item => `<li>${BadmintonData.escapeHtml(item)}</li>`).join("")}</ul></article>
    </div>
    <p class="muted small">This assistant is currently local and rule-based. It can later be replaced by a real AI API.</p>`;
}

function buildAiStyleSummary(items) {
  if (!items.length) {
    return {
      patterns: ["No filtered submissions are available yet."],
      openText: ["Open-text themes will appear after testers submit answers."],
      actions: ["Collect a few test responses before interpreting results."]
    };
  }
  const levelCounts = countValues(items.map(sub => sub.answers.level));
  const concerns = countValues(items.flatMap(sub => Array.isArray(sub.answers.concerns) ? sub.answers.concerns : []));
  const useful = countValues(items.flatMap(sub => Array.isArray(sub.answers.most_useful) ? sub.answers.most_useful : []));
  const comments = items.map(sub => sub.answers.comments).filter(Boolean);
  const willingness = countValues(items.map(sub => sub.answers.willingness));
  return {
    patterns: [
      `Most common tester level: ${topValue(levelCounts) || "not enough data"}.`,
      `Most selected useful feature: ${topValue(useful) || "not enough data"}.`,
      `Most common reuse willingness: ${topValue(willingness) || "not enough data"}.`
    ],
    openText: [
      comments.length ? `${comments.length} open comments were collected.` : "No open comments have been submitted yet.",
      `Most common concern: ${topValue(concerns) || "not enough data"}.`,
      comments[0] ? `Representative comment: ${comments[0]}` : "Representative comments will appear after collection."
    ],
    actions: [
      "Review concerns around accuracy and explain what the system can and cannot measure.",
      "Keep the client questionnaire short while validating product value.",
      "Use open-text answers to improve future coaching suggestions."
    ]
  };
}

function answerQuestion(questionText) {
  const text = questionText.trim().toLowerCase();
  const items = filteredSubmissions();
  if (!text) return "Ask a question about the current filtered responses.";
  if (!items.length) return "No matching submissions are available under the current filters.";
  if (text.includes("concern") || text.includes("worry") || text.includes("risk") || text.includes("顾虑")) {
    const concerns = countValues(items.flatMap(sub => Array.isArray(sub.answers.concerns) ? sub.answers.concerns : []));
    return `Top concern: ${topValue(concerns) || "not enough concern data"}.`;
  }
  if (text.includes("level") || text.includes("水平")) {
    return `Tester level distribution: ${formatCounts(countValues(items.map(sub => sub.answers.level)))}.`;
  }
  if (text.includes("comment") || text.includes("subjective") || text.includes("open") || text.includes("主观")) {
    const comments = items.map(sub => sub.answers.comments).filter(Boolean);
    return comments.length ? `There are ${comments.length} open comments. Representative comment: ${comments[0]}` : "No open comments were submitted.";
  }
  if (text.includes("helpful") || text.includes("rating") || text.includes("评分")) {
    const helpfulness = items.map(sub => Number(sub.answers.helpfulness)).filter(Number.isFinite);
    return helpfulness.length ? `Average helpfulness is ${(helpfulness.reduce((sum, value) => sum + value, 0) / helpfulness.length).toFixed(1)} from ${helpfulness.length} responses.` : "No helpfulness ratings are available.";
  }
  if (text.includes("contact") || text.includes("联系")) {
    const contacts = items.filter(sub => {
      const contact = sub.answers.contact;
      return contact && (contact.name || contact.contact);
    });
    return `${contacts.length} of ${items.length} matching submissions left contact information.`;
  }
  const summary = buildAiStyleSummary(items);
  return [...summary.patterns, ...summary.openText, ...summary.actions].join(" ");
}

function countValues(values) {
  return values.filter(Boolean).reduce((acc, value) => {
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function topValue(counts) {
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return entries[0] ? `${entries[0][0]} (${entries[0][1]})` : "";
}

function formatCounts(counts) {
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return entries.length ? entries.map(([label, count]) => `${label}: ${count}`).join("; ") : "not enough data";
}

document.querySelector("#loginBtn").addEventListener("click", () => {
  const password = config.ADMIN_PASSWORD || "";
  if (!password || document.querySelector("#adminPassword").value === password) {
    sessionStorage.setItem("badminton_admin_ok", "true");
    renderAuth();
    loadDashboard();
  } else {
    document.querySelector("#loginMessage").textContent = "Incorrect password.";
  }
});
document.querySelector("#refreshDataBtn").addEventListener("click", loadDashboard);
document.querySelector("#searchResponses").addEventListener("input", () => { renderResponses(); renderSummary(); });
document.querySelector("#filterField").addEventListener("change", () => { renderFilterValues(); renderResponses(); renderSummary(); });
document.querySelector("#filterValue").addEventListener("change", () => { renderResponses(); renderSummary(); });
document.querySelector("#refreshSummaryBtn").addEventListener("click", renderSummary);
document.querySelector("#askAiBtn").addEventListener("click", () => {
  document.querySelector("#aiAnswer").textContent = answerQuestion(document.querySelector("#aiQuestion").value);
});

renderAuth();
if (authReady()) loadDashboard();
