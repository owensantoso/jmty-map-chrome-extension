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
      title: "Jimoty Pickup Map",
      autoOpen: "Auto-open map",
      showLocation: "Show my location by default",
      panelPosition: "Panel position",
      mapHeight: "Map height",
      directionsMode: "Directions mode",
      uiLanguage: "UI language",
      uiLanguageAuto: "Use Chrome language",
      directionsWalking: "Walking",
      directionsTransit: "Transit",
      directionsCar: "Car",
      context: "Use area and line in geocoding",
      note: "Reload the Jimoty tab after changing defaults.",
      openOptions: "Open full options"
    },
    ja: {
      title: "ジモティー受け渡しマップ",
      autoOpen: "自動でマップを開く",
      showLocation: "デフォルトで現在地を表示する",
      panelPosition: "パネル位置",
      mapHeight: "マップの高さ",
      directionsMode: "経路モード",
      uiLanguage: "UI言語",
      uiLanguageAuto: "Chromeの言語に合わせる",
      directionsWalking: "徒歩",
      directionsTransit: "公共交通",
      directionsCar: "車",
      context: "ジオコーディングで路線名と地域名を使う",
      note: "設定変更後はジモティーのタブを再読み込みしてください。",
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
      directionsMode: form.directionsMode.value,
      useContextInGeocoding: form.useContextInGeocoding.checked,
      uiLanguage: form.uiLanguage.value
    };
  }

  function renderLanguage(settings) {
    const strings = UI_STRINGS[resolveUiLanguage(settings)] || UI_STRINGS.en;
    document.getElementById("popup-title").textContent = strings.title;
    document.querySelector("#popup-auto-open-label .jmty-label-text").textContent = strings.autoOpen;
    document.querySelector("#popup-show-location-label .jmty-label-text").textContent = strings.showLocation;
    document.querySelector("#popup-panel-position-label .jmty-label-text").textContent = strings.panelPosition;
    document.querySelector("#popup-map-height-label .jmty-label-text").textContent = strings.mapHeight;
    document.querySelector("#popup-directions-mode-label .jmty-label-text").textContent = strings.directionsMode;
    document.querySelector("#popup-ui-language-label .jmty-label-text").textContent = strings.uiLanguage;
    document.querySelector('#popup-form select[name="uiLanguage"] option[value="auto"]').textContent = strings.uiLanguageAuto;
    document.querySelector('#popup-form select[name="directionsMode"] option[value="walking"]').textContent = strings.directionsWalking;
    document.querySelector('#popup-form select[name="directionsMode"] option[value="transit"]').textContent = strings.directionsTransit;
    document.querySelector('#popup-form select[name="directionsMode"] option[value="car"]').textContent = strings.directionsCar;
    document.querySelector("#popup-context-label .jmty-label-text").textContent = strings.context;
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
