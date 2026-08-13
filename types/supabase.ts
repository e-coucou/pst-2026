export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action_type: string
          created_at: string | null
          id: number
          metadata: Json | null
          nickname: string | null
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string | null
          id?: number
          metadata?: Json | null
          nickname?: string | null
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string | null
          id?: number
          metadata?: Json | null
          nickname?: string | null
          user_id?: string
        }
        Relationships: []
      }
      elo_history: {
        Row: {
          created_at: string | null
          elo_modern_value: number | null
          elo_value: number | null
          game_id: number | null
          id: number
          modern_rank_at_time: number | null
          nom: string | null
          player_id: number | null
          pointeur: string | null
          pointeur_id: number | null
          poule: string | null
          rank_at_time: number | null
          role: string | null
          sc_c: number | null
          sc_p: number | null
          skill_mu: number | null
          skill_ordinal: number | null
          skill_rank_at_time: number | null
          skill_sigma: number | null
          tireur: string | null
          tireur_id: number | null
          type: string | null
          win: number | null
          year: number | null
        }
        Insert: {
          created_at?: string | null
          elo_modern_value?: number | null
          elo_value?: number | null
          game_id?: number | null
          id?: number
          modern_rank_at_time?: number | null
          nom?: string | null
          player_id?: number | null
          pointeur?: string | null
          pointeur_id?: number | null
          poule?: string | null
          rank_at_time?: number | null
          role?: string | null
          sc_c?: number | null
          sc_p?: number | null
          skill_mu?: number | null
          skill_ordinal?: number | null
          skill_rank_at_time?: number | null
          skill_sigma?: number | null
          tireur?: string | null
          tireur_id?: number | null
          type?: string | null
          win?: number | null
          year?: number | null
        }
        Update: {
          created_at?: string | null
          elo_modern_value?: number | null
          elo_value?: number | null
          game_id?: number | null
          id?: number
          modern_rank_at_time?: number | null
          nom?: string | null
          player_id?: number | null
          pointeur?: string | null
          pointeur_id?: number | null
          poule?: string | null
          rank_at_time?: number | null
          role?: string | null
          sc_c?: number | null
          sc_p?: number | null
          skill_mu?: number | null
          skill_ordinal?: number | null
          skill_rank_at_time?: number | null
          skill_sigma?: number | null
          tireur?: string | null
          tireur_id?: number | null
          type?: string | null
          win?: number | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "elo_history_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elo_history_year_fkey"
            columns: ["year"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["year"]
          },
          {
            foreignKeyName: "fk_elo_history_seasons"
            columns: ["year"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["year"]
          },
          {
            foreignKeyName: "fk_elo_player"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_history_step"
            columns: ["type"]
            isOneToOne: false
            referencedRelation: "steps"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          id: number
          played_at: string | null
          poule: string | null
          score_1: number | null
          score_2: number | null
          tableau: string | null
          team_1_id: number | null
          team_2_id: number | null
          type: string | null
          year: number | null
        }
        Insert: {
          id: number
          played_at?: string | null
          poule?: string | null
          score_1?: number | null
          score_2?: number | null
          tableau?: string | null
          team_1_id?: number | null
          team_2_id?: number | null
          type?: string | null
          year?: number | null
        }
        Update: {
          id?: number
          played_at?: string | null
          poule?: string | null
          score_1?: number | null
          score_2?: number | null
          tableau?: string | null
          team_1_id?: number | null
          team_2_id?: number | null
          type?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_games_eq1"
            columns: ["team_1_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_games_eq2"
            columns: ["team_2_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_games_seasons"
            columns: ["year"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["year"]
          },
          {
            foreignKeyName: "fk_games_step"
            columns: ["type"]
            isOneToOne: false
            referencedRelation: "steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_year_fkey"
            columns: ["year"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["year"]
          },
        ]
      }
      history_all: {
        Row: {
          created_at: string
          elo_modern_value: number | null
          elo_value: number | null
          game_id: number | null
          id: string
          player_id: number | null
          poule: string | null
          rank: number | null
          rank_modern: number | null
          rank_skill: number | null
          skill_mu: number | null
          skill_ordinal: number | null
          skill_sigma: number | null
          team1_id: number | null
          team2_id: number | null
          year: number | null
        }
        Insert: {
          created_at?: string
          elo_modern_value?: number | null
          elo_value?: number | null
          game_id?: number | null
          id?: string
          player_id?: number | null
          poule?: string | null
          rank?: number | null
          rank_modern?: number | null
          rank_skill?: number | null
          skill_mu?: number | null
          skill_ordinal?: number | null
          skill_sigma?: number | null
          team1_id?: number | null
          team2_id?: number | null
          year?: number | null
        }
        Update: {
          created_at?: string
          elo_modern_value?: number | null
          elo_value?: number | null
          game_id?: number | null
          id?: string
          player_id?: number | null
          poule?: string | null
          rank?: number | null
          rank_modern?: number | null
          rank_skill?: number | null
          skill_mu?: number | null
          skill_ordinal?: number | null
          skill_sigma?: number | null
          team1_id?: number | null
          team2_id?: number | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_history_game"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_history_player"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_history_season"
            columns: ["year"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["year"]
          },
          {
            foreignKeyName: "fk_history_team1"
            columns: ["team1_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_history_team2"
            columns: ["team2_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      live_history: {
        Row: {
          created_at: string
          elo_modern_value: number | null
          elo_value: number | null
          game_id: number | null
          id: string
          player_id: number | null
          poule: string | null
          rank: number | null
          rank_modern: number | null
          rank_skill: number | null
          skill_mu: number | null
          skill_ordinal: number | null
          skill_sigma: number | null
          team1_id: string | null
          team2_id: string | null
          year: number | null
        }
        Insert: {
          created_at?: string
          elo_modern_value?: number | null
          elo_value?: number | null
          game_id?: number | null
          id?: string
          player_id?: number | null
          poule?: string | null
          rank?: number | null
          rank_modern?: number | null
          rank_skill?: number | null
          skill_mu?: number | null
          skill_ordinal?: number | null
          skill_sigma?: number | null
          team1_id?: string | null
          team2_id?: string | null
          year?: number | null
        }
        Update: {
          created_at?: string
          elo_modern_value?: number | null
          elo_value?: number | null
          game_id?: number | null
          id?: string
          player_id?: number | null
          poule?: string | null
          rank?: number | null
          rank_modern?: number | null
          rank_skill?: number | null
          skill_mu?: number | null
          skill_ordinal?: number | null
          skill_sigma?: number | null
          team1_id?: string | null
          team2_id?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "live_history_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_history_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_history_team1_id_fkey"
            columns: ["team1_id"]
            isOneToOne: false
            referencedRelation: "live_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_history_team2_id_fkey"
            columns: ["team2_id"]
            isOneToOne: false
            referencedRelation: "live_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_history_year_fkey"
            columns: ["year"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["year"]
          },
        ]
      }
      live_matches: {
        Row: {
          delta_elo_team1: number
          delta_elo_team2: number
          delta_modern_team1: number
          delta_modern_team2: number
          delta_skill_team1: number | null
          delta_skill_team2: number | null
          id: number
          poule: string | null
          round: number | null
          score_team1: number | null
          score_team2: number | null
          status: string | null
          tableau: string
          team1_id: string | null
          team2_id: string | null
          terrain: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          delta_elo_team1?: number
          delta_elo_team2?: number
          delta_modern_team1?: number
          delta_modern_team2?: number
          delta_skill_team1?: number | null
          delta_skill_team2?: number | null
          id?: number
          poule?: string | null
          round?: number | null
          score_team1?: number | null
          score_team2?: number | null
          status?: string | null
          tableau?: string
          team1_id?: string | null
          team2_id?: string | null
          terrain?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          delta_elo_team1?: number
          delta_elo_team2?: number
          delta_modern_team1?: number
          delta_modern_team2?: number
          delta_skill_team1?: number | null
          delta_skill_team2?: number | null
          id?: number
          poule?: string | null
          round?: number | null
          score_team1?: number | null
          score_team2?: number | null
          status?: string | null
          tableau?: string
          team1_id?: string | null
          team2_id?: string | null
          terrain?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "live_matches_team1_id_fkey"
            columns: ["team1_id"]
            isOneToOne: false
            referencedRelation: "live_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_matches_team2_id_fkey"
            columns: ["team2_id"]
            isOneToOne: false
            referencedRelation: "live_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_matches_type_fkey"
            columns: ["type"]
            isOneToOne: false
            referencedRelation: "steps"
            referencedColumns: ["id"]
          },
        ]
      }
      live_selected: {
        Row: {
          confirmed: boolean
          elo_at_selection: number | null
          id: string
          modern_at_selection: number
          nom: string | null
          player_id: number | null
          role: string | null
          skill_mu_at_selection: number | null
          skill_sigma_at_selection: number | null
        }
        Insert: {
          confirmed?: boolean
          elo_at_selection?: number | null
          id?: string
          modern_at_selection?: number
          nom?: string | null
          player_id?: number | null
          role?: string | null
          skill_mu_at_selection?: number | null
          skill_sigma_at_selection?: number | null
        }
        Update: {
          confirmed?: boolean
          elo_at_selection?: number | null
          id?: string
          modern_at_selection?: number
          nom?: string | null
          player_id?: number | null
          role?: string | null
          skill_mu_at_selection?: number | null
          skill_sigma_at_selection?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "live_selected_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      live_teams: {
        Row: {
          defaites: number | null
          elo_start: number
          elo_start_pointeur: number
          elo_start_tireur: number
          id: string
          modern_start: number
          pointeur_id: number | null
          points_contre: number | null
          points_pour: number | null
          poule: string | null
          skill_mu_pointeur: number | null
          skill_mu_tireur: number | null
          skill_sigma_pointeur: number | null
          skill_sigma_tireur: number | null
          tireur_id: number | null
          victoires: number | null
        }
        Insert: {
          defaites?: number | null
          elo_start?: number
          elo_start_pointeur?: number
          elo_start_tireur?: number
          id: string
          modern_start?: number
          pointeur_id?: number | null
          points_contre?: number | null
          points_pour?: number | null
          poule?: string | null
          skill_mu_pointeur?: number | null
          skill_mu_tireur?: number | null
          skill_sigma_pointeur?: number | null
          skill_sigma_tireur?: number | null
          tireur_id?: number | null
          victoires?: number | null
        }
        Update: {
          defaites?: number | null
          elo_start?: number
          elo_start_pointeur?: number
          elo_start_tireur?: number
          id?: string
          modern_start?: number
          pointeur_id?: number | null
          points_contre?: number | null
          points_pour?: number | null
          poule?: string | null
          skill_mu_pointeur?: number | null
          skill_mu_tireur?: number | null
          skill_sigma_pointeur?: number | null
          skill_sigma_tireur?: number | null
          tireur_id?: number | null
          victoires?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "live_teams_pointeur_id_fkey"
            columns: ["pointeur_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_teams_tireur_id_fkey"
            columns: ["tireur_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      live_tournament: {
        Row: {
          format: string | null
          id: number
          status: string
          team_mode: string | null
          updated_at: string | null
        }
        Insert: {
          format?: string | null
          id?: number
          status?: string
          team_mode?: string | null
          updated_at?: string | null
        }
        Update: {
          format?: string | null
          id?: number
          status?: string
          team_mode?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      player_roles: {
        Row: {
          id: number
          player_id: number | null
          role: string | null
          year: number | null
        }
        Insert: {
          id?: number
          player_id?: number | null
          role?: string | null
          year?: number | null
        }
        Update: {
          id?: number
          player_id?: number | null
          role?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_player_roles_seasons"
            columns: ["year"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["year"]
          },
          {
            foreignKeyName: "player_roles_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_roles_year_fkey"
            columns: ["year"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["year"]
          },
        ]
      }
      profiles: {
        Row: {
          id: number
          level: string | null
          nom: string
          photo_url: string | null
        }
        Insert: {
          id: number
          level?: string | null
          nom: string
          photo_url?: string | null
        }
        Update: {
          id?: number
          level?: string | null
          nom?: string
          photo_url?: string | null
        }
        Relationships: []
      }
      residence_codes: {
        Row: {
          code: string
          id: string
          label: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          code: string
          id?: string
          label: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          id?: string
          label?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      residence_contacts: {
        Row: {
          apartment_num: string | null
          category: string
          contrat: string | null
          created_at: string
          email: string | null
          id: string
          nom: string
          notes: string | null
          telephone: string | null
          updated_at: string
        }
        Insert: {
          apartment_num?: string | null
          category?: string
          contrat?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nom: string
          notes?: string | null
          telephone?: string | null
          updated_at?: string
        }
        Update: {
          apartment_num?: string | null
          category?: string
          contrat?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nom?: string
          notes?: string | null
          telephone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      residence_documents: {
        Row: {
          category: string
          created_at: string
          description: string | null
          external_url: string
          id: string
          resume: string | null
          title: string
          uploaded_by: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          external_url: string
          id?: string
          resume?: string | null
          title: string
          uploaded_by?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          external_url?: string
          id?: string
          resume?: string | null
          title?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "residence_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "site_users"
            referencedColumns: ["id"]
          },
        ]
      }
      residence_lots: {
        Row: {
          anomalie_signalee: string | null
          autres_lots_du_meme_proprietaire: number[] | null
          batiment: string
          categorie: string
          charges_comptes: Json | null
          charges_reparties_total: number | null
          charges_solde_total: number | null
          composition: string[] | null
          concordance_residence_ts: string | null
          created_at: string
          description: string | null
          etage: string | null
          historique_proprietaires: string[] | null
          id: string
          identifiant_local: string
          numero_lot: number | null
          observation: string | null
          orientation: string | null
          plan_kind: string | null
          plan_num: string | null
          proprietaire_confiance: string | null
          proprietaire_officiel: string | null
          proprietaire_source_annee: string | null
          secteur: string | null
          situation: string | null
          tantieme_denominateur: number | null
          tantieme_numerateur: number | null
          tantieme_texte_original: string | null
        }
        Insert: {
          anomalie_signalee?: string | null
          autres_lots_du_meme_proprietaire?: number[] | null
          batiment?: string
          categorie: string
          charges_comptes?: Json | null
          charges_reparties_total?: number | null
          charges_solde_total?: number | null
          composition?: string[] | null
          concordance_residence_ts?: string | null
          created_at?: string
          description?: string | null
          etage?: string | null
          historique_proprietaires?: string[] | null
          id?: string
          identifiant_local: string
          numero_lot?: number | null
          observation?: string | null
          orientation?: string | null
          plan_kind?: string | null
          plan_num?: string | null
          proprietaire_confiance?: string | null
          proprietaire_officiel?: string | null
          proprietaire_source_annee?: string | null
          secteur?: string | null
          situation?: string | null
          tantieme_denominateur?: number | null
          tantieme_numerateur?: number | null
          tantieme_texte_original?: string | null
        }
        Update: {
          anomalie_signalee?: string | null
          autres_lots_du_meme_proprietaire?: number[] | null
          batiment?: string
          categorie?: string
          charges_comptes?: Json | null
          charges_reparties_total?: number | null
          charges_solde_total?: number | null
          composition?: string[] | null
          concordance_residence_ts?: string | null
          created_at?: string
          description?: string | null
          etage?: string | null
          historique_proprietaires?: string[] | null
          id?: string
          identifiant_local?: string
          numero_lot?: number | null
          observation?: string | null
          orientation?: string | null
          plan_kind?: string | null
          plan_num?: string | null
          proprietaire_confiance?: string | null
          proprietaire_officiel?: string | null
          proprietaire_source_annee?: string | null
          secteur?: string | null
          situation?: string | null
          tantieme_denominateur?: number | null
          tantieme_numerateur?: number | null
          tantieme_texte_original?: string | null
        }
        Relationships: []
      }
      seasons: {
        Row: {
          format: string | null
          is_active: boolean | null
          is_archived: boolean
          year: number
        }
        Insert: {
          format?: string | null
          is_active?: boolean | null
          is_archived?: boolean
          year: number
        }
        Update: {
          format?: string | null
          is_active?: boolean | null
          is_archived?: boolean
          year?: number
        }
        Relationships: []
      }
      session_logs: {
        Row: {
          action: string | null
          created_at: string | null
          details: string | null
          id: string
          ip_address: string | null
          player_nickname: string | null
          user_id: string | null
        }
        Insert: {
          action?: string | null
          created_at?: string | null
          details?: string | null
          id?: string
          ip_address?: string | null
          player_nickname?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string | null
          created_at?: string | null
          details?: string | null
          id?: string
          ip_address?: string | null
          player_nickname?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      settings: {
        Row: {
          init: number | null
          key: string
          label: string | null
          value: number | null
        }
        Insert: {
          init?: number | null
          key: string
          label?: string | null
          value?: number | null
        }
        Update: {
          init?: number | null
          key?: string
          label?: string | null
          value?: number | null
        }
        Relationships: []
      }
      site_config: {
        Row: {
          id: string
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      site_users: {
        Row: {
          created_at: string | null
          email: string | null
          favoris: number | null
          id: string
          invitation_code_used: string | null
          last_login: string | null
          nickname: string
          residence_access_level: number
          role: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          favoris?: number | null
          id: string
          invitation_code_used?: string | null
          last_login?: string | null
          nickname: string
          residence_access_level?: number
          role?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          favoris?: number | null
          id?: string
          invitation_code_used?: string | null
          last_login?: string | null
          nickname?: string
          residence_access_level?: number
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_users_favoris_fkey"
            columns: ["favoris"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      steps: {
        Row: {
          created_at: string
          id: string
          label: string | null
          value: number | null
        }
        Insert: {
          created_at?: string
          id: string
          label?: string | null
          value?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          label?: string | null
          value?: number | null
        }
        Relationships: []
      }
      teams: {
        Row: {
          id: number
          nom: string | null
          pointeur_id: number | null
          tireur_id: number | null
          year: number | null
        }
        Insert: {
          id?: number
          nom?: string | null
          pointeur_id?: number | null
          tireur_id?: number | null
          year?: number | null
        }
        Update: {
          id?: number
          nom?: string | null
          pointeur_id?: number | null
          tireur_id?: number | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_teams_pointeur"
            columns: ["pointeur_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_teams_seasons"
            columns: ["year"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["year"]
          },
          {
            foreignKeyName: "fk_teams_tireur"
            columns: ["tireur_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_pointeur_id_fkey"
            columns: ["pointeur_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_tireur_id_fkey"
            columns: ["tireur_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_year_fkey"
            columns: ["year"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["year"]
          },
        ]
      }
      videos: {
        Row: {
          created_at: string
          id: number
          link: string | null
          year: number | null
        }
        Insert: {
          created_at?: string
          id?: number
          link?: string | null
          year?: number | null
        }
        Update: {
          created_at?: string
          id?: number
          link?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_videos_seasons"
            columns: ["year"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["year"]
          },
        ]
      }
    }
    Views: {
      residence_documents_public: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          external_url: string | null
          id: string | null
          resume: string | null
          title: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          external_url?: string | null
          id?: string | null
          resume?: never
          title?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          external_url?: string | null
          id?: string | null
          resume?: never
          title?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      advance_to_next_season: { Args: { p_next_year: number }; Returns: Json }
      archive_tournament: { Args: { p_year: number }; Returns: Json }
      get_full_live: {
        Args: never
        Returns: {
          game_id: number
          players: Json
          year: number
        }[]
      }
      get_full_timeline: {
        Args: never
        Returns: {
          game_id: number
          players: Json
          year: number
        }[]
      }
      get_my_role: { Args: never; Returns: string }
      get_player_elo: {
        Args: { p_id: number }
        Returns: {
          annee: number
          elo: number
          game: number
          id: number
          modern: number
          rank_elo: number
          rank_modern_elo: number
          rank_skill_elo: number
          skill: number
        }[]
      }
      get_player_stats: {
        Args: { p_id: number }
        Returns: {
          annee: number
          classement: number
          contre: number
          defaites: number
          finale_jouee: string
          goalavg: number
          id: number
          nom: string
          nuls: number
          palmares: string
          partenaire: string
          pour: number
          rang: number
          role: string
          victoires: number
        }[]
      }
      get_popularity_stats: { Args: never; Returns: Json }
      get_residence_access_level: { Args: never; Returns: number }
      is_admin: { Args: never; Returns: boolean }
      is_super: { Args: never; Returns: boolean }
      reset_tournament: { Args: never; Returns: undefined }
      verify_invitation_code: {
        Args: { attempted_code: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
