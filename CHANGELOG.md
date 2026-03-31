# Changelog

All notable changes to this project should be documented in this file.

## 0.1.1 - 2026-03-31

- Bumped the extension version from `0.1.0` to `0.1.1`.
- Added `.gitignore` rules for generated ZIP archives and local store asset files.
- Standardized local release packaging so generated archives are kept in `/zip` with the version in the filename.

## 0.1.0 - 2026-03-31

- Added inline pickup maps for supported Jimoty item pages.
- Parsed `受け渡し場所` content from listings and geocoded it with OpenStreetMap Nominatim.
- Added optional current-location display and distance estimation.
- Added Google Maps directions support with walking, transit, and driving modes.
- Added a photo-grid browsing mode for Jimoty sale results pages.
- Added popup and options settings for layout, language, directions mode, and geocoding behavior.
- Added English and Japanese localized extension metadata and UI strings.
- Refined the panel UI, moved the map above the details area, and updated the extension icon set.
- Prepared the extension for Chrome Web Store submission with icons, privacy policy text, and packaging cleanup.
