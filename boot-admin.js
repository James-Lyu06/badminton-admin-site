(async () => {
  try {
    window.BADMINTON_SCHEMA = await BadmintonData.loadQuestionnaireConfig(window.BADMINTON_SCHEMA);
  } catch (error) {
    console.error(error);
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `${src}?v=${Date.now()}`;
      script.onload = resolve;
      script.onerror = reject;
      document.body.appendChild(script);
    });
  }

  await loadScript("admin.js");
  await loadScript("admin-editor.js");
})();
