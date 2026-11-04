// ============================================================
// Eastern Ethiopia Flood Hazard Explorer
// Boundaries : Woredas & Districts.geojson  (replaces Ethiopia_GAUL_Level2.geojson)
// Rainfall   : District_Rainfall_Hazard_Summary.csv
// NOTE: fetch() needs a web server (e.g. `python -m http.server`), not file://
// ============================================================
const CONFIG = {
  // Tried in order. The 2nd name is a safe fallback if your host dislikes spaces / "&".
  geojsonCandidates: ['Woredas & Districts.geojson', 'Woredas_Districts.geojson'],
  csv: 'District_Rainfall_Hazard_Summary.csv',
  // Optional: exact GeoJSON property holding the district name (e.g. 'ADMIN3'). null = auto-detect.
  nameField: null
};

// Indicators shown on the map. Columns missing from the CSV are skipped automatically.
const INDICATORS = {
  Return_Level_10yr_mm:      { label: '10-yr return level',         unit: 'mm/day',  dec: 1 },
  Return_Level_25yr_mm:      { label: '25-yr return level',         unit: 'mm/day',  dec: 1 },
  Return_Level_50yr_mm:      { label: '50-yr return level',         unit: 'mm/day',  dec: 1 },
  Mean_Annual_Rainfall_mm:   { label: 'Mean annual rainfall',       unit: 'mm',      dec: 0 },
  Mean_Annual_Max_Daily_mm:  { label: 'Mean annual max daily rain', unit: 'mm/day',  dec: 1 },
  Max_Recorded_Daily_mm:     { label: 'Max recorded daily rain',    unit: 'mm/day',  dec: 1 },
  Heavy_Days_30mm_yr:        { label: 'Days ≥ 30 mm per year',      unit: 'days/yr', dec: 1 },
  Heavy_Days_50mm_yr:        { label: 'Days ≥ 50 mm per year',      unit: 'days/yr', dec: 2 },
  Mean_Consecutive_Dry_Days: { label: 'Mean consecutive dry days',  unit: 'days',    dec: 1 }
};
// Low -> high colours (same palette as the susceptibility legend)
const COLORS = ['#2b83ba', '#abdda4', '#ffffbf', '#fdae61', '#d7191c'];
const CLASS_NAMES = ['Very low', 'Low', 'Moderate', 'High', 'Very high'];
const NO_DATA_COLOR = '#cbd5e1';

const state = {
  indicator: 'Return_Level_25yr_mm',
  T: 25,            // return period used for the planning-horizon calculator
  years: 3,
  selected: null,
  rasterOn: true
};
const data = {};            // normalised district name -> CSV record
const layersByKey = {};     // normalised district name -> Leaflet layer
let indicators = {};        // INDICATORS that actually exist in the CSV
let geoLayer = null;

// ---------- helpers ----------
const $ = id => document.getElementById(id);
const norm = s => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (v, d) => Number.isFinite(v) ? v.toFixed(d) : 'n/a';

function showStatus(html) {
  const el = $('data-status');
  el.innerHTML = html;
  el.style.display = 'block';
}
function hideStatus() { $('data-status').style.display = 'none'; }

// ---------- map ----------
const map = L.map('map', { maxZoom: 16 }).setView([8.9, 40.2], 8);
L.control.scale({ position: 'bottomleft', metric: true, imperial: false }).addTo(map);
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
  attribution: 'Tiles &copy; Esri', maxZoom: 16, zIndex: 1
}).addTo(map);

// Climate-scenario raster layer.
// PLACEHOLDER: these three Esri basemaps only stand in for real susceptibility rasters.
// Replace each URL with your own tile service (e.g. .../ssp245/{z}/{x}/{y}.png) when available.
const rasterOpts = { opacity: 0.85, zIndex: 2, maxZoom: 16 };
const rasterLayers = {
  baseline: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', rasterOpts),
  ssp245:   L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', rasterOpts),
  ssp585:   L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', rasterOpts)
};
let activeRaster = rasterLayers.baseline;
activeRaster.addTo(map);

function setScenario(key, btn) {
  document.querySelectorAll('#scenarioGroup .btn').forEach(b => b.classList.toggle('active', b === btn));
  if (state.rasterOn) map.removeLayer(activeRaster);
  activeRaster = rasterLayers[key];
  activeRaster.setOpacity(parseFloat($('opacitySlider').value));
  if (state.rasterOn) activeRaster.addTo(map);
}

function updateOpacity(val) {               // raster transparency
  $('opacityVal').textContent = `${Math.round(val * 100)}%`;
  activeRaster.setOpacity(parseFloat(val));
}

function updateFill(val) {                  // district fill transparency
  $('fillVal').textContent = `${Math.round(val * 100)}%`;
  refreshMap();
}

// ---------- CSV ----------
function splitLine(line, delim) {
  const out = []; let cur = '', quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else quoted = false; }
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delim) { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out.map(s => s.trim());
}

function parseCSV(text) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) throw new Error(`${CONFIG.csv} has no data rows`);
  const h = lines[0];
  const delim = h.includes('\t') ? '\t' : (h.split(';').length > h.split(',').length ? ';' : ',');
  const head = splitLine(h, delim);
  return lines.slice(1).map(l => {
    const c = splitLine(l, delim), o = {};
    head.forEach((k, i) => { o[k] = c[i] !== undefined ? c[i] : ''; });
    return o;
  });
}

async function loadTable() {
  const res = await fetch(encodeURIComponent(CONFIG.csv));
  if (!res.ok) throw new Error(`${CONFIG.csv}: HTTP ${res.status}`);
  const rows = parseCSV(await res.text());
  if (!('District' in rows[0])) throw new Error(`${CONFIG.csv} needs a "District" column`);

  indicators = Object.fromEntries(Object.entries(INDICATORS).filter(([k]) => k in rows[0]));
  if (!Object.keys(indicators).length) throw new Error(`${CONFIG.csv} has none of the expected indicator columns`);

  rows.forEach(r => {
    Object.keys(indicators).forEach(k => { r[k] = parseFloat(r[k]); });
    data[norm(r.District)] = r;
  });
  if (!indicators[state.indicator]) state.indicator = Object.keys(indicators)[0];
  const m = state.indicator.match(/^Return_Level_(\d+)yr_mm$/);
  if (m) state.T = +m[1];
}

const districtCount = () => Object.keys(data).length;

// ---------- classification ----------
const brkCache = {};
function breaks() {
  const k = state.indicator;
  if (!brkCache[k]) {
    const vals = Object.values(data).map(r => r[k]).filter(Number.isFinite);
    if (!vals.length) brkCache[k] = { min: 0, step: 0, ok: false };
    else {
      const min = Math.min(...vals), max = Math.max(...vals);
      brkCache[k] = { min, step: (max - min) / 5, ok: true };
    }
  }
  return brkCache[k];
}
function classOf(v) {                       // -1 = no data
  const { min, step, ok } = breaks();
  if (!ok || !Number.isFinite(v)) return -1;
  if (step === 0) return 2;
  return Math.min(4, Math.max(0, Math.floor((v - min) / step)));
}
function styleFor(key) {
  const rec = data[key];
  const cls = rec ? classOf(rec[state.indicator]) : -1;
  const sel = key === state.selected;
  return {
    color: sel ? '#0b192c' : '#334155',
    weight: sel ? 3 : 1,
    fillOpacity: parseFloat($('fillSlider').value),
    fillColor: cls >= 0 ? COLORS[cls] : NO_DATA_COLOR
  };
}

// ---------- GeoJSON ----------
// Fetches the first candidate file that is real GeoJSON (a host may return index.html with HTTP 200 for missing files).
async function fetchGeoJSON() {
  let lastErr = new Error('No GeoJSON file name configured');
  for (const name of CONFIG.geojsonCandidates) {
    try {
      const res = await fetch(encodeURIComponent(name));
      if (!res.ok) { lastErr = new Error(`${name}: HTTP ${res.status}`); continue; }
      const gj = await res.json();
      if (!gj || !Array.isArray(gj.features)) { lastErr = new Error(`${name}: not a FeatureCollection`); continue; }
      return gj;
    } catch (e) { lastErr = new Error(`${name}: ${e.message}`); }
  }
  throw lastErr;
}

// Finds which property holds the district name by counting matches against the CSV
function detectNameField(features) {
  if (CONFIG.nameField) return CONFIG.nameField;
  const score = {};
  features.forEach(f => Object.entries(f.properties || {}).forEach(([k, v]) => {
    if (typeof v === 'string' && data[norm(v)]) score[k] = (score[k] || 0) + 1;
  }));
  const best = Object.entries(score).sort((a, b) => b[1] - a[1])[0];
  if (!best) {
    const fields = Object.keys((features[0] && features[0].properties) || {}).join(', ') || 'none';
    throw new Error(`No GeoJSON property matches the CSV "District" names. Properties found: ${fields}`);
  }
  return best[0];
}

async function loadBoundaries() {
  const gj = await fetchGeoJSON();
  const feats = gj.features.filter(f => f.geometry);
  if (!feats.length) throw new Error('GeoJSON has no features with geometry');
  const field = detectNameField(feats);
  console.log('District name field detected:', field);

  const seen = new Set(), unmatched = [];
  const layer = L.geoJSON({ type: 'FeatureCollection', features: feats }, {
    style: f => styleFor(norm(f.properties[field])),
    onEachFeature: (f, lyr) => {
      const raw = f.properties[field], key = norm(raw);
      if (!data[key]) { unmatched.push(raw); lyr.bindTooltip(`${esc(raw)} (no data)`, { sticky: true }); return; }
      seen.add(key);
      layersByKey[key] = lyr;
      lyr.bindTooltip(esc(data[key].District), { sticky: true });
      lyr.on({
        mouseover: e => { e.target.setStyle({ weight: 3 }); e.target.bringToFront(); },
        mouseout: () => lyr.setStyle(styleFor(key)),
        click: () => selectDistrict(key)
      });
    }
  });

  // Sanity check: Leaflet needs WGS84 lon/lat (EPSG:4326)
  const b = layer.getBounds();
  if (!b.isValid() || Math.abs(b.getWest()) > 180 || Math.abs(b.getEast()) > 180 || Math.abs(b.getNorth()) > 90 || Math.abs(b.getSouth()) > 90)
    throw new Error('GeoJSON coordinates are not longitude/latitude. Re-export it in EPSG:4326 (WGS 84).');

  geoLayer = layer.addTo(map);
  map.fitBounds(b, { padding: [20, 20] });
  if (state.selected && layersByKey[state.selected]) layersByKey[state.selected].setStyle(styleFor(state.selected));

  const missing = Object.values(data).filter(r => !seen.has(norm(r.District))).map(r => r.District);
  const total = districtCount();
  if (unmatched.length || missing.length) {
    showStatus(`⚠ Matched ${seen.size}/${total} districts.` +
      (unmatched.length ? `<br>On map, not in CSV: ${unmatched.map(esc).join(', ')}` : '') +
      (missing.length ? `<br>In CSV, not on map: ${missing.map(esc).join(', ')}` : ''));
  } else hideStatus();
}

// ---------- indicator / legend / ranking ----------
function buildIndicatorMenu() {
  const sel = $('indicatorSelect');
  sel.innerHTML = Object.entries(indicators).map(([k, v]) => `<option value="${k}">${esc(v.label)} (${esc(v.unit)})</option>`).join('');
  sel.value = state.indicator;
  const rp = $('returnPeriod');                         // only offer return periods present in the CSV
  [...rp.options].forEach(o => { o.disabled = !indicators[`Return_Level_${o.value}yr_mm`]; });
  if (indicators[`Return_Level_${state.T}yr_mm`]) rp.value = String(state.T);
}

function setIndicator(key) {
  if (!indicators[key]) return;
  state.indicator = key;
  $('indicatorSelect').value = key;
  const m = key.match(/^Return_Level_(\d+)yr_mm$/);
  if (m) { state.T = +m[1]; $('returnPeriod').value = m[1]; }
  refreshMap();
}

function setReturnPeriod(T) { setIndicator(`Return_Level_${T}yr_mm`); }

function refreshMap() {
  Object.entries(layersByKey).forEach(([k, l]) => l.setStyle(styleFor(k)));
  renderLegend();
  renderRanking();
  updateHorizon(state.years);
  if (state.selected) renderBrief(state.selected);
}

function renderLegend() {
  const ind = indicators[state.indicator];
  if (!ind) return;
  const { min, step, ok } = breaks();
  $('legend-title').textContent = `${ind.label} (${ind.unit})`;
  if (!ok) { $('legend-bar').innerHTML = ''; $('legend-range').textContent = 'No numeric values for this indicator.'; return; }
  $('legend-bar').innerHTML = COLORS.map((c, i) => {
    const lo = min + i * step, hi = min + (i + 1) * step;
    return `<div class="sus-class" style="background:${c};color:${c === '#ffffbf' ? '#333' : '#fff'}" title="${CLASS_NAMES[i]}: ${fmt(lo, ind.dec)}–${fmt(hi, ind.dec)}">${CLASS_NAMES[i]}</div>`;
  }).join('');
  $('legend-range').textContent = `Equal-interval classes: ${fmt(min, ind.dec)} – ${fmt(min + 5 * step, ind.dec)} ${ind.unit}`;
}

function renderRanking() {
  const ind = indicators[state.indicator];
  if (!ind) return;
  const rows = Object.values(data)
    .filter(r => Number.isFinite(r[state.indicator]))
    .sort((a, b) => b[state.indicator] - a[state.indicator]);
  const top = rows.slice(0, 10);
  $('ranking').innerHTML = `<table class="forecast-table rank-table"><thead><tr><th>#</th><th style="text-align:left">District</th><th>${esc(ind.unit)}</th></tr></thead><tbody>` +
    top.map((r, i) =>
      `<tr onclick="selectDistrict('${norm(r.District)}', true)" style="cursor:pointer"><td>${i + 1}</td><td style="text-align:left">${esc(r.District)}</td><td><b>${fmt(r[state.indicator], ind.dec)}</b></td></tr>`
    ).join('') + `</tbody></table><p class="note">Top ${top.length} of ${rows.length} districts · click a row to open it.</p>`;
}

// ---------- district selection ----------
function selectDistrict(key, jumpToTab) {
  if (!data[key]) return;
  const prev = state.selected;
  state.selected = key;
  if (prev && layersByKey[prev]) layersByKey[prev].setStyle(styleFor(prev));
  const layer = layersByKey[key];
  if (layer) {
    layer.setStyle(styleFor(key));
    map.fitBounds(layer.getBounds(), { maxZoom: 10 });
  }
  renderBrief(key);
  if (jumpToTab) switchTab('districts');
  loadForecast(layer ? layer.getBounds().getCenter() : map.getCenter(), data[key].District);
}

function renderBrief(key) {
  const r = data[key], ind = indicators[state.indicator];
  if (!r || !ind) return;
  const c = classOf(r[state.indicator]);
  $('woreda-brief-card').style.display = 'block';
  $('brief-woreda-name').textContent = r.District;
  $('brief-woreda-region').textContent = [r.Region_ADMIN1 && `${r.Region_ADMIN1} Region`, r.Zone_ADMIN2 && `${r.Zone_ADMIN2} Zone`].filter(Boolean).join(' · ') || 'Admin level 3';
  $('brief-class').innerHTML = `${esc(ind.label)}: <strong>${fmt(r[state.indicator], ind.dec)} ${esc(ind.unit)}</strong> · class <strong>${c >= 0 ? CLASS_NAMES[c] : 'no data'}</strong>`;
  $('brief-stats').innerHTML = Object.entries(indicators)
    .map(([k, v]) => `<tr><td>${esc(v.label)}</td><td><b>${fmt(r[k], v.dec)}</b> ${esc(v.unit)}</td></tr>`).join('');
  const rl = r[`Return_Level_${state.T}yr_mm`];
  $('brief-design').textContent = Number.isFinite(rl)
    ? `Design depth guidance: ${fmt(rl, 1)} mm/day (${state.T}-year return level).` : '';
}

let searchTimer = null;
function filterWoreda(query) {
  clearTimeout(searchTimer);                         // debounce: one map move per pause, not per keystroke
  searchTimer = setTimeout(() => {
    const q = norm(query);
    if (q.length < 2) return;
    const rows = Object.entries(data);
    const hit = rows.find(([k]) => k === q) || rows.find(([k]) => k.includes(q));
    if (hit) return selectDistrict(hit[0]);
    // otherwise try a zone / region name and zoom to that group
    const group = rows.filter(([, r]) => norm(r.Zone_ADMIN2).includes(q) || norm(r.Region_ADMIN1).includes(q))
      .map(([k]) => layersByKey[k]).filter(Boolean);
    if (group.length) map.fitBounds(L.featureGroup(group).getBounds(), { padding: [20, 20] });
  }, 250);
}

// ---------- UI handlers ----------
function switchTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tabId));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('active', c.id === `tab-${tabId}`));
}

function toggleLayer(name, on) {
  if (name === 'districts' && geoLayer) on ? map.addLayer(geoLayer) : map.removeLayer(geoLayer);
  else if (name === 'susceptibility') {
    state.rasterOn = on;
    on ? activeRaster.addTo(map) : map.removeLayer(activeRaster);
  }
}

// Probability of at least one T-year event in n years: 1 - (1 - 1/T)^n
function updateHorizon(years) {
  state.years = +years;
  $('horizonVal').textContent = `${years} year${+years === 1 ? '' : 's'}`;
  const risk = (1 - Math.pow(1 - 1 / state.T, years)) * 100;
  $('horizonRisk').textContent = `${Math.round(risk)}%`;
  $('horizonText').textContent = `chance of at least one ${state.T}-year magnitude event within ${years} year${+years === 1 ? '' : 's'}`;
}

async function shareLink(btn) {
  const url = location.href;
  try {
    if (navigator.share) { await navigator.share({ title: document.title, url }); return; }
    await navigator.clipboard.writeText(url);
    const old = btn.textContent; btn.textContent = 'Link copied';
    setTimeout(() => { btn.textContent = old; }, 1500);
  } catch (e) {
    if (e && e.name === 'AbortError') return;        // user closed the share sheet
    window.prompt('Copy this link:', url);
  }
}

// ---------- Open-Meteo 7-day forecast (for the selected district centre) ----------
let forecastToken = 0;
async function loadForecast(latlng, name) {
  const token = ++forecastToken;                     // ignore stale responses if the user clicks quickly
  const c = $('forecast-container');
  $('forecast-title').textContent = `Next 7 days · model forecast · ${name}`;
  c.textContent = 'Loading model forecast...';
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latlng.lat.toFixed(4)}&longitude=${latlng.lng.toFixed(4)}` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max&timezone=Africa%2FAddis_Ababa`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(res.status);
    const d = (await res.json()).daily;
    if (token !== forecastToken) return;
    const days = d.time.map((t, i) => i === 0 ? 'Today' : new Date(t + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' }));
    const row = (label, fn) => `<tr><td style="font-weight:600;text-align:left">${label}</td>${d.time.map((_, i) => `<td>${fn(i)}</td>`).join('')}</tr>`;
    c.innerHTML = `<table class="forecast-table"><thead><tr><th>Metric</th>${days.map(n => `<th>${n}</th>`).join('')}</tr></thead><tbody>` +
      row('Temp °C', i => `${Math.round(d.temperature_2m_max[i])}°<br>${Math.round(d.temperature_2m_min[i])}°`) +
      row('Rain mm', i => { const r = d.precipitation_sum[i] ?? 0; return `<b style="color:${r >= 30 ? '#e11d48' : '#0284c7'}">${r.toFixed(1)}</b>`; }) +
      row('Chance', i => `${d.precipitation_probability_max[i] ?? 0}%`) + `</tbody></table>`;
  } catch (e) {
    if (token !== forecastToken) return;
    c.textContent = 'Forecast unavailable (offline or service error).';
  }
}

// ---------- Rule-based assistant (answers only from the CSV) ----------
function answer(text) {
  const q = text.toLowerCase(), nq = norm(q);
  const rows = Object.values(data);
  if (!rows.length) return 'The district table is not loaded yet.';
  // longest matching name wins, so "Adama town" is not read as "Adama"
  const hit = rows.filter(r => nq.includes(norm(r.District))).sort((a, b) => norm(b.District).length - norm(a.District).length)[0];
  const T = (q.match(/\b(10|25|50)[\s-]*(yr|year)/) || [])[1] || state.T;
  const rl = `Return_Level_${T}yr_mm`;
  const hasRL = rows.some(r => Number.isFinite(r[rl]));
  if (/\b(tomorrow|next week|this week|forecast)\b/.test(q) || /\bwill\b.*\bflood/.test(q) || /flood.*\b20\d\d\b/.test(q))
    return 'This dashboard gives long-term planning statistics, not operational forecasts. Use the 7-day model forecast on the Rainfall hazard tab and official NMA/EDRMC warnings.';
  if (hasRL && /(highest|most|worst|top)/.test(q)) {
    const t = [...rows].sort((a, b) => b[rl] - a[rl]).slice(0, 3);
    return `Highest ${T}-year daily rainfall: ${t.map(r => `${r.District} (${fmt(r[rl], 1)} mm)`).join(', ')}.`;
  }
  if (hasRL && /(lowest|least|driest)/.test(q)) {
    const t = [...rows].sort((a, b) => a[rl] - b[rl]).slice(0, 3);
    return `Lowest ${T}-year daily rainfall: ${t.map(r => `${r.District} (${fmt(r[rl], 1)} mm)`).join(', ')}.`;
  }
  if (hit) {
    return `${hit.District} (${[hit.Zone_ADMIN2, hit.Region_ADMIN1].filter(Boolean).join(', ')}): ` +
      `${fmt(hit.Return_Level_10yr_mm, 1)} / ${fmt(hit.Return_Level_25yr_mm, 1)} / ${fmt(hit.Return_Level_50yr_mm, 1)} mm/day for 10/25/50-year return periods; ` +
      `mean annual rainfall ${fmt(hit.Mean_Annual_Rainfall_mm, 0)} mm; ${fmt(hit.Heavy_Days_30mm_yr, 1)} days/yr ≥ 30 mm; max recorded daily ${fmt(hit.Max_Recorded_Daily_mm, 1)} mm.`;
  }
  return 'Try a district name (e.g. "Mojo town"), or ask "highest 25-year rainfall" or "driest district". This tool shows planning statistics, not forecasts.';
}

function sendQuery() {
  const input = $('chatInput'), win = $('chatWindow'), text = input.value.trim();
  if (!text) return;
  win.insertAdjacentHTML('beforeend', `<div class="chat-msg user"><b>You:</b> ${esc(text)}</div>`);
  win.insertAdjacentHTML('beforeend', `<div class="chat-msg bot"><b>Assistant:</b> ${esc(answer(text))}</div>`);
  input.value = '';
  win.scrollTop = win.scrollHeight;
}

// ---------- init ----------
(async function init() {
  let tableOk = false;
  try {
    await loadTable();
    tableOk = true;
    buildIndicatorMenu();
    const n = districtCount();
    document.querySelectorAll('.n-districts').forEach(el => { el.textContent = n; });
    $('districtList').innerHTML = Object.values(data).map(r => `<option value="${esc(r.District)}">`).join('');
    renderLegend(); renderRanking(); updateHorizon(state.years);
  } catch (err) {
    console.error(err);
    showStatus(`⚠ Could not load rainfall table: ${esc(err.message)}.<br>Open the page through a web server and check file names in CONFIG (top of app.js).`);
  }
  if (tableOk) {
    try { await loadBoundaries(); }
    catch (err) {
      console.error(err);
      showStatus(`⚠ Could not load district boundaries: ${esc(err.message)}`);
    }
  }
  loadForecast(map.getCenter(), 'study area centre');
})();
