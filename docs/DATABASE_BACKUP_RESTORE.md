# Database Backup & Restore Guide

This guide explains how to backup and restore the IE Software Supabase database.

## Prerequisites

- PostgreSQL installed on your system
  - Download from: https://www.postgresql.org/download/windows/
- Database password (found in Supabase Dashboard > Project Settings > Database)

## Getting the Connection String

1. Go to your Supabase Dashboard
2. Click the **"Connect"** button at the top of the page
3. Select **"Session pooler"** (required for pg_dump/pg_restore)
4. Copy the connection string

The connection string format:
```
postgresql://postgres.waxywordtmfvaryyumht:[YOUR-PASSWORD]@aws-1-eu-central-1.pooler.supabase.com:5432/postgres
```

## Important: Password Encoding

If your password contains special characters, they must be URL-encoded:

| Character | Encoded |
|-----------|---------|
| `&`       | `%26`   |
| `#`       | `%23`   |
| `@`       | `%40`   |
| `?`       | `%3F`   |
| `/`       | `%2F`   |

## Backup Database

### Windows (PowerShell)

```powershell
& "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe" "postgresql://postgres.waxywordtmfvaryyumht:[YOUR-PASSWORD]@aws-1-eu-central-1.pooler.supabase.com:5432/postgres" -F c -f backup.dump
```

### Linux/Mac

```bash
pg_dump "postgresql://postgres.waxywordtmfvaryyumht:[YOUR-PASSWORD]@aws-1-eu-central-1.pooler.supabase.com:5432/postgres" -F c -f backup.dump
```

### Options Explained

- `-F c` - Custom format (compressed, recommended)
- `-f backup.dump` - Output filename

### Alternative Formats

```powershell
# Plain SQL (readable but larger)
& "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe" "CONNECTION_STRING" -F p -f backup.sql

# Tar format
& "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe" "CONNECTION_STRING" -F t -f backup.tar
```

## Restore Database

### Windows (PowerShell)

```powershell
& "C:\Program Files\PostgreSQL\18\bin\pg_restore.exe" -d "postgresql://postgres.waxywordtmfvaryyumht:[YOUR-PASSWORD]@aws-1-eu-central-1.pooler.supabase.com:5432/postgres" -c backup.dump
```

### Linux/Mac

```bash
pg_restore -d "postgresql://postgres.waxywordtmfvaryyumht:[YOUR-PASSWORD]@aws-1-eu-central-1.pooler.supabase.com:5432/postgres" -c backup.dump
```

### Options Explained

- `-d` - Target database connection string
- `-c` - Clean (drop) existing objects before restoring

### Restore Options

```powershell
# Restore without dropping existing objects
& "C:\Program Files\PostgreSQL\18\bin\pg_restore.exe" -d "CONNECTION_STRING" backup.dump

# Restore specific schema only
& "C:\Program Files\PostgreSQL\18\bin\pg_restore.exe" -d "CONNECTION_STRING" -n public backup.dump

# Restore data only (no schema)
& "C:\Program Files\PostgreSQL\18\bin\pg_restore.exe" -d "CONNECTION_STRING" --data-only backup.dump

# Restore schema only (no data)
& "C:\Program Files\PostgreSQL\18\bin\pg_restore.exe" -d "CONNECTION_STRING" --schema-only backup.dump
```

## Backup Storage Location

By default, the backup file is saved in your current directory:
- Windows: `C:\Users\[USERNAME]\backup.dump`

## Best Practices

1. **Regular Backups**: Create backups before major changes
2. **Naming Convention**: Use dates in filenames: `backup_2024-12-25.dump`
3. **Secure Storage**: Store backups in a secure location, never commit to git
4. **Test Restores**: Periodically test that your backups can be restored
5. **Keep Multiple Versions**: Maintain several recent backups

## Troubleshooting

### "pg_dump is not recognized"

PostgreSQL is not in your PATH. Use the full path:
```powershell
& "C:\Program Files\PostgreSQL\[VERSION]\bin\pg_dump.exe"
```

### "Tenant or user not found"

- Ensure you're using **Session pooler** (port 5432), not Transaction pooler
- Verify the connection string is correct from the Supabase Dashboard

### "Password authentication failed"

- Check your password is correct
- Ensure special characters are URL-encoded

### Connection timeout

- Check your internet connection
- Verify the Supabase project is active
