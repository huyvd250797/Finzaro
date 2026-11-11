# Finzaro V3.2.0 SQL Syntax Fix

Corrected migration `supabase/migrations/20261111180000_instant_copy_batch_v320.sql` to avoid PL/pgSQL IF/CASE parsing ambiguity. Also made the date iteration alias explicit. All other source entries are copied from the original V3.2.0 package. Re-run the full SQL file in Supabase SQL Editor; migration uses CREATE TABLE IF NOT EXISTS and CREATE OR REPLACE FUNCTION.
