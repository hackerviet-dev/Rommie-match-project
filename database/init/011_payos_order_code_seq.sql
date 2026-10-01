-- payOS order codes now come from a database sequence instead of a time-plus-random value, so two
-- app instances can never mint the same one. It starts at 1000000 — clear of payOS's sample 123 —
-- and stays far below the 2^53 ceiling JavaScript can hold. Already part of 001_schema.sql for
-- fresh volumes; this upgrades a volume created before the sequence existed and is safe to re-run.

CREATE SEQUENCE IF NOT EXISTS payments_provider_order_code_seq START WITH 1000000;
