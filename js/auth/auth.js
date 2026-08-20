/* auth.js — simple role-based login/session, backed by localStorage (demo only —
 * a real deployment must hash passwords and authenticate server-side). */
const Auth = (() => {
  const SESSION_KEY = 'session';

  function login(username, password) {
    const users = DB.get('users', []);
    const user = users.find(u => u.username === username && u.password === password);
    if (!user) return { ok: false, error: 'Invalid username or password.' };
    const session = { userId: user.id, name: user.name, role: user.role, loggedInAt: Date.now() };
    DB.set(SESSION_KEY, session);
    return { ok: true, session };
  }

  function logout() { DB.remove(SESSION_KEY); }

  function currentSession() { return DB.get(SESSION_KEY, null); }

  /** Call at the top of a protected page. Redirects if not logged in / wrong role. */
  function requireRole(role, redirectTo = '../login.html') {
    const session = currentSession();
    if (!session || session.role !== role) {
      window.location.href = redirectTo;
      return null;
    }
    return session;
  }

  return { login, logout, currentSession, requireRole };
})();
