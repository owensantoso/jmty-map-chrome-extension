(function () {
  const NOMINATIM_GEOCODER = {
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

  const GOOGLE_GEOCODER = {
    name: "google",
    endpoint: "https://maps.googleapis.com/maps/api/geocode/json",
    buildUrl(query, settings) {
      const params = new URLSearchParams({
        address: query,
        key: settings.googleMapsApiKey,
        language: "ja",
        region: "jp"
      });
      return `${this.endpoint}?${params.toString()}`;
    },
    parseResponse(payload) {
      if (!payload || payload.status !== "OK" || !Array.isArray(payload.results) || !payload.results.length) {
        return null;
      }

      const result = payload.results[0];
      return {
        lat: Number(result.geometry.location.lat),
        lon: Number(result.geometry.location.lng),
        displayName: result.formatted_address,
        raw: result
      };
    }
  };

  function makeCacheKey(providerName, query) {
    return `geo:${providerName}:${query}`;
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

  async function getCachedResult(providerName, query) {
    const key = makeCacheKey(providerName, query);
    const stored = await storageGet("local", [key]);
    return stored[key] || null;
  }

  async function setCachedResult(providerName, query, value) {
    const key = makeCacheKey(providerName, query);
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

  function getGeocoderForSettings(settings) {
    if (settings.mapProvider === "google" && settings.googleMapsApiKey) {
      return GOOGLE_GEOCODER;
    }
    return NOMINATIM_GEOCODER;
  }

  async function geocodeQuery(query, provider, settings) {
    const cached = await getCachedResult(provider.name, query);
    if (cached) {
      return { ...cached, cached: true };
    }

    const payload = await requestJson(provider.buildUrl(query, settings));
    const mapped = provider.parseResponse
      ? provider.parseResponse(payload)
      : (Array.isArray(payload) && payload.length ? provider.mapResult(payload[0]) : null);

    if (!mapped) {
      return null;
    }

    await setCachedResult(provider.name, query, mapped);
    return { ...mapped, cached: false };
  }

  async function geocodePickup(parsedLocation, settings) {
    const provider = getGeocoderForSettings(settings);
    const queryParts = window.JmtyMapParse.buildLocationQueryParts(
      parsedLocation,
      settings.useContextInGeocoding
    );
    const customQuery = (parsedLocation.customQuery || "").trim();

    const queries = [
      customQuery,
      queryParts.join(" "),
      [parsedLocation.stationName, parsedLocation.areaName, "日本"].filter(Boolean).join(" "),
      [parsedLocation.stationName, "日本"].filter(Boolean).join(" "),
      [parsedLocation.rawLocationText, "日本"].filter(Boolean).join(" ")
    ].filter(Boolean);

    for (const query of Array.from(new Set(queries))) {
      const result = await geocodeQuery(query, provider, settings);
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
    NOMINATIM_GEOCODER,
    GOOGLE_GEOCODER,
    geocodePickup
  };
})();
