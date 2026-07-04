import { ReactNode, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getLoginIntent, setLoginIntent, setLoginRejection } from '../state/loginIntent';

/**
 * Wraps AppNavigator (which switches screens the instant `user` becomes
 * truthy, in the same render pass that unmounts LoginScreen) so the
 * student/faculty intent check survives that swap. LoginScreen itself
 * cannot run this check reliably — it's gone from the tree before its own
 * effects for the new `user` value would fire.
 */
export const RoleGuard = ({ children }: { children: ReactNode }) => {
  const { user, signOut } = useAuth();

  useEffect(() => {
    const intent = getLoginIntent();
    if (!intent || !user) {
      return;
    }
    setLoginIntent(null);

    if (user.role !== intent) {
      setLoginRejection(`That account isn't registered as ${intent}. Use the correct sign-in option below.`);
      void signOut();
    }
  }, [user, signOut]);

  return <>{children}</>;
};
