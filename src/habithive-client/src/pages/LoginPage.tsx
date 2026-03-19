import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { login as apiLogin, register as apiRegister } from '../services/api';

export default function LoginPage() {
  const { login } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isRegister) {
        const res = await apiRegister(username, displayName || username, password);
        login(res.data.token, res.data.displayName);
      } else {
        const res = await apiLogin(username, password);
        login(res.data.token, res.data.displayName);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Something went wrong. The bees are confused. Try again?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-cream">
      <div className="w-full max-w-md p-8 animate-fade-in">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold font-display text-amber-dark mb-2">🐝 HabitHive</h1>
          <p className="text-cocoa text-lg">Track habits. Hype friends. Stay cozy.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8 border border-border-warm">
          <div className="flex mb-6 bg-stone rounded-xl p-1">
            <button
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                !isRegister ? 'bg-amber text-white shadow-sm' : 'text-cocoa hover:text-charcoal'
              }`}
              onClick={() => setIsRegister(false)}
            >
              Log In
            </button>
            <button
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                isRegister ? 'bg-amber text-white shadow-sm' : 'text-cocoa hover:text-charcoal'
              }`}
              onClick={() => setIsRegister(true)}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-cocoa uppercase tracking-wider mb-1">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-border-warm bg-cream text-charcoal focus:outline-none focus:ring-2 focus:ring-amber focus:border-transparent transition-all"
                placeholder="your_username"
                required
                minLength={3}
                maxLength={20}
              />
            </div>

            {isRegister && (
              <div className="animate-fade-in">
                <label className="block text-xs font-semibold text-cocoa uppercase tracking-wider mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-border-warm bg-cream text-charcoal focus:outline-none focus:ring-2 focus:ring-amber focus:border-transparent transition-all"
                  placeholder="How your friends see you"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-cocoa uppercase tracking-wider mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-border-warm bg-cream text-charcoal focus:outline-none focus:ring-2 focus:ring-amber focus:border-transparent transition-all"
                placeholder="••••••••"
                required
                minLength={8}
              />
            </div>

            {error && (
              <div className="p-3 bg-coral-light rounded-xl text-coral text-sm animate-fade-in">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-amber hover:bg-amber-dark text-white font-bold rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100"
            >
              {loading ? 'Summoning motivation...' : isRegister ? 'Join the Hive 🐝' : 'Enter the Hive'}
            </button>
          </form>
        </div>

        <p className="text-center text-cocoa text-sm mt-6">
          {isRegister
            ? 'Already have an account? Log in above.'
            : "Don't have an account? Sign up above."}
        </p>
      </div>
    </div>
  );
}
