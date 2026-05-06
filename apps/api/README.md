# API Schema Notes

`schema.sql` is the current source of truth for the initial Supabase CRM schema.

## Seeding sample data

If you want reproducible sample clients, tags, and activity to try out the dashboard, use the included seed script:

```bash
cd apps/api
uv run python seed.py
```

Set `--drop` if you want to clear the existing CRM tables before inserting the sample rows.

The script uses the same `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` that the FastAPI app expects, so ensure those are available in your environment before running it.

It inserts:

- three sample clients (Acorn Atelier, Blue Peak Logistics, Fern Harbor Dental)
- three tags with assignments
- four activity records that span the clients/tags

Apply the script after running `schema.sql`, or run it repeatedly with `--drop` for a clean slate.
