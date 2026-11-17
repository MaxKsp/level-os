import type {Metric} from 'web-vitals'

function sendMetric(metric: Metric): void {
  const payload = JSON.stringify({
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    path: window.location.pathname,
  })

  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/web-vitals.php', new Blob([payload], {type: 'application/json'}))
    return
  }

  void fetch('/api/web-vitals.php', {
    method: 'POST',
    credentials: 'same-origin',
    keepalive: true,
    headers: {'Content-Type': 'application/json'},
    body: payload,
  }).catch(() => undefined)
}

export function startWebVitalsMonitoring(): void {
  const load = () => {
    void import('web-vitals').then(({onCLS, onINP, onLCP}) => {
      onCLS(sendMetric)
      onINP(sendMetric)
      onLCP(sendMetric)
    })
  }

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(load, {timeout: 4000})
  } else {
    globalThis.setTimeout(load, 1500)
  }
}
