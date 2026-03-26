(function () {
  const STATION_PATTERN = /([^\s、,()/]+駅)/g;
  const LINE_PATTERN = /([^\s、,()/]+線)/g;
  const LOCATION_LABEL = "受け渡し場所";

  function normalizeText(value) {
    return (value || "")
      .replace(/\u00a0/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function splitLocationLines(text) {
    return normalizeText(text)
      .split(/\s*\/\s*|\s{2,}|\n+/)
      .map(normalizeText)
      .filter(Boolean);
  }

  function unique(list) {
    return Array.from(new Set(list.filter(Boolean)));
  }

  function firstAreaToken(value) {
    const normalized = normalizeText(value);
    if (!normalized) {
      return "";
    }

    return normalized
      .split(/\s*-\s*/)
      .map(normalizeText)
      .filter(Boolean)[0] || "";
  }

  function collectTextSegments(locationCell) {
    const directLines = [];
    const blockCandidates = locationCell.querySelectorAll("div, p, li");

    blockCandidates.forEach((node) => {
      const text = normalizeText(node.textContent);
      if (!text || text === LOCATION_LABEL) {
        return;
      }
      if (text.length > 120) {
        return;
      }
      directLines.push(text);
    });

    if (!directLines.length) {
      directLines.push(normalizeText(locationCell.textContent));
    }

    return unique(
      directLines.flatMap((line) => splitLocationLines(line))
    );
  }

  function findLocationCell() {
    const rows = document.querySelectorAll("tr");
    for (const row of rows) {
      const cells = row.querySelectorAll("td, th");
      if (cells.length < 2) {
        continue;
      }
      const labelCell = cells[0];
      if (normalizeText(labelCell.textContent) !== LOCATION_LABEL) {
        continue;
      }
      return {
        row,
        labelCell,
        locationCell: cells[1]
      };
    }

    const fallbackLabel = Array.from(document.querySelectorAll("td, th, dt, div, span"))
      .find((node) => normalizeText(node.textContent) === LOCATION_LABEL);
    if (!fallbackLabel) {
      return null;
    }

    const sibling = fallbackLabel.nextElementSibling;
    if (!sibling) {
      return null;
    }

    return {
      row: fallbackLabel.closest("tr") || fallbackLabel.parentElement,
      labelCell: fallbackLabel,
      locationCell: sibling
    };
  }

  function extractMatches(lines, pattern) {
    const matches = [];
    lines.forEach((line) => {
      const found = line.match(pattern);
      if (found) {
        matches.push(...found.map(normalizeText));
      }
    });
    return unique(matches);
  }

  function findStationFromLinks(locationCell) {
    const stationLinks = Array.from(locationCell.querySelectorAll("a"))
      .map((link) => normalizeText(link.textContent))
      .filter((text) => text.endsWith("駅"));
    return stationLinks.at(-1) || "";
  }

  function findLineFromLines(lines) {
    for (const line of lines) {
      const lineMatch = line.match(LINE_PATTERN);
      if (lineMatch && lineMatch.length) {
        return normalizeText(lineMatch.at(-1));
      }
    }
    return "";
  }

  function findAreaName(lines, locationCell) {
    const areaLinks = Array.from(locationCell.querySelectorAll("a"))
      .filter((link) => /\/a-\d+-/.test(link.getAttribute("href") || ""))
      .map((link) => normalizeText(link.textContent));

    const firstNonRailLine = lines.find((line) => !line.includes("線") && !line.includes("駅"));
    if (firstNonRailLine) {
      return firstNonRailLine;
    }

    if (areaLinks.length) {
      return areaLinks.join(" - ");
    }

    return lines[0] || "";
  }

  function buildLocationQueryParts(parsed, useContextInGeocoding) {
    const parts = [];
    if (parsed.stationName) {
      parts.push(parsed.stationName);
    }
    if (useContextInGeocoding && parsed.lineName) {
      parts.push(parsed.lineName);
    }
    if (useContextInGeocoding && parsed.areaName) {
      parts.push(parsed.areaName);
    }
    parts.push("日本");
    return unique(parts);
  }

  function buildRawLocationText(lines, areaName, stationName) {
    const firstNonLineSegment = lines.find((line) => !line.includes("線"));
    const areaToken = firstAreaToken(firstNonLineSegment || areaName);

    return [areaToken, stationName]
      .map(normalizeText)
      .filter(Boolean)
      .join(" ");
  }

  function parseLocationSection() {
    const section = findLocationCell();
    if (!section || !section.locationCell) {
      return {
        found: false,
        error: "Could not find the 受け渡し場所 section."
      };
    }

    const lines = collectTextSegments(section.locationCell);
    const stationCandidates = extractMatches(lines, STATION_PATTERN);
    const lineCandidates = extractMatches(lines, LINE_PATTERN);
    const stationName = stationCandidates.at(-1) || findStationFromLinks(section.locationCell);
    const lineName = lineCandidates.at(-1) || findLineFromLines(lines);
    const areaName = findAreaName(lines, section.locationCell);
    const rawLocationText = buildRawLocationText(lines, areaName, stationName);
    const confidence = stationName
      ? stationName.endsWith("駅")
        ? "high"
        : "medium"
      : rawLocationText
        ? "low"
        : "none";

    return {
      found: true,
      rowElement: section.row,
      locationCell: section.locationCell,
      rawLocationText,
      lines,
      areaName,
      lineName,
      stationName,
      stationCandidates,
      confidence
    };
  }

  window.JmtyMapParse = {
    LOCATION_LABEL,
    normalizeText,
    parseLocationSection,
    buildLocationQueryParts
  };
})();
