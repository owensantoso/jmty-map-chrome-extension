(function () {
  const TILE_PROVIDER = {
    name: "osm-standard",
    urlTemplate: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    options: {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }
  };

  function createDestinationIcon() {
    return window.L.icon({
      iconUrl: chrome.runtime.getURL("vendor/images/marker-icon.png"),
      iconRetinaUrl: chrome.runtime.getURL("vendor/images/marker-icon-2x.png"),
      shadowUrl: chrome.runtime.getURL("vendor/images/marker-shadow.png"),
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });
  }

  function createMapController(container, heightClass) {
    const mapRoot = document.createElement("div");
    mapRoot.className = `jmty-map-canvas jmty-map-height-${heightClass}`;
    container.appendChild(mapRoot);

    const distanceBadge = document.createElement("div");
    distanceBadge.className = "jmty-map-distance-badge";
    distanceBadge.hidden = true;
    mapRoot.appendChild(distanceBadge);

    const map = window.L.map(mapRoot, {
      zoomControl: true,
      scrollWheelZoom: false
    });

    window.L.tileLayer(TILE_PROVIDER.urlTemplate, TILE_PROVIDER.options).addTo(map);
    const destinationIcon = createDestinationIcon();

    let destinationMarker = null;
    let currentMarker = null;
    let pathLine = null;

    function refreshBounds() {
      const points = [];
      if (destinationMarker) {
        points.push(destinationMarker.getLatLng());
      }
      if (currentMarker) {
        points.push(currentMarker.getLatLng());
      }

      if (!points.length) {
        return;
      }

      if (points.length === 1) {
        map.setView(points[0], 14);
        return;
      }

      const bounds = window.L.latLngBounds(points);
      map.fitBounds(bounds.pad(0.25));
    }

    function refreshLine() {
      if (pathLine) {
        map.removeLayer(pathLine);
        pathLine = null;
      }
      if (destinationMarker && currentMarker) {
        pathLine = window.L.polyline(
          [destinationMarker.getLatLng(), currentMarker.getLatLng()],
          {
            color: "#1d4ed8",
            weight: 3,
            opacity: 0.75,
            dashArray: "6 6"
          }
        ).addTo(map);
      }
    }

    return {
      root: mapRoot,
      invalidateSize() {
        setTimeout(() => map.invalidateSize(), 0);
      },
      setDistanceBadge(text) {
        distanceBadge.textContent = text;
        distanceBadge.hidden = !text;
      },
      setDestination(location, label) {
        if (destinationMarker) {
          map.removeLayer(destinationMarker);
        }
        destinationMarker = window.L.marker([location.lat, location.lon], {
          icon: destinationIcon
        }).addTo(map);
        if (label) {
          destinationMarker.bindPopup(label);
        }
        refreshLine();
        refreshBounds();
      },
      setCurrentLocation(location, label) {
        if (currentMarker) {
          map.removeLayer(currentMarker);
        }
        currentMarker = window.L.circleMarker([location.lat, location.lon], {
          radius: 8,
          color: "#059669",
          fillColor: "#10b981",
          fillOpacity: 0.9,
          weight: 2
        }).addTo(map);
        if (label) {
          currentMarker.bindPopup(label);
        }
        refreshLine();
        refreshBounds();
      },
      clearCurrentLocation() {
        if (currentMarker) {
          map.removeLayer(currentMarker);
          currentMarker = null;
        }
        refreshLine();
        refreshBounds();
      },
      destroy() {
        map.remove();
      }
    };
  }

  window.JmtyMapView = {
    TILE_PROVIDER,
    createMapController
  };
})();
