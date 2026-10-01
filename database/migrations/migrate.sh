#!/bin/sh
set -eu

psql --set=ON_ERROR_STOP=1 --command="
CREATE TABLE IF NOT EXISTS schema_migrations (
    version text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
);"

for migration in /migrations/[0-9][0-9][0-9]_*.sql; do
    [ -f "$migration" ] || continue

    filename=${migration##*/}
    version=${filename%%_*}

    case "$version" in
        *[!0-9]*)
            echo "Invalid migration filename: $filename" >&2
            exit 1
            ;;
    esac

    applied=$(psql --set=ON_ERROR_STOP=1 --tuples-only --no-align \
        --command="SELECT 1 FROM schema_migrations WHERE version = '$version';")

    if [ "$applied" = "1" ]; then
        echo "Migration $filename already applied"
        continue
    fi

    echo "Applying migration $filename"
    psql --set=ON_ERROR_STOP=1 --single-transaction \
        --file="$migration" \
        --command="INSERT INTO schema_migrations(version) VALUES ('$version');"
done
