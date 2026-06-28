(function () {
  "use strict";

  var config = window.HOME_HUB_CONFIG;

  var state = {
    lang: config.ui.defaultLang,
    now: new Date(),
    weather: null,
    warnsum: null,
    warningInfo: null,
    lastWeatherFetch: null,
    transport: {
      citybusStop: null,
      citybus: {},
      gmbRows: [],
      gmbStop: null,
      gmbDirection: null
    },
    lastTransportFetch: null
  };

  var i18n = {
    en: {
      weatherTitle: "Weather",
      tempLabel: "Temperature",
      humidityLabel: "Relative Humidity",
      rainLabel: "Rainfall (max district)",
      tipsTitle: "Special Tips",
      warningsTitle: "Active Warnings",
      noWarnings: "No active warning signal",
      transportTitle: "Bus and Minibus ETA",
      transportSubtitle: "Robinson Road commute view",
      noEta: "No ETA available at this moment",
      now: "Now",
      min: "min",
      weatherUpdated: "Weather updated",
      transportUpdated: "Transport updated",
      stale: "Data may be stale",
      loading: "Loading data...",
      destination: "Destination",
      stop: "Stop",
      route23Label: "Citybus 23",
      route40Label: "Citybus 40",
      route56aLabel: "GMB 56A",
      fallbackTip: "No special weather tip right now.",
      unknown: "--"
    },
    tc: {
      weatherTitle: "天氣",
      tempLabel: "溫度",
      humidityLabel: "相對濕度",
      rainLabel: "雨量 (各區最高)",
      tipsTitle: "天氣提示",
      warningsTitle: "現行警告",
      noWarnings: "現時沒有生效警告",
      transportTitle: "巴士及小巴到站時間",
      transportSubtitle: "羅便臣道通勤模式",
      noEta: "暫時未有到站資料",
      now: "即將到站",
      min: "分鐘",
      weatherUpdated: "天氣更新",
      transportUpdated: "交通更新",
      stale: "資料可能延遲",
      loading: "正在載入資料...",
      destination: "目的地",
      stop: "上車站",
      route23Label: "城巴 23",
      route40Label: "城巴 40",
      route56aLabel: "小巴 56A",
      fallbackTip: "暫時沒有特別天氣提示。",
      unknown: "--"
    }
  };

  var refs = {
    app: byId("app"),
    rainLayer: byId("rainLayer"),
    clockValue: byId("clockValue"),
    dateValue: byId("dateValue"),
    syncStatus: byId("syncStatus"),
    langToggle: byId("langToggle"),
    weatherTitle: byId("weatherTitle"),
    weatherIcon: byId("weatherIcon"),
    tempLabel: byId("tempLabel"),
    tempValue: byId("tempValue"),
    humidityLabel: byId("humidityLabel"),
    humidityValue: byId("humidityValue"),
    rainLabel: byId("rainLabel"),
    rainValue: byId("rainValue"),
    tipsTitle: byId("tipsTitle"),
    specialTips: byId("specialTips"),
    warningsTitle: byId("warningsTitle"),
    warningChips: byId("warningChips"),
    warningDetails: byId("warningDetails"),
    transportTitle: byId("transportTitle"),
    transportSubtitle: byId("transportSubtitle"),
    transportCards: byId("transportCards")
  };

  function byId(id) {
    return document.getElementById(id);
  }

  function tr(key) {
    return i18n[state.lang][key] || i18n.en[key] || key;
  }

  function langCode() {
    return state.lang === "tc" ? "tc" : "en";
  }

  function formatDateTime(value) {
    if (!value) {
      return tr("unknown");
    }

    var dt = new Date(value);
    if (Number.isNaN(dt.getTime())) {
      return tr("unknown");
    }

    return dt.toLocaleTimeString(state.lang === "tc" ? "zh-HK" : "en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });
  }

  function minutesUntil(value) {
    var dt = new Date(value);
    if (Number.isNaN(dt.getTime())) {
      return null;
    }

    var diffMs = dt.getTime() - state.now.getTime();
    var mins = Math.floor(diffMs / 60000);
    if (mins < 0) {
      mins = 0;
    }
    return mins;
  }

  function formatMinutes(mins) {
    if (mins === null || mins === undefined) {
      return tr("unknown");
    }
    if (mins <= 0) {
      return tr("now");
    }
    return mins + " " + tr("min");
  }

  function fetchJson(url) {
    var timeoutMs = config.request.timeoutMs;
    var timer;

    var timeoutPromise = new Promise(function (_, reject) {
      timer = setTimeout(function () {
        reject(new Error("Request timeout"));
      }, timeoutMs);
    });

    var fetchPromise = fetch(url, { cache: "no-store" }).then(function (response) {
      if (!response.ok) {
        throw new Error("HTTP " + response.status);
      }
      return response.json();
    });

    return Promise.race([fetchPromise, timeoutPromise]).finally(function () {
      clearTimeout(timer);
    });
  }

  function replaceTemplate(template, values) {
    var url = template;
    Object.keys(values).forEach(function (key) {
      url = url.replace("{" + key + "}", values[key]);
    });
    return url;
  }

  function readLangField(object, base) {
    if (!object) {
      return "";
    }
    return state.lang === "tc" ? object[base + "_tc"] || object[base + "_en"] || "" : object[base + "_en"] || object[base + "_tc"] || "";
  }

  function readCitybusField(item, base) {
    if (!item) {
      return "";
    }
    return state.lang === "tc" ? item[base + "_tc"] || item[base + "_en"] || "" : item[base + "_en"] || item[base + "_tc"] || "";
  }

  function setText(node, value) {
    node.textContent = value;
  }

  function currentTemperature() {
    if (!state.weather || !state.weather.temperature || !Array.isArray(state.weather.temperature.data)) {
      return null;
    }

    var stations = state.weather.temperature.data;
    var station = stations.find(function (entry) {
      return entry.place === "Hong Kong Observatory" || entry.place === "香港天文台";
    }) || stations[0];

    if (!station || station.value === undefined || station.value === null) {
      return null;
    }

    return Number(station.value);
  }

  function currentHumidity() {
    if (!state.weather || !state.weather.humidity || !Array.isArray(state.weather.humidity.data)) {
      return null;
    }

    var first = state.weather.humidity.data[0];
    return first && first.value !== undefined ? Number(first.value) : null;
  }

  function maxRainfall() {
    if (!state.weather || !state.weather.rainfall || !Array.isArray(state.weather.rainfall.data)) {
      return null;
    }

    var max = null;
    state.weather.rainfall.data.forEach(function (item) {
      if (item.max !== undefined && item.max !== null) {
        var value = Number(item.max);
        if (!Number.isNaN(value)) {
          max = max === null ? value : Math.max(max, value);
        }
      }
    });
    return max;
  }

  function setTheme() {
    var warningCodes = state.warnsum ? Object.keys(state.warnsum) : [];
    var temp = currentTemperature();
    var rain = maxRainfall();

    var hasTyphoonLike = warningCodes.some(function (code) {
      return code.indexOf("TC") === 0 || code === "WTS";
    });

    var themeClass = "theme-clear";
    if (hasTyphoonLike) {
      themeClass = "theme-storm";
    } else if (rain !== null && rain > 0) {
      themeClass = "theme-rain";
    } else if (temp !== null && temp >= 31) {
      themeClass = "theme-hot";
    }

    refs.app.className = "app " + themeClass;

    if (themeClass === "theme-rain" || themeClass === "theme-storm") {
      refs.rainLayer.classList.remove("hidden");
    } else {
      refs.rainLayer.classList.add("hidden");
    }
  }

  function renderStaticText() {
    setText(refs.weatherTitle, tr("weatherTitle"));
    setText(refs.tempLabel, tr("tempLabel"));
    setText(refs.humidityLabel, tr("humidityLabel"));
    setText(refs.rainLabel, tr("rainLabel"));
    setText(refs.tipsTitle, tr("tipsTitle"));
    setText(refs.warningsTitle, tr("warningsTitle"));
    setText(refs.transportTitle, tr("transportTitle"));
    setText(refs.transportSubtitle, tr("transportSubtitle"));
    refs.langToggle.textContent = state.lang === "en" ? "繁中" : "EN";
  }

  function renderClock() {
    refs.clockValue.textContent = state.now.toLocaleTimeString(state.lang === "tc" ? "zh-HK" : "en-GB", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });

    refs.dateValue.textContent = state.now.toLocaleDateString(state.lang === "tc" ? "zh-HK" : "en-GB", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  }

  function renderSyncStatus() {
    var weatherText = tr("weatherUpdated") + ": " + formatDateTime(state.lastWeatherFetch);
    var transportText = tr("transportUpdated") + ": " + formatDateTime(state.lastTransportFetch);

    var stale = false;
    if (state.lastTransportFetch) {
      var transportAgeMs = state.now.getTime() - new Date(state.lastTransportFetch).getTime();
      stale = transportAgeMs > config.ui.staleAfterMinutes * 60000;
    }

    var status = weatherText + " | " + transportText;
    if (stale) {
      status += " | " + tr("stale");
    }
    refs.syncStatus.textContent = status;
  }

  function renderWeather() {
    if (!state.weather) {
      refs.tempValue.textContent = tr("unknown");
      refs.humidityValue.textContent = tr("unknown");
      refs.rainValue.textContent = tr("unknown");
      refs.specialTips.textContent = tr("loading");
      refs.weatherIcon.removeAttribute("src");
      refs.weatherIcon.alt = tr("weatherTitle");
      return;
    }

    var temp = currentTemperature();
    var humidity = currentHumidity();
    var rain = maxRainfall();

    refs.tempValue.textContent = temp === null ? tr("unknown") : temp + " C";
    refs.humidityValue.textContent = humidity === null ? tr("unknown") : humidity + " %";
    refs.rainValue.textContent = rain === null ? tr("unknown") : rain + " mm";

    var tips = Array.isArray(state.weather.specialWxTips) && state.weather.specialWxTips.length
      ? state.weather.specialWxTips.join(" ")
      : tr("fallbackTip");
    refs.specialTips.textContent = tips;

    if (Array.isArray(state.weather.icon) && state.weather.icon.length) {
      var iconCode = state.weather.icon[0];
      refs.weatherIcon.src = "https://www.hko.gov.hk/images/HKOWxIconOutline/pic" + iconCode + ".png";
      refs.weatherIcon.alt = tr("weatherTitle") + " " + iconCode;
    }
  }

  function warningClass(code) {
    if (code.indexOf("WRAIN") === 0) {
      return "rain";
    }
    if (code.indexOf("TC") === 0) {
      return "typhoon";
    }
    if (code === "WTS") {
      return "storm";
    }
    return "";
  }

  function warningIconLabel(code) {
    if (code.indexOf("WRAIN") === 0) {
      return code.slice(-1);
    }
    if (code.indexOf("TC") === 0) {
      return code.replace("TC", "T");
    }
    if (code === "WTS") {
      return "TS";
    }
    if (code.length > 3) {
      return code.slice(0, 3);
    }
    return code;
  }

  function warningIconTone(code) {
    if (code.indexOf("WRAIN") === 0) {
      var colorCode = code.slice(-1);
      if (colorCode === "A") {
        return "amber";
      }
      if (colorCode === "R") {
        return "red";
      }
      if (colorCode === "B") {
        return "black";
      }
    }
    if (code.indexOf("TC") === 0) {
      return "typhoon";
    }
    if (code === "WTS") {
      return "storm";
    }
    return "default";
  }

  function transportIconSvg(mode) {
    if (mode === "gmb") {
      return [
        "<svg viewBox='0 0 24 24' aria-hidden='true' focusable='false'>",
        "<rect x='2' y='6' width='20' height='12' rx='3' fill='none' stroke='currentColor' stroke-width='1.8'></rect>",
        "<path d='M6 6v12M18 6v12' stroke='currentColor' stroke-width='1.5'></path>",
        "<circle cx='7.5' cy='18.5' r='1.8' fill='currentColor'></circle>",
        "<circle cx='16.5' cy='18.5' r='1.8' fill='currentColor'></circle>",
        "</svg>"
      ].join("");
    }

    return [
      "<svg viewBox='0 0 24 24' aria-hidden='true' focusable='false'>",
      "<rect x='2' y='5' width='20' height='13' rx='2.6' fill='none' stroke='currentColor' stroke-width='1.8'></rect>",
      "<path d='M6 5h12v5H6z' fill='currentColor' opacity='0.28'></path>",
      "<circle cx='7' cy='19' r='2' fill='currentColor'></circle>",
      "<circle cx='17' cy='19' r='2' fill='currentColor'></circle>",
      "</svg>"
    ].join("");
  }

  function renderWarnings() {
    refs.warningChips.innerHTML = "";
    refs.warningDetails.innerHTML = "";

    if (!state.warnsum || !Object.keys(state.warnsum).length) {
      var emptyChip = document.createElement("span");
      emptyChip.className = "warning-chip";
      emptyChip.textContent = tr("noWarnings");
      refs.warningChips.appendChild(emptyChip);
      return;
    }

    Object.keys(state.warnsum).sort().forEach(function (code) {
      var item = state.warnsum[code];
      var chip = document.createElement("span");
      var cls = warningClass(code);
      var tone = warningIconTone(code);
      chip.className = "warning-chip" + (cls ? " " + cls : "");
      chip.innerHTML = [
        "<span class='signal-icon signal-" + tone + "'>" + escapeHtml(warningIconLabel(code)) + "</span>",
        "<span class='signal-text'>" + escapeHtml(code + " " + (item.name || "")) + "</span>"
      ].join("");
      refs.warningChips.appendChild(chip);
    });

    if (state.warningInfo && Array.isArray(state.warningInfo.details)) {
      var lines = [];
      state.warningInfo.details.forEach(function (detail) {
        if (Array.isArray(detail.contents)) {
          detail.contents.forEach(function (line) {
            var trimmed = String(line || "").trim();
            if (trimmed && lines.indexOf(trimmed) === -1) {
              lines.push(trimmed);
            }
          });
        }
      });

      lines.slice(0, 2).forEach(function (line) {
        var li = document.createElement("li");
        li.textContent = line;
        refs.warningDetails.appendChild(li);
      });
    }
  }

  function citybusRows(route) {
    var list = state.transport.citybus[route] || [];
    return list.slice(0, config.ui.maxEtaRows).map(function (row) {
      return {
        mins: minutesUntil(row.eta),
        etaTime: formatDateTime(row.eta),
        remark: readCitybusField(row, "rmk"),
        destination: readCitybusField(row, "dest")
      };
    });
  }

  function gmbRows() {
    return state.transport.gmbRows.slice(0, config.ui.maxEtaRows).map(function (row) {
      var remark = state.lang === "tc" ? row.remarks_tc || row.remarks_en || "" : row.remarks_en || row.remarks_tc || "";
      return {
        mins: minutesUntil(row.timestamp),
        etaTime: formatDateTime(row.timestamp),
        remark: remark,
        destination: ""
      };
    });
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function routeCardHtml(label, stopName, destination, rows, routeBadge, mode) {
    var etaHtml = "";

    if (!rows.length) {
      etaHtml = "<div class=\"empty-row\">" + escapeHtml(tr("noEta")) + "</div>";
    } else {
      etaHtml = "<div class=\"eta-list\">" + rows.map(function (row) {
        return [
          "<div class=\"eta-item\">",
          "<div class=\"eta-mins\">" + escapeHtml(formatMinutes(row.mins)) + "</div>",
          "<div class=\"eta-time\">" + escapeHtml(row.etaTime) + "</div>",
          "<div class=\"eta-remark\">" + escapeHtml(row.remark || "") + "</div>",
          "</div>"
        ].join("");
      }).join("") + "</div>";
    }

    return [
      "<article class=\"route-card\">",
      "<div class=\"route-top\">",
      "<div class=\"route-badge\">",
      "<span class=\"route-icon\">" + transportIconSvg(mode) + "</span>",
      "<span>" + escapeHtml(routeBadge) + "</span>",
      "</div>",
      "<div class=\"route-destination\">" + escapeHtml(tr("destination")) + ": " + escapeHtml(destination || tr("unknown")) + "</div>",
      "</div>",
      "<div class=\"route-stop\"><strong>" + escapeHtml(label) + "</strong><br>" + escapeHtml(tr("stop")) + ": " + escapeHtml(stopName || tr("unknown")) + "</div>",
      etaHtml,
      "</article>"
    ].join("");
  }

  function renderTransport() {
    var stopName = state.transport.citybusStop ? readLangField(state.transport.citybusStop, "name") : "";
    var rows23 = citybusRows("23");
    var rows40 = citybusRows("40");
    var rows56a = gmbRows();

    var dest23 = rows23.length ? rows23[0].destination : "";
    var dest40 = rows40.length ? rows40[0].destination : "";
    var dest56a = state.transport.gmbDirection ? readLangField(state.transport.gmbDirection, "dest") : "";
    var stop56a = state.transport.gmbStop ? readLangField(state.transport.gmbStop, "name") : "";

    refs.transportCards.innerHTML = [
      routeCardHtml(tr("route23Label"), stopName, dest23, rows23, "CTB 23", "citybus"),
      routeCardHtml(tr("route40Label"), stopName, dest40, rows40, "CTB 40", "citybus"),
      routeCardHtml(tr("route56aLabel"), stop56a, dest56a, rows56a, "GMB 56A", "gmb")
    ].join("");
  }

  function renderAll() {
    renderStaticText();
    renderClock();
    renderSyncStatus();
    renderWeather();
    renderWarnings();
    renderTransport();
    setTheme();
  }

  function fetchWeatherAll() {
    var lang = langCode();

    var currentUrl = replaceTemplate(config.weather.current, { lang: lang });
    var warnsumUrl = replaceTemplate(config.weather.warnsum, { lang: lang });
    var warningInfoUrl = replaceTemplate(config.weather.warningInfo, { lang: lang });

    return Promise.allSettled([
      fetchJson(currentUrl),
      fetchJson(warnsumUrl),
      fetchJson(warningInfoUrl)
    ]).then(function (results) {
      if (results[0].status === "fulfilled") {
        state.weather = results[0].value;
      }
      if (results[1].status === "fulfilled") {
        state.warnsum = results[1].value;
      }
      if (results[2].status === "fulfilled") {
        state.warningInfo = results[2].value;
      }
      state.lastWeatherFetch = new Date().toISOString();
      renderAll();
    }).catch(function (error) {
      console.error("Weather fetch failed", error);
      renderAll();
    });
  }

  function fetchTransportMeta() {
    var stopUrl = replaceTemplate(config.transport.citybus.stopEndpoint, { stop: config.transport.citybus.stopId });
    var gmbStopUrl = replaceTemplate(config.transport.gmb.routeStopEndpoint, {
      routeId: config.transport.gmb.routeId,
      routeSeq: config.transport.gmb.routeSeq
    });

    return Promise.allSettled([
      fetchJson(stopUrl),
      fetchJson(gmbStopUrl),
      fetchJson(config.transport.gmb.routeInfoEndpoint)
    ]).then(function (results) {
      if (results[0].status === "fulfilled" && results[0].value && results[0].value.data) {
        state.transport.citybusStop = results[0].value.data;
      }

      if (results[1].status === "fulfilled" && results[1].value && results[1].value.data) {
        var stops = results[1].value.data.route_stops || [];
        state.transport.gmbStop = stops.find(function (entry) {
          return Number(entry.stop_seq) === Number(config.transport.gmb.stopSeq);
        }) || null;
      }

      if (results[2].status === "fulfilled" && results[2].value && Array.isArray(results[2].value.data)) {
        var routeInfo = results[2].value.data.find(function (route) {
          return Number(route.route_id) === Number(config.transport.gmb.routeId);
        }) || results[2].value.data[0];

        if (routeInfo && Array.isArray(routeInfo.directions)) {
          state.transport.gmbDirection = routeInfo.directions.find(function (direction) {
            return Number(direction.route_seq) === Number(config.transport.gmb.routeSeq);
          }) || routeInfo.directions[0];
        }
      }

      renderAll();
    }).catch(function (error) {
      console.error("Transport meta fetch failed", error);
    });
  }

  function fetchCitybusRoute(routeInfo) {
    var url = replaceTemplate(config.transport.citybus.etaEndpoint, {
      stop: config.transport.citybus.stopId,
      route: routeInfo.route
    });

    return fetchJson(url).then(function (payload) {
      var rows = Array.isArray(payload.data) ? payload.data : [];
      return rows.filter(function (row) {
        return row.dir === routeInfo.dir && row.stop === config.transport.citybus.stopId;
      }).sort(function (a, b) {
        return new Date(a.eta).getTime() - new Date(b.eta).getTime();
      });
    });
  }

  function fetchGmbEta() {
    var url = replaceTemplate(config.transport.gmb.etaEndpoint, {
      routeId: config.transport.gmb.routeId,
      routeSeq: config.transport.gmb.routeSeq,
      stopSeq: config.transport.gmb.stopSeq
    });

    return fetchJson(url).then(function (payload) {
      if (!payload || !payload.data || !Array.isArray(payload.data.eta)) {
        return [];
      }
      return payload.data.eta.slice().sort(function (a, b) {
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      });
    });
  }

  function fetchTransportAll() {
    var routePromises = config.transport.citybus.routes.map(function (routeInfo) {
      return fetchCitybusRoute(routeInfo).then(function (rows) {
        state.transport.citybus[routeInfo.route] = rows;
      }).catch(function (error) {
        console.error("Citybus ETA failed for route", routeInfo.route, error);
        state.transport.citybus[routeInfo.route] = state.transport.citybus[routeInfo.route] || [];
      });
    });

    var gmbPromise = fetchGmbEta().then(function (rows) {
      state.transport.gmbRows = rows;
    }).catch(function (error) {
      console.error("GMB ETA failed", error);
      state.transport.gmbRows = state.transport.gmbRows || [];
    });

    return Promise.all(routePromises.concat([gmbPromise])).then(function () {
      state.lastTransportFetch = new Date().toISOString();
      renderAll();
    });
  }

  function onLanguageToggle() {
    state.lang = state.lang === "en" ? "tc" : "en";
    renderAll();
    fetchWeatherAll();
  }

  function tick() {
    state.now = new Date();
    renderClock();
    renderSyncStatus();
    renderTransport();
  }

  function init() {
    refs.langToggle.addEventListener("click", onLanguageToggle);

    state.now = new Date();
    renderAll();

    fetchTransportMeta();
    fetchWeatherAll();
    fetchTransportAll();

    setInterval(tick, config.refresh.clockMs);
    setInterval(fetchWeatherAll, config.refresh.weatherMs);
    setInterval(fetchTransportAll, config.refresh.transportMs);
  }

  init();
})();