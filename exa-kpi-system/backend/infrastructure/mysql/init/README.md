# MySQL local initialization

Files in this directory are mounted read-only at `/docker-entrypoint-initdb.d/`.
The official MySQL image runs them only when `/var/lib/mysql` is initialized for
the first time. Editing an init script does not update an existing `mysql_data`
volume.

Ordinary `docker compose down` and `docker compose up` preserve the databases.
Use `docker compose down -v` only when intentionally resetting all local MySQL
data; that operation deletes the named volume and is destructive.
