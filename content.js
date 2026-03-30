(function () {
  const PANEL_ID = "jmty-pickup-map-panel";
  const DEFAULT_SETTINGS = {
    autoOpenMap: true,
    showCurrentLocationByDefault: false,
    panelPosition: "inline",
    mapHeight: "medium",
    useContextInGeocoding: true,
    listPhotoGridEnabled: true,
    uiLanguage: "auto"
  };

  const UI_STRINGS = {
    en: {
      pickupMap: "Pickup map",
      refresh: "Refresh",
      collapse: "Collapse",
      expand: "Expand",
      station: "Station",
      line: "Line",
      distance: "Distance",
      enableLocation: "Enable current location",
      waitingForBothPoints: "Waiting for both points",
      searchText: "Search text",
      searchThisText: "Search this text",
      showMyLocation: "Show my current location",
      openInGoogleMaps: "Open in Google Maps",
      preparingMap: "Preparing map…",
      geocodingPickup: "Geocoding pickup location…",
      notEnoughLocationText: "Could not find enough location text to geocode.",
      geocodingFailedPrefix: "Geocoding failed. Parsed:",
      destinationMappedVia: "Destination mapped via",
      cacheSuffix: " (cache)",
      requestCurrentLocation: "Requesting current location…",
      showingDestinationAndLocation: "Showing destination and current location.",
      currentLocationShown: "Current location shown.",
      currentLocationDenied: "Current location permission was denied.",
      currentLocationError: "Could not read current location.",
      stationUnknown: "Unknown",
      noLocationText: "No location text found",
      detectStationFailed: "Could not confidently detect station",
      photoFirstView: "Photo-first view",
      photoGridNote: "Larger thumbnails with a card grid for browsing",
      photoGrid: "Photo Grid",
      originalList: "Original List"
    },
    ja: {
      pickupMap: "受け渡しマップ",
      refresh: "再読み込み",
      collapse: "閉じる",
      expand: "開く",
      station: "駅",
      line: "路線",
      distance: "距離",
      enableLocation: "現在地を有効にしてください",
      waitingForBothPoints: "両方の地点を待機中",
      searchText: "検索テキスト",
      searchThisText: "このテキストで検索",
      showMyLocation: "現在地を表示",
      openInGoogleMaps: "Googleマップで開く",
      preparingMap: "マップを準備中…",
      geocodingPickup: "受け渡し場所をジオコーディング中…",
      notEnoughLocationText: "ジオコーディングに十分な位置情報が見つかりませんでした。",
      geocodingFailedPrefix: "ジオコーディングに失敗しました。解析結果:",
      destinationMappedVia: "マッピング元",
      cacheSuffix: "（キャッシュ）",
      requestCurrentLocation: "現在地を取得中…",
      showingDestinationAndLocation: "目的地と現在地を表示中です。",
      currentLocationShown: "現在地を表示しています。",
      currentLocationDenied: "現在地の許可が拒否されました。",
      currentLocationError: "現在地を取得できませんでした。",
      stationUnknown: "不明",
      noLocationText: "位置テキストが見つかりません",
      detectStationFailed: "駅を確実に判定できませんでした",
      photoFirstView: "写真優先ビュー",
      photoGridNote: "大きめのサムネイルで一覧を見やすくします",
      photoGrid: "写真グリッド",
      originalList: "元の一覧",
      useCurrentLocation: "現在地"
    }
  };

  function detectUiLanguage() {
    const chromeLanguage = chrome.i18n && typeof chrome.i18n.getUILanguage === "function"
      ? chrome.i18n.getUILanguage()
      : "";
    const language = (chromeLanguage || navigator.language || "en").toLowerCase();
    return language.startsWith("ja") ? "ja" : "en";
  }

  function getStrings(settings) {
    const language = settings.uiLanguage === "auto" ? detectUiLanguage() : settings.uiLanguage;
    return UI_STRINGS[language] || UI_STRINGS.en;
  }

  function getStorage(area, defaults) {
    return new Promise((resolve) => {
      chrome.storage[area].get(defaults, resolve);
    });
  }

  function setStorage(area, values) {
    return new Promise((resolve) => {
      chrome.storage[area].set(values, resolve);
    });
  }

  function isListingPage() {
    return /^\/[^/]+\/sale(?:-[^/]+)?\/article-/.test(location.pathname);
  }

  function isSearchResultsPage() {
    return /^\/[^/]+\/sale(?:\/p-\d+)?$/.test(location.pathname) && Boolean(document.querySelector(".p-articles-list"));
  }

  function createElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) {
      element.className = className;
    }
    if (typeof text === "string") {
      element.textContent = text;
    }
    return element;
  }

  function getInlineAnchor(parsed) {
    const row = parsed.rowElement;
    if (!row) {
      return null;
    }

    const table = row.closest("table");
    if (!table) {
      return row;
    }

    const sectionRoot =
      table.closest("section") ||
      table.closest("article") ||
      table.parentElement;

    if (sectionRoot && sectionRoot !== document.body) {
      return sectionRoot;
    }

    return table;
  }

  function placeInlinePanel(panel, parsed) {
    const anchor = getInlineAnchor(parsed);
    if (!anchor) {
      document.body.appendChild(panel);
      return;
    }

    if (anchor.parentNode) {
      anchor.insertAdjacentElement("afterend", panel);
    } else {
      document.body.appendChild(panel);
    }
  }

  function shouldForceFloating(panel) {
    const container = panel.parentElement;
    if (!container) {
      return false;
    }

    const width = container.getBoundingClientRect().width;
    return width > 0 && width < 560;
  }

  function ensureSinglePanel() {
    const existing = document.getElementById(PANEL_ID);
    if (existing) {
      existing.remove();
    }
  }

  function setStatus(statusNode, message, tone) {
    statusNode.textContent = message;
    statusNode.dataset.tone = tone || "muted";
  }

  function escapeHtml(value) {
    return (value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function updatePosition(panel, settings) {
    panel.dataset.position = settings.panelPosition;
  }

  function mapExternalUrl(query) {
    const params = new URLSearchParams({
      api: "1",
      destination: query,
      travelmode: "walking"
    });
    return `https://www.google.com/maps/dir/?${params.toString()}`;
  }

  function formatDistanceMeters(distanceMeters) {
    if (!Number.isFinite(distanceMeters)) {
      return "Unknown";
    }
    if (distanceMeters < 1000) {
      return `${Math.round(distanceMeters)} m`;
    }
    return `${(distanceMeters / 1000).toFixed(distanceMeters >= 10000 ? 0 : 1)} km`;
  }

  function haversineMeters(from, to) {
    const earthRadiusMeters = 6371000;
    const toRadians = (degrees) => (degrees * Math.PI) / 180;
    const dLat = toRadians(to.lat - from.lat);
    const dLon = toRadians(to.lon - from.lon);
    const fromLat = toRadians(from.lat);
    const toLat = toRadians(to.lat);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(fromLat) * Math.cos(toLat) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadiusMeters * c;
  }

  function getCurrentPosition() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported in this browser."));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => resolve(position),
        (error) => reject(error),
        {
          enableHighAccuracy: true,
          maximumAge: 60000,
          timeout: 10000
        }
      );
    });
  }

  function applyListPhotoGrid(enabled, listRoot, toggleButton, strings) {
    listRoot.classList.toggle("jmty-photo-grid-enabled", enabled);
    toggleButton.textContent = enabled ? strings.originalList : strings.photoGrid;
    toggleButton.setAttribute("aria-pressed", enabled ? "true" : "false");
  }

  async function initListPageEnhancer() {
    if (!isSearchResultsPage()) {
      return false;
    }

    const listRoot = document.querySelector(".p-articles-list");
    const listItems = listRoot ? Array.from(listRoot.querySelectorAll(".p-articles-list-item")) : [];
    if (!listRoot || !listItems.length) {
      return false;
    }

    const settings = await getStorage("sync", DEFAULT_SETTINGS);
    const strings = getStrings(settings);
    const heading = document.querySelector(".p-articles-list-title");
    const toolbar = createElement("div", "jmty-photo-grid-toolbar");
    const title = createElement("div", "jmty-photo-grid-label", strings.photoFirstView);
    const subtitle = createElement("div", "jmty-photo-grid-note", strings.photoGridNote);
    const copy = createElement("div", "jmty-photo-grid-copy");
    copy.append(title, subtitle);

    const toggleButton = createElement(
      "button",
      "jmty-map-button jmty-map-button-secondary jmty-photo-grid-toggle",
      strings.photoGrid
    );
    toggleButton.type = "button";

    toolbar.append(copy, toggleButton);
    if (heading) {
      heading.insertAdjacentElement("afterend", toolbar);
    } else {
      listRoot.parentElement.insertBefore(toolbar, listRoot);
    }

    applyListPhotoGrid(Boolean(settings.listPhotoGridEnabled), listRoot, toggleButton, strings);

    toggleButton.addEventListener("click", async () => {
      const nextEnabled = !listRoot.classList.contains("jmty-photo-grid-enabled");
      applyListPhotoGrid(nextEnabled, listRoot, toggleButton, strings);
      await setStorage("sync", {
        listPhotoGridEnabled: nextEnabled
      });
    });

    return true;
  }

  async function buildPanel(parsed, settings) {
    ensureSinglePanel();
    const strings = getStrings(settings);

    const panel = createElement("section", "jmty-map-panel");
    panel.id = PANEL_ID;
    updatePosition(panel, settings);

    const header = createElement("div", "jmty-map-header");
    const titleBlock = createElement("div", "jmty-map-title-block");
    titleBlock.appendChild(createElement("div", "jmty-map-kicker", strings.pickupMap));
    titleBlock.appendChild(
      createElement(
        "h3",
        "jmty-map-title",
        parsed.stationName || strings.detectStationFailed
      )
    );

    const actions = createElement("div", "jmty-map-header-actions");
    const refreshButton = createElement("button", "jmty-map-button jmty-map-button-secondary", strings.refresh);
    refreshButton.type = "button";
    const collapseButton = createElement(
      "button",
      "jmty-map-button jmty-map-button-secondary",
      settings.autoOpenMap ? strings.collapse : strings.expand
    );
    collapseButton.type = "button";

    actions.append(refreshButton, collapseButton);
    header.append(titleBlock, actions);

    const body = createElement("div", "jmty-map-body");
    if (!settings.autoOpenMap) {
      body.hidden = true;
    }

    const metaGrid = createElement("div", "jmty-map-meta");
    const stationMeta = createElement("div", "jmty-map-meta-row");
    stationMeta.innerHTML = `<span>${strings.station}</span><strong>${parsed.stationName || strings.stationUnknown}</strong>`;
    const lineMeta = createElement("div", "jmty-map-meta-row");
    lineMeta.innerHTML = `<span>${strings.line}</span><strong>${parsed.lineName || strings.stationUnknown}</strong>`;
    const distanceMeta = createElement("div", "jmty-map-meta-row");
    distanceMeta.innerHTML = `<span>${strings.distance}</span><strong>${strings.enableLocation}</strong>`;
    const rawMeta = createElement("div", "jmty-map-meta-row jmty-map-meta-row-wide");
    rawMeta.innerHTML = `
      <span>${strings.searchText}</span>
      <textarea class="jmty-map-query-input" rows="3">${escapeHtml(parsed.rawLocationText || "")}</textarea>
      <div class="jmty-map-query-actions">
        <button type="button" class="jmty-map-button jmty-map-button-secondary jmty-map-search-button">${strings.searchThisText}</button>
      </div>
    `;
    metaGrid.append(stationMeta, lineMeta, distanceMeta, rawMeta);
    const rawQueryInput = rawMeta.querySelector(".jmty-map-query-input");
    const searchButton = rawMeta.querySelector(".jmty-map-search-button");
    const distanceValue = distanceMeta.querySelector("strong");

    const toolbar = createElement("div", "jmty-map-toolbar");
    const currentLocationLabel = createElement("label", "jmty-map-toggle");
    const currentLocationCheckbox = document.createElement("input");
    currentLocationCheckbox.type = "checkbox";
    currentLocationCheckbox.checked = settings.showCurrentLocationByDefault;
    const toggleText = createElement("span", "", strings.showMyLocation);
    currentLocationLabel.append(currentLocationCheckbox, toggleText);

    const externalLink = createElement("a", "jmty-map-button jmty-map-button-link", strings.openInGoogleMaps);
    externalLink.target = "_blank";
    externalLink.rel = "noreferrer";
    externalLink.href = "#";
    externalLink.hidden = true;

    toolbar.append(currentLocationLabel, externalLink);

    const statusNode = createElement("div", "jmty-map-status", strings.preparingMap);
    const mapMount = createElement("div", "jmty-map-mount");
    const retryButton = createElement("button", "jmty-map-button jmty-map-button-secondary jmty-map-retry", strings.refresh);
    retryButton.type = "button";
    retryButton.hidden = true;

    body.append(metaGrid, toolbar, statusNode, mapMount, retryButton);
    panel.append(header, body);

    if (settings.panelPosition === "inline") {
      placeInlinePanel(panel, parsed);
      if (shouldForceFloating(panel)) {
        panel.remove();
        panel.dataset.position = "floating";
        document.body.appendChild(panel);
      }
    } else {
      document.body.appendChild(panel);
    }

    const mapController = window.JmtyMapView.createMapController(mapMount, settings.mapHeight);
    mapController.invalidateSize();

    let destinationResult = null;
    let currentLocationResult = null;
    let activeParsed = {
      ...parsed,
      customQuery: ""
    };

    function updateDistanceMeta() {
      if (!distanceValue) {
        return;
      }

      if (!destinationResult || !currentLocationResult) {
        distanceValue.textContent = currentLocationCheckbox.checked
          ? strings.waitingForBothPoints
          : strings.enableLocation;
        mapController.setDistanceBadge("");
        return;
      }

      const formattedDistance = formatDistanceMeters(
        haversineMeters(currentLocationResult, destinationResult)
      );
      distanceValue.textContent = formattedDistance;
      mapController.setDistanceBadge(formattedDistance);
    }

    async function refreshDestination() {
      retryButton.hidden = true;
      setStatus(statusNode, strings.geocodingPickup, "muted");

      const editedQuery = rawQueryInput ? rawQueryInput.value.trim() : "";
      activeParsed = {
        ...parsed,
        rawLocationText: editedQuery || parsed.rawLocationText,
        customQuery: editedQuery || ""
      };

      if (!activeParsed.stationName && !activeParsed.rawLocationText) {
        setStatus(statusNode, strings.notEnoughLocationText, "error");
        return;
      }

      try {
        destinationResult = await window.JmtyMapGeocode.geocodePickup(activeParsed, settings);
      } catch (error) {
        setStatus(statusNode, error.message || "Geocoding failed.", "error");
        retryButton.hidden = false;
        return;
      }

      if (!destinationResult) {
        setStatus(
          statusNode,
          `${strings.geocodingFailedPrefix} ${activeParsed.stationName || activeParsed.rawLocationText || strings.stationUnknown}`,
          "error"
        );
        retryButton.hidden = false;
        return;
      }

      mapController.setDestination(
        destinationResult,
        activeParsed.stationName || activeParsed.rawLocationText || "Pickup location"
      );
      updateDistanceMeta();
      externalLink.href = mapExternalUrl(destinationResult.query || activeParsed.rawLocationText);
      externalLink.hidden = false;
      setStatus(
        statusNode,
        `${strings.destinationMappedVia} ${destinationResult.provider}${destinationResult.cached ? strings.cacheSuffix : ""}.`,
        "success"
      );
    }

    async function syncCurrentLocation() {
      if (!currentLocationCheckbox.checked) {
        currentLocationResult = null;
        mapController.clearCurrentLocation();
        updateDistanceMeta();
        return;
      }

      setStatus(statusNode, strings.requestCurrentLocation, "muted");

      try {
        const position = await getCurrentPosition();
        currentLocationResult = {
          lat: position.coords.latitude,
          lon: position.coords.longitude
        };
        mapController.setCurrentLocation(
          currentLocationResult,
          "Your current location"
        );
        updateDistanceMeta();
        if (destinationResult) {
          setStatus(statusNode, strings.showingDestinationAndLocation, "success");
        } else {
          setStatus(statusNode, strings.currentLocationShown, "success");
        }
      } catch (error) {
        currentLocationCheckbox.checked = false;
        currentLocationResult = null;
        mapController.clearCurrentLocation();
        updateDistanceMeta();
        setStatus(
          statusNode,
          error.code === 1
            ? strings.currentLocationDenied
            : (error.message || strings.currentLocationError),
          "error"
        );
      }
    }

    refreshButton.addEventListener("click", async () => {
      const latestSettings = await getStorage("sync", DEFAULT_SETTINGS);
      const latestParsed = window.JmtyMapParse.parseLocationSection();
      if (!latestParsed.found) {
        setStatus(statusNode, latestParsed.error, "error");
        return;
      }
      panel.remove();
      buildPanel(latestParsed, latestSettings);
    });

    collapseButton.addEventListener("click", () => {
      body.hidden = !body.hidden;
      collapseButton.textContent = body.hidden ? strings.expand : strings.collapse;
      if (!body.hidden) {
        mapController.invalidateSize();
      }
    });

    currentLocationCheckbox.addEventListener("change", async () => {
      await setStorage("sync", {
        showCurrentLocationByDefault: currentLocationCheckbox.checked
      });
      syncCurrentLocation();
    });

    retryButton.addEventListener("click", () => {
      refreshDestination();
    });

    if (searchButton) {
      searchButton.addEventListener("click", () => {
        refreshDestination();
      });
    }

    if (rawQueryInput) {
      rawQueryInput.addEventListener("keydown", (event) => {
        if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
          event.preventDefault();
          refreshDestination();
        }
      });
    }

    if (!parsed.stationName) {
        setStatus(
          statusNode,
        `${strings.detectStationFailed}. ${parsed.rawLocationText || ""}`,
        "warning"
      );
    }

    await refreshDestination();

    if (currentLocationCheckbox.checked) {
      await syncCurrentLocation();
    }
  }

  async function init() {
    const handledListPage = await initListPageEnhancer();
    if (handledListPage) {
      return;
    }

    if (!isListingPage()) {
      return;
    }

    let parsed = null;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      parsed = window.JmtyMapParse.parseLocationSection();
      if (parsed.found) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    if (!parsed || !parsed.found) {
      return;
    }

    const settings = await getStorage("sync", DEFAULT_SETTINGS);
    await buildPanel(parsed, settings);
  }

  init();
})();
