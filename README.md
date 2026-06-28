# Home Hub Dashboard (GitHub Pages)

Static one-page dashboard for iPad showing:

- Hong Kong Observatory weather and warning signals
- Citybus ETA for routes 23 and 40 from Robinson Road (Seymour Road stop)
- GMB 56A ETA from Robinson Road (outside Carlos Court)
- EN / Traditional Chinese toggle
- 5-second transport refresh with live countdown

## Files

- index.html: page layout
- styles.css: responsive UI, weather-reactive graphics
- config.js: routes, stop bindings, polling intervals
- app.js: data fetch, rendering, language toggle, countdown logic

## Data Sources

### HKO

- Current weather:
  - https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=rhrread&lang=en
- Warning summary:
  - https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=warnsum&lang=en
- Warning details:
  - https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=warningInfo&lang=en

### Citybus

- ETA template:
  - https://rt.data.gov.hk/v2/transport/citybus/eta/CTB/{stop_id}/{route}
- Stop template:
  - https://rt.data.gov.hk/v2/transport/citybus/stop/{stop_id}

Current configuration:

- Shared stop for route 23 and 40: 001148
- Route 23 filter direction: I
- Route 40 filter direction: O

### GMB

- Route lookup:
  - https://data.etagmb.gov.hk/route/HKI/56A
- Route stop template:
  - https://data.etagmb.gov.hk/route-stop/{route_id}/{route_seq}
- ETA template:
  - https://data.etagmb.gov.hk/eta/route-stop/{route_id}/{route_seq}/{stop_seq}

Current configuration:

- route_id: 2001130
- route_seq: 1
- stop_seq: 6

## Configuration

Edit config.js to change:

- polling intervals
- route/stop IDs
- stale data threshold
- default language

## GitHub Pages Deployment

1. Create a GitHub repository.
2. Upload all files to the repository root.
3. In repository Settings -> Pages:
   - Source: Deploy from branch
   - Branch: main
   - Folder: /(root)
4. Open the generated Pages URL on iPad Safari.

## Notes

- If one API is temporarily slow, last successful values stay visible.
- Weather updates every 60 seconds; transport updates every 5 seconds.
- Countdown labels update every second without waiting for network refresh.