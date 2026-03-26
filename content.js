(function () {
  const PANEL_ID = "jmty-pickup-map-panel";
  const DEFAULT_SETTINGS = {
    autoOpenMap: true,
    showCurrentLocationByDefault: false,
    panelPosition: "inline",
    mapHeight: "medium",
    useContextInGeocoding: true
  };

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

  function mapExternalUrl(result) {
    const target = encodeURIComponent(result.displayName || `${result.lat},${result.lon}`);
    return `https://www.openstreetmap.org/search?query=${target}`;
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

  async function buildPanel(parsed, settings) {
    ensureSinglePanel();

    const panel = createElement("section", "jmty-map-panel");
    panel.id = PANEL_ID;
    updatePosition(panel, settings);

    const header = createElement("div", "jmty-map-header");
    const titleBlock = createElement("div", "jmty-map-title-block");
    titleBlock.appendChild(createElement("div", "jmty-map-kicker", "Pickup map"));
    titleBlock.appendChild(
      createElement(
        "h3",
        "jmty-map-title",
        parsed.stationName || "Could not confidently detect station"
      )
    );

    const actions = createElement("div", "jmty-map-header-actions");
    const refreshButton = createElement("button", "jmty-map-button jmty-map-button-secondary", "Refresh");
    refreshButton.type = "button";
    const collapseButton = createElement(
      "button",
      "jmty-map-button jmty-map-button-secondary",
      settings.autoOpenMap ? "Collapse" : "Expand"
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
    stationMeta.innerHTML = `<span>Station</span><strong>${parsed.stationName || "Unknown"}</strong>`;
    const lineMeta = createElement("div", "jmty-map-meta-row");
    lineMeta.innerHTML = `<span>Line</span><strong>${parsed.lineName || "Unknown"}</strong>`;
    const distanceMeta = createElement("div", "jmty-map-meta-row");
    distanceMeta.innerHTML = `<span>Distance</span><strong>Enable current location</strong>`;
    const rawMeta = createElement("div", "jmty-map-meta-row jmty-map-meta-row-wide");
    rawMeta.innerHTML = `
      <span>Search Text</span>
      <textarea class="jmty-map-query-input" rows="3">${escapeHtml(parsed.rawLocationText || "")}</textarea>
      <div class="jmty-map-query-actions">
        <button type="button" class="jmty-map-button jmty-map-button-secondary jmty-map-search-button">Search this text</button>
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
    const toggleText = createElement("span", "", "Show my current location");
    currentLocationLabel.append(currentLocationCheckbox, toggleText);

    const externalLink = createElement("a", "jmty-map-button jmty-map-button-link", "Open in maps");
    externalLink.target = "_blank";
    externalLink.rel = "noreferrer";
    externalLink.href = "#";
    externalLink.hidden = true;

    toolbar.append(currentLocationLabel, externalLink);

    const statusNode = createElement("div", "jmty-map-status", "Preparing map…");
    const mapMount = createElement("div", "jmty-map-mount");
    const retryButton = createElement("button", "jmty-map-button jmty-map-button-secondary jmty-map-retry", "Retry geocoding");
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
          ? "Waiting for both points"
          : "Enable current location";
        return;
      }

      distanceValue.textContent = formatDistanceMeters(
        haversineMeters(currentLocationResult, destinationResult)
      );
    }

    async function refreshDestination() {
      retryButton.hidden = true;
      setStatus(statusNode, "Geocoding pickup location…", "muted");

      const editedQuery = rawQueryInput ? rawQueryInput.value.trim() : "";
      activeParsed = {
        ...parsed,
        rawLocationText: editedQuery || parsed.rawLocationText,
        customQuery: editedQuery || ""
      };

      if (!activeParsed.stationName && !activeParsed.rawLocationText) {
        setStatus(statusNode, "Could not find enough location text to geocode.", "error");
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
          `Geocoding failed. Parsed: ${activeParsed.stationName || activeParsed.rawLocationText || "unknown location"}`,
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
      externalLink.href = mapExternalUrl(destinationResult);
      externalLink.hidden = false;
      setStatus(
        statusNode,
        `Destination mapped via ${destinationResult.provider}${destinationResult.cached ? " (cache)" : ""}.`,
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

      setStatus(statusNode, "Requesting current location…", "muted");

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
          setStatus(statusNode, "Showing destination and current location.", "success");
        } else {
          setStatus(statusNode, "Current location shown.", "success");
        }
      } catch (error) {
        currentLocationCheckbox.checked = false;
        currentLocationResult = null;
        mapController.clearCurrentLocation();
        updateDistanceMeta();
        setStatus(
          statusNode,
          error.code === 1
            ? "Current location permission was denied."
            : (error.message || "Could not read current location."),
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
      collapseButton.textContent = body.hidden ? "Expand" : "Collapse";
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
        `Could not confidently detect station. Raw text: ${parsed.rawLocationText || "none"}`,
        "warning"
      );
    }

    await refreshDestination();

    if (currentLocationCheckbox.checked) {
      await syncCurrentLocation();
    }
  }

  async function init() {
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
