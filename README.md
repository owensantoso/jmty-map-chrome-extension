# JMty Pickup Map

Chrome extension for JMty pages that detects likely pickup locations from the `受け渡し場所` section and shows them on an inline map.

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

## Install locally

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click `Load unpacked`.
4. Select this repository folder.

## Usage

1. Open a JMty listing page that has a `受け渡し場所` section.
2. Reload the page after loading the extension.
3. Confirm the injected panel appears under the location row or as a floating card if that setting is enabled.
4. Toggle `Show my current location` to test geolocation.
5. Use the popup or options page to change defaults.

## Settings

Stored in `chrome.storage.sync`:

- `autoOpenMap`: default `true`
- `showCurrentLocationByDefault`: default `false`
- `panelPosition`: default `"inline"`
- `mapHeight`: default `"medium"`
- `directionsMode`: default `"walking"`
- `useContextInGeocoding`: default `true`
- `listPhotoGridEnabled`: default `true`
- `uiLanguage`: default `"auto"` (follows Chrome UI language, with manual override)

Geocoding cache is stored separately in `chrome.storage.local`.

## Development notes

- Map rendering uses Leaflet with OpenStreetMap tiles.
- Geocoding currently uses OpenStreetMap Nominatim.
- The tile provider is isolated in `map.js`.
- The geocoder implementation is isolated in `geocode.js`.

## Limitations

- The parser is DOM-first and mainly depends on finding a table row whose label cell is exactly `受け渡し場所`.
- It intentionally avoids JMty hashed class names.
- If JMty changes the detail layout away from a label/value row, parsing may need adjustment.
- Station extraction is heuristic. It prefers the last `...駅` token because that matched the attached sample and is usually the most precise pickup hint.
- Geocoding uses OpenStreetMap Nominatim for MVP convenience. Public OSM infrastructure has usage limits, so this should be replaced for heavier use.
- Current location uses `navigator.geolocation` only when the user toggles it on or enables the default setting.

## TODO

- Improve thumbnail normalization for the photo-grid view on more JMty result-page layouts.
- Consider adding an alternative map and geocoding provider for heavier production use.
