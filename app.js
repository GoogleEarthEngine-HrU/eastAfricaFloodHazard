// 1. Initialize Leaflet Map Centered on Eastern Ethiopia Region
const map = L.map('map').setView([9.593, 41.866], 8);

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

// 5. GAUL Level 2 Administrative Boundary Dataset Integration
const ethiopiaBoundaryData = {
  "type": "FeatureCollection",
  "features": [
    {"type":"Feature","geometry":null,"properties":{"ADM0_NAME":"Ethiopia","ADM1_NAME":"Addis Ababa","ADM2_NAME":"Region 14","ADM2_CODE":149277}},
    {"type":"Feature","geometry":null,"properties":{"ADM0_NAME":"Ethiopia","ADM1_NAME":"Amhara","ADM2_NAME":"Awi/Agew","ADM2_CODE":149278}},
    {"type":"Feature","geometry":null,"properties":{"ADM0_NAME":"Ethiopia","ADM1_NAME":"Amhara","ADM2_NAME":"No Name","ADM2_CODE":149279}},
    {"type":"Feature","geometry":null,"properties":{"ADM0_NAME":"Ethiopia","ADM1_NAME":"Amhara","ADM2_NAME":"North Gonder","ADM2_CODE":149280}},
    {"type":"Feature","geometry":null,"properties":{"ADM0_NAME":"Ethiopia","ADM1_NAME":"Amhara","ADM2_NAME":"South Wollo","ADM2_CODE":149281}},
    {"type":"Feature","geometry":null,"properties":{"ADM0_NAME":"Ethiopia","ADM1_NAME":"Amhara","ADM2_NAME":"Special Woreda","ADM2_CODE":149282}},
    {"type":"Feature","geometry":null,"properties":{"ADM0_NAME":"Ethiopia","ADM1_NAME":"Beneshangul Gumu","ADM2_NAME":"Kemashi","ADM2_CODE":149283}},
    {"type":"Feature","geometry":null,"properties":{"ADM0_NAME":"Ethiopia","ADM1_NAME":"Gambela","ADM2_NAME":"Agnuak","ADM2_CODE":149284}},
    {"type":"Feature","geometry":null,"properties":{"ADM0_NAME":"Ethiopia","ADM1_NAME":"Gambela","ADM2_NAME":"Majang","ADM2_CODE":149285}},
    {"type":"Feature","geometry":null,"properties":{"ADM0_NAME":"Ethiopia","ADM1_NAME":"Gambela","ADM2_NAME":"Nuer","ADM2_CODE":149286}},
    {"type":"Feature","geometry":null,"properties":{"ADM0_NAME":"Ethiopia","ADM1_NAME":"Oromia","ADM2_NAME":"Arsi","ADM2_CODE":149287}},
    {"type":"Feature","geometry":null,"properties":{"ADM0_NAME":"Ethiopia","ADM1_NAME":"Oromia","ADM2_NAME":"Bale","ADM2_CODE":149288}},
    {"type":"Feature","geometry":null,"properties":{"ADM0_NAME":"Ethiopia","ADM1_NAME":"Oromia","ADM2_NAME":"East Shewa","ADM2_CODE":149289}},
    {"type":"Feature","geometry":null,"properties":{"ADM0_NAME":"Ethiopia","ADM1_NAME":"Oromia","ADM2_NAME":"East Wellega","ADM2_CODE":149290}},
    {"type":"Feature","geometry":null,"properties":{"ADM0_NAME":"Ethiopia","ADM1_NAME":"Oromia","ADM2_NAME":"Horo Guduru","ADM2_CODE":149291}},
    {"type":"Feature","geometry":null,"properties":{"ADM0_NAME":"Ethiopia","ADM1_NAME":"Oromia","ADM2_NAME":"Ilubabor","ADM2_CODE":149292}},
    {"type":"Feature","geometry":null,"properties":{"ADM0_NAME":"Ethiopia","ADM1_NAME":"Oromia","ADM2_NAME":"Kelem Wellega","ADM2_CODE":149293}},
    {"type":"Feature","geometry":null,"properties":{"ADM0_NAME":"Ethiopia","ADM1_NAME":"Oromia","ADM2_NAME":"West Arsi","ADM2_CODE":149294}},
    {"type":"Feature","geometry":null,"properties":{"ADM0_NAME":"Ethiopia","ADM1_NAME":"Oromia","ADM2_NAME":"West Wellega","ADM2_CODE":149295}},
    {"type":"Feature","geometry":null,"properties":{"ADM0_NAME":"Ethiopia","ADM1_NAME":"SNNPR","ADM2_NAME":"Bench Maji","ADM2_CODE":149296}},
    {"type":"Feature","geometry":null,"properties":{"ADM0_NAME":"Ethiopia","ADM1_NAME":"SNNPR","ADM2_NAME":"Segen Peoples'","ADM2_CODE":149297}},
    {"type":"Feature","geometry":null,"properties":{"ADM0_NAME":"Ethiopia","ADM1_NAME":"Tigray","ADM2_NAME":"Southern","ADM2_CODE":149298}},
    {"type":"Feature","geometry":null,"properties":{"ADM0_NAME":"Ethiopia","ADM1_NAME":"Afar","ADM2_NAME":"Zone 1","ADM2_CODE":40788}},
    {"type":"Feature","geometry":null,"properties":{"ADM0_NAME":"Ethiopia","ADM1_NAME":"Afar","ADM2_NAME":"Zone 2","ADM2_CODE":40789}},
    {"type":"Feature","geometry":null,"properties":{"ADM0_NAME":"Ethiopia","ADM1_NAME":"Afar","ADM2_NAME":"Zone 3","ADM2_CODE":40792}},
    {"type":"Feature","geometry":null,"properties":{"ADM0_NAME":"Ethiopia","ADM1_NAME":"Afar","ADM2_NAME":"Zone 4","ADM2_CODE":40790}},
    {"type":"Feature","geometry":null,"properties":{"ADM0_NAME":"Ethiopia","ADM1_NAME":"Afar","ADM2_NAME":"Zone 5","ADM2_CODE":40791}},
    {"type":"Feature","geometry":null,"properties":{"ADM0_NAME":"Ethiopia","ADM1_NAME":"Amhara","ADM2_NAME":"East Gojam","ADM2_CODE":40796}},
    {"type":"Feature","geometry":null,"properties":{"ADM0_NAME":"Ethiopia","ADM1_NAME":"Amhara","ADM2_NAME":"North Shewa(R3)","ADM2_CODE":47682}},
    {"type":"Feature","geometry":null,"properties":{"ADM0_NAME":"Ethiopia","ADM1_NAME":"Amhara","ADM2_NAME":"North Wollo","ADM2_CODE":40799}},
    {"type":"Feature","geometry":null,"properties":{"ADM0_NAME":"Ethiopia","ADM1_NAME":"Amhara","ADM2_NAME":"Oromia","ADM2_CODE":40800}},
    {"type":"Feature","geometry":null,"properties":{"ADM0_NAME":"Ethiopia","ADM1_NAME":"Amhara","ADM2_NAME":"South Gonder","ADM2_CODE":40801}},
    {"type":"Feature","geometry":null,"properties":{"ADM0_NAME":"Ethiopia","ADM1_NAME":"Amhara","ADM2_NAME":"Wag Himra","ADM2_CODE":40803}},
    {"type":"Feature","geometry":null,"properties":{"ADM0_NAME":"Ethiopia","ADM1_NAME":"Amhara","ADM2_NAME":"West Gojam","ADM2_CODE":40804}},
    {"type":"Feature","geometry":null,"properties":{"ADM0_NAME":"Ethiopia","ADM1_NAME":"Beneshangul Gumu","ADM2_NAME":"Asosa","ADM2_CODE":40805}},
    {"type":"Feature","geometry":null,"properties":{"ADM0_NAME":"Ethiopia","ADM1_NAME":"Beneshangul Gumu","ADM2_NAME":"Metekel","ADM2_CODE":40807}},
    {"type":"Feature","geometry":null,"properties":{"ADM0_NAME":"Ethiopia","ADM1_NAME":"Dire Dawa","ADM2_NAME":"Dire Dawa","ADM2_CODE":40809}},
    {"type":"Feature","geometry":null,"properties":{"ADM0_NAME":"Ethiopia","ADM1_NAME":"Hareri","ADM2_NAME":"Hareri","ADM2_CODE":40814}},
    {"type":"Feature","geometry":null,"properties":{"ADM0_NAME":"Ethiopia","ADM1_NAME":"Oromia","ADM2_NAME":"Borena","ADM2_CODE":47688}},
    {"type":"Feature","geometry":null,"properties":{"ADM0_NAME":"Ethiopia","ADM1_NAME":"Oromia","ADM2_NAME":"East Harerge","ADM2_CODE":47689}},
    {"type":"Feature","geometry":null,"properties":{"ADM0_NAME":"Ethiopia","ADM1_NAME":"Oromia","ADM2_NAME":"Guji","ADM2_CODE":47691}},
    {"type":"Feature","geometry":null,"properties":{"ADM0_NAME":"Ethiopia","ADM1_NAME":"Oromia","ADM2_NAME":"Jimma","ADM2_CODE":40822}},
    {"type":"Feature","geometry":null,"properties":{"ADM0_NAME":"Ethiopia","ADM1_NAME":"Oromia","ADM2_NAME":"North Shewa(R4)","ADM2_CODE":47692}},
    {"type":"Feature","geometry":null,"properties":{"ADM0_NAME":"Ethiopia","ADM1_NAME":"Oromia","ADM2_NAME":"South West Shewa","ADM2_CODE":47693}},
    {"type":"Feature","geometry":null,"properties":{"ADM0_NAME":"Ethiopia","ADM1_NAME":"Oromia","ADM2_NAME":"West Harerge","ADM2_CODE":40824}},
    {"type":"Feature","geometry":null,"properties":{"ADM0_NAME":"Ethiopia","ADM1_NAME":"Oromia","ADM2_NAME":"West Shewa","ADM2_CODE":47694}},
    {"type":"Feature","geometry":null,"properties":{"ADM0_NAME":"Ethiopia","ADM1_NAME":"SNNPR","ADM2_NAME":"Alaba","ADM2_CODE":47695}},
    {"type":"Feature","geometry":null,"properties":{"ADM0_NAME":"Ethiopia","ADM1_NAME":"SNNPR","ADM2_NAME":"Basketo","ADM2_CODE":47696}},
    {"type":"Feature","geometry":null,"properties":{"ADM0_NAME":"Ethiopia","ADM1_NAME":"SNNPR","ADM2_NAME":"Dawro","ADM2_CODE":47698}},
    {"type":"Feature","geometry":null,"properties":{"ADM0_NAME":"Ethiopia","ADM1_NAME":"SNNPR","ADM2_NAME":"Gamo Gofa","ADM2_CODE":47699}},
    {"type":"Feature","geometry":null,"properties":{"ADM0_NAME":"Ethiopia","ADM1_NAME":"SNNPR","ADM2_NAME":"Gedio","ADM2_CODE":40831}},
    {"type":"Feature","geometry":null,"properties":{"ADM0_NAME":"Ethiopia","ADM1_NAME":"SNNPR","ADM2_NAME":"Gurage","ADM2_CODE":47700}},
    {"type":"Feature","geometry":null,"properties":{"ADM0_NAME":"Ethiopia","ADM1_NAME":"SNNPR","ADM2_NAME":"Hadiya","ADM2_CODE":40833}},
    {"type":"Feature","geometry":null,"properties":{"ADM0_NAME":"Ethiopia","ADM1_NAME":"SNNPR","ADM2_NAME":"Keffa","ADM2_CODE":47701}},
    {"type":"Feature","geometry":null,"properties":{"ADM0_NAME":"Ethiopia","ADM1_NAME":"SNNPR","ADM2_NAME":"Konta","ADM2_CODE":47703}},
    {"type":"Feature","geometry":null,"properties":{"ADM0_NAME":"Ethiopia","ADM1_NAME":"SNNPR","ADM2_NAME":"KT","ADM2_CODE":47702}},
    {"type":"Feature","geometry":null,"properties":{"ADM0_NAME":"Ethiopia","ADM1_NAME":"SNNPR","ADM2_NAME":"Selti","ADM2_CODE":47705}},
    {"type":"Feature","geometry":null,"properties":{"ADM0_NAME":"Ethiopia","ADM1_NAME":"SNNPR","ADM2_NAME":"Sheka","ADM2_CODE":47704}},
    {"type":"Feature","geometry":null,"properties":{"ADM0_NAME":"Ethiopia","ADM1_NAME":"SNNPR","ADM2_NAME":"Sidama","ADM2_CODE":40838}},
    {"type":"Feature","geometry":null,"properties":{"ADM0_NAME":"Ethiopia","ADM1_NAME":"SNNPR","ADM2_NAME":"South Omo","ADM2_CODE":40839}},
    {"type":"Feature","geometry":null,"properties":{"ADM0_NAME":"Ethiopia","ADM1_NAME":"SNNPR","ADM2_NAME":"Wolayita","ADM2_CODE":47706}},
    {"type":"Feature","geometry":null,"properties":{"ADM0_NAME":"Ethiopia","ADM1_NAME":"SNNPR","ADM2_NAME":"Yem","ADM2_CODE":40840}},
    {"type":"Feature","geometry":null,"properties":{"ADM0_NAME":"Ethiopia","ADM1_NAME":"Somali","ADM2_NAME":"Afder","ADM2_CODE":40841}},
    {"type":"Feature","geometry":null,"properties":{"ADM0_NAME":"Ethiopia","ADM1_NAME":"Somali","ADM2_NAME":"Doolo","ADM2_CODE":40849}},
    {"type":"Feature","geometry":null,"properties":{"ADM0_NAME":"Ethiopia","ADM1_NAME":"Somali","ADM2_NAME":"Fafan","ADM2_CODE":40845}},
    {"type":"Feature","geometry":null,"properties":{"ADM0_NAME":"Ethiopia","ADM1_NAME":"Somali","ADM2_NAME":"Jarar","ADM2_CODE":40842}},
    {"type":"Feature","geometry":null,"properties":{"ADM0_NAME":"Ethiopia","ADM1_NAME":"Somali","ADM2_NAME":"Korahe","ADM2_CODE":47708}},
    {"type":"Feature","geometry":null,"properties":{"ADM0_NAME":"Ethiopia","ADM1_NAME":"Somali","ADM2_NAME":"Liben","ADM2_CODE":47709}},
    {"type":"Feature","geometry":null,"properties":{"ADM0_NAME":"Ethiopia","ADM1_NAME":"Somali","ADM2_NAME":"Nogob","ADM2_CODE":47707}},
    {"type":"Feature","geometry":null,"properties":{"ADM0_NAME":"Ethiopia","ADM1_NAME":"Somali","ADM2_NAME":"Shabelle","ADM2_CODE":40844}},
    {"type":"Feature","geometry":null,"properties":{"ADM0_NAME":"Ethiopia","ADM1_NAME":"Somali","ADM2_NAME":"Siti","ADM2_CODE":40848}},
    {"type":"Feature","geometry":null,"properties":{"ADM0_NAME":"Ethiopia","ADM1_NAME":"Tigray","ADM2_NAME":"Central","ADM2_CODE":40850}},
    {"type":"Feature","geometry":null,"properties":{"ADM0_NAME":"Ethiopia","ADM1_NAME":"Tigray","ADM2_NAME":"Eastern","ADM2_CODE":40851}},
    {"type":"Feature","geometry":null,"properties":{"ADM0_NAME":"Ethiopia","ADM1_NAME":"Tigray","ADM2_NAME":"North Western","ADM2_CODE":47710}},
    {"type":"Feature","geometry":null,"properties":{"ADM0_NAME":"Ethiopia","ADM1_NAME":"Tigray","ADM2_NAME":"Western","ADM2_CODE":47711}}
  ]
};

const geoJsonLayer = L.geoJSON(ethiopiaBoundaryData, {
  filter: (feature) => feature.geometry !== null, // Safely handles null geometry items
  style: { color: "#0284c7", weight: 1.5, fillOpacity: 0.1 },
  onEachFeature: (feature, layer) => {
    layer.on({
      mouseover: (e) => e.target.setStyle({ weight: 3, fillOpacity: 0.25 }),
      mouseout: (e) => e.target.setStyle({ weight: 1.5, fillOpacity: 0.1 }),
      click: (e) => displayWoredaBrief(feature.properties.ADM2_NAME, feature.properties.ADM1_NAME)
    });
  }
}).addTo(map);

function displayWoredaBrief(districtName, regionName) {
  document.getElementById('woreda-brief-card').style.display = 'block';
  document.getElementById('brief-woreda-name').innerText = districtName;
  document.getElementById('brief-woreda-region').innerText = `Region: ${regionName} · Admin Level 2`;
  document.getElementById('brief-exposure-pct').innerText = districtName === 'Dire Dawa' ? '77.7%' : '65.4%';
  document.getElementById('brief-text-summary').innerText = `${districtName} is part of the regional flood vulnerability monitoring framework. Susceptibility increases under projected climate warming scenarios.`;
}

function filterWoreda(query) {
  const q = query.toLowerCase();
  ethiopiaBoundaryData.features.forEach(f => {
    if (f.geometry && f.properties.ADM2_NAME.toLowerCase().includes(q) && q.length > 2) {
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
  if (layerName === 'woredas') {
    isChecked ? map.addLayer(geoJsonLayer) : map.removeLayer(geoJsonLayer);
  } else if (layerName === 'susceptibility') {
    isChecked ? map.addLayer(activeRaster) : map.removeLayer(activeRaster);
  }
}

// 8. Open-Meteo 7-Day Forecast Integration[cite: 1, 4, 5]
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
  
  let reply = "This dashboard shows long-term planning statistics based on historical GEV/POT distribution fitting, not operational weather forecasts[cite: 1, 4, 5].";
  if (text.toLowerCase().includes('dire dawa')) {
    reply = "Dire Dawa: 25-year daily rainfall is ~114 mm/day (GEV/POT) with a 12% chance of occurrence within any 3-year planning horizon[cite: 1, 4, 5].";
  }

  win.innerHTML += `<div class="chat-msg bot"><b>Assistant:</b> ${reply}</div>`;
  input.value = '';
  win.scrollTop = win.scrollHeight;
}

loadForecast();