# Schéma versionné

`schema.sql` et `storage_policies.sql` sont un **instantané** du schéma réel du projet Supabase
`pst-2026-db` (`vlqqdwjmqtseohlneiki`), capturés le 2026-08-13 :

- `schema.sql` — schéma `public` complet (`supabase db dump --schema public`) : tables, contraintes,
  policies RLS, fonctions/RPC (`archive_tournament`, `get_full_live`, `is_super`, etc.).
- `storage_policies.sql` — policies RLS sur `storage.objects` pour les buckets `joueurs_photos` et
  `photos_import`, extraites manuellement de `supabase db dump --schema storage` (le reste de ce
  schéma appartient à l'infrastructure Supabase Storage, pas à nous).

## Pourquoi un instantané et pas de vraies migrations incrémentales

`supabase db pull` (qui génère des migrations diffables dans `supabase/migrations/`) nécessite
Docker Desktop (utilisé pour créer une "shadow database" locale) — non installé sur cette machine.
En attendant, `supabase db dump` a été utilisé à la place : il ne nécessite pas Docker si un
`pg_dump` local est disponible (installé ici via `brew install libpq`, binaire dans
`/opt/homebrew/opt/libpq/bin`, pas symlinké par défaut).

## Rafraîchir l'instantané

```bash
export PATH="/opt/homebrew/opt/libpq/bin:$PATH"
supabase db dump --linked --schema public -f supabase/schema.sql
```

Si cette commande échoue avec `LegacyDockerRunError` malgré `pg_dump` dans le `PATH` (constaté une
fois — le CLI force parfois le chemin Docker), contourner avec le script imprimé par
`supabase db dump --linked --schema public --dry-run` (l'exécuter directement, il utilise le
`pg_dump` local).

Pour `storage_policies.sql`, refaire la même chose avec `--schema storage`, puis ne garder que les
lignes `CREATE POLICY` concernant `joueurs_photos`/`photos_import` (le reste du dump `storage` est
du bruit — tables internes Supabase).

## Limites de cet instantané

- Pas de mécanisme de migration incrémentale : toute modification future du schéma (dashboard ou
  SQL direct) doit être suivie d'un nouveau dump + commit pour rester à jour. Aucune automatisation
  en place.
- Le schéma `auth` (géré par Supabase) n'est pas inclus.
- Pour repasser sur un vrai flux de migrations versionnées (`supabase migration new` /
  `supabase db push`), installer Docker Desktop puis `supabase db pull` une première fois pour
  amorcer `supabase/migrations/` à partir de l'état actuel.
