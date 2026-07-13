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
  const followUpAnswers = submissions.map(sub => sub.answers.follow_up_willingness).filter(Boolean);
  const futureTestInterest = followUpAnswers.filter(answer => ["Yes", "Maybe"].includes(answer)).length;
  document.querySelector("#followUpInterest").textContent = followUpAnswers.length
    ? `${Math.round((futureTestInterest / followUpAnswers.length) * 100)}%`
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
    return `<details class="submissionCard" data-submission-id="${BadmintonData.escapeHtml(sub.id)}">
      <summary><span>${new Date(sub.createdAt).toLocaleString()}</span></summary>
      <div class="submissionActions">
        <span class="muted small">Response ID: ${BadmintonData.escapeHtml(sub.id)}</span>
        <button class="dangerButton" type="button" data-delete-id="${BadmintonData.escapeHtml(sub.id)}">Delete response</button>
      </div>
      <table>${rows}</table>
    </details>`;
  }).join("");
}

async function deleteResponse(id) {
  const confirmed = window.confirm("Delete this response permanently? This action cannot be undone.");
  if (!confirmed) return;
  try {
    await BadmintonData.deleteSubmission(id);
    submissions = submissions.filter(sub => sub.id !== id);
    renderStats();
    renderFilterValues();
    renderResponses();
    renderSummary();
    showToast("Response deleted.");
  } catch (error) {
    console.error(error);
    showToast("Delete failed. Check Supabase delete policy.");
  }
}

function renderSummary() {
  const summary = buildAiStyleSummary(filteredSubmissions());
  summaryView.innerHTML = `
    <div class="summaryGrid">
      <article><h3>Key patterns</h3><ul>${summary.patterns.map(item => `<li>${BadmintonData.escapeHtml(item)}</li>`).join("")}</ul></article>
      <article><h3>Satisfaction & follow-up</h3><ul>${summary.followUp.map(item => `<li>${BadmintonData.escapeHtml(item)}</li>`).join("")}</ul></article>
      <article><h3>Suggested next actions</h3><ul>${summary.actions.map(item => `<li>${BadmintonData.escapeHtml(item)}</li>`).join("")}</ul></article>
    </div>
    <p class="muted small">The cards above are calculated locally. Questions are answered by OpenAI through a server-side Supabase Edge Function.</p>`;
}

function buildAiStyleSummary(items) {
  if (!items.length) {
    return {
      patterns: ["No filtered submissions are available yet."],
      followUp: ["Satisfaction and follow-up signals will appear after participants submit answers."],
      actions: ["Collect a few test responses before interpreting results."]
    };
  }
  const levelCounts = countValues(items.map(sub => sub.answers.level));
  const painPoints = countValues(items.flatMap(sub => answerValues(sub.answers.pain_points)));
  const trainingMethods = countValues(items.flatMap(sub => answerValues(sub.answers.training_methods)));
  const satisfaction = countValues(items.map(sub => sub.answers.current_satisfaction));
  const willingness = countValues(items.map(sub => sub.answers.follow_up_willingness));
  const contacts = items.filter(sub => {
    const contact = sub.answers.contact;
    return contact && (contact.name || contact.contact);
  }).length;
  return {
    patterns: [
      `Most common tester level: ${topValue(levelCounts) || "not enough data"}.`,
      `Most common training pain point: ${topValue(painPoints) || "not enough data"}.`,
      `Most used training method: ${topValue(trainingMethods) || "not enough data"}.`
    ],
    followUp: [
      `Most common current satisfaction: ${topValue(satisfaction) || "not enough data"}.`,
      `Most common future test willingness: ${topValue(willingness) || "not enough data"}.`,
      `${contacts} of ${items.length} matching submissions left contact information.`
    ],
    actions: [
      "Prioritize the most common training difficulty in future product tests.",
      "Adapt future training guidance to the methods participants already use.",
      "Follow up only with participants who selected Yes or Maybe and left contact information."
    ]
  };
}

async function answerQuestion(questionText) {
  const text = questionText.trim();
  const items = filteredSubmissions();
  if (!text) return "Ask a question about the current filtered responses.";
  if (!items.length) return "No matching submissions are available under the current filters.";
  return BadmintonData.askAi(text, items, schema.questions);
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
async function askAi() {
  const button = document.querySelector("#askAiBtn");
  const answer = document.querySelector("#aiAnswer");
  if (button.disabled) return;
  button.disabled = true;
  button.textContent = "Thinking...";
  answer.textContent = "Analyzing the current filtered responses...";
  try {
    answer.textContent = await answerQuestion(document.querySelector("#aiQuestion").value);
  } catch (error) {
    console.error(error);
    answer.textContent = `AI unavailable: ${error.message}`;
  } finally {
    button.disabled = false;
    button.textContent = "Ask";
  }
}
document.querySelector("#askAiBtn").addEventListener("click", askAi);
document.querySelector("#aiQuestion").addEventListener("keydown", event => {
  if (event.key === "Enter" && !event.isComposing) askAi();
});
responsesView.addEventListener("click", event => {
  const button = event.target.closest("[data-delete-id]");
  if (button) deleteResponse(button.dataset.deleteId);
});

renderAuth();
if (authReady()) loadDashboard();

