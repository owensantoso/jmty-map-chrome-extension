(function () {
  const DEFAULT_SETTINGS = {
    autoOpenMap: true,
    showCurrentLocationByDefault: false,
    panelPosition: "inline",
    mapHeight: "medium",
    useContextInGeocoding: true,
    uiLanguage: "auto"
  };

  const UI_STRINGS = {
    en: {
      title: "JMty Pickup Map",
      autoOpen: "Auto-open map",
      showLocation: "Show my location by default",
      panelPosition: "Panel position",
      mapHeight: "Map height",
      uiLanguage: "UI language",
      uiLanguageAuto: "Use Chrome language",
      context: "Use area and line in geocoding",
      note: "Reload the JMty tab after changing defaults.",
      openOptions: "Open full options"
    },
    ja: {
      title: "JMty 受け渡しマップ",
      autoOpen: "自動でマップを開く",
      showLocation: "デフォルトで現在地を表示する",
      panelPosition: "パネル位置",
      mapHeight: "マップの高さ",
      uiLanguage: "UI言語",
      uiLanguageAuto: "Chromeの言語に合わせる",
      context: "ジオコーディングで路線名と地域名を使う",
      note: "設定変更後はJMtyのタブを再読み込みしてください。",
      openOptions: "詳細オプションを開く"
    }
  };

  function detectUiLanguage() {
    const chromeLanguage = chrome.i18n && typeof chrome.i18n.getUILanguage === "function"
      ? chrome.i18n.getUILanguage()
      : "";
    const language = (chromeLanguage || navigator.language || "en").toLowerCase();
    return language.startsWith("ja") ? "ja" : "en";
  }

  function resolveUiLanguage(settings) {
    return settings.uiLanguage === "auto" ? detectUiLanguage() : settings.uiLanguage;
  }

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

  function formToSettings(form) {
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
    const strings = UI_STRINGS[resolveUiLanguage(settings)] || UI_STRINGS.en;
    document.getElementById("popup-title").textContent = strings.title;
    document.getElementById("popup-auto-open-label").lastChild.textContent = ` ${strings.autoOpen}`;
    document.getElementById("popup-show-location-label").lastChild.textContent = ` ${strings.showLocation}`;
    document.getElementById("popup-panel-position-label").childNodes[0].textContent = strings.panelPosition;
    document.getElementById("popup-map-height-label").childNodes[0].textContent = strings.mapHeight;
    document.getElementById("popup-ui-language-label").childNodes[0].textContent = strings.uiLanguage;
    document.querySelector('#popup-form select[name="uiLanguage"] option[value="auto"]').textContent = strings.uiLanguageAuto;
    document.getElementById("popup-context-label").lastChild.textContent = ` ${strings.context}`;
    document.getElementById("popup-note").textContent = strings.note;
    document.getElementById("popup-open-options").textContent = strings.openOptions;
  }

  async function init() {
    const form = document.getElementById("popup-form");
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

    form.addEventListener("change", () => {
      const nextSettings = formToSettings(form);
      saveSettings(nextSettings);
      renderLanguage(nextSettings);
    });
  }

  init();
})();
