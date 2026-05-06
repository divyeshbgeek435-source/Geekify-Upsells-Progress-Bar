# Backend (Express + MongoDB)

This backend replaces Prisma-based storage with MongoDB using Express + Mongoose.

## 1) Setup

1. Copy environment values:

```bash
cp .env.example .env
```

2. Install dependencies:

```bash
npm install
```

3. Run development server:

```bash
npm run dev
```

4. Health check:

```bash
curl http://localhost:5000/health
```

## 2) API Endpoints

Base URL: `/api`

- `announcement-bars`
- `threshold-tiers`
- `cart-access-logs`
- `tier-widget-settings`

Each resource supports Prisma-style CRUD:

- `POST /api/<resource>` create
- `GET /api/<resource>` list (supports `?shop=...`, `?active=true|false`, `?limit=...`)
- `GET /api/<resource>/:id` read one
- `PUT/PATCH /api/<resource>/:id` update
- `DELETE /api/<resource>/:id` delete

Tier widget settings also support shop upsert:

- `GET /api/tier-widget-settings/shop/:shop`
- `PUT/PATCH /api/tier-widget-settings/shop/:shop`

## 3) Prisma to MongoDB mapping

- `AnnouncementBar` -> `announcementbars`
- `ThresholdTier` -> `thresholdtiers`
- `CartAccessLog` -> `cartaccesslogs`
- `TierWidgetSettings` -> `tierwidgetsettings`

## 4) Notes for migration from existing app

Your Remix routes currently call Prisma directly. To fully switch:

1. Replace Prisma calls with HTTP requests to this backend.
2. Remove Prisma dependencies and session storage adapter once Shopify sessions are migrated to Mongo.
3. Point `MONGODB_URI` to your production MongoDB cluster.
