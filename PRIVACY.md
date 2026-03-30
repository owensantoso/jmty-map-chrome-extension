# Privacy Policy

JMty Pickup Map is designed to work on supported `jmty.jp` listing pages.

## Data this extension processes

- Listing page content on supported JMty pages, limited to the information needed to identify a likely pickup location.
- Extension settings saved with `chrome.storage.sync`.
- Geocoding cache saved with `chrome.storage.local`.
- Optional current location data, only when you explicitly enable the current-location feature.

## How the data is used

- Listing page content is parsed locally in your browser to detect candidate pickup text and related station or area names.
- The detected pickup query is sent to OpenStreetMap Nominatim to look up map coordinates.
- Map tiles are loaded from OpenStreetMap so the map can be displayed.
- Settings are stored so your preferred map behavior and language remain available across sessions.
- If you enable the current-location feature, the extension reads your location in the browser to show your position relative to the detected pickup point.

## Data sharing

- Pickup search queries are sent to OpenStreetMap Nominatim for geocoding.
- Map tile requests are sent to OpenStreetMap tile servers to render the map.
- The developer does not operate a backend service for this extension and does not receive your settings, browsing history, or location data directly.

## Data retention

- Settings remain in Chrome storage until you change them or remove the extension.
- Cached geocoding results remain in local extension storage until they are overwritten, cleared, or the extension is removed.

## Contact

For questions about this policy, open an issue in this repository:

https://github.com/owensantoso/jmty-map-chrome-extension/issues
