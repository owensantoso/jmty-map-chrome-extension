(function () {
  const DEFAULT_GEOCODER = {
    name: "nominatim",
    endpoint: "https://nominatim.openstreetmap.org/search",
    buildUrl(query) {
      const params = new URLSearchParams({
        q: query,
        format: "jsonv2",
        limit: "1",
        countrycodes: "jp",
        addressdetails: "1"
      });
      return `${this.endpoint}?${params.toString()}`;
    },
    mapResult(result) {
      return {
        lat: Number(result.lat),
        lon: Number(result.lon),
        displayName: result.display_name,
        raw: result
      };
    }
  };

  function makeCacheKey(query) {
    return `geo:${query}`;
  }

  function storageGet(area, keys) {
    return new Promise((resolve) => {
      chrome.storage[area].get(keys, resolve);
    });
  }

  function storageSet(area, values) {
    return new Promise((resolve) => {
      chrome.storage[area].set(values, resolve);
    });
  }

  async function getCachedResult(query) {
    const key = makeCacheKey(query);
    const stored = await storageGet("local", [key]);
    return stored[key] || null;
  }

  async function setCachedResult(query, value) {
    const key = makeCacheKey(query);
    await storageSet("local", { [key]: value });
  }

  async function requestJson(url) {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`Geocoder request failed with status ${response.status}`);
    }

    return response.json();
  }

  async function geocodeQuery(query, provider) {
    const cached = await getCachedResult(query);
    if (cached) {
      return { ...cached, cached: true };
    }

    const results = await requestJson(provider.buildUrl(query));
    if (!Array.isArray(results) || !results.length) {
      return null;
    }

    const mapped = provider.mapResult(results[0]);
    await setCachedResult(query, mapped);
    return { ...mapped, cached: false };
  }

  async function geocodePickup(parsedLocation, settings) {
    const provider = DEFAULT_GEOCODER;
    const queryParts = window.JmtyMapParse.buildLocationQueryParts(
      parsedLocation,
      settings.useContextInGeocoding
    );

    const queries = [
      queryParts.join(" "),
      [parsedLocation.stationName, parsedLocation.areaName, "日本"].filter(Boolean).join(" "),
      [parsedLocation.stationName, "日本"].filter(Boolean).join(" "),
      [parsedLocation.rawLocationText, "日本"].filter(Boolean).join(" ")
    ].filter(Boolean);

    for (const query of Array.from(new Set(queries))) {
      const result = await geocodeQuery(query, provider);
      if (result) {
        return {
          ...result,
          provider: provider.name,
          query
        };
      }
    }

    return null;
  }

  window.JmtyMapGeocode = {
    DEFAULT_GEOCODER,
    geocodePickup
  };
})();
