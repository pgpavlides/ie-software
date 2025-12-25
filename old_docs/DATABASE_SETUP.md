# Database Setup Guide

This guide will help you set up the Supabase database with all escape room data.

## Database Schema

The database consists of three main tables:

1. **escape_room_types** - The main categories (MindTrap, Agent Factory, MindGolf)
2. **cities** - Cities within each escape room type, organized by country
3. **rooms** - Individual rooms with AnyDesk IDs, IP addresses, and notes

## Setup Steps

### 1. Create a Supabase Project

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Fill in the project details and create it

### 2. Get Your Project Credentials

1. Go to your project settings: `Settings > API`
2. Copy the **Project URL** and **anon/public** key
3. Also note your **Project Reference ID** from the URL or settings

### 3. Configure Environment Variables

Create a `.env` file in the project root with the following:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_ACCESS_TOKEN=sbp_8c58912e7aaf93f68da2341c0699e8973ad8507c
```

### 4. Link Your Local Project to Supabase

```bash
npx supabase link --project-ref your-project-ref-id
```

When prompted, enter your database password (from project settings).

### 5. Push the Migration

```bash
npx supabase db push
```

This will create the tables in your Supabase database.

### 6. Seed the Database

```bash
npm run seed
```

This will populate all the data from `src/data/data.ts` into your database.

## Verification

After seeding, you should have:
- 3 escape room types (mindtrap, agent-factory, mindgolf)
- 100+ cities across multiple countries
- 1000+ rooms with their connection details

You can verify this in the Supabase dashboard under the "Table Editor" section.

## Database Structure

### escape_room_types
- `id` (TEXT, PRIMARY KEY)
- `name` (TEXT)
- `description` (TEXT)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### cities
- `id` (UUID, PRIMARY KEY)
- `name` (TEXT)
- `country` (TEXT)
- `escape_room_type_id` (TEXT, FOREIGN KEY)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)
- UNIQUE constraint on (name, country, escape_room_type_id)

### rooms
- `id` (UUID, PRIMARY KEY)
- `name` (TEXT)
- `anydesk` (TEXT)
- `ip` (TEXT, nullable)
- `notes` (TEXT, nullable)
- `city_id` (UUID, FOREIGN KEY)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

## Querying Examples

### Get all cities for MindTrap in Germany
```sql
SELECT c.* FROM cities c
JOIN escape_room_types ert ON c.escape_room_type_id = ert.id
WHERE ert.id = 'mindtrap' AND c.country = 'Germany';
```

### Get all rooms in a specific city
```sql
SELECT r.* FROM rooms r
JOIN cities c ON r.city_id = c.id
WHERE c.name = 'Munich' AND c.country = 'Germany';
```

### Search for rooms by name
```sql
SELECT r.*, c.name as city, c.country
FROM rooms r
JOIN cities c ON r.city_id = c.id
WHERE r.name ILIKE '%dracula%';
```

## Troubleshooting

### Migration fails
- Make sure you're logged in: `npx supabase login --token YOUR_TOKEN`
- Check your project reference ID is correct
- Verify your database password

### Seed script fails
- Ensure your `.env` file has the correct values
- Check that the migration was successful first
- Verify network connectivity to Supabase

### Data doesn't appear
- Check the Supabase logs in the dashboard
- Verify RLS policies allow read access
- Try querying directly in the SQL editor

## Security Notes

- The current RLS policies allow all operations for development
- Before production, update the policies to restrict access based on authentication
- Keep your `.env` file secure and never commit it to version control
