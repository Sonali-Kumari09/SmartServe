/* auth.js — simple role-based login/register/session, backed by localStorage (demo only —
 * a real deployment must hash passwords and authenticate server-side). */
const Auth = (() => {
  const SESSION_KEY = 'session';

  /**
   * Log in. `expectedRole` is the role tab the user picked on the login screen — if the
   * stored account has a different role, the login is rejected outright (no session is
   * ever created for a mismatched role, so a student account can never end up signed in
   * on the admin side or vice-versa).
   */
  function login(username, password, expectedRole) {
    const users = DB.get('users', []);
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
    if (!user) return { ok: false, error: 'Invalid username or password.' };
    if (expectedRole && user.role !== expectedRole) {
      const label = user.role === 'admin' ? 'Mess Admin' : 'Student';
      return { ok: false, error: `This account is registered as ${label}. Switch tabs to log in.` };
    }
    const session = { userId: user.id, name: user.name, role: user.role, loggedInAt: Date.now() };
    DB.set(SESSION_KEY, session);
    return { ok: true, session };
  }

  /** Create a new account with a fixed role (chosen at signup) and immediately sign in. */
  function register({ name, username, password, role }) {
    name = (name || '').trim();
    username = (username || '').trim();
    if (!name || !username || !password) return { ok: false, error: 'Please fill in every field.' };
    if (password.length < 6) return { ok: false, error: 'Password must be at least 6 characters.' };
    if (role !== 'student' && role !== 'admin') return { ok: false, error: 'Please choose a role.' };

    const users = DB.get('users', []);
    if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
      return { ok: false, error: 'That username is already taken.' };
    }

    const user = { id: DB.nextId('u'), username, password, role, name };
    DB.push('users', user);

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

  return { login, register, logout, currentSession, requireRole };
})();
