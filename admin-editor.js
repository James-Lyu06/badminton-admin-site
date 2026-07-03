const questionnaireEditor = document.querySelector("#questionnaireEditor");
const saveQuestionnaireBtn = document.querySelector("#saveQuestionnaireBtn");
const resetQuestionnaireBtn = document.querySelector("#resetQuestionnaireBtn");
const reloadQuestionnaireBtn = document.querySelector("#reloadQuestionnaireBtn");

function editorToast(message) {
  if (typeof showToast === "function") showToast(message);
}

function validateQuestionnaireSchema(nextSchema) {
  if (!nextSchema || typeof nextSchema !== "object") throw new Error("Schema must be an object.");
  if (!nextSchema.title) throw new Error("Schema must include a title.");
  if (!Array.isArray(nextSchema.questions)) throw new Error("Schema must include a questions array.");
  nextSchema.questions.forEach((question, index) => {
    if (!question.id || !question.label || !question.type) throw new Error(`Question ${index + 1} needs id, label, and type.`);
    if (!Array.isArray(question.options)) question.options = [];
  });
}

async function loadQuestionnaireIntoEditor() {
  try {
    const currentSchema = await BadmintonData.loadQuestionnaireConfig(window.BADMINTON_SCHEMA);
    questionnaireEditor.value = JSON.stringify(currentSchema, null, 2);
    editorToast("Questionnaire loaded.");
  } catch (error) {
    console.error(error);
    questionnaireEditor.value = JSON.stringify(window.BADMINTON_SCHEMA, null, 2);
    editorToast("Questionnaire config failed to load. Default schema is shown.");
  }
}

async function saveQuestionnaireFromEditor() {
  try {
    const nextSchema = JSON.parse(questionnaireEditor.value);
    validateQuestionnaireSchema(nextSchema);
    await BadmintonData.saveQuestionnaireConfig(nextSchema);
    window.BADMINTON_SCHEMA = nextSchema;
    editorToast("Questionnaire saved. Refresh the client site to see the update.");
  } catch (error) {
    console.error(error);
    editorToast(`Questionnaire save failed: ${error.message}`);
  }
}

saveQuestionnaireBtn?.addEventListener("click", saveQuestionnaireFromEditor);
resetQuestionnaireBtn?.addEventListener("click", () => {
  questionnaireEditor.value = JSON.stringify(window.BADMINTON_SCHEMA, null, 2);
  editorToast("Default questionnaire loaded in editor. Click save to publish it.");
});
reloadQuestionnaireBtn?.addEventListener("click", loadQuestionnaireIntoEditor);

loadQuestionnaireIntoEditor();
