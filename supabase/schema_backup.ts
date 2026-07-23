/*
 * SCHEMA BACKUP
 * Date: 2026-07-20T02:05:16.069Z
 * Last Commit: 259e564a353665fe903dc11f17c2dc7cdbcc692c
 * Last EAS Build: 1a3c5328-a423-4421-ace8-2b4c0f238a8b
 * Project: capstone-research-repo (nnqnszprshnsyuebegnt)
 * Reason: Backup before destructive changes
 * Note: This file should be updated each time there are working changes with the database
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.1';
  };
  public: {
    Tables: {
      approval_workflow: {
        Row: {
          action_type: string;
          comments: string | null;
          created_at: string | null;
          id: string;
          metadata: Json;
          new_status: string | null;
          previous_status: string | null;
          research_id: string;
          reviewed_at: string | null;
          reviewer_id: string;
          reviewer_role: string;
          status: string;
        };
        Insert: {
          action_type?: string;
          comments?: string | null;
          created_at?: string | null;
          id?: string;
          metadata?: Json;
          new_status?: string | null;
          previous_status?: string | null;
          research_id: string;
          reviewed_at?: string | null;
          reviewer_id: string;
          reviewer_role: string;
          status: string;
        };
        Update: {
          action_type?: string;
          comments?: string | null;
          created_at?: string | null;
          id?: string;
          metadata?: Json;
          new_status?: string | null;
          previous_status?: string | null;
          research_id?: string;
          reviewed_at?: string | null;
          reviewer_id?: string;
          reviewer_role?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'approval_workflow_research_id_fkey';
            columns: ['research_id'];
            isOneToOne: false;
            referencedRelation: 'active_research_papers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'approval_workflow_research_id_fkey';
            columns: ['research_id'];
            isOneToOne: false;
            referencedRelation: 'pending_reviews';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'approval_workflow_research_id_fkey';
            columns: ['research_id'];
            isOneToOne: false;
            referencedRelation: 'recycle_bin';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'approval_workflow_research_id_fkey';
            columns: ['research_id'];
            isOneToOne: false;
            referencedRelation: 'research_papers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'approval_workflow_research_id_fkey';
            columns: ['research_id'];
            isOneToOne: false;
            referencedRelation: 'research_with_authors';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'approval_workflow_reviewer_id_fkey';
            columns: ['reviewer_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      co_author_invitations: {
        Row: {
          created_at: string;
          expires_at: string;
          id: string;
          invitee_email: string | null;
          invitee_id: string;
          inviter_id: string;
          research_id: string;
          responded_at: string | null;
          status: string;
          token: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          expires_at: string;
          id?: string;
          invitee_email?: string | null;
          invitee_id: string;
          inviter_id: string;
          research_id: string;
          responded_at?: string | null;
          status?: string;
          token: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          expires_at?: string;
          id?: string;
          invitee_email?: string | null;
          invitee_id?: string;
          inviter_id?: string;
          research_id?: string;
          responded_at?: string | null;
          status?: string;
          token?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'co_author_invitations_invitee_id_fkey';
            columns: ['invitee_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'co_author_invitations_inviter_id_fkey';
            columns: ['inviter_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'co_author_invitations_research_id_fkey';
            columns: ['research_id'];
            isOneToOne: false;
            referencedRelation: 'active_research_papers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'co_author_invitations_research_id_fkey';
            columns: ['research_id'];
            isOneToOne: false;
            referencedRelation: 'pending_reviews';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'co_author_invitations_research_id_fkey';
            columns: ['research_id'];
            isOneToOne: false;
            referencedRelation: 'recycle_bin';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'co_author_invitations_research_id_fkey';
            columns: ['research_id'];
            isOneToOne: false;
            referencedRelation: 'research_papers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'co_author_invitations_research_id_fkey';
            columns: ['research_id'];
            isOneToOne: false;
            referencedRelation: 'research_with_authors';
            referencedColumns: ['id'];
          },
        ];
      };
      collection_papers: {
        Row: {
          added_at: string;
          collection_id: string;
          id: string;
          paper_id: string;
        };
        Insert: {
          added_at?: string;
          collection_id: string;
          id?: string;
          paper_id: string;
        };
        Update: {
          added_at?: string;
          collection_id?: string;
          id?: string;
          paper_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'collection_papers_collection_id_fkey';
            columns: ['collection_id'];
            isOneToOne: false;
            referencedRelation: 'collections';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'collection_papers_paper_id_fkey';
            columns: ['paper_id'];
            isOneToOne: false;
            referencedRelation: 'active_research_papers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'collection_papers_paper_id_fkey';
            columns: ['paper_id'];
            isOneToOne: false;
            referencedRelation: 'pending_reviews';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'collection_papers_paper_id_fkey';
            columns: ['paper_id'];
            isOneToOne: false;
            referencedRelation: 'recycle_bin';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'collection_papers_paper_id_fkey';
            columns: ['paper_id'];
            isOneToOne: false;
            referencedRelation: 'research_papers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'collection_papers_paper_id_fkey';
            columns: ['paper_id'];
            isOneToOne: false;
            referencedRelation: 'research_with_authors';
            referencedColumns: ['id'];
          },
        ];
      };
      collections: {
        Row: {
          created_at: string;
          id: string;
          is_default: boolean;
          name: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_default?: boolean;
          name: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_default?: boolean;
          name?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'collections_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      departments: {
        Row: {
          code: string | null;
          created_at: string;
          description: string | null;
          id: string;
          is_active: boolean;
          name: string;
          updated_at: string;
        };
        Insert: {
          code?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          name: string;
          updated_at?: string;
        };
        Update: {
          code?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      faculty_conflict_declarations: {
        Row: {
          declared_at: string;
          faculty_id: string;
          id: string;
          reason: string | null;
          research_id: string;
        };
        Insert: {
          declared_at?: string;
          faculty_id: string;
          id?: string;
          reason?: string | null;
          research_id: string;
        };
        Update: {
          declared_at?: string;
          faculty_id?: string;
          id?: string;
          reason?: string | null;
          research_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'faculty_conflict_faculty_fkey';
            columns: ['faculty_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'faculty_conflict_research_fkey';
            columns: ['research_id'];
            isOneToOne: false;
            referencedRelation: 'active_research_papers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'faculty_conflict_research_fkey';
            columns: ['research_id'];
            isOneToOne: false;
            referencedRelation: 'pending_reviews';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'faculty_conflict_research_fkey';
            columns: ['research_id'];
            isOneToOne: false;
            referencedRelation: 'recycle_bin';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'faculty_conflict_research_fkey';
            columns: ['research_id'];
            isOneToOne: false;
            referencedRelation: 'research_papers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'faculty_conflict_research_fkey';
            columns: ['research_id'];
            isOneToOne: false;
            referencedRelation: 'research_with_authors';
            referencedColumns: ['id'];
          },
        ];
      };
      notifications: {
        Row: {
          created_at: string | null;
          id: string;
          is_read: boolean | null;
          message: string;
          research_id: string | null;
          title: string;
          type: string;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          is_read?: boolean | null;
          message: string;
          research_id?: string | null;
          title: string;
          type: string;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          is_read?: boolean | null;
          message?: string;
          research_id?: string | null;
          title?: string;
          type?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notifications_research_id_fkey';
            columns: ['research_id'];
            isOneToOne: false;
            referencedRelation: 'active_research_papers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notifications_research_id_fkey';
            columns: ['research_id'];
            isOneToOne: false;
            referencedRelation: 'pending_reviews';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notifications_research_id_fkey';
            columns: ['research_id'];
            isOneToOne: false;
            referencedRelation: 'recycle_bin';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notifications_research_id_fkey';
            columns: ['research_id'];
            isOneToOne: false;
            referencedRelation: 'research_papers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notifications_research_id_fkey';
            columns: ['research_id'];
            isOneToOne: false;
            referencedRelation: 'research_with_authors';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notifications_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      paper_downloads: {
        Row: {
          created_at: string | null;
          downloaded_at: string | null;
          id: string;
          paper_id: string | null;
          user_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          downloaded_at?: string | null;
          id?: string;
          paper_id?: string | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          downloaded_at?: string | null;
          id?: string;
          paper_id?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'paper_downloads_paper_id_fkey';
            columns: ['paper_id'];
            isOneToOne: false;
            referencedRelation: 'active_research_papers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'paper_downloads_paper_id_fkey';
            columns: ['paper_id'];
            isOneToOne: false;
            referencedRelation: 'pending_reviews';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'paper_downloads_paper_id_fkey';
            columns: ['paper_id'];
            isOneToOne: false;
            referencedRelation: 'recycle_bin';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'paper_downloads_paper_id_fkey';
            columns: ['paper_id'];
            isOneToOne: false;
            referencedRelation: 'research_papers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'paper_downloads_paper_id_fkey';
            columns: ['paper_id'];
            isOneToOne: false;
            referencedRelation: 'research_with_authors';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'paper_downloads_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      paper_views: {
        Row: {
          created_at: string | null;
          id: string;
          paper_id: string | null;
          user_id: string | null;
          viewed_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          paper_id?: string | null;
          user_id?: string | null;
          viewed_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          paper_id?: string | null;
          user_id?: string | null;
          viewed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'paper_views_paper_id_fkey';
            columns: ['paper_id'];
            isOneToOne: false;
            referencedRelation: 'active_research_papers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'paper_views_paper_id_fkey';
            columns: ['paper_id'];
            isOneToOne: false;
            referencedRelation: 'pending_reviews';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'paper_views_paper_id_fkey';
            columns: ['paper_id'];
            isOneToOne: false;
            referencedRelation: 'recycle_bin';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'paper_views_paper_id_fkey';
            columns: ['paper_id'];
            isOneToOne: false;
            referencedRelation: 'research_papers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'paper_views_paper_id_fkey';
            columns: ['paper_id'];
            isOneToOne: false;
            referencedRelation: 'research_with_authors';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'paper_views_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          id: string;
          role: string | null;
        };
        Insert: {
          id: string;
          role?: string | null;
        };
        Update: {
          id?: string;
          role?: string | null;
        };
        Relationships: [];
      };
      programs: {
        Row: {
          code: string | null;
          created_at: string;
          department_id: string;
          id: string;
          is_active: boolean;
          name: string;
          updated_at: string;
        };
        Insert: {
          code?: string | null;
          created_at?: string;
          department_id: string;
          id?: string;
          is_active?: boolean;
          name: string;
          updated_at?: string;
        };
        Update: {
          code?: string | null;
          created_at?: string;
          department_id?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'programs_department_id_fkey';
            columns: ['department_id'];
            isOneToOne: false;
            referencedRelation: 'departments';
            referencedColumns: ['id'];
          },
        ];
      };
      research_authors: {
        Row: {
          author_order: number;
          created_at: string | null;
          id: string;
          is_primary: boolean | null;
          research_id: string;
          user_id: string;
        };
        Insert: {
          author_order?: number;
          created_at?: string | null;
          id?: string;
          is_primary?: boolean | null;
          research_id: string;
          user_id: string;
        };
        Update: {
          author_order?: number;
          created_at?: string | null;
          id?: string;
          is_primary?: boolean | null;
          research_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'research_authors_research_id_fkey';
            columns: ['research_id'];
            isOneToOne: false;
            referencedRelation: 'active_research_papers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'research_authors_research_id_fkey';
            columns: ['research_id'];
            isOneToOne: false;
            referencedRelation: 'pending_reviews';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'research_authors_research_id_fkey';
            columns: ['research_id'];
            isOneToOne: false;
            referencedRelation: 'recycle_bin';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'research_authors_research_id_fkey';
            columns: ['research_id'];
            isOneToOne: false;
            referencedRelation: 'research_papers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'research_authors_research_id_fkey';
            columns: ['research_id'];
            isOneToOne: false;
            referencedRelation: 'research_with_authors';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'research_authors_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      research_categories: {
        Row: {
          created_at: string | null;
          description: string | null;
          id: string;
          name: string;
        };
        Insert: {
          created_at?: string | null;
          description?: string | null;
          id?: string;
          name: string;
        };
        Update: {
          created_at?: string | null;
          description?: string | null;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      research_comments: {
        Row: {
          comment: string;
          created_at: string | null;
          id: string;
          is_internal: boolean | null;
          parent_id: string | null;
          research_id: string;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          comment: string;
          created_at?: string | null;
          id?: string;
          is_internal?: boolean | null;
          parent_id?: string | null;
          research_id: string;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          comment?: string;
          created_at?: string | null;
          id?: string;
          is_internal?: boolean | null;
          parent_id?: string | null;
          research_id?: string;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'research_comments_parent_id_fkey';
            columns: ['parent_id'];
            isOneToOne: false;
            referencedRelation: 'research_comments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'research_comments_research_id_fkey';
            columns: ['research_id'];
            isOneToOne: false;
            referencedRelation: 'active_research_papers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'research_comments_research_id_fkey';
            columns: ['research_id'];
            isOneToOne: false;
            referencedRelation: 'pending_reviews';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'research_comments_research_id_fkey';
            columns: ['research_id'];
            isOneToOne: false;
            referencedRelation: 'recycle_bin';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'research_comments_research_id_fkey';
            columns: ['research_id'];
            isOneToOne: false;
            referencedRelation: 'research_papers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'research_comments_research_id_fkey';
            columns: ['research_id'];
            isOneToOne: false;
            referencedRelation: 'research_with_authors';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'research_comments_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      research_paper_embeddings: {
        Row: {
          embedding: string;
          paper_id: string;
          source_hash: string;
          updated_at: string;
        };
        Insert: {
          embedding: string;
          paper_id: string;
          source_hash: string;
          updated_at?: string;
        };
        Update: {
          embedding?: string;
          paper_id?: string;
          source_hash?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'research_paper_embeddings_paper_id_fkey';
            columns: ['paper_id'];
            isOneToOne: true;
            referencedRelation: 'active_research_papers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'research_paper_embeddings_paper_id_fkey';
            columns: ['paper_id'];
            isOneToOne: true;
            referencedRelation: 'pending_reviews';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'research_paper_embeddings_paper_id_fkey';
            columns: ['paper_id'];
            isOneToOne: true;
            referencedRelation: 'recycle_bin';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'research_paper_embeddings_paper_id_fkey';
            columns: ['paper_id'];
            isOneToOne: true;
            referencedRelation: 'research_papers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'research_paper_embeddings_paper_id_fkey';
            columns: ['paper_id'];
            isOneToOne: true;
            referencedRelation: 'research_with_authors';
            referencedColumns: ['id'];
          },
        ];
      };
      research_papers: {
        Row: {
          abstract: string;
          author_id: string;
          bypass_reason: string | null;
          bypassed_at: string | null;
          bypassed_by: string | null;
          category: string;
          created_at: string | null;
          deadline_reminder_last_sent_at: string | null;
          dean_chair_id: string | null;
          deleted_at: string | null;
          deleted_by: string | null;
          department: string | null;
          department_id: string | null;
          download_count: number | null;
          embedding: string | null;
          embedding_generated_at: string | null;
          embedding_model: string | null;
          embedding_source_hash: string | null;
          external_author_notes: string | null;
          faculty_id: string | null;
          file_name: string;
          file_size: number;
          file_storage_path: string | null;
          file_url: string;
          id: string;
          keywords: string[] | null;
          last_reviewer_role: string | null;
          plagiarism_checked_at: string | null;
          plagiarism_provider: string | null;
          plagiarism_report: Json | null;
          plagiarism_score: number | null;
          plagiarism_status: string | null;
          plagiarism_summary: string | null;
          previous_status: string | null;
          program_id: string | null;
          published_date: string | null;
          rejection_reason: string | null;
          return_notes: string | null;
          return_to_author: boolean;
          review_deadline_at: string | null;
          revision_notes: string | null;
          search_vector: unknown;
          status: string;
          submission_date: string | null;
          title: string;
          updated_at: string | null;
          view_count: number | null;
        };
        Insert: {
          abstract: string;
          author_id: string;
          bypass_reason?: string | null;
          bypassed_at?: string | null;
          bypassed_by?: string | null;
          category: string;
          created_at?: string | null;
          deadline_reminder_last_sent_at?: string | null;
          dean_chair_id?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          department?: string | null;
          department_id?: string | null;
          download_count?: number | null;
          embedding?: string | null;
          embedding_generated_at?: string | null;
          embedding_model?: string | null;
          embedding_source_hash?: string | null;
          external_author_notes?: string | null;
          faculty_id?: string | null;
          file_name?: string;
          file_size?: number;
          file_storage_path?: string | null;
          file_url: string;
          id?: string;
          keywords?: string[] | null;
          last_reviewer_role?: string | null;
          plagiarism_checked_at?: string | null;
          plagiarism_provider?: string | null;
          plagiarism_report?: Json | null;
          plagiarism_score?: number | null;
          plagiarism_status?: string | null;
          plagiarism_summary?: string | null;
          previous_status?: string | null;
          program_id?: string | null;
          published_date?: string | null;
          rejection_reason?: string | null;
          return_notes?: string | null;
          return_to_author?: boolean;
          review_deadline_at?: string | null;
          revision_notes?: string | null;
          search_vector?: unknown;
          status?: string;
          submission_date?: string | null;
          title: string;
          updated_at?: string | null;
          view_count?: number | null;
        };
        Update: {
          abstract?: string;
          author_id?: string;
          bypass_reason?: string | null;
          bypassed_at?: string | null;
          bypassed_by?: string | null;
          category?: string;
          created_at?: string | null;
          deadline_reminder_last_sent_at?: string | null;
          dean_chair_id?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          department?: string | null;
          department_id?: string | null;
          download_count?: number | null;
          embedding?: string | null;
          embedding_generated_at?: string | null;
          embedding_model?: string | null;
          embedding_source_hash?: string | null;
          external_author_notes?: string | null;
          faculty_id?: string | null;
          file_name?: string;
          file_size?: number;
          file_storage_path?: string | null;
          file_url?: string;
          id?: string;
          keywords?: string[] | null;
          last_reviewer_role?: string | null;
          plagiarism_checked_at?: string | null;
          plagiarism_provider?: string | null;
          plagiarism_report?: Json | null;
          plagiarism_score?: number | null;
          plagiarism_status?: string | null;
          plagiarism_summary?: string | null;
          previous_status?: string | null;
          program_id?: string | null;
          published_date?: string | null;
          rejection_reason?: string | null;
          return_notes?: string | null;
          return_to_author?: boolean;
          review_deadline_at?: string | null;
          revision_notes?: string | null;
          search_vector?: unknown;
          status?: string;
          submission_date?: string | null;
          title?: string;
          updated_at?: string | null;
          view_count?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'research_papers_author_id_fkey';
            columns: ['author_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'research_papers_bypassed_by_fkey';
            columns: ['bypassed_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'research_papers_dean_chair_id_fkey';
            columns: ['dean_chair_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'research_papers_deleted_by_fkey';
            columns: ['deleted_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'research_papers_department_id_fkey';
            columns: ['department_id'];
            isOneToOne: false;
            referencedRelation: 'departments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'research_papers_faculty_id_fkey';
            columns: ['faculty_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'research_papers_program_id_fkey';
            columns: ['program_id'];
            isOneToOne: false;
            referencedRelation: 'programs';
            referencedColumns: ['id'];
          },
        ];
      };
      submission_drafts: {
        Row: {
          created_at: string;
          draft_data: Json;
          id: string;
          paper_id: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          draft_data?: Json;
          id?: string;
          paper_id?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          draft_data?: Json;
          id?: string;
          paper_id?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'submission_drafts_paper_id_fkey';
            columns: ['paper_id'];
            isOneToOne: false;
            referencedRelation: 'active_research_papers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'submission_drafts_paper_id_fkey';
            columns: ['paper_id'];
            isOneToOne: false;
            referencedRelation: 'pending_reviews';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'submission_drafts_paper_id_fkey';
            columns: ['paper_id'];
            isOneToOne: false;
            referencedRelation: 'recycle_bin';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'submission_drafts_paper_id_fkey';
            columns: ['paper_id'];
            isOneToOne: false;
            referencedRelation: 'research_papers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'submission_drafts_paper_id_fkey';
            columns: ['paper_id'];
            isOneToOne: false;
            referencedRelation: 'research_with_authors';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'submission_drafts_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      system_policy_settings: {
        Row: {
          allowed_file_types: string[];
          id: boolean;
          legacy_policy_overrides: Json;
          max_file_size_mb: number;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          allowed_file_types?: string[];
          id?: boolean;
          legacy_policy_overrides?: Json;
          max_file_size_mb?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          allowed_file_types?: string[];
          id?: boolean;
          legacy_policy_overrides?: Json;
          max_file_size_mb?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      users: {
        Row: {
          auth_user_id: string | null;
          created_at: string | null;
          department: string | null;
          department_id: string | null;
          email: string;
          first_name: string;
          id: string;
          is_active: boolean;
          last_name: string;
          middle_name: string | null;
          password: string | null;
          program: string | null;
          program_id: string | null;
          recovery_email: string | null;
          role: string;
          suspended_at: string | null;
          suspended_by: string | null;
          suspended_reason: string | null;
          updated_at: string | null;
        };
        Insert: {
          auth_user_id?: string | null;
          created_at?: string | null;
          department?: string | null;
          department_id?: string | null;
          email: string;
          first_name: string;
          id?: string;
          is_active?: boolean;
          last_name: string;
          middle_name?: string | null;
          password?: string | null;
          program?: string | null;
          program_id?: string | null;
          recovery_email?: string | null;
          role: string;
          suspended_at?: string | null;
          suspended_by?: string | null;
          suspended_reason?: string | null;
          updated_at?: string | null;
        };
        Update: {
          auth_user_id?: string | null;
          created_at?: string | null;
          department?: string | null;
          department_id?: string | null;
          email?: string;
          first_name?: string;
          id?: string;
          is_active?: boolean;
          last_name?: string;
          middle_name?: string | null;
          password?: string | null;
          program?: string | null;
          program_id?: string | null;
          recovery_email?: string | null;
          role?: string;
          suspended_at?: string | null;
          suspended_by?: string | null;
          suspended_reason?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'users_department_id_fkey';
            columns: ['department_id'];
            isOneToOne: false;
            referencedRelation: 'departments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'users_program_id_fkey';
            columns: ['program_id'];
            isOneToOne: false;
            referencedRelation: 'programs';
            referencedColumns: ['id'];
          },
        ];
      };
      workflow_stages: {
        Row: {
          code: string;
          created_at: string;
          id: string;
          is_active: boolean;
          label: string;
          position: number;
          reviewer_role: string;
          updated_at: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          label: string;
          position: number;
          reviewer_role: string;
          updated_at?: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          label?: string;
          position?: number;
          reviewer_role?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      active_research_papers: {
        Row: {
          abstract: string | null;
          author_id: string | null;
          bypass_reason: string | null;
          bypassed_at: string | null;
          bypassed_by: string | null;
          category: string | null;
          co_authors: string | null;
          created_at: string | null;
          dean_chair_id: string | null;
          deleted_at: string | null;
          deleted_by: string | null;
          department: string | null;
          department_id: string | null;
          download_count: number | null;
          faculty_id: string | null;
          file_name: string | null;
          file_size: number | null;
          file_storage_path: string | null;
          file_url: string | null;
          id: string | null;
          keywords: string[] | null;
          last_reviewer_role: string | null;
          previous_status: string | null;
          published_date: string | null;
          rejection_reason: string | null;
          revision_notes: string | null;
          status: string | null;
          submission_date: string | null;
          title: string | null;
          updated_at: string | null;
          view_count: number | null;
        };
        Insert: {
          abstract?: string | null;
          author_id?: string | null;
          bypass_reason?: string | null;
          bypassed_at?: string | null;
          bypassed_by?: string | null;
          category?: string | null;
          co_authors?: string | null;
          created_at?: string | null;
          dean_chair_id?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          department?: string | null;
          department_id?: string | null;
          download_count?: number | null;
          faculty_id?: string | null;
          file_name?: string | null;
          file_size?: number | null;
          file_storage_path?: string | null;
          file_url?: string | null;
          id?: string | null;
          keywords?: string[] | null;
          last_reviewer_role?: string | null;
          previous_status?: string | null;
          published_date?: string | null;
          rejection_reason?: string | null;
          revision_notes?: string | null;
          status?: string | null;
          submission_date?: string | null;
          title?: string | null;
          updated_at?: string | null;
          view_count?: number | null;
        };
        Update: {
          abstract?: string | null;
          author_id?: string | null;
          bypass_reason?: string | null;
          bypassed_at?: string | null;
          bypassed_by?: string | null;
          category?: string | null;
          co_authors?: string | null;
          created_at?: string | null;
          dean_chair_id?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          department?: string | null;
          department_id?: string | null;
          download_count?: number | null;
          faculty_id?: string | null;
          file_name?: string | null;
          file_size?: number | null;
          file_storage_path?: string | null;
          file_url?: string | null;
          id?: string | null;
          keywords?: string[] | null;
          last_reviewer_role?: string | null;
          previous_status?: string | null;
          published_date?: string | null;
          rejection_reason?: string | null;
          revision_notes?: string | null;
          status?: string | null;
          submission_date?: string | null;
          title?: string | null;
          updated_at?: string | null;
          view_count?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'research_papers_author_id_fkey';
            columns: ['author_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'research_papers_bypassed_by_fkey';
            columns: ['bypassed_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'research_papers_dean_chair_id_fkey';
            columns: ['dean_chair_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'research_papers_deleted_by_fkey';
            columns: ['deleted_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'research_papers_department_id_fkey';
            columns: ['department_id'];
            isOneToOne: false;
            referencedRelation: 'departments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'research_papers_faculty_id_fkey';
            columns: ['faculty_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      pending_reviews: {
        Row: {
          author_id: string | null;
          author_name: string | null;
          category: string | null;
          id: string | null;
          status: string | null;
          submission_date: string | null;
          title: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'research_papers_author_id_fkey';
            columns: ['author_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      recycle_bin: {
        Row: {
          abstract: string | null;
          author_id: string | null;
          bypass_reason: string | null;
          bypassed_at: string | null;
          bypassed_by: string | null;
          category: string | null;
          co_authors: string | null;
          created_at: string | null;
          dean_chair_id: string | null;
          deleted_at: string | null;
          deleted_by: string | null;
          department: string | null;
          department_id: string | null;
          download_count: number | null;
          faculty_id: string | null;
          file_name: string | null;
          file_size: number | null;
          file_storage_path: string | null;
          file_url: string | null;
          id: string | null;
          keywords: string[] | null;
          last_reviewer_role: string | null;
          previous_status: string | null;
          published_date: string | null;
          rejection_reason: string | null;
          revision_notes: string | null;
          status: string | null;
          submission_date: string | null;
          title: string | null;
          updated_at: string | null;
          view_count: number | null;
        };
        Insert: {
          abstract?: string | null;
          author_id?: string | null;
          bypass_reason?: string | null;
          bypassed_at?: string | null;
          bypassed_by?: string | null;
          category?: string | null;
          co_authors?: string | null;
          created_at?: string | null;
          dean_chair_id?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          department?: string | null;
          department_id?: string | null;
          download_count?: number | null;
          faculty_id?: string | null;
          file_name?: string | null;
          file_size?: number | null;
          file_storage_path?: string | null;
          file_url?: string | null;
          id?: string | null;
          keywords?: string[] | null;
          last_reviewer_role?: string | null;
          previous_status?: string | null;
          published_date?: string | null;
          rejection_reason?: string | null;
          revision_notes?: string | null;
          status?: string | null;
          submission_date?: string | null;
          title?: string | null;
          updated_at?: string | null;
          view_count?: number | null;
        };
        Update: {
          abstract?: string | null;
          author_id?: string | null;
          bypass_reason?: string | null;
          bypassed_at?: string | null;
          bypassed_by?: string | null;
          category?: string | null;
          co_authors?: string | null;
          created_at?: string | null;
          dean_chair_id?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          department?: string | null;
          department_id?: string | null;
          download_count?: number | null;
          faculty_id?: string | null;
          file_name?: string | null;
          file_size?: number | null;
          file_storage_path?: string | null;
          file_url?: string | null;
          id?: string | null;
          keywords?: string[] | null;
          last_reviewer_role?: string | null;
          previous_status?: string | null;
          published_date?: string | null;
          rejection_reason?: string | null;
          revision_notes?: string | null;
          status?: string | null;
          submission_date?: string | null;
          title?: string | null;
          updated_at?: string | null;
          view_count?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'research_papers_author_id_fkey';
            columns: ['author_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'research_papers_bypassed_by_fkey';
            columns: ['bypassed_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'research_papers_dean_chair_id_fkey';
            columns: ['dean_chair_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'research_papers_deleted_by_fkey';
            columns: ['deleted_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'research_papers_department_id_fkey';
            columns: ['department_id'];
            isOneToOne: false;
            referencedRelation: 'departments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'research_papers_faculty_id_fkey';
            columns: ['faculty_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      research_with_authors: {
        Row: {
          abstract: string | null;
          author_email: string | null;
          author_id: string | null;
          author_name: string | null;
          category: string | null;
          category_name: string | null;
          co_authors: string | null;
          created_at: string | null;
          download_count: number | null;
          file_name: string | null;
          file_size: number | null;
          file_url: string | null;
          id: string | null;
          keywords: string[] | null;
          published_date: string | null;
          rejection_reason: string | null;
          revision_notes: string | null;
          status: string | null;
          submission_date: string | null;
          title: string | null;
          updated_at: string | null;
          view_count: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'research_papers_author_id_fkey';
            columns: ['author_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Functions: {
      create_co_author_invitations: {
        Args: { p_invitee_ids: string[]; p_research_id: string };
        Returns: {
          invitee_id: string;
          result: string;
        }[];
      };
      create_faculty_annotation: {
        Args: { p_comment: string; p_paper_id: string };
        Returns: string;
      };
      faculty_approve_paper: {
        Args: {
          p_comments: string;
          p_paper_id: string;
          p_target_role: string;
          p_target_user_id: string;
        };
        Returns: string;
      };
      faculty_notify_paper_parties: {
        Args: {
          p_author_id: string;
          p_author_message: string;
          p_author_title: string;
          p_coauthor_message: string;
          p_coauthor_title: string;
          p_research_id: string;
          p_type: string;
        };
        Returns: undefined;
      };
      faculty_reject_paper: {
        Args: { p_paper_id: string; p_reason: string };
        Returns: string;
      };
      faculty_request_revision: {
        Args: { p_notes: string; p_paper_id: string };
        Returns: string;
      };
      get_dean_chair_members: {
        Args: never;
        Returns: {
          department: string;
          department_id: string;
          email: string;
          first_name: string;
          id: string;
          last_name: string;
          middle_name: string;
          role: string;
        }[];
      };
      get_faculty_members: {
        Args: { p_department?: string; p_department_id?: string };
        Returns: {
          department: string;
          email: string;
          first_name: string;
          id: string;
          last_name: string;
          middle_name: string;
        }[];
      };
      get_research_paper_ids_for_invitee: {
        Args: { p_invitee_id: string };
        Returns: {
          id: string;
        }[];
      };
      get_user_basic_info: {
        Args: { user_id: string };
        Returns: {
          email: string;
          first_name: string;
          id: string;
          last_name: string;
          middle_name: string;
        }[];
      };
      increment_download_count: { Args: { row_id: string }; Returns: undefined };
      increment_view_count: { Args: { row_id: string }; Returns: undefined };
      match_paper_content: {
        Args: {
          match_count: number;
          match_threshold: number;
          p_paper_id: string;
          query_embedding: string;
        };
        Returns: {
          content: string;
          id: string;
          similarity: number;
        }[];
      };
      match_research_papers: {
        Args: {
          filter_author?: string;
          filter_department?: string;
          filter_year?: number;
          keyword_weight?: number;
          match_count?: number;
          query_embedding: string;
          query_text?: string;
          semantic_weight?: number;
          similarity_threshold?: number;
        };
        Returns: {
          hybrid_score: number;
          id: string;
          keyword_score: number;
          semantic_score: number;
        }[];
      };
      published_paper_ids_by_author: {
        Args: { author_term: string };
        Returns: string[];
      };
      search_research_papers: {
        Args: {
          full_text_weight?: number;
          match_count?: number;
          query_embedding: string;
          query_text: string;
          rrf_k?: number;
          semantic_weight?: number;
        };
        Returns: {
          paper_id: string;
          score: number;
        }[];
      };
      search_students: {
        Args: { p_query: string };
        Returns: {
          email: string;
          first_name: string;
          id: string;
          last_name: string;
          middle_name: string;
          program: string;
        }[];
      };
      toggle_paper_saved: { Args: { p_paper_id: string }; Returns: boolean };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
