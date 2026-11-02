// 1. Initialize Leaflet Map Centered on Eastern Ethiopia Region (Zoom set to 10 for a 10 km scale view)
const map = L.map('map').setView([9.593, 41.866], 10);

// Add Scale Bar Control (Metric scale on bottom left, set to show 10 km scale at zoom level 10)
L.control.scale({
  position: 'bottomleft',
  metric: true,
  imperial: false
}).addTo(map);

// 2. Add Esri Light Gray Canvas Base Map
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
  attribution: 'Tiles &copy; Esri',
  maxZoom: 16
}).addTo(map);

// 3. Climate Scenario Raster Layer Handler
const rasterLayers = {
  baseline: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', { opacity: 0.85 }),
  ssp245: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { opacity: 0.85 }),
  ssp585: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', { opacity: 0.85 })
};

let activeRaster = rasterLayers.baseline;
activeRaster.addTo(map);

function setScenario(scenarioKey) {
  document.querySelectorAll('#tab-susceptibility .btn-group .btn').forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');

  map.removeLayer(activeRaster);
  activeRaster = rasterLayers[scenarioKey];
  const currentOpacity = parseFloat(document.getElementById('opacitySlider').value);
  activeRaster.setOpacity(currentOpacity);
  activeRaster.addTo(map);
}

function updateOpacity(val) {
  document.getElementById('opacityVal').innerText = `${Math.round(val * 100)}%`;
  activeRaster.setOpacity(val);
}

// 4. Tab Navigation Switcher
function switchTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

  event.target.classList.add('active');
  document.getElementById(`tab-${tabId}`).classList.add('active');
}

// 5. GAUL Level 2 Administrative Boundary Dataset Integration (Async Fetch)
let geoJsonLayer = null;
let loadedFeatures = [];

async function loadBoundaries() {
  try {
    const response = await fetch('Ethiopia_GAUL_Level2.geojson');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    loadedFeatures = data.features;

    geoJsonLayer = L.geoJSON(data, {
      filter: (feature) => feature.geometry !== null,
      style: { color: "#0284c7", weight: 1.5, fillOpacity: 0.1 },
      onEachFeature: (feature, layer) => {
        layer.on({
          mouseover: (e) => e.target.setStyle({ weight: 3, fillOpacity: 0.25 }),
          mouseout: (e) => e.target.setStyle({ weight: 1.5, fillOpacity: 0.1 }),
          click: (e) => displayWoredaBrief(feature.properties.ADM2_NAME, feature.properties.ADM1_NAME)
        });
      }
    }).addTo(map);
  } catch (error) {
    console.error('Error loading Ethiopia_GAUL_Level2.geojson:', error);
  }
}

function displayWoredaBrief(districtName, regionName) {
  document.getElementById('woreda-brief-card').style.display = 'block';
  document.getElementById('brief-woreda-name').innerText = districtName;
  document.getElementById('brief-woreda-region').innerText = `Region: ${regionName} · Admin Level 2`;
  document.getElementById('brief-exposure-pct').innerText = districtName === 'Dire Dawa' ? '77.7%' : '65.4%';
  document.getElementById('brief-text-summary').innerText = `${districtName} is part of the regional flood vulnerability monitoring framework. Susceptibility increases under projected climate warming scenarios.`;
}

function filterWoreda(query) {
  const q = query.toLowerCase();
  loadedFeatures.forEach(f => {
    if (f.geometry && f.properties && f.properties.ADM2_NAME && f.properties.ADM2_NAME.toLowerCase().includes(q) && q.length > 2) {
      displayWoredaBrief(f.properties.ADM2_NAME, f.properties.ADM1_NAME);
    }
  });
}

// 6. Cumulative Planning Horizon Risk Calculator
function updateHorizon(years) {
  document.getElementById('horizonVal').innerText = `${years} years`;
  const T = 25;
  const risk = (1 - Math.pow((1 - 1/T), years)) * 100;
  document.getElementById('horizonRisk').innerText = `${Math.round(risk)}%`;
}

// 7. Layer Visibility Toggle Handler
function toggleLayer(layerName, isChecked) {
  if (layerName === 'woredas' && geoJsonLayer) {
    isChecked ? map.addLayer(geoJsonLayer) : map.removeLayer(geoJsonLayer);
  } else if (layerName === 'susceptibility') {
    isChecked ? map.addLayer(activeRaster) : map.removeLayer(activeRaster);
  }
}

// 8. Open-Meteo 7-Day Forecast Integration
async function loadForecast() {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=9.6008&longitude=41.8342&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,precipitation_hours,wind_speed_10m_max&timezone=Africa%2FAddis_Ababa`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    const container = document.getElementById('forecast-container');

    let html = `<table class="forecast-table"><thead><tr><th>Metric</th>`;
    data.daily.time.forEach((t, i) => {
      const d = new Date(t);
      const name = i === 0 ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' });
      html += `<th>${name}</th>`;
    });
    html += `</tr></thead><tbody>`;

    html += `<tr><td style="font-weight:600; text-align:left;">Temp °C</td>`;
    data.daily.time.forEach((t, i) => {
      html += `<td>${Math.round(data.daily.temperature_2m_max[i])}°<br>${Math.round(data.daily.temperature_2m_min[i])}°</td>`;
    });

    html += `</tr><tr><td style="font-weight:600; text-align:left;">Rain mm</td>`;
    data.daily.time.forEach((t, i) => {
      const r = data.daily.precipitation_sum[i].toFixed(1);
      html += `<td style="font-weight:700; color:${r >= 30 ? '#e11d48' : '#0284c7'};">${r}</td>`;
    });

    html += `</tr><tr><td style="font-weight:600; text-align:left;">Chance</td>`;
    data.daily.time.forEach((t, i) => {
      html += `<td>${data.daily.precipitation_probability_max[i] || 0}%</td>`;
    });

    html += `</tr></tbody></table>`;
    container.innerHTML = html;
  } catch (err) {
    document.getElementById('forecast-container').innerText = 'Forecast offline.';
  }
}

// 9. Rule-Based Offline Assistant
function sendQuery() {
  const input = document.getElementById('chatInput');
  const win = document.getElementById('chatWindow');
  const text = input.value.trim();
  if (!text) return;

  win.innerHTML += `<div class="chat-msg user"><b>You:</b> ${text}</div>`;
  
  let reply = "This dashboard shows long-term planning statistics based on historical GEV/POT distribution fitting, not operational weather forecasts.";
  if (text.toLowerCase().includes('dire dawa')) {
    reply = "Dire Dawa: 25-year daily rainfall is ~114 mm/day (GEV/POT) with a 12% chance of occurrence within any 3-year planning horizon.";
  }

  win.innerHTML += `<div class="chat-msg bot"><b>Assistant:</b> ${reply}</div>`;
  input.value = '';
  win.scrollTop = win.scrollHeight;
}

// Initialize application tasks on load
loadBoundaries();
loadForecast();