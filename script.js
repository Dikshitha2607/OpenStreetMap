"use strict";

const GEOCODING_URL = "https://photon.komoot.io/api/";
const ROUTING_URL = "https://valhalla1.openstreetmap.de/route";
const WALK_WARNING_DISTANCE_KM = 50;
const MIN_GEOCODING_INTERVAL_MS = 1000;

const MODE_LABELS = {
  auto: "Car",
  bicycle: "Bike",
  pedestrian: "Walk"
};

const MODE_SVG = {
  auto: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 11 1.6-4.3A2.5 2.5 0 0 1 9 5h6a2.5 2.5 0 0 1 2.4 1.7L19 11m-15 0h16v7h-2v-2H6v2H4v-7Zm2 0v-1m12 1v-1M7.5 12.5h.01m9 0h.01"/></svg>',
  bicycle: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="16.5" r="3.5"/><circle cx="18" cy="16.5" r="3.5"/><path d="m6 16.5 4-7h3l5 7m-8-7 3 7h5m-6-10h2m3 1h2"/></svg>',
  pedestrian: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="13" cy="4.5" r="2"/><path d="m11 8 3-1 2 3-2 3 1 6m-4-9-3 4-3 1m8-5 4 2 2 4m-9-2-1 6"/></svg>'
};

const locations = {
  from: { input: document.querySelector("#from-input"), selected: null, suggestions: document.querySelector("#from-suggestions"), hint: document.querySelector("#from-help") },
  to: { input: document.querySelector("#to-input"), selected: null, suggestions: document.querySelector("#to-suggestions"), hint: document.querySelector("#to-help") }
};

const form = document.querySelector("#route-form");
const formMessage = document.querySelector("#form-message");
const planButton = document.querySelector("#plan-button");
const emptyState = document.querySelector("#empty-state");
const routeResult = document.querySelector("#route-result");
const resultLoading = document.querySelector("#result-loading");
const routeStatus = document.querySelector("#route-status");
let lastGeocodingRequestAt = 0;
let pendingLongWalk = null;
let routeRequestId = 0;

document.querySelectorAll("[data-search]").forEach((button) => {
  button.addEventListener("click", () => searchLocation(button.dataset.search));
});

Object.entries(locations).forEach(([key, location]) => {
  location.input.addEventListener("input", () => {
    location.selected = null;
    location.suggestions.replaceChildren();
    location.hint.textContent = "Search for this place and select a match.";
    location.hint.classList.remove("is-error");
    clearFormMessage();
    clearRouteDisplay();
    if (pendingLongWalk) {
      pendingLongWalk = null;
      planButton.querySelector("span").textContent = "Find my route";
    }
  });

  location.input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      searchLocation(key);
    }
  });
});

document.querySelector("#swap-locations").addEventListener("click", () => {
  const fromValue = locations.from.input.value;
  const fromSelected = locations.from.selected;
  locations.from.input.value = locations.to.input.value;
  locations.from.selected = locations.to.selected;
  locations.to.input.value = fromValue;
  locations.to.selected = fromSelected;

  Object.values(locations).forEach((location) => {
    location.suggestions.replaceChildren();
    setFieldMessage(location, location.selected
      ? "Location selected."
      : "Search for this place and select a match.");
  });

  pendingLongWalk = null;
  clearRouteDisplay();
  setFormMessage("Starting point and destination swapped. Find a new route to update the results.");
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  planRoute();
});

form.querySelectorAll('input[name="mode"]').forEach((input) => {
  input.addEventListener("change", () => {
    pendingLongWalk = null;
    clearRouteDisplay();
    setFormMessage("Travel mode changed. Find a new route for your selected mode.");
  });
});

async function searchLocation(key) {
  const location = locations[key];
  const query = location.input.value.trim();
  location.suggestions.replaceChildren();

  if (query.length < 2) {
    setFieldMessage(location, "Enter at least 2 characters to search.", true);
    return;
  }

  const waitMs = MIN_GEOCODING_INTERVAL_MS - (Date.now() - lastGeocodingRequestAt);
  if (waitMs > 0) {
    setFieldMessage(location, `Please wait ${Math.ceil(waitMs / 1000)} second before searching again.`);
    return;
  }

  lastGeocodingRequestAt = Date.now();
  setFieldMessage(location, "Searching for places…");
  const searchButton = document.querySelector(`[data-search="${key}"]`);
  searchButton.disabled = true;

  try {
    const params = new URLSearchParams({ q: query, limit: "5", lang: "en" });
    const response = await fetch(`${GEOCODING_URL}?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`Place search is temporarily unavailable (HTTP ${response.status}). Please try again.`);
    }

    const data = await response.json();
    const results = Array.isArray(data.features) ? data.features : [];
    if (results.length === 0) {
      setFieldMessage(location, "No matches found. Try adding a city or region.", true);
      return;
    }

    renderSuggestions(key, results);
    setFieldMessage(location, "Choose the correct match below.");
  } catch (error) {
    setFieldMessage(location, error instanceof TypeError
      ? "Could not reach place search. Check your connection and try again."
      : error.message, true);
  } finally {
    searchButton.disabled = false;
  }
}

function renderSuggestions(key, results) {
  const location = locations[key];
  const fragment = document.createDocumentFragment();

  results.forEach((feature) => {
    const coordinates = feature.geometry && feature.geometry.coordinates;
    if (!Array.isArray(coordinates) || coordinates.length < 2 ||
        !Number.isFinite(coordinates[0]) || !Number.isFinite(coordinates[1])) {
      return;
    }

    const properties = feature.properties || {};
    const title = properties.name || properties.street || properties.city || properties.locality || "Unnamed place";
    const details = [properties.street, properties.city || properties.locality, properties.state, properties.country]
      .filter((part, index, parts) => part && part !== title && parts.indexOf(part) === index)
      .join(", ");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "suggestion-button";
    button.innerHTML = `<span class="suggestion-title"></span><span class="suggestion-detail"></span>`;
    button.querySelector(".suggestion-title").textContent = title;
    button.querySelector(".suggestion-detail").textContent = details || "OpenStreetMap place";
    button.addEventListener("click", () => {
      location.selected = {
        label: [title, details].filter(Boolean).join(", "),
        lon: coordinates[0],
        lat: coordinates[1]
      };
      location.input.value = location.selected.label;
      location.suggestions.replaceChildren();
      setFieldMessage(location, "Location selected.");
      clearFormMessage();
      if (pendingLongWalk) {
        pendingLongWalk = null;
        planButton.querySelector("span").textContent = "Find my route";
      }
    });
    fragment.append(button);
  });

  location.suggestions.replaceChildren(fragment);
  if (location.suggestions.childElementCount === 0) {
    setFieldMessage(location, "No usable locations found. Try a more specific search.", true);
  }
}

async function planRoute() {
  clearFormMessage();

  const missing = Object.entries(locations).find(([, location]) => !location.selected);
  if (missing) {
    const [key, location] = missing;
    setFieldMessage(location, "Search and select a location before planning your route.", true);
    location.input.focus();
    return;
  }

  const mode = form.querySelector('input[name="mode"]:checked').value;
  if (pendingLongWalk && pendingLongWalk.mode === mode &&
      pendingLongWalk.from === locations.from.selected &&
      pendingLongWalk.to === locations.to.selected) {
    const shouldContinue = window.confirm(
      `This walk is about ${formatDistance(pendingLongWalk.distanceKm)}. Walking more than ${WALK_WARNING_DISTANCE_KM} km may be impractical. Do you want to continue with the walking route?`
    );
    if (!shouldContinue) {
      pendingLongWalk = null;
      setRouteLoading(false);
      setFormMessage("The long walking route was not continued. Choose another mode or route.");
      return;
    }
    const confirmedRoute = pendingLongWalk.route;
    pendingLongWalk = null;
    showRoute(confirmedRoute, mode);
    return;
  }

  pendingLongWalk = null;
  const requestId = ++routeRequestId;
  setRouteLoading(true);
  try {
    const route = await requestRoute(locations.from.selected, locations.to.selected, mode);
    if (requestId !== routeRequestId) {
      return;
    }
    const distanceKm = route.trip.summary.length;
    if (!Number.isFinite(distanceKm) || distanceKm < 0 ||
        !Number.isFinite(route.trip.summary.time) || route.trip.summary.time < 0) {
      throw new Error("The routing service returned incomplete route details. Please try again.");
    }

    if (mode === "pedestrian" && distanceKm > WALK_WARNING_DISTANCE_KM) {
      pendingLongWalk = {
        mode,
        from: locations.from.selected,
        to: locations.to.selected,
        distanceKm,
        route
      };
      setRouteLoading(false);
      setFormMessage(`This walk is about ${formatDistance(distanceKm)}. Walks over ${WALK_WARNING_DISTANCE_KM} km can take many hours and may be impractical.`);
      return;
    }

    showRoute(route, mode);
  } catch (error) {
    if (requestId === routeRequestId) {
      setRouteLoading(false);
      setFormMessage(error.message, true);
    }
  }
}

async function requestRoute(from, to, mode) {
  const params = new URLSearchParams({
    json: JSON.stringify({
      locations: [
        { lat: from.lat, lon: from.lon },
        { lat: to.lat, lon: to.lon }
      ],
      costing: mode,
      units: "kilometers"
    })
  });

  let response;
  try {
    response = await fetch(`${ROUTING_URL}?${params.toString()}`);
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error("Could not reach the routing service. Check your connection and try again.");
    }
    throw error;
  }

  if (!response.ok) {
    throw new Error(`Route service is temporarily unavailable (HTTP ${response.status}). Please try again.`);
  }

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("The routing service returned an unreadable response. Please try again.");
  }

  if (data.error || data.status_code >= 400 || !data.trip || !data.trip.summary) {
    const detail = data.error || data.status_message;
    throw new Error(detail
      ? `No route found: ${detail}`
      : "No route was found for these places and travel mode. Try different locations.");
  }
  return data;
}

function showRoute(route, mode) {
  const summary = route.trip.summary;
  const leg = route.trip.legs && route.trip.legs[0];
  if (!leg || typeof leg.shape !== "string") {
    setRouteLoading(false);
    setFormMessage("The route service did not return a route shape. Please try again.", true);
    return;
  }

  document.querySelector("#result-mode-icon").innerHTML = MODE_SVG[mode];
  document.querySelector("#result-mode-label").textContent = `${MODE_LABELS[mode]} route`;
  document.querySelector("#result-duration").textContent = formatDuration(summary.time);
  document.querySelector("#result-distance").textContent = formatDistance(summary.length);
  document.querySelector("#route-start-label").textContent = locations.from.selected.label;
  document.querySelector("#route-end-label").textContent = locations.to.selected.label;

  const mapLink = document.querySelector("#map-link");
  mapLink.href = `https://www.openstreetmap.org/?mlat=${encodeURIComponent(locations.to.selected.lat)}&mlon=${encodeURIComponent(locations.to.selected.lon)}#map=13/${encodeURIComponent(locations.to.selected.lat)}/${encodeURIComponent(locations.to.selected.lon)}`;
  drawRouteShape(leg.shape);
  routeStatus.textContent = mode === "pedestrian" && summary.length > WALK_WARNING_DISTANCE_KM
    ? "Long-distance walking route shown after your confirmation."
    : "Route calculated successfully.";

  emptyState.hidden = true;
  routeResult.hidden = false;
  setRouteLoading(false);
  clearFormMessage();
}

function drawRouteShape(encodedShape) {
  const points = decodePolyline(encodedShape);
  const svg = document.querySelector("#route-shape");
  svg.replaceChildren();

  if (points.length < 2) {
    throw new Error("The route service returned an invalid route shape.");
  }

  const latitudes = points.map((point) => point[0]);
  const longitudes = points.map((point) => point[1]);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLon = Math.min(...longitudes);
  const maxLon = Math.max(...longitudes);
  const width = 600;
  const height = 220;
  const padding = 24;
  const lonRange = maxLon - minLon || 1;
  const latRange = maxLat - minLat || 1;
  const scale = Math.min((width - padding * 2) / lonRange, (height - padding * 2) / latRange);
  const usedWidth = lonRange * scale;
  const usedHeight = latRange * scale;
  const offsetX = (width - usedWidth) / 2;
  const offsetY = (height - usedHeight) / 2;
  const projected = points.map(([lat, lon]) => [
    offsetX + (lon - minLon) * scale,
    height - offsetY - (lat - minLat) * scale
  ]);
  const namespace = "http://www.w3.org/2000/svg";
  const line = document.createElementNS(namespace, "polyline");
  line.setAttribute("class", "route-line");
  line.setAttribute("points", projected.map((point) => point.join(",")).join(" "));
  svg.append(line);

  [["route-start", projected[0]], ["route-end", projected[projected.length - 1]]].forEach(([className, point]) => {
    const marker = document.createElementNS(namespace, "circle");
    marker.setAttribute("class", className);
    marker.setAttribute("cx", point[0]);
    marker.setAttribute("cy", point[1]);
    marker.setAttribute("r", "8");
    svg.append(marker);
  });
}

function decodePolyline(encoded) {
  const points = [];
  let index = 0;
  let lat = 0;
  let lon = 0;

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte;
    do {
      if (index >= encoded.length) {
        throw new Error("The routing service returned an incomplete route shape.");
      }
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    result = 0;
    shift = 0;
    do {
      if (index >= encoded.length) {
        throw new Error("The routing service returned an incomplete route shape.");
      }
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lon += result & 1 ? ~(result >> 1) : result >> 1;
    points.push([lat / 1e6, lon / 1e6]);
  }
  return points;
}

function formatDuration(seconds) {
  const minutes = Math.round(seconds / 60);
  if (minutes < 1) {
    return "Under 1 min";
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  const parts = [];
  if (hours > 0) {
    parts.push(`${hours} hr${hours === 1 ? "" : "s"}`);
  }
  if (remainingMinutes > 0) {
    parts.push(`${remainingMinutes} min${remainingMinutes === 1 ? "" : "s"}`);
  }
  return parts.join(" ");
}

function formatDistance(kilometers) {
  const digits = kilometers >= 100 ? 0 : kilometers >= 10 ? 1 : 2;
  return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: digits }).format(kilometers)} km`;
}

function setFieldMessage(location, message, isError = false) {
  location.hint.textContent = message;
  location.hint.classList.toggle("is-error", isError);
}

function setFormMessage(message, isError = false) {
  formMessage.textContent = message;
  formMessage.classList.toggle("is-error", isError);
}

function clearFormMessage() {
  setFormMessage("");
}

function clearRouteDisplay() {
  routeRequestId += 1;
  resultLoading.hidden = true;
  routeResult.hidden = true;
  emptyState.hidden = false;
  routeStatus.textContent = "";
  planButton.disabled = false;
  planButton.querySelector("span").textContent = "Find my route";
}

function setRouteLoading(isLoading) {
  planButton.disabled = isLoading;
  planButton.querySelector("span").textContent = isLoading
    ? "Finding route…"
    : pendingLongWalk ? "Continue with this walk" : "Find my route";
  resultLoading.hidden = !isLoading;
  if (isLoading) {
    emptyState.hidden = true;
    routeResult.hidden = true;
  } else if (routeResult.hidden) {
    emptyState.hidden = false;
  }
}
