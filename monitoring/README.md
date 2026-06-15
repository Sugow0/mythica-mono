# Monitoring & Observabilité

Stack locale couvrant les **3 piliers** : logs, métriques, (traces non couvertes —
voir justification plus bas).

## Lancer la stack

```bash
# 1. Démarrer un service instrumenté (le gateway expose /metrics)
bun run dev:gateway

# 2. Démarrer la stack d'observabilité
docker compose -f monitoring/docker-compose.yml up -d
```

| Service | URL | Identifiants |
|---------|-----|--------------|
| Grafana | http://localhost:3001 | `admin` / `admin` |
| Prometheus | http://localhost:9090 | — |
| Alertmanager | http://localhost:9093 | — |

Le dashboard **Mythica — Gateway** est provisionné automatiquement (dossier *Mythica*).

## Les 3 piliers

### 1. Logs (déjà en place)

Logging **structuré JSON** via [pino](https://getpino.io) dans chaque service
(`src/logger.ts`). Niveaux `debug`/`info`/`warn`/`error`, contexte (méthode, URL,
temps de réponse, status). En production le transport JSON brut est utilisé
(pas de `pino-pretty`), exploitable par un collecteur (Loki, ELK…).

### 2. Métriques

Le **gateway** est instrumenté avec [`prom-client`](https://github.com/siimon/prom-client)
et expose `GET /metrics` :

- `http_requests_total{method,route,status}` — compteur de requêtes ;
- `http_request_duration_seconds{...}` — histogramme de latence ;
- métriques process par défaut (CPU, mémoire RSS, event loop, GC…).

Le gateway est instrumenté **plutôt que chaque service** car c'est le point
d'entrée unique du trafic : on obtient une vue centralisée sans dupliquer le code.

### 3. Health checks

Chaque service expose `GET /health` retournant son état **et celui de ses
dépendances** (Postgres, Redis), avec code HTTP `503` si dégradé. Consommé par
le `HEALTHCHECK` Docker, le load balancer et le monitoring.

## Dashboard (5 panneaux)

Requêtes/s par route · Taux d'erreur 5xx · Latence p50/p95/p99 · Mémoire RSS · CPU.

## Alerting

3 règles dans [`prometheus/alerts.yml`](prometheus/alerts.yml), routées vers
Discord par Alertmanager :

| Alerte | Condition | Sévérité |
|--------|-----------|----------|
| `GatewayDown` | `up == 0` pendant 1 min | critical |
| `HighErrorRate` | > 5% de 5xx pendant 5 min | warning |
| `HighLatencyP95` | p95 > 1s pendant 5 min | warning |

> ⚠️ Le webhook Discord dans [`alertmanager/alertmanager.yml`](alertmanager/alertmanager.yml)
> est un **placeholder** : l'URL réelle est un secret, à fournir via un fichier
> monté ou une variable — jamais committée.

## Traces (non couvert — justifié)

Le barème demande **au minimum** logs + métriques. Les traces distribuées
(OpenTelemetry + Jaeger/Tempo) n'ont pas été mises en place faute de temps et
parce qu'elles apportent surtout de la valeur sur des architectures à
nombreux sauts réseau. La voie : instrumenter chaque service avec le SDK
OpenTelemetry, exporter vers un collector OTLP, visualiser dans Tempo/Jaeger.
Le gateway, qui propage déjà l'identité entre services, serait le point de
départ de la propagation du contexte de trace (`traceparent`).
