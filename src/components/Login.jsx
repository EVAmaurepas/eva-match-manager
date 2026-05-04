import { useState } from 'react';
import { Gamepad2, LogIn, Lock, User } from 'lucide-react';

function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        onLoginSuccess(data.role);
      } else {
        setError(data.error || 'Erreur de connexion');
      }
    } catch (err) {
      setError('Impossible de joindre le serveur. Essayez plus tard.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="eva-container flex flex-col items-center justify-center" style={{ minHeight: '100vh', padding: '1rem' }}>
      <div className="eva-card w-full" style={{ maxWidth: '400px', margin: 'auto', marginTop: '10vh' }}>
        <div className="text-center mb-8">
          <img src="/logo.png" alt="EVA Logo" className="mx-auto mb-4" style={{ height: '100px' }} />
          <h1 className="glow-text text-primary text-2xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
            EVA MAUREPAS
          </h1>
          <p className="text-secondary opacity-80 mt-2 font-bold">KHÉOPS LEAGUE</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="flex items-center gap-2 mb-2 opacity-80">
              <User size={16} /> Identifiant
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="eva-input"
              required
              disabled={loading}
              autoFocus
            />
          </div>
          
          <div>
            <label className="flex items-center gap-2 mb-2 opacity-80">
              <Lock size={16} /> Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="eva-input"
              required
              disabled={loading}
            />
          </div>

          {error && (
            <div className="p-3 mt-2 bg-red-900/20 border border-red-500 rounded text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            className="eva-button mt-4" 
            disabled={loading}
            style={{ width: '100%' }}
          >
            {loading ? 'Vérification...' : <><LogIn size={20} /> Connexion</>}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
