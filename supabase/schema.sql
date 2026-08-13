


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."advance_to_next_season"("p_next_year" integer) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_current_year integer;
  v_is_archived boolean;
begin
  if not is_super() then
    raise exception 'Action réservée au rôle super';
  end if;

  select year, is_archived into v_current_year, v_is_archived
  from seasons where is_active = true
  limit 1;

  if v_current_year is null then
    raise exception 'Aucune saison active trouvée — état incohérent, à corriger manuellement avant de continuer';
  end if;

  if not coalesce(v_is_archived, false) then
    raise exception 'La saison % n''est pas encore archivée — archivez le tournoi (archive_tournament) avant de passer à la saison suivante', v_current_year;
  end if;

  -- Garde supplémentaire, indépendante de l'UI : archive_tournament() marque déjà is_archived
  -- avant que le client n'appelle POST /api/admin/recompute-elo (étape cross-langage, hors de
  -- cette transaction) — si cet appel a échoué ou n'a jamais eu lieu, elo_history/history_all ne
  -- reflètent pas encore la saison archivée. Sans ce recalcul, la saison suivante démarrerait les
  -- joueurs sur un ELO obsolète (admin/page.tsx lit la dernière ligne elo_history par joueur).
  if not exists (select 1 from elo_history where year = v_current_year) then
    raise exception 'Le recalcul ELO (Classic + Modern) n''a pas encore été fait pour la saison % — relancez-le (POST /api/admin/recompute-elo, bouton "Réessayer le recalcul ELO" sur /live/archive) avant de continuer', v_current_year;
  end if;

  if p_next_year <= v_current_year then
    raise exception 'L''année suivante (%) doit être postérieure à la saison active actuelle (%)', p_next_year, v_current_year;
  end if;

  insert into seasons (year, is_active, is_archived)
  values (p_next_year, true, false)
  on conflict (year) do update set is_active = true, is_archived = false;

  update seasons set is_active = false where year = v_current_year;

  perform reset_tournament();

  return jsonb_build_object('previous_year', v_current_year, 'new_year', p_next_year);
end;
$$;


ALTER FUNCTION "public"."advance_to_next_season"("p_next_year" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."archive_tournament"("p_year" integer) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_status text;
  v_format text;
  v_unfinished_matches integer;
  v_teams_count integer;
  v_games_count integer;
  v_next_team_id integer;
  v_next_game_id integer;
begin
  if not is_super() then
    raise exception 'Action réservée au rôle super';
  end if;

  select status, format into v_status, v_format from live_tournament where id = 1;

  if v_status is distinct from 'TERMINE' then
    raise exception 'Le tournoi live n''est pas encore au statut TERMINE (statut actuel : %)', v_status;
  end if;

  select count(*) into v_unfinished_matches from live_matches where status <> 'TERMINE';
  if v_unfinished_matches > 0 then
    raise exception '% match(s) live non saisis (status != TERMINE) — corrigez avant d''archiver', v_unfinished_matches;
  end if;

  if exists (select 1 from games where year = p_year) then
    raise exception 'La saison % est déjà archivée (des lignes existent déjà dans games)', p_year;
  end if;

  -- id calculés explicitement (max(id)+1, puis +row_number()) plutôt que laissés à un DEFAULT :
  -- constaté en pratique que teams.id a une séquence désynchronisée (duplicate key) ET que
  -- games.id n'a AUCUN default du tout (not-null violation, aucune séquence à resynchroniser —
  -- pg_get_serial_sequence renvoie NULL pour cette colonne, donc le setval précédent ne faisait
  -- rien). Plutôt que de dépendre du comportement — différent selon la table — d'un DEFAULT
  -- éventuel (non versionné, cf. documents/architecture.md §11), on calcule nous-mêmes des id
  -- uniques, sans hypothèse sur le schéma réel.
  select coalesce(max(id), 0) + 1 into v_next_team_id from teams;
  select coalesce(max(id), 0) + 1 into v_next_game_id from games;

  -- Copie teams (hors placeholder 'Z') puis games, en chaînant deux CTE modificatrices dans une
  -- seule requête : la deuxième (games) lit le mapping lettre->id renvoyé par la première
  -- (RETURNING) sans passer par une table temporaire.
  with inserted_teams as (
    insert into teams (id, nom, year, tireur_id, pointeur_id)
    select v_next_team_id + row_number() over (order by lt.id) - 1, lt.id, p_year, lt.tireur_id, lt.pointeur_id
    from live_teams lt
    where lt.id <> 'Z'
    returning id, nom
  ),
  inserted_games as (
    insert into games (id, year, poule, type, tableau, team_1_id, team_2_id, score_1, score_2)
    select v_next_game_id + row_number() over (order by lm.id) - 1,
           p_year, lm.poule, lm.type, coalesce(lm.tableau, 'Principal'), m1.id, m2.id, lm.score_team1, lm.score_team2
    from live_matches lm
    join inserted_teams m1 on m1.nom = lm.team1_id
    join inserted_teams m2 on m2.nom = lm.team2_id
    where lm.status = 'TERMINE'
    returning id
  )
  select (select count(*) from inserted_teams), (select count(*) from inserted_games)
  into v_teams_count, v_games_count;

  insert into seasons (year, format, is_archived, is_active)
  values (p_year, v_format, true, false)
  on conflict (year) do update set format = excluded.format, is_archived = true;

  return jsonb_build_object(
    'year', p_year,
    'format', v_format,
    'teams_archived', v_teams_count,
    'games_archived', v_games_count
  );
end;
$$;


ALTER FUNCTION "public"."archive_tournament"("p_year" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_full_live"() RETURNS TABLE("game_id" integer, "year" integer, "players" "jsonb")
    LANGUAGE "plpgsql" STABLE
    AS $$
BEGIN
  RETURN QUERY
  WITH unique_selection AS (
    -- On s'assure de n'avoir qu'une seule ligne par joueur sélectionné
    SELECT DISTINCT ON (player_id) player_id, nom
    FROM live_selected
  )
  SELECT
    h.game_id,
    h.year,
    jsonb_agg(
      jsonb_build_object(
        'player_id', h.player_id,
        'elo', h.elo_value,
        'modern', h.elo_modern_value,
        'skill', h.skill_ordinal,
        'nom', p.nom
      ) ORDER BY h.elo_value DESC
    ) as players
  FROM live_history h
  JOIN live_selected p ON h.player_id = p.player_id
  GROUP BY h.game_id, h.year
  ORDER BY h.year ASC, h.game_id ASC;
END;
$$;


ALTER FUNCTION "public"."get_full_live"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_full_timeline"() RETURNS TABLE("game_id" integer, "year" integer, "players" "jsonb")
    LANGUAGE "plpgsql" STABLE
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    h.game_id,
    h.year,
    jsonb_agg(
      jsonb_build_object(
        'player_id', h.player_id,
        'elo', h.elo_value,
        'modern', h.elo_modern_value,
        'skill', h.skill_ordinal,
        'nom', p.nom
      ) ORDER BY h.elo_value DESC
    ) as players
  FROM history_all h
  JOIN profiles p ON h.player_id = p.id
  GROUP BY h.game_id, h.year
  ORDER BY h.year ASC, h.game_id ASC;
END;
$$;


ALTER FUNCTION "public"."get_full_timeline"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_role"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN (
    SELECT role FROM public.site_users 
    WHERE id = auth.uid()
  );
END;
$$;


ALTER FUNCTION "public"."get_my_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_player_elo"("p_id" integer) RETURNS TABLE("id" integer, "game" integer, "elo" double precision, "modern" double precision, "skill" double precision, "annee" integer, "rank_elo" integer, "rank_modern_elo" integer, "rank_skill_elo" integer)
    LANGUAGE "plpgsql" STABLE
    AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (year)
    player_id::INT AS id,
    game_id::INT AS game,
    elo_value::FLOAT AS elo,
    elo_modern_value::FLOAT AS modern,
    skill_ordinal::FLOAT AS skill,
    year::INT AS annee,
    rank::INT as rank_elo,
    rank_modern::INT as rank_modern_elo,
    history_all.rank_skill::INT as rank_skill_elo
  FROM history_all
  WHERE player_id = p_id
  ORDER BY year, game_id DESC;
END;
$$;


ALTER FUNCTION "public"."get_player_elo"("p_id" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_player_stats"("p_id" integer) RETURNS TABLE("id" integer, "nom" "text", "annee" integer, "role" "text", "partenaire" "text", "pour" bigint, "contre" bigint, "goalavg" bigint, "classement" integer, "victoires" bigint, "defaites" bigint, "nuls" bigint, "palmares" "text", "finale_jouee" "text", "rang" integer)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    h.player_id::INT as id, -- CORRECTION ICI : Ajout du ::INT
    p.nom::TEXT as nom,
    h.year::INT as annee,
    MAX(CASE 
      WHEN t.tireur_id = h.player_id THEN 'Tireur'
      WHEN t.pointeur_id = h.player_id THEN 'Pointeur'
      ELSE 'Inconnu'
    END)::TEXT as role,
    MAX(CASE 
      WHEN t.tireur_id = h.player_id THEN p_pointeur.nom 
      ELSE p_tireur.nom 
    END)::TEXT as partenaire,
    SUM(h.sc_p)::BIGINT as pour,
    SUM(h.sc_c)::BIGINT as contre,
    SUM(h.sc_p - h.sc_c)::BIGINT as goalavg,
    MAX(s.value + (CASE WHEN h.win = -1 THEN 1 ELSE 0 END))::INT as classement,
    SUM(CASE WHEN h.win = 1 THEN 1 ELSE 0 END)::BIGINT as victoires,
    SUM(CASE WHEN h.win = -1 THEN 1 ELSE 0 END)::BIGINT as defaites,
    SUM(CASE WHEN h.win = 0 THEN 1 ELSE 0 END)::BIGINT as nuls,
    CASE
      WHEN SUM(CASE WHEN h.win = 1 AND h.type = 'Finale' THEN 1 ELSE 0 END) >= 1 THEN '🏆 Vainqueur'::TEXT
      ELSE '-'::TEXT
    END as palmares,
    COALESCE(MAX(CASE WHEN h.type ILIKE '%inale%' THEN h.type END), 'Tournoi')::TEXT as finale_jouee,
    MAX(h.rank_at_time)::INT as rang
  FROM elo_history h
  JOIN profiles p ON h.player_id = p.id
  JOIN steps s ON h.type = s.id
  LEFT JOIN teams t ON (t.tireur_id = h.player_id OR t.pointeur_id = h.player_id) AND t.year = h.year
  LEFT JOIN profiles p_tireur ON t.tireur_id = p_tireur.id
  LEFT JOIN profiles p_pointeur ON t.pointeur_id = p_pointeur.id
  WHERE h.player_id = p_id
  GROUP BY p.nom, h.player_id, h.year
  ORDER BY h.year DESC;
END;
$$;


ALTER FUNCTION "public"."get_player_stats"("p_id" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_popularity_stats"() RETURNS "jsonb"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  with views as (
    select split_part(metadata->>'path', '?', 1) as pathname
    from activity_logs
    where action_type = 'PAGE_VIEW'
      and metadata->>'path' is not null
  ),
  top_page as (
    select pathname, count(*) as cnt
    from views
    group by pathname
    order by cnt desc
    limit 1
  ),
  player_views as (
    select (regexp_match(pathname, '^/joueurs/(\d+)'))[1]::int as player_id
    from views
    where pathname ~ '^/joueurs/\d+'
  ),
  top_players as (
    select pv.player_id, p.nom, count(*) as cnt
    from player_views pv
    join profiles p on p.id = pv.player_id
    group by pv.player_id, p.nom
    order by cnt desc
    limit 3
  ),
  tournament_views as (
    select (regexp_match(pathname, '^/tournois/(\d+)'))[1] as year
    from views
    where pathname ~ '^/tournois/\d+'
  ),
  top_tournament as (
    select year, count(*) as cnt
    from tournament_views
    group by year
    order by cnt desc
    limit 1
  ),
  photo_views as (
    select metadata->>'photo' as photo_path
    from activity_logs
    where action_type = 'PHOTO_VIEW'
      and metadata->>'photo' is not null
  ),
  top_photo as (
    select photo_path, count(*) as cnt
    from photo_views
    group by photo_path
    order by cnt desc
    limit 1
  )
  select jsonb_build_object(
    'topPage', (select jsonb_build_object('path', pathname, 'count', cnt) from top_page),
    'topPlayers', coalesce((select jsonb_agg(jsonb_build_object('id', player_id, 'nom', nom, 'count', cnt)) from top_players), '[]'::jsonb),
    'topTournament', (select jsonb_build_object('year', year, 'count', cnt) from top_tournament),
    'topPhoto', (select jsonb_build_object('path', photo_path, 'count', cnt) from top_photo)
  );
$$;


ALTER FUNCTION "public"."get_popularity_stats"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_residence_access_level"() RETURNS integer
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
   select coalesce((select residence_access_level from site_users where id = auth.uid()), 0);
 $$;


ALTER FUNCTION "public"."get_residence_access_level"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    final_nickname text;
BEGIN
    -- On prend le pseudo du formulaire OU le nom Google OU l'email OU l'ID
    final_nickname := COALESCE(
        new.raw_user_meta_data->>'nickname',
        new.raw_user_meta_data->>'full_name',
        split_part(new.email, '@', 1),
        'User_' || substr(new.id::text, 1, 8)
    );

    INSERT INTO public.site_users (
        id, 
        nickname, 
        email, 
        invitation_code_used,
        role
    )
    VALUES (
        new.id,
        final_nickname,
        new.email,
        new.raw_user_meta_data->>'invitation_code',
        'membre'
    );
    
    RETURN new;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    user_role text;
BEGIN
    -- On récupère le rôle directement dans la table
    SELECT role INTO user_role 
    FROM public.site_users 
    WHERE id = auth.uid();

    -- On retourne true si c'est admin ou super, sinon false (et jamais NULL)
    IF user_role IN ('admin', 'super') THEN
        RETURN true;
    ELSE
        RETURN false;
    END IF;
END;
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_super"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.site_users 
    WHERE id = auth.uid() 
    AND role = 'super'
  );
END;
$$;


ALTER FUNCTION "public"."is_super"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reset_tournament"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$BEGIN
    -- RESTART IDENTITY remet les compteurs d'ID à 1
    -- CASCADE permet de supprimer même s'il y a des clés étrangères (attention à l'ordre)
    TRUNCATE TABLE live_matches, live_selected, live_teams RESTART IDENTITY CASCADE;

    UPDATE live_tournament SET status = 'JOUEURS', format = 'classique' WHERE id = 1;
END;$$;


ALTER FUNCTION "public"."reset_tournament"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."verify_invitation_code"("attempted_code" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.site_config 
    WHERE key = 'invitation_code' 
    AND value = attempted_code
  );
END;
$$;


ALTER FUNCTION "public"."verify_invitation_code"("attempted_code" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."activity_logs" (
    "id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "nickname" "text",
    "action_type" "text" NOT NULL,
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."activity_logs" OWNER TO "postgres";


ALTER TABLE "public"."activity_logs" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."activity_logs_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."elo_history" (
    "id" integer NOT NULL,
    "player_id" bigint,
    "game_id" integer,
    "year" integer,
    "elo_value" double precision,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "elo_modern_value" double precision,
    "rank_at_time" integer,
    "modern_rank_at_time" integer,
    "type" "text",
    "win" integer,
    "sc_p" integer,
    "sc_c" integer,
    "poule" "text",
    "tireur_id" integer,
    "pointeur_id" integer,
    "tireur" "text",
    "pointeur" "text",
    "nom" "text",
    "role" "text",
    "skill_ordinal" numeric,
    "skill_mu" numeric,
    "skill_sigma" numeric,
    "skill_rank_at_time" integer
);


ALTER TABLE "public"."elo_history" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."elo_history_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."elo_history_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."elo_history_id_seq" OWNED BY "public"."elo_history"."id";



CREATE TABLE IF NOT EXISTS "public"."games" (
    "id" integer NOT NULL,
    "year" integer,
    "poule" "text",
    "type" "text",
    "tableau" "text",
    "team_1_id" integer,
    "team_2_id" integer,
    "score_1" integer,
    "score_2" integer,
    "played_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."games" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."history_all" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "player_id" integer,
    "game_id" integer,
    "year" integer,
    "elo_value" double precision,
    "elo_modern_value" double precision,
    "rank" integer,
    "rank_modern" integer,
    "poule" "text",
    "team1_id" integer,
    "team2_id" integer,
    "skill_ordinal" numeric,
    "skill_mu" numeric,
    "skill_sigma" numeric,
    "rank_skill" integer
);


ALTER TABLE "public"."history_all" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."live_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "player_id" integer,
    "game_id" integer,
    "year" integer,
    "elo_value" double precision,
    "elo_modern_value" double precision,
    "rank" integer,
    "rank_modern" integer,
    "poule" "text",
    "team1_id" "text",
    "team2_id" "text",
    "skill_ordinal" numeric,
    "skill_mu" numeric,
    "skill_sigma" numeric,
    "rank_skill" integer
);


ALTER TABLE "public"."live_history" OWNER TO "postgres";


COMMENT ON TABLE "public"."live_history" IS 'This is a duplicate of history_all';



CREATE TABLE IF NOT EXISTS "public"."live_matches" (
    "id" integer NOT NULL,
    "poule" "text",
    "team1_id" "text",
    "team2_id" "text",
    "score_team1" integer DEFAULT 0,
    "score_team2" integer DEFAULT 0,
    "status" "text" DEFAULT 'EN_ATTENTE'::"text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "type" "text" DEFAULT ''::"text",
    "tableau" "text" DEFAULT 'Principal'::"text" NOT NULL,
    "delta_elo_team1" real DEFAULT '0'::real NOT NULL,
    "delta_elo_team2" real DEFAULT '0'::real NOT NULL,
    "delta_modern_team1" real DEFAULT '0'::real NOT NULL,
    "delta_modern_team2" real DEFAULT '0'::real NOT NULL,
    "round" integer,
    "terrain" "text",
    "delta_skill_team1" numeric,
    "delta_skill_team2" numeric,
    CONSTRAINT "live_matches_poule_check" CHECK (("poule" = ANY (ARRAY['Gassin'::"text", 'Ramatuelle'::"text", 'Ronde'::"text", ''::"text"]))),
    CONSTRAINT "live_matches_status_check" CHECK (("status" = ANY (ARRAY['EN_ATTENTE'::"text", 'EN_COURS'::"text", 'TERMINE'::"text"])))
);


ALTER TABLE "public"."live_matches" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."live_matches_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."live_matches_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."live_matches_id_seq" OWNED BY "public"."live_matches"."id";



CREATE TABLE IF NOT EXISTS "public"."live_selected" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "player_id" integer,
    "role" "text",
    "elo_at_selection" double precision,
    "nom" "text",
    "modern_at_selection" real DEFAULT '100'::real NOT NULL,
    "confirmed" boolean DEFAULT false NOT NULL,
    "skill_mu_at_selection" numeric,
    "skill_sigma_at_selection" numeric,
    CONSTRAINT "live_selected_role_check" CHECK (("role" = ANY (ARRAY['Pointeur'::"text", 'Tireur'::"text"])))
);


ALTER TABLE "public"."live_selected" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."live_teams" (
    "id" "text" NOT NULL,
    "pointeur_id" integer,
    "tireur_id" integer,
    "poule" "text",
    "victoires" integer DEFAULT 0,
    "defaites" integer DEFAULT 0,
    "points_pour" integer DEFAULT 0,
    "points_contre" integer DEFAULT 0,
    "elo_start" real DEFAULT '100'::real NOT NULL,
    "modern_start" real DEFAULT '100'::real NOT NULL,
    "elo_start_pointeur" real DEFAULT '100'::real NOT NULL,
    "elo_start_tireur" real DEFAULT '100'::real NOT NULL,
    "skill_mu_pointeur" numeric,
    "skill_sigma_pointeur" numeric,
    "skill_mu_tireur" numeric,
    "skill_sigma_tireur" numeric,
    CONSTRAINT "live_teams_id_check" CHECK (("id" = ANY (ARRAY['A'::"text", 'B'::"text", 'C'::"text", 'D'::"text", 'E'::"text", 'F'::"text", 'G'::"text", 'H'::"text", 'I'::"text", 'J'::"text"]))),
    CONSTRAINT "live_teams_poule_check" CHECK (("poule" = ANY (ARRAY['Gassin'::"text", 'Ramatuelle'::"text", 'Ronde'::"text"])))
);


ALTER TABLE "public"."live_teams" OWNER TO "postgres";


COMMENT ON COLUMN "public"."live_teams"."elo_start" IS 'elo de l''équipe au début du tournois';



COMMENT ON COLUMN "public"."live_teams"."modern_start" IS 'modern de l''équipe au début du tournois';



CREATE TABLE IF NOT EXISTS "public"."live_tournament" (
    "id" integer DEFAULT 1 NOT NULL,
    "status" "text" DEFAULT 'JOUEURS'::"text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "format" "text" DEFAULT 'classique'::"text",
    "team_mode" "text" DEFAULT 'auto'::"text",
    CONSTRAINT "live_tournament_status_check" CHECK (("status" = ANY (ARRAY['PREPARATION'::"text", 'JOUEURS'::"text", 'EQUIPES'::"text", 'POULES'::"text", 'DEMI'::"text", 'FINALE'::"text", 'TERMINE'::"text"]))),
    CONSTRAINT "single_row" CHECK (("id" = 1))
);


ALTER TABLE "public"."live_tournament" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."player_roles" (
    "id" integer NOT NULL,
    "player_id" integer,
    "year" integer,
    "role" "text"
);


ALTER TABLE "public"."player_roles" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."player_roles_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."player_roles_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."player_roles_id_seq" OWNED BY "public"."player_roles"."id";



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" integer NOT NULL,
    "nom" "text" NOT NULL,
    "photo_url" "text",
    "level" "text" DEFAULT 'joueur'::"text"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."residence_codes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "label" "text" NOT NULL,
    "code" "text" NOT NULL,
    "notes" "text",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."residence_codes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."residence_contacts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "category" "text" DEFAULT 'conseil_syndical'::"text" NOT NULL,
    "nom" "text" NOT NULL,
    "telephone" "text",
    "email" "text",
    "apartment_num" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "contrat" "text"
);


ALTER TABLE "public"."residence_contacts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."residence_documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "external_url" "text" NOT NULL,
    "uploaded_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "category" "text" DEFAULT 'autre'::"text" NOT NULL,
    "resume" "text"
);


ALTER TABLE "public"."residence_documents" OWNER TO "postgres";


COMMENT ON COLUMN "public"."residence_documents"."resume" IS 'résumé en format markdonw';



CREATE OR REPLACE VIEW "public"."residence_documents_public" WITH ("security_invoker"='true') AS
 SELECT "id",
    "title",
    "description",
    "external_url",
    "category",
    "created_at",
        CASE
            WHEN ("public"."is_super"() OR ("public"."get_residence_access_level"() >= 2)) THEN "resume"
            ELSE NULL::"text"
        END AS "resume"
   FROM "public"."residence_documents";


ALTER VIEW "public"."residence_documents_public" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."residence_lots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "numero_lot" integer,
    "identifiant_local" "text" NOT NULL,
    "categorie" "text" NOT NULL,
    "batiment" "text" DEFAULT 'B'::"text" NOT NULL,
    "etage" "text",
    "secteur" "text",
    "orientation" "text",
    "situation" "text",
    "composition" "text"[],
    "tantieme_numerateur" integer,
    "tantieme_denominateur" integer,
    "tantieme_texte_original" "text",
    "description" "text",
    "observation" "text",
    "plan_kind" "text",
    "plan_num" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "proprietaire_officiel" "text",
    "proprietaire_source_annee" "text",
    "proprietaire_confiance" "text",
    "autres_lots_du_meme_proprietaire" integer[],
    "historique_proprietaires" "text"[],
    "anomalie_signalee" "text",
    "concordance_residence_ts" "text",
    "charges_reparties_total" numeric,
    "charges_solde_total" numeric,
    "charges_comptes" "jsonb"
);


ALTER TABLE "public"."residence_lots" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."seasons" (
    "year" integer NOT NULL,
    "is_active" boolean DEFAULT false,
    "format" "text",
    "is_archived" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."seasons" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."session_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "player_nickname" "text",
    "action" "text",
    "details" "text",
    "ip_address" "text",
    "user_id" "uuid"
);


ALTER TABLE "public"."session_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."settings" (
    "key" "text" NOT NULL,
    "value" double precision,
    "label" "text",
    "init" double precision
);


ALTER TABLE "public"."settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."site_config" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "key" "text" NOT NULL,
    "value" "text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."site_config" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."site_users" (
    "id" "uuid" NOT NULL,
    "nickname" "text" NOT NULL,
    "role" "text" DEFAULT 'membre'::"text",
    "invitation_code_used" "text",
    "last_login" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "email" "text",
    "favoris" integer,
    "residence_access_level" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "site_users_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'membre'::"text", 'super'::"text"])))
);


ALTER TABLE "public"."site_users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."steps" (
    "id" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "value" integer DEFAULT 0,
    "label" "text" DEFAULT 'Finale'::"text"
);


ALTER TABLE "public"."steps" OWNER TO "postgres";


COMMENT ON COLUMN "public"."steps"."label" IS 'Nom affiché';



CREATE TABLE IF NOT EXISTS "public"."teams" (
    "id" integer NOT NULL,
    "nom" "text",
    "year" integer,
    "tireur_id" bigint,
    "pointeur_id" bigint
);


ALTER TABLE "public"."teams" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."teams_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."teams_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."teams_id_seq" OWNED BY "public"."teams"."id";



CREATE TABLE IF NOT EXISTS "public"."videos" (
    "id" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "link" "text",
    "year" integer
);


ALTER TABLE "public"."videos" OWNER TO "postgres";


ALTER TABLE "public"."videos" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."vidéos_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE ONLY "public"."elo_history" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."elo_history_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."live_matches" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."live_matches_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."player_roles" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."player_roles_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."teams" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."teams_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."steps"
    ADD CONSTRAINT "Steps_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."activity_logs"
    ADD CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."elo_history"
    ADD CONSTRAINT "elo_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."games"
    ADD CONSTRAINT "games_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."history_all"
    ADD CONSTRAINT "history_all_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."live_history"
    ADD CONSTRAINT "live_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."live_matches"
    ADD CONSTRAINT "live_matches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."live_selected"
    ADD CONSTRAINT "live_selected_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."live_selected"
    ADD CONSTRAINT "live_selected_player_id_key" UNIQUE ("player_id");



ALTER TABLE ONLY "public"."live_teams"
    ADD CONSTRAINT "live_teams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."live_tournament"
    ADD CONSTRAINT "live_tournament_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."player_roles"
    ADD CONSTRAINT "player_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."residence_codes"
    ADD CONSTRAINT "residence_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."residence_contacts"
    ADD CONSTRAINT "residence_contacts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."residence_documents"
    ADD CONSTRAINT "residence_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."residence_lots"
    ADD CONSTRAINT "residence_lots_identifiant_local_key" UNIQUE ("identifiant_local");



ALTER TABLE ONLY "public"."residence_lots"
    ADD CONSTRAINT "residence_lots_numero_lot_key" UNIQUE ("numero_lot");



ALTER TABLE ONLY "public"."residence_lots"
    ADD CONSTRAINT "residence_lots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."seasons"
    ADD CONSTRAINT "seasons_pkey" PRIMARY KEY ("year");



ALTER TABLE ONLY "public"."session_logs"
    ADD CONSTRAINT "session_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."settings"
    ADD CONSTRAINT "settings_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."site_config"
    ADD CONSTRAINT "site_config_key_key" UNIQUE ("key");



ALTER TABLE ONLY "public"."site_config"
    ADD CONSTRAINT "site_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."site_users"
    ADD CONSTRAINT "site_users_nickname_key" UNIQUE ("nickname");



ALTER TABLE ONLY "public"."site_users"
    ADD CONSTRAINT "site_users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."videos"
    ADD CONSTRAINT "vidéos_pkey" PRIMARY KEY ("id");



CREATE UNIQUE INDEX "live_history_player_game_idx" ON "public"."live_history" USING "btree" ("player_id", "game_id");



CREATE UNIQUE INDEX "seasons_year_idx" ON "public"."seasons" USING "btree" ("year");



CREATE UNIQUE INDEX "teams_year_nom_idx" ON "public"."teams" USING "btree" ("year", "nom");



ALTER TABLE ONLY "public"."activity_logs"
    ADD CONSTRAINT "activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."elo_history"
    ADD CONSTRAINT "elo_history_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id");



ALTER TABLE ONLY "public"."elo_history"
    ADD CONSTRAINT "elo_history_year_fkey" FOREIGN KEY ("year") REFERENCES "public"."seasons"("year");



ALTER TABLE ONLY "public"."elo_history"
    ADD CONSTRAINT "fk_elo_history_seasons" FOREIGN KEY ("year") REFERENCES "public"."seasons"("year") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."elo_history"
    ADD CONSTRAINT "fk_elo_player" FOREIGN KEY ("player_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."games"
    ADD CONSTRAINT "fk_games_eq1" FOREIGN KEY ("team_1_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."games"
    ADD CONSTRAINT "fk_games_eq2" FOREIGN KEY ("team_2_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."games"
    ADD CONSTRAINT "fk_games_seasons" FOREIGN KEY ("year") REFERENCES "public"."seasons"("year") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."games"
    ADD CONSTRAINT "fk_games_step" FOREIGN KEY ("type") REFERENCES "public"."steps"("id");



ALTER TABLE ONLY "public"."history_all"
    ADD CONSTRAINT "fk_history_game" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id");



ALTER TABLE ONLY "public"."history_all"
    ADD CONSTRAINT "fk_history_player" FOREIGN KEY ("player_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."history_all"
    ADD CONSTRAINT "fk_history_season" FOREIGN KEY ("year") REFERENCES "public"."seasons"("year");



ALTER TABLE ONLY "public"."elo_history"
    ADD CONSTRAINT "fk_history_step" FOREIGN KEY ("type") REFERENCES "public"."steps"("id");



ALTER TABLE ONLY "public"."history_all"
    ADD CONSTRAINT "fk_history_team1" FOREIGN KEY ("team1_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."history_all"
    ADD CONSTRAINT "fk_history_team2" FOREIGN KEY ("team2_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."player_roles"
    ADD CONSTRAINT "fk_player_roles_seasons" FOREIGN KEY ("year") REFERENCES "public"."seasons"("year") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "fk_teams_pointeur" FOREIGN KEY ("pointeur_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "fk_teams_seasons" FOREIGN KEY ("year") REFERENCES "public"."seasons"("year") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "fk_teams_tireur" FOREIGN KEY ("tireur_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."videos"
    ADD CONSTRAINT "fk_videos_seasons" FOREIGN KEY ("year") REFERENCES "public"."seasons"("year") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."games"
    ADD CONSTRAINT "games_year_fkey" FOREIGN KEY ("year") REFERENCES "public"."seasons"("year");



ALTER TABLE ONLY "public"."live_history"
    ADD CONSTRAINT "live_history_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id");



ALTER TABLE ONLY "public"."live_history"
    ADD CONSTRAINT "live_history_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."live_history"
    ADD CONSTRAINT "live_history_team1_id_fkey" FOREIGN KEY ("team1_id") REFERENCES "public"."live_teams"("id");



ALTER TABLE ONLY "public"."live_history"
    ADD CONSTRAINT "live_history_team2_id_fkey" FOREIGN KEY ("team2_id") REFERENCES "public"."live_teams"("id");



ALTER TABLE ONLY "public"."live_history"
    ADD CONSTRAINT "live_history_year_fkey" FOREIGN KEY ("year") REFERENCES "public"."seasons"("year");



ALTER TABLE ONLY "public"."live_matches"
    ADD CONSTRAINT "live_matches_team1_id_fkey" FOREIGN KEY ("team1_id") REFERENCES "public"."live_teams"("id");



ALTER TABLE ONLY "public"."live_matches"
    ADD CONSTRAINT "live_matches_team2_id_fkey" FOREIGN KEY ("team2_id") REFERENCES "public"."live_teams"("id");



ALTER TABLE ONLY "public"."live_matches"
    ADD CONSTRAINT "live_matches_type_fkey" FOREIGN KEY ("type") REFERENCES "public"."steps"("id");



ALTER TABLE ONLY "public"."live_selected"
    ADD CONSTRAINT "live_selected_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."live_teams"
    ADD CONSTRAINT "live_teams_pointeur_id_fkey" FOREIGN KEY ("pointeur_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."live_teams"
    ADD CONSTRAINT "live_teams_tireur_id_fkey" FOREIGN KEY ("tireur_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."player_roles"
    ADD CONSTRAINT "player_roles_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."player_roles"
    ADD CONSTRAINT "player_roles_year_fkey" FOREIGN KEY ("year") REFERENCES "public"."seasons"("year");



ALTER TABLE ONLY "public"."residence_documents"
    ADD CONSTRAINT "residence_documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."site_users"("id");



ALTER TABLE ONLY "public"."session_logs"
    ADD CONSTRAINT "session_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."site_users"
    ADD CONSTRAINT "site_users_favoris_fkey" FOREIGN KEY ("favoris") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."site_users"
    ADD CONSTRAINT "site_users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_pointeur_id_fkey" FOREIGN KEY ("pointeur_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_tireur_id_fkey" FOREIGN KEY ("tireur_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_year_fkey" FOREIGN KEY ("year") REFERENCES "public"."seasons"("year");



CREATE POLICY "Admin write live_matches" ON "public"."live_matches" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admin write live_teams" ON "public"."live_teams" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admin write live_tournament" ON "public"."live_tournament" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins have full access on live_selected" ON "public"."live_selected" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Enable delete for authenticated users only" ON "public"."profiles" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Enable insert for authenticated users only" ON "public"."live_selected" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable insert for authenticated users only" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable insert for authenticated users only" ON "public"."session_logs" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Enable insert for authenticated users only" ON "public"."settings" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable read access for all users" ON "public"."elo_history" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."games" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."history_all" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."live_history" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."live_selected" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."player_roles" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."seasons" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."settings" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."steps" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."teams" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."videos" FOR SELECT USING (true);



CREATE POLICY "Enable update for authenticated users only" ON "public"."settings" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Everyone can view live_selected" ON "public"."live_selected" FOR SELECT USING (true);



CREATE POLICY "Lecture interdite au public" ON "public"."site_config" FOR SELECT USING (false);



CREATE POLICY "Lecture publique live_matches" ON "public"."live_matches" FOR SELECT USING (true);



CREATE POLICY "Lecture publique live_teams" ON "public"."live_teams" FOR SELECT USING (true);



CREATE POLICY "Lecture publique live_tournament" ON "public"."live_tournament" FOR SELECT USING (true);



CREATE POLICY "Les utilisateurs peuvent créer leur propre profil" ON "public"."site_users" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Les utilisateurs peuvent modifier leur propre profil" ON "public"."site_users" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Seul le super voit les logs" ON "public"."activity_logs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."site_users"
  WHERE (("site_users"."id" = "auth"."uid"()) AND ("site_users"."role" = 'super'::"text")))));



ALTER TABLE "public"."activity_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "activity_logs_insert_own" ON "public"."activity_logs" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "activity_logs_select_admin" ON "public"."activity_logs" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."site_users" "su"
  WHERE (("su"."id" = "auth"."uid"()) AND ("su"."role" = ANY (ARRAY['admin'::"text", 'super'::"text"]))))));



CREATE POLICY "admin_write_policy" ON "public"."site_users" TO "authenticated" USING ("public"."is_super"());



CREATE POLICY "allow_read_for_all_auth" ON "public"."site_users" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."elo_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."games" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."history_all" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."live_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."live_matches" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."live_selected" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."live_teams" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."live_tournament" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."player_roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "residence codes readers" ON "public"."residence_codes" FOR SELECT TO "authenticated" USING (("public"."is_super"() OR ("public"."get_residence_access_level"() >= 1)));



CREATE POLICY "residence contacts readers" ON "public"."residence_contacts" FOR SELECT TO "authenticated" USING (("public"."is_super"() OR ("public"."get_residence_access_level"() >= 2)));



CREATE POLICY "residence documents readers" ON "public"."residence_documents" FOR SELECT TO "authenticated" USING (("public"."is_super"() OR ("public"."get_residence_access_level"() >= 1)));



CREATE POLICY "residence lots readers" ON "public"."residence_lots" FOR SELECT TO "authenticated" USING (("public"."is_super"() OR ("public"."get_residence_access_level"() >= 2)));



ALTER TABLE "public"."residence_codes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."residence_contacts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."residence_documents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."residence_lots" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."seasons" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."session_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."site_config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."site_users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."steps" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "super full access" ON "public"."residence_codes" USING ("public"."is_super"()) WITH CHECK ("public"."is_super"());



CREATE POLICY "super full access" ON "public"."residence_contacts" USING ("public"."is_super"()) WITH CHECK ("public"."is_super"());



CREATE POLICY "super full access" ON "public"."residence_documents" USING ("public"."is_super"()) WITH CHECK ("public"."is_super"());



CREATE POLICY "super full access" ON "public"."residence_lots" USING ("public"."is_super"()) WITH CHECK ("public"."is_super"());



ALTER TABLE "public"."teams" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."videos" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."advance_to_next_season"("p_next_year" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."advance_to_next_season"("p_next_year" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."advance_to_next_season"("p_next_year" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."archive_tournament"("p_year" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."archive_tournament"("p_year" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."archive_tournament"("p_year" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_full_live"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_full_live"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_full_live"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_full_timeline"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_full_timeline"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_full_timeline"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_player_elo"("p_id" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_player_elo"("p_id" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_player_elo"("p_id" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_player_stats"("p_id" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_player_stats"("p_id" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_player_stats"("p_id" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_popularity_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_popularity_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_popularity_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_residence_access_level"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_residence_access_level"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_residence_access_level"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_super"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_super"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_super"() TO "service_role";



GRANT ALL ON FUNCTION "public"."reset_tournament"() TO "anon";
GRANT ALL ON FUNCTION "public"."reset_tournament"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."reset_tournament"() TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."verify_invitation_code"("attempted_code" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."verify_invitation_code"("attempted_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."verify_invitation_code"("attempted_code" "text") TO "service_role";



GRANT ALL ON TABLE "public"."activity_logs" TO "anon";
GRANT ALL ON TABLE "public"."activity_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."activity_logs" TO "service_role";



GRANT ALL ON SEQUENCE "public"."activity_logs_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."activity_logs_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."activity_logs_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."elo_history" TO "anon";
GRANT ALL ON TABLE "public"."elo_history" TO "authenticated";
GRANT ALL ON TABLE "public"."elo_history" TO "service_role";



GRANT ALL ON SEQUENCE "public"."elo_history_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."elo_history_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."elo_history_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."games" TO "anon";
GRANT ALL ON TABLE "public"."games" TO "authenticated";
GRANT ALL ON TABLE "public"."games" TO "service_role";



GRANT ALL ON TABLE "public"."history_all" TO "anon";
GRANT ALL ON TABLE "public"."history_all" TO "authenticated";
GRANT ALL ON TABLE "public"."history_all" TO "service_role";



GRANT ALL ON TABLE "public"."live_history" TO "anon";
GRANT ALL ON TABLE "public"."live_history" TO "authenticated";
GRANT ALL ON TABLE "public"."live_history" TO "service_role";



GRANT ALL ON TABLE "public"."live_matches" TO "anon";
GRANT ALL ON TABLE "public"."live_matches" TO "authenticated";
GRANT ALL ON TABLE "public"."live_matches" TO "service_role";



GRANT ALL ON SEQUENCE "public"."live_matches_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."live_matches_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."live_matches_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."live_selected" TO "anon";
GRANT ALL ON TABLE "public"."live_selected" TO "authenticated";
GRANT ALL ON TABLE "public"."live_selected" TO "service_role";



GRANT ALL ON TABLE "public"."live_teams" TO "anon";
GRANT ALL ON TABLE "public"."live_teams" TO "authenticated";
GRANT ALL ON TABLE "public"."live_teams" TO "service_role";



GRANT ALL ON TABLE "public"."live_tournament" TO "anon";
GRANT ALL ON TABLE "public"."live_tournament" TO "authenticated";
GRANT ALL ON TABLE "public"."live_tournament" TO "service_role";



GRANT ALL ON TABLE "public"."player_roles" TO "anon";
GRANT ALL ON TABLE "public"."player_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."player_roles" TO "service_role";



GRANT ALL ON SEQUENCE "public"."player_roles_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."player_roles_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."player_roles_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."residence_codes" TO "anon";
GRANT ALL ON TABLE "public"."residence_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."residence_codes" TO "service_role";



GRANT ALL ON TABLE "public"."residence_contacts" TO "anon";
GRANT ALL ON TABLE "public"."residence_contacts" TO "authenticated";
GRANT ALL ON TABLE "public"."residence_contacts" TO "service_role";



GRANT ALL ON TABLE "public"."residence_documents" TO "anon";
GRANT ALL ON TABLE "public"."residence_documents" TO "authenticated";
GRANT ALL ON TABLE "public"."residence_documents" TO "service_role";



GRANT ALL ON TABLE "public"."residence_documents_public" TO "anon";
GRANT ALL ON TABLE "public"."residence_documents_public" TO "authenticated";
GRANT ALL ON TABLE "public"."residence_documents_public" TO "service_role";



GRANT ALL ON TABLE "public"."residence_lots" TO "anon";
GRANT ALL ON TABLE "public"."residence_lots" TO "authenticated";
GRANT ALL ON TABLE "public"."residence_lots" TO "service_role";



GRANT ALL ON TABLE "public"."seasons" TO "anon";
GRANT ALL ON TABLE "public"."seasons" TO "authenticated";
GRANT ALL ON TABLE "public"."seasons" TO "service_role";



GRANT ALL ON TABLE "public"."session_logs" TO "anon";
GRANT ALL ON TABLE "public"."session_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."session_logs" TO "service_role";



GRANT ALL ON TABLE "public"."settings" TO "anon";
GRANT ALL ON TABLE "public"."settings" TO "authenticated";
GRANT ALL ON TABLE "public"."settings" TO "service_role";



GRANT ALL ON TABLE "public"."site_config" TO "anon";
GRANT ALL ON TABLE "public"."site_config" TO "authenticated";
GRANT ALL ON TABLE "public"."site_config" TO "service_role";



GRANT ALL ON TABLE "public"."site_users" TO "anon";
GRANT ALL ON TABLE "public"."site_users" TO "authenticated";
GRANT ALL ON TABLE "public"."site_users" TO "service_role";



GRANT ALL ON TABLE "public"."steps" TO "anon";
GRANT ALL ON TABLE "public"."steps" TO "authenticated";
GRANT ALL ON TABLE "public"."steps" TO "service_role";



GRANT ALL ON TABLE "public"."teams" TO "anon";
GRANT ALL ON TABLE "public"."teams" TO "authenticated";
GRANT ALL ON TABLE "public"."teams" TO "service_role";



GRANT ALL ON SEQUENCE "public"."teams_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."teams_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."teams_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."videos" TO "anon";
GRANT ALL ON TABLE "public"."videos" TO "authenticated";
GRANT ALL ON TABLE "public"."videos" TO "service_role";



GRANT ALL ON SEQUENCE "public"."vidéos_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."vidéos_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."vidéos_id_seq" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







