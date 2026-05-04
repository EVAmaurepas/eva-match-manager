import { useState, useEffect } from 'react';
import PlayerList from './components/PlayerList';
import MatchMaker from './components/MatchMaker';
import MatchHistory from './components/MatchHistory';
import Archives from './components/Archives';
import Login from './components/Login';
import { Gamepad2, Users, History, Download, Upload, LogOut } from 'lucide-react';

function App() {
  const [players, setPlayers] = useState([]);
  const [upcomingMatches, setUpcomingMatches] = useState([]);
  const [matchHistory, setMatchHistory] = useState([]);
  const [archives, setArchives] = useState([]);
  const [activeTab, setActiveTab] = useState('match');
  const [loading, setLoading] = useState(true);
  const [showResetModal, setShowResetModal] = useState(false);
  const [archiveName, setArchiveName] = useState('');
  const [shouldArchive, setShouldArchive] = useState(true);

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('eva-auth') === 'true';
  });
  const [userRole, setUserRole] = useState(() => {
    return sessionStorage.getItem('eva-role') || 'viewer';
  });

  useEffect(() => {
    fetch('/api/state')
      .then(res => {
        if (!res.ok) throw new Error("API not available");
        return res.json();
      })
      .then(data => {
        if (data.players) setPlayers(data.players);
        else {
          const savedPlayers = localStorage.getItem('eva-players');
          if (savedPlayers) setPlayers(JSON.parse(savedPlayers));
        }
        
        if (data.upcomingMatches) setUpcomingMatches(data.upcomingMatches);
        else if (data.currentMatch) setUpcomingMatches([data.currentMatch]); // migration
        else {
          const savedMatches = localStorage.getItem('eva-upcoming');
          if (savedMatches) setUpcomingMatches(JSON.parse(savedMatches));
        }
        
        if (data.matchHistory) setMatchHistory(data.matchHistory);
        else {
          const savedHistory = localStorage.getItem('eva-history');
          if (savedHistory) setMatchHistory(JSON.parse(savedHistory));
        }

        if (data.archives) setArchives(data.archives);
        else {
          const savedArchives = localStorage.getItem('eva-archives');
          if (savedArchives) setArchives(JSON.parse(savedArchives));
        }

        setLoading(false);
      })
      .catch(err => {
        console.warn("API Error, falling back to localStorage", err);
        const savedPlayers = localStorage.getItem('eva-players');
        const savedMatches = localStorage.getItem('eva-upcoming');
        const savedHistory = localStorage.getItem('eva-history');
        const savedArchives = localStorage.getItem('eva-archives');
        if (savedPlayers) setPlayers(JSON.parse(savedPlayers));
        if (savedMatches) setUpcomingMatches(JSON.parse(savedMatches));
        if (savedHistory) setMatchHistory(JSON.parse(savedHistory));
        if (savedArchives) setArchives(JSON.parse(savedArchives));
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (loading) return;
    
    // Save locally always
    localStorage.setItem('eva-players', JSON.stringify(players));
    localStorage.setItem('eva-upcoming', JSON.stringify(upcomingMatches));
    localStorage.setItem('eva-history', JSON.stringify(matchHistory));
    localStorage.setItem('eva-archives', JSON.stringify(archives));

    // Try saving to DB
    const data = { players, upcomingMatches, matchHistory, archives };
    fetch('/api/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).catch(() => {}); // ignore error locally
  }, [players, upcomingMatches, matchHistory, archives, loading]);

  const addPlayer = (name, level) => {
    const newPlayer = {
      id: Date.now().toString(),
      name,
      level: parseInt(level),
      matchesPlayed: 0
    };
    setPlayers([...players, newPlayer]);
  };

  const updatePlayer = (id, updates) => {
    setPlayers(players.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const deletePlayer = (id) => {
    setPlayers(players.filter(p => p.id !== id));
  };

  const finishMatch = () => {
    if (upcomingMatches.length === 0) return;
    
    const match = upcomingMatches[0];
    const participatingIds = [
      ...match.team1.map(p => p.id),
      ...match.team2.map(p => p.id)
    ];

    setPlayers(players.map(p => {
      if (participatingIds.includes(p.id)) {
        return { ...p, matchesPlayed: p.matchesPlayed + 1 };
      }
      return p;
    }));

    const newMatchRecord = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      team1: match.team1,
      team2: match.team2
    };
    
    setMatchHistory([newMatchRecord, ...matchHistory]);
    setUpcomingMatches(upcomingMatches.slice(1));
  };

  const exportData = () => {
    const data = { players, upcomingMatches, matchHistory, archives };
    const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `eva-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (data.players) setPlayers(data.players);
        if (data.upcomingMatches) setUpcomingMatches(data.upcomingMatches);
        else if (data.currentMatch) setUpcomingMatches([data.currentMatch]);
        if (data.matchHistory) setMatchHistory(data.matchHistory);
        if (data.archives) setArchives(data.archives);
        alert("Données importées avec succès !");
      } catch (err) {
        alert("Erreur lors de l'importation du fichier JSON.");
      }
    };
    reader.readAsText(file);
    event.target.value = null; // reset file input
  };

  const handleLogout = () => {
    sessionStorage.removeItem('eva-auth');
    sessionStorage.removeItem('eva-role');
    setIsAuthenticated(false);
  };

  const handleReset = () => {
    if (shouldArchive) {
      if (!archiveName.trim()) {
        alert("Veuillez donner un nom à l'archive");
        return;
      }
      const newArchive = {
        id: Date.now().toString(),
        name: archiveName,
        date: new Date().toISOString(),
        players: [...players],
        matchHistory: [...matchHistory],
        upcomingMatches: [...upcomingMatches]
      };
      setArchives([newArchive, ...archives]);
    }

    setPlayers([]);
    setUpcomingMatches([]);
    setMatchHistory([]);
    setShowResetModal(false);
    setArchiveName('');
    setActiveTab('players');
    alert("Application réinitialisée !");
  };

  if (!isAuthenticated) {
    return (
      <Login onLoginSuccess={(role) => {
        sessionStorage.setItem('eva-auth', 'true');
        sessionStorage.setItem('eva-role', role);
        setUserRole(role);
        setIsAuthenticated(true);
      }} />
    );
  }

  if (loading) {
    return (
      <div className="eva-container flex items-center justify-center" style={{ minHeight: '100vh' }}>
        <h2 className="glow-text text-primary text-2xl">Connexion au serveur...</h2>
      </div>
    );
  }

  return (
    <div className="eva-container">
      <header className="flex md-flex-col justify-between items-center md-items-start mb-8 md-gap-2">
        <div className="flex-1">
          <h1 className="glow-text text-primary flex items-center gap-4">
            <img src="/logo.png" alt="EVA Logo" style={{ height: '60px' }} />
            EVA MAUREPAS
          </h1>
          <div className="flex md-wrap items-center gap-6 mt-2 mb-4">
            <p className="text-secondary font-bold">KHÉOPS LEAGUE</p>
          </div>
        </div>

        <div className="flex gap-2 self-start pt-1">
          <button onClick={exportData} className="eva-button" title="Exporter" style={{ padding: '0.4rem 0.6rem', minWidth: 'auto', background: 'rgba(0, 240, 255, 0.05)', borderColor: 'rgba(0, 240, 255, 0.2)', fontSize: '0.75rem' }}>
            <Download size={14} /> EXPORT
          </button>
          {userRole === 'admin' && (
            <>
              <label className="eva-button" title="Importer" style={{ padding: '0.4rem 0.6rem', minWidth: 'auto', background: 'rgba(0, 240, 255, 0.05)', borderColor: 'rgba(0, 240, 255, 0.2)', cursor: 'pointer', fontSize: '0.75rem' }}>
                <Upload size={14} /> IMPORT
                <input type="file" accept=".json" style={{ display: 'none' }} onChange={importData} />
              </label>
              <button 
                onClick={() => setShowResetModal(true)} 
                className="eva-button secondary" 
                title="Reset" 
                style={{ padding: '0.4rem 0.6rem', minWidth: 'auto', background: 'rgba(255, 0, 85, 0.05)', borderColor: 'rgba(255, 0, 85, 0.2)', fontSize: '0.75rem' }}
              >
                RESET
              </button>
            </>
          )}
          <button onClick={handleLogout} className="eva-button secondary" title="Déconnexion" style={{ padding: '0.4rem 0.6rem', minWidth: 'auto', background: 'rgba(255, 0, 85, 0.05)', borderColor: 'rgba(255, 0, 85, 0.2)', fontSize: '0.75rem' }}>
            <LogOut size={14} /> LOGOUT
          </button>
        </div>
      </header>
        
      <nav className="flex md-wrap gap-2 w-full mb-8">
        <button 
          className={`eva-button ${activeTab === 'players' ? 'secondary' : ''}`}
          onClick={() => setActiveTab('players')}
        >
          <Users size={20} />
          Roster ({players.length})
        </button>
        <button 
          className={`eva-button ${activeTab === 'match' ? 'secondary' : ''}`}
          onClick={() => setActiveTab('match')}
        >
          <Gamepad2 size={20} />
          Match Area
        </button>
        <button 
          className={`eva-button ${activeTab === 'history' ? 'secondary' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <History size={20} />
          Historique
        </button>
        <button 
          className={`eva-button ${activeTab === 'archives' ? 'secondary' : ''}`}
          onClick={() => setActiveTab('archives')}
        >
          <History size={20} />
          Archives ({archives.length})
        </button>
      </nav>

      <main>
        {activeTab === 'players' && (
          <PlayerList 
            players={players} 
            onAdd={addPlayer} 
            onUpdate={updatePlayer}
            onDelete={deletePlayer}
            isAdmin={userRole === 'admin'}
          />
        )}
        {activeTab === 'match' && (
          <MatchMaker 
            players={players} 
            upcomingMatches={upcomingMatches}
            setUpcomingMatches={setUpcomingMatches}
            finishMatch={finishMatch}
            matchHistory={matchHistory}
            isAdmin={userRole === 'admin'}
          />
        )}
        {activeTab === 'history' && (
          <MatchHistory matchHistory={matchHistory} />
        )}
        {activeTab === 'archives' && (
          <Archives archives={archives} setArchives={setArchives} isAdmin={userRole === 'admin'} />
        )}
      </main>

      {/* Reset Modal */}
      {showResetModal && (
        <div className="modal-overlay">
          <div className="eva-card" style={{ maxWidth: '400px', width: '90%' }}>
            <h2 className="text-secondary mb-4">Reset Application</h2>
            <p className="mb-6 opacity-80">Êtes-vous sûr de vouloir tout réinitialiser ? Cette action est irréversible (sauf si vous archivez).</p>
            
            <div className="flex flex-col gap-4 mb-8">
              <label className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={shouldArchive} 
                  onChange={(e) => setShouldArchive(e.target.checked)}
                  style={{ width: '20px', height: '20px' }}
                />
                <span>Sauvegarder dans les archives</span>
              </label>
              
              {shouldArchive && (
                <input 
                  type="text" 
                  className="eva-input" 
                  placeholder="Nom de l'archive (ex: Tournoi Mai)"
                  value={archiveName}
                  onChange={(e) => setArchiveName(e.target.value)}
                  autoFocus
                />
              )}
            </div>
            
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowResetModal(false)} className="eva-button" style={{ borderColor: 'rgba(255,255,255,0.2)', color: 'white' }}>
                Annuler
              </button>
              <button onClick={handleReset} className="eva-button secondary">
                Confirmer Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
