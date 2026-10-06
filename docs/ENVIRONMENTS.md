# Finzaro Environment Strategy

## V0.0.4 target topology

```text
GitHub feature branch / PR
        │
        ▼
Vercel Preview
        │
        ▼
Finzaro DEV Supabase

GitHub main (current development release)
        │
        ▼
Vercel Production URL
        │
        ▼
Finzaro DEV Supabase  ← temporary until PROD is provisioned
```

V0.0.4 continues to use the isolated DEV database provisioned in V0.1.1. This prevents premature duplication of database administration while the schema is still evolving quickly.

## Later production topology

Before Finzaro begins storing real personal finance data, create a second isolated project:

```text
Vercel Preview  → Finzaro DEV Supabase
Vercel Production → Finzaro PROD Supabase
```

Migrations must flow forward through Git:

```text
migration file → DEV verification → merge → PROD migration
```

Never edit production schema manually unless the change is subsequently represented by a migration in source control.

## Environment variables

### Development / Preview

```dotenv
NEXT_PUBLIC_FINZARO_ENV=development
NEXT_PUBLIC_SUPABASE_URL=<DEV URL>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<DEV publishable key>
```

### Production (future)

```dotenv
NEXT_PUBLIC_FINZARO_ENV=production
NEXT_PUBLIC_SUPABASE_URL=<PROD URL>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<PROD publishable key>
```

A Supabase publishable key is designed to be used by browser clients. Data authorization must come from Row Level Security, not from hiding the publishable key.
