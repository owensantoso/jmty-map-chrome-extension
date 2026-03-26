(function () {
  const DEFAULT_SETTINGS = {
    autoOpenMap: true,
    showCurrentLocationByDefault: false,
    panelPosition: "inline",
    mapHeight: "medium",
    useContextInGeocoding: true
  };

  function getSettings() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(DEFAULT_SETTINGS, resolve);
    });
  }

  function saveSettings(values) {
    return new Promise((resolve) => {
      chrome.storage.sync.set(values, resolve);
    });
  }

  function readForm(form) {
    return {
      autoOpenMap: form.autoOpenMap.checked,
      showCurrentLocationByDefault: form.showCurrentLocationByDefault.checked,
      panelPosition: form.panelPosition.value,
      mapHeight: form.mapHeight.value,
      useContextInGeocoding: form.useContextInGeocoding.checked
    };
  }

  async function init() {
    const form = document.getElementById("options-form");
    const status = document.getElementById("options-status");
    const settings = await getSettings();

    Object.entries(settings).forEach(([key, value]) => {
      const field = form.elements[key];
      if (!field) {
        return;
      }
      if (field.type === "checkbox") {
        field.checked = Boolean(value);
      } else {
        field.value = value;
      }
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      await saveSettings(readForm(form));
      status.textContent = "Saved.";
    });
  }

  init();
})();
