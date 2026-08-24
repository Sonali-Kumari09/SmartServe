const Auth = (() => {
  async function login(email, password, role) {
    try {
      const result = await API.login(email, password, role);
      API.saveSession(result.token, result.user);
      return { ok: true, session: result.user };
    } catch (error) { return { ok: false, error: error.message }; }
  }

  function logout() { API.clearSession(); }
  function currentSession() { return API.user(); }

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
