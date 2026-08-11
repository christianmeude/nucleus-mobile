# SECURITY DEFINER RPCs for Cross-User Reads and Recursion

Direct anon + RLS writes or reads frequently fail in this project due to infinite recursion errors (`42P17` on `public.users`) and UUID mismatches. We decided that cross-user reads and complex writes must fall back to a `SECURITY DEFINER` Remote Procedure Call (RPC) function with `search_path = public`. This bypasses the infinite recursion traps while maintaining secure access control through explicit function logic.

## Consequences

- Cross-user reads (where a user needs to see another user's profile or data that RLS blocks) must go through a `SECURITY DEFINER` RPC.
- Representative RPCs using this pattern include `increment_view_count`, `get_faculty_members`, and `create_co_author_invitations`.
