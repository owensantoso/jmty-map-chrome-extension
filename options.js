(function () {
  const DEFAULT_SETTINGS = {
    autoOpenMap: true,
    showCurrentLocationByDefault: false,
    panelPosition: "inline",
    mapHeight: "medium",
    useContextInGeocoding: true,
    uiLanguage: "auto",
    directionsMode: "walking"
  };

  const UI_STRINGS = {
    en: {
      title: "Jimoty Pickup Map Options",
      note: "Settings are stored with chrome.storage.sync.",
      autoOpen: "Auto-open map on supported Jimoty listing pages",
      showLocation: "Try to show my current location by default",
      panelPosition: "Panel position",
      mapHeight: "Map height",
      directionsMode: "Directions mode",
      uiLanguage: "UI language",
      uiLanguageAuto: "Use Chrome language",
      directionsWalking: "Walking",
      directionsTransit: "Transit",
      directionsCar: "Car",
      context: "Use line and area context when geocoding",
      save: "Save settings",
      saved: "Saved.",
      unsaved: "Unsaved changes"
    },
    ja: {
      title: "ジモティー受け渡しマップ設定",
      note: "設定は chrome.storage.sync に保存されます。",
      autoOpen: "対応するジモティーの商品ページで自動的にマップを開く",
      showLocation: "デフォルトで現在地の表示を試みる",
      panelPosition: "パネル位置",
      mapHeight: "マップの高さ",
      directionsMode: "経路モード",
      uiLanguage: "UI言語",
      uiLanguageAuto: "Chromeの言語に合わせる",
      directionsWalking: "徒歩",
      directionsTransit: "公共交通",
      directionsCar: "車",
      context: "ジオコーディングで路線名と地域名を使う",
      save: "設定を保存",
      saved: "保存しました。",
      unsaved: "未保存の変更があります"
    }
  };

  function settingsEqual(left, right) {
    return JSON.stringify(left) === JSON.stringify(right);
  }

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

  function readForm(form) {
    return {
      autoOpenMap: form.autoOpenMap.checked,
      showCurrentLocationByDefault: form.showCurrentLocationByDefault.checked,
      panelPosition: form.panelPosition.value,
      mapHeight: form.mapHeight.value,
      directionsMode: form.directionsMode.value,
      useContextInGeocoding: form.useContextInGeocoding.checked,
      uiLanguage: form.uiLanguage.value
    };
  }

  function renderLanguage(settings) {
    const strings = UI_STRINGS[resolveUiLanguage(settings)] || UI_STRINGS.en;
    document.getElementById("options-title").textContent = strings.title;
    document.getElementById("options-note").textContent = strings.note;
    document.querySelector("#options-auto-open-label .jmty-label-text").textContent = strings.autoOpen;
    document.querySelector("#options-show-location-label .jmty-label-text").textContent = strings.showLocation;
    document.querySelector("#options-panel-position-label .jmty-label-text").textContent = strings.panelPosition;
    document.querySelector("#options-map-height-label .jmty-label-text").textContent = strings.mapHeight;
    document.querySelector("#options-directions-mode-label .jmty-label-text").textContent = strings.directionsMode;
    document.querySelector("#options-ui-language-label .jmty-label-text").textContent = strings.uiLanguage;
    document.querySelector('#options-form select[name="uiLanguage"] option[value="auto"]').textContent = strings.uiLanguageAuto;
    document.querySelector('#options-form select[name="directionsMode"] option[value="walking"]').textContent = strings.directionsWalking;
    document.querySelector('#options-form select[name="directionsMode"] option[value="transit"]').textContent = strings.directionsTransit;
    document.querySelector('#options-form select[name="directionsMode"] option[value="car"]').textContent = strings.directionsCar;
    document.querySelector("#options-context-label .jmty-label-text").textContent = strings.context;
    document.getElementById("save-options").textContent = strings.save;
  }

  async function init() {
    const form = document.getElementById("options-form");
    const status = document.getElementById("options-status");
    const saveButton = document.getElementById("save-options");
    const settings = await getSettings();
    let savedSettings = { ...settings };
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

    function syncDirtyState() {
      const currentSettings = readForm(form);
      const strings = UI_STRINGS[resolveUiLanguage(currentSettings)] || UI_STRINGS.en;
      const isDirty = !settingsEqual(currentSettings, savedSettings);
      saveButton.disabled = !isDirty;
      status.textContent = isDirty ? strings.unsaved : "";
      status.dataset.tone = isDirty ? "warning" : "muted";
    }

    syncDirtyState();

    form.addEventListener("input", () => {
      renderLanguage(readForm(form));
      syncDirtyState();
    });

    form.addEventListener("change", () => {
      renderLanguage(readForm(form));
      syncDirtyState();
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const nextSettings = readForm(form);
      await saveSettings(nextSettings);
      savedSettings = { ...nextSettings };
      renderLanguage(nextSettings);
      const strings = UI_STRINGS[resolveUiLanguage(nextSettings)] || UI_STRINGS.en;
      status.textContent = strings.saved;
      status.dataset.tone = "success";
      saveButton.disabled = true;
    });
  }

  init();
})();
