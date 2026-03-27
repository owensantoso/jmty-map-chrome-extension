(function () {
  const DEFAULT_SETTINGS = {
    autoOpenMap: true,
    showCurrentLocationByDefault: false,
    panelPosition: "inline",
    mapHeight: "medium",
    useContextInGeocoding: true,
    uiLanguage: "en"
  };

  const UI_STRINGS = {
    en: {
      title: "JMty Pickup Map Options",
      note: "Settings are stored with chrome.storage.sync.",
      autoOpen: "Auto-open map on supported JMty listing pages",
      showLocation: "Try to show my current location by default",
      panelPosition: "Panel position",
      mapHeight: "Map height",
      uiLanguage: "UI language",
      context: "Use line and area context when geocoding",
      save: "Save settings",
      saved: "Saved."
    },
    ja: {
      title: "JMty 受け渡しマップ設定",
      note: "設定は chrome.storage.sync に保存されます。",
      autoOpen: "対応するJMtyページで自動的にマップを開く",
      showLocation: "デフォルトで現在地の表示を試みる",
      panelPosition: "パネル位置",
      mapHeight: "マップの高さ",
      uiLanguage: "UI言語",
      context: "ジオコーディングで路線名と地域名を使う",
      save: "設定を保存",
      saved: "保存しました。"
    }
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
      useContextInGeocoding: form.useContextInGeocoding.checked,
      uiLanguage: form.uiLanguage.value
    };
  }

  function renderLanguage(settings) {
    const strings = UI_STRINGS[settings.uiLanguage] || UI_STRINGS.en;
    document.getElementById("options-title").textContent = strings.title;
    document.getElementById("options-note").textContent = strings.note;
    document.getElementById("options-auto-open-label").lastChild.textContent = ` ${strings.autoOpen}`;
    document.getElementById("options-show-location-label").lastChild.textContent = ` ${strings.showLocation}`;
    document.getElementById("options-panel-position-label").childNodes[0].textContent = strings.panelPosition;
    document.getElementById("options-map-height-label").childNodes[0].textContent = strings.mapHeight;
    document.getElementById("options-ui-language-label").childNodes[0].textContent = strings.uiLanguage;
    document.getElementById("options-context-label").lastChild.textContent = ` ${strings.context}`;
    document.getElementById("save-options").textContent = strings.save;
  }

  async function init() {
    const form = document.getElementById("options-form");
    const status = document.getElementById("options-status");
    const settings = await getSettings();
    renderLanguage(settings);

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
      const nextSettings = readForm(form);
      await saveSettings(nextSettings);
      renderLanguage(nextSettings);
      const strings = UI_STRINGS[nextSettings.uiLanguage] || UI_STRINGS.en;
      status.textContent = strings.saved;
    });
  }

  init();
})();
