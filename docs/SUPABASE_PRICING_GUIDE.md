# Supabase Pro Plan Pricing Guide

## Base Cost: $25/month per project

---

## What's Included vs Extra Charges

### 1. Monthly Active Users (MAU)
**Included:** 100,000 users | **Extra:** $0.00325 per user

| Users | Extra Cost |
|-------|-----------|
| 100,000 | $0 |
| 150,000 | $162.50/mo |
| 200,000 | $325/mo |

> **What it means:** Users who log in or interact with your app at least once per month. Authentication users only.

---

### 2. Database Disk Size
**Included:** 8 GB | **Extra:** $0.125 per GB

| Database Size | Extra Cost |
|---------------|-----------|
| 8 GB | $0 |
| 20 GB | $1.50/mo |
| 50 GB | $5.25/mo |
| 100 GB | $11.50/mo |

> **What it means:** Your actual database tables, rows, and data. Text, numbers, JSON, etc.

---

### 3. File Storage
**Included:** 100 GB | **Extra:** $0.021 per GB

| Files Stored | Extra Cost |
|--------------|-----------|
| 100 GB | $0 |
| 200 GB | $2.10/mo |
| 300 GB | $4.20/mo |
| 500 GB | $8.40/mo |
| 1 TB (1000 GB) | $18.90/mo |

> **What it means:** Images, videos, PDFs, documents, user uploads. Any files you store.

---

### 4. Egress (Data Transfer OUT)
**Included:** 250 GB | **Extra:** $0.09 per GB

| Data Sent | Extra Cost |
|-----------|-----------|
| 250 GB | $0 |
| 500 GB | $22.50/mo |
| 1 TB | $67.50/mo |

> **What it means:** Data your app sends to users (API responses, file downloads, video streaming). Every time someone loads data from your app.

---

### 5. Cached Egress (via CDN)
**Included:** 250 GB | **Extra:** $0.03 per GB

| Cached Data Sent | Extra Cost |
|------------------|-----------|
| 250 GB | $0 |
| 500 GB | $7.50/mo |
| 1 TB | $22.50/mo |

> **What it means:** Same as egress, but served from CDN cache (faster, cheaper). Static files like images that don't change often.

---

## Example Scenario

| Resource | Usage | Included | Extra | Cost |
|----------|-------|----------|-------|------|
| Base Plan | - | - | - | $25.00 |
| Users (MAU) | 50,000 | 100,000 | 0 | $0 |
| Database | 5 GB | 8 GB | 0 | $0 |
| **File Storage** | **300 GB** | 100 GB | 200 GB | **$4.20** |
| Egress | 100 GB | 250 GB | 0 | $0 |
| **TOTAL** | | | | **$29.20/mo** |

---

## Quick Reference Card

| Resource | Free Tier | Pro Included | Overage Rate |
|----------|-----------|--------------|--------------|
| MAU | 50,000 | 100,000 | $0.00325/user |
| Database | 500 MB | 8 GB | $0.125/GB |
| File Storage | 1 GB | 100 GB | $0.021/GB |
| Egress | 5 GB | 250 GB | $0.09/GB |
| Cached Egress | - | 250 GB | $0.03/GB |

---

## Included Features (No Extra Cost)

- Daily backups (stored 7 days)
- Email support
- 7-day log retention
- Unlimited API requests
- Unlimited database rows
- Point-in-time recovery
- No pausing (always on)

---

## Key Takeaways

1. **Base cost is $25/month** - everything else is only if you exceed limits
2. **File storage is cheap** - 300 GB only costs $4.20 extra
3. **Most companies stay under limits** - You only pay extra for what you actually use
4. **Egress is the expensive one** - Watch video streaming and large file downloads
5. **Scale as you grow** - Start small, pay more only when needed
