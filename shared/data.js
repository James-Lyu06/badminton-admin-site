const BadmintonData = (() => {
  const STORAGE_KEYS = {
    schema: "badminton_question_schema_v2",
    submissions: "badminton_submissions_v2"
  };
  const OTHER_VALUE = "__other__";

  const defaultSchema = {
    title: "AuraSense testing feedback",
    version: "2026-07-02-split-sites",
    questions: [
      { id: "level", section: "User background", label: "What is your current badminton level?", type: "single_choice", required: true, allowOther: true, options: ["Beginner", "Intermediate", "Advanced", "Competitive / club / school team", "Not sure"] },
      { id: "frequency", section: "User background", label: "How often do you usually play badminton?", type: "single_choice", required: true, allowOther: true, options: ["1-3 times per month", "Once per week", "2-3 times per week", "4+ times per week"] },
      { id: "coaching", section: "User background", label: "Have you received formal badminton coaching?", type: "single_choice", required: true, allowOther: true, options: ["No", "A few trial lessons", "I used to take lessons", "I currently take lessons regularly", "I am a coach / assistant / competitive player"] },
      { id: "pain_points", section: "Current training pain points", label: "What are your biggest difficulties when improving your technique?", type: "multiple_choice", required: true, allowOther: true, options: ["I do not know what is wrong with my movement", "I forget the coach's feedback during self-practice", "I feel my movement is correct, but the result is not good", "I do not know whether I am improving", "It is hard to imitate skilled players", "I do not have training data or records"] },
      { id: "current_solution", section: "Current training pain points", label: "How do you currently judge whether your stroke is improving?", type: "multiple_choice", required: true, allowOther: true, options: ["By feeling", "By shuttle flight result", "Coach feedback", "Friend feedback", "Video review", "I do not have a clear method"] },
      { id: "helpfulness", section: "Questionnaire feedback", label: "How helpful was this testing questionnaire?", type: "rating", required: true, allowOther: false, options: ["1", "2", "3", "4", "5"] },
      { id: "trust", section: "Product direction", label: "What would make you trust motion-analysis feedback more?", type: "multiple_choice", required: true, allowOther: true, options: ["Verified by a coach", "Clear explanation of the score", "Video comparison", "Long-term progress tracking", "More tests with skilled players"] },
      { id: "most_useful", section: "Product direction", label: "Which product features would be most useful to you?", type: "multiple_choice", required: false, allowOther: true, options: ["Overall score", "Stroke-by-stroke score", "Consistency", "Wrist speed", "Comparison with skilled players", "Simple training suggestions", "Charts and curves"] },
      { id: "future_feedback", section: "Product direction", label: "What would you most want the product to tell you in the future?", type: "multiple_choice", required: true, allowOther: true, options: ["Whether my movement is standard", "How I differ from skilled players", "Which stroke was best", "How stable my movement is", "How I should improve", "Long-term progress tracking"] },
      { id: "willingness", section: "Product direction", label: "Would you be willing to use this product again after training?", type: "single_choice", required: true, allowOther: true, options: ["Yes", "Maybe", "Probably not", "No", "Depends on price and accuracy"] },
      { id: "concerns", section: "Product direction", label: "What is your biggest concern?", type: "multiple_choice", required: false, allowOther: true, options: ["Accuracy", "Hard to understand", "Wearing device is inconvenient", "Price", "I would rather ask a coach", "May affect playing feeling", "Data privacy"] },
      { id: "comments", section: "Open feedback", label: "Any suggestions or comments?", type: "long_text", required: false, allowOther: false, options: [] },
      { id: "contact", section: "Follow-up", label: "Leave your name and contact if you are willing to join future tests.", type: "contact", required: false, allowOther: false, options: [] }
    ]
  };

  function clone(value) {
    return window.structuredClone ? structuredClone(value) : JSON.parse(JSON.stringify(value));
  }

  function safeParse(raw, fallback) {
    if (!raw) return clone(fallback);
    try { return JSON.parse(raw); } catch { return clone(fallback); }
  }

  function uid(prefix = "q") {
    return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 7)}`;
  }

  function loadSchema() { return safeParse(localStorage.getItem(STORAGE_KEYS.schema), defaultSchema); }
  function saveSchema(schema) { localStorage.setItem(STORAGE_KEYS.schema, JSON.stringify(schema, null, 2)); }
  function loadSubmissions() { return safeParse(localStorage.getItem(STORAGE_KEYS.submissions), []); }
  function saveSubmissions(submissions) { localStorage.setItem(STORAGE_KEYS.submissions, JSON.stringify(submissions, null, 2)); }

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

  return { OTHER_VALUE, clone, defaultSchema, escapeHtml, formatAnswer, loadSchema, loadSubmissions, saveSchema, saveSubmissions, uid };
})();
