# JMty Pickup Map

Minimal Chrome extension for JMty item pages. It detects the `受け渡し場所` section, extracts likely pickup text, geocodes it, and injects a small Leaflet map into the page.

## What it does

- Runs on JMty listing URLs such as `https://jmty.jp/tokyo/sale-hom/article-1o027i`
- Finds the `受け渡し場所` row from the page DOM
- Extracts:
  - `rawLocationText`
  - `areaName`
  - `lineName`
  - `stationName`
- Prefers the last station-like token ending in `駅`
- Geocodes using station + line + area when enabled
- Renders an inline or floating Leaflet map
- Shows the destination marker
- Optionally shows the current location marker
- Fits bounds when both markers exist
- Caches geocoding results in `chrome.storage.local`
- Stores user settings in `chrome.storage.sync`

## Files

- `/Users/macintoso/Documents/VSCode/jmty-map-chrome-extension/manifest.json`
- `/Users/macintoso/Documents/VSCode/jmty-map-chrome-extension/content.js`
- `/Users/macintoso/Documents/VSCode/jmty-map-chrome-extension/parse.js`
- `/Users/macintoso/Documents/VSCode/jmty-map-chrome-extension/geocode.js`
- `/Users/macintoso/Documents/VSCode/jmty-map-chrome-extension/map.js`
- `/Users/macintoso/Documents/VSCode/jmty-map-chrome-extension/popup.html`
- `/Users/macintoso/Documents/VSCode/jmty-map-chrome-extension/popup.js`
- `/Users/macintoso/Documents/VSCode/jmty-map-chrome-extension/options.html`
- `/Users/macintoso/Documents/VSCode/jmty-map-chrome-extension/options.js`
- `/Users/macintoso/Documents/VSCode/jmty-map-chrome-extension/styles.css`
- `/Users/macintoso/Documents/VSCode/jmty-map-chrome-extension/vendor/leaflet.js`
- `/Users/macintoso/Documents/VSCode/jmty-map-chrome-extension/vendor/leaflet.css`

## Load unpacked in Chrome

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click `Load unpacked`.
4. Select `/Users/macintoso/Documents/VSCode/jmty-map-chrome-extension`.

## Test on JMty

1. Open a JMty listing page that has a `受け渡し場所` section.
2. Reload the page after loading the extension.
3. Confirm the injected panel appears under the location row or as a floating card if that setting is enabled.
4. Toggle `Show my current location` to test geolocation.
5. Use the popup or options page to change defaults.

The saved sample page you attached contains:

- `西東京市 - 下保谷`
- `西武池袋線 - 保谷駅`

That should resolve to `保谷駅` as the preferred station candidate.

## Change tile provider later

Update `TILE_PROVIDER` in `/Users/macintoso/Documents/VSCode/jmty-map-chrome-extension/map.js`.

Current default:

- URL template: `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`
- Renderer: Leaflet tile layer

This was kept isolated so you can swap to another provider without changing the rest of the UI code.

## Change geocoder later

Update `DEFAULT_GEOCODER` in `/Users/macintoso/Documents/VSCode/jmty-map-chrome-extension/geocode.js`.

Current default:

- Provider: Nominatim
- Endpoint: `https://nominatim.openstreetmap.org/search`

The content script only calls `JmtyMapGeocode.geocodePickup`, so replacing the provider logic stays localized.

## Settings

Stored in `chrome.storage.sync`:

- `autoOpenMap`: default `true`
- `showCurrentLocationByDefault`: default `false`
- `panelPosition`: default `"inline"`
- `mapHeight`: default `"medium"`
- `useContextInGeocoding`: default `true`
- `uiLanguage`: default `"en"`

Geocoding cache is stored separately in `chrome.storage.local`.

## Assumptions and fragility

- TODO: The photo-grid list view still needs a follow-up pass to better normalize thumbnail sizing on some JMty result pages.
- TODO: Revisit Google Maps provider support later if you want a first-party Google map/geocoder path again.
- The parser is DOM-first and mainly depends on finding a table row whose label cell is exactly `受け渡し場所`.
- It intentionally avoids JMty hashed class names.
- If JMty changes the detail layout away from a label/value row, parsing may need adjustment.
- Station extraction is heuristic. It prefers the last `...駅` token because that matched the attached sample and is usually the most precise pickup hint.
- Geocoding uses OpenStreetMap Nominatim for MVP convenience. Public OSM infrastructure has usage limits, so this should be replaced for heavier use.
- Current location uses `navigator.geolocation` only when the user toggles it on or enables the default setting.
