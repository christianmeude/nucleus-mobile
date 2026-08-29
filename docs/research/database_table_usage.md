# Research: Database Table Usage in Mobile App

**Date:** 2026-08-23
**Goal:** Determine which database tables are used by the React Native mobile app and which are completely unfetched.

## Methodology
Searched the capstone-nucleus-rn source code (src/ directory) for Supabase query syntax (e.g., .from('table_name')). The list of all 25 tables in the Supabase database was cross-referenced against the codebase.

## 1. Tables Used Directly by Mobile App
These tables are explicitly queried, inserted into, or updated by the mobile app's codebase.

- users
- esearch_categories
- 
otifications
- esearch_comments
- collections
- paper_downloads
- departments
- collection_papers
- push_tokens
- submission_drafts
- paper_views
- esearch_authors
- system_policy_settings
- co_author_invitations
- esearch_papers

## 2. Tables Completely Unfetched Directly
These tables are never explicitly referenced via a direct Supabase table fetch (.from(...)) in the mobile application. 

- profiles
- pproval_workflow
- ctive_research_papers
- ecycle_bin
- aculty_conflict_declarations
- programs
- workflow_stages
- esearch_paper_embeddings
- pending_reviews
- esearch_with_authors

### Note on RPCs (Stored Procedures)
While the tables in Section 2 are unfetched *directly* by the mobile app, the mobile app calls several Supabase RPCs (Remote Procedure Calls) which may mutate or query these tables on the server side. 

For example, the mobile app heavily uses:
- aculty_approve_paper
- aculty_request_revision
- aculty_reject_paper

These RPCs internally interact with the pproval_workflow and workflow_stages tables, meaning these tables are still critical to the mobile app's core functionality (faculty reviews), even though the client code does not query them directly. 

Similarly, ctive_research_papers and esearch_with_authors are likely SQL Views used by the web backend for aggregation, which the mobile app currently ignores in favor of direct relational queries or other RPCs.
