window.HOME_HUB_CONFIG = {
  refresh: {
    clockMs: 1000,
    weatherMs: 60000,
    transportMs: 5000
  },
  request: {
    timeoutMs: 8000
  },
  weather: {
    current: "https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=rhrread&lang={lang}",
    warnsum: "https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=warnsum&lang={lang}",
    warningInfo: "https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=warningInfo&lang={lang}",
    forecast: "https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=fnd&lang={lang}"
  },
  transport: {
    citybus: {
      stopId: "001148",
      stopName: {
        en: "Seymour Road, Robinson Road",
        tc: "羅便臣道西摩道"
      },
      stopEndpoint: "https://rt.data.gov.hk/v2/transport/citybus/stop/{stop}",
      etaEndpoint: "https://rt.data.gov.hk/v2/transport/citybus/eta/CTB/{stop}/{route}",
      routes: [
        { key: "ctb23", route: "23", dir: "I" },
        { key: "ctb40", route: "40", dir: "O" }
      ]
    },
    gmb: {
      key: "gmb56a",
      routeCode: "56A",
      region: "HKI",
      routeId: 2001130,
      routeSeq: 1,
      stopSeq: 6,
      stopName: {
        en: "Robinson Road, outside Carlos Court",
        tc: "羅便臣道嘉和苑外"
      },
      destination: {
        en: "Tin Hau Station",
        tc: "天后站"
      },
      routeInfoEndpoint: "https://data.etagmb.gov.hk/route/HKI/56A",
      routeStopEndpoint: "https://data.etagmb.gov.hk/route-stop/{routeId}/{routeSeq}",
      etaEndpoint: "https://data.etagmb.gov.hk/eta/route-stop/{routeId}/{routeSeq}/{stopSeq}"
    }
  },
  ui: {
    maxEtaRows: 3,
    warningSummaryLines: 2,
    staleAfterMinutes: 5,
    defaultLang: "en"
  }
};