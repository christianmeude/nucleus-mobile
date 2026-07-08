import { ReactNode, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getLoginIntent, setLoginIntent, setLoginRejection } from '../state/loginIntent';

/**
 * Enforces that the chosen sign-in option matches the account's role: a
 * "Sign in as Student" with a faculty account (and vice versa) is rejected and
 * signed straight back out, surfacing a rejection on the login screen.
 *
 * The mismatch is derived **during render** (not only in an effect), so a
 * mismatched session never paints the wrong role's tabs for even one frame — the
 * guard withholds the app the moment the mismatch is visible. The pending intent
 * is deliberately kept set until the session is actually gone, so the guard stays
 * closed through the async sign-out instead of flashing the tabs mid-teardown.
 *
 * Wraps AppNavigator (which swaps LoginScreen → tabs the instant `user` becomes
 * truthy, in the same render pass) so this gate survives that swap; LoginScreen
 * itself is gone from the tree before its own effects for the new `user` fire.
 */
export const RoleGuard = ({ children }: { children: ReactNode }) => {
  const { user, signOut } = useAuth();
  const intent = getLoginIntent();
  const mismatched = !!user && !!intent && user.role !== intent;

  useEffect(() => {
    if (!user || !intent) return;
    if (user.role !== intent) {
      // Reject: leave the intent set (so `mismatched` stays true through the
      // async sign-out) and tear the session down. The intent is cleared once
      // the session is gone, by the effect below.
      setLoginRejection(
        `That account isn't registered as ${intent}. Use the correct sign-in option below.`
      );
      void signOut();
    } else {
      // Matched: consume the intent so it doesn't linger into the next session.
      setLoginIntent(null);
    }
  }, [user, intent, signOut]);

  // After a rejection sign-out, clear the lingering intent once the session is
  // gone so the next login attempt starts clean.
  useEffect(() => {
    if (!user) setLoginIntent(null);
  }, [user]);

  if (mismatched) {
    return null;
  }

  return <>{children}</>;
};
