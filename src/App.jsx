import { useState, useEffect } from 'react';
import PlayerList from './components/PlayerList';
import MatchMaker from './components/MatchMaker';
import MatchHistory from './components/MatchHistory';
import Archives from './components/Archives';
import DoubleArena from './components/DoubleArena';
import Login from './components/Login';
import { Gamepad2, Users, History, Download, Upload, LogOut, Swords } from 'lucide-react';

// Helper to reconstruct histories and player stats from completed matches
const rebuildStatsFromHistory = (currentPlayers, completedMatches) => {
  const playerMap = {};
  currentPlayers.forEach(p => {
    playerMap[p.id] = {
      ...p,
      matchesPlayed: 0,
      consecutiveBench: 0,
      lastPlayedAt: 0
    };
  });

  const presence = {};
  const team = {};
  const opponent = {};

  const addPair = (matrix, a, b, val) => {
    if (!matrix[a]) matrix[a] = {};
    if (!matrix[b]) matrix[b] = {};
    matrix[a][b] = (matrix[a][b] || 0) + val;
    matrix[b][a] = (matrix[b][a] || 0) + val;
  };

  const decay = (matrix) => {
    Object.keys(matrix).forEach(a => {
      Object.keys(matrix[a]).forEach(b => {
        matrix[a][b] *= 0.95;
      });
    });
  };

  // Process matches in chronological order (oldest to newest)
  const chronological = [...completedMatches].reverse();
  chronological.forEach(match => {
    const team1Ids = match.team1.map(p => p.id);
    const team2Ids = match.team2.map(p => p.id);
    const participatingIds = [...team1Ids, ...team2Ids];
    const matchTime = match.date ? new Date(match.date).getTime() : Date.now();

    // Update players
    Object.keys(playerMap).forEach(id => {
      const p = playerMap[id];
      if (p.isPaused) return;
      if (participatingIds.includes(id)) {
        p.matchesPlayed += 1;
        p.consecutiveBench = 0;
        p.lastPlayedAt = matchTime;
      } else {
        p.consecutiveBench += 1;
      }
    });

    // Presence
    for (let i = 0; i < participatingIds.length; i++) {
      for (let j = i + 1; j < participatingIds.length; j++) {
        addPair(presence, participatingIds[i], participatingIds[j], 1);
      }
    }

    // Team
    for (let i = 0; i < team1Ids.length; i++) {
      for (let j = i + 1; j < team1Ids.length; j++) {
        addPair(team, team1Ids[i], team1Ids[j], 1);
      }
    }
    for (let i = 0; i < team2Ids.length; i++) {
      for (let j = i + 1; j < team2Ids.length; j++) {
        addPair(team, team2Ids[i], team2Ids[j], 1);
      }
    }

    // Opponent
    for (let i = 0; i < team1Ids.length; i++) {
      for (let j = 0; j < team2Ids.length; j++) {
        addPair(opponent, team1Ids[i], team2Ids[j], 1);
      }
    }

    // Decay
    decay(presence);
    decay(team);
    decay(opponent);
  });

  return {
    players: Object.values(playerMap),
    presence,
    team,
    opponent
  };
};

function App() {
  const [players, setPlayers] = useState([]);
  const [upcomingMatches, setUpcomingMatches] = useState([]);
  const [matchHistory, setMatchHistory] = useState([]);
  const [presenceHistory, setPresenceHistory] = useState({});
  const [teamHistory, setTeamHistory] = useState({});
  const [opponentHistory, setOpponentHistory] = useState({});
  const [archives, setArchives] = useState([]);
  const [activeTab, setActiveTab] = useState('match');
  const [loading, setLoading] = useState(true);
  const [showResetModal, setShowResetModal] = useState(false);
  const [archiveName, setArchiveName] = useState('');
  const [shouldArchive, setShouldArchive] = useState(true);
  const [doubleArenaMatches, setDoubleArenaMatches] = useState(null);
  const [doubleArenaHistory, setDoubleArenaHistory] = useState([]);

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
        let loadedPlayers = data.players || [];
        const savedPlayers = localStorage.getItem('eva-players');
        if (!data.players && savedPlayers) {
          loadedPlayers = JSON.parse(savedPlayers);
        }

        let loadedHistory = data.matchHistory || [];
        const savedHistory = localStorage.getItem('eva-history');
        if (!data.matchHistory && savedHistory) {
          loadedHistory = JSON.parse(savedHistory);
        }

        const sanitizedPlayers = loadedPlayers.map(p => ({
          id: p.id,
          name: p.name,
          level: p.level ?? p.skill ?? 5,
          matchesPlayed: p.matchesPlayed ?? p.gamesPlayed ?? 0,
          consecutiveBench: p.consecutiveBench ?? 0,
          lastPlayedAt: p.lastPlayedAt ?? 0,
          isPaused: p.isPaused ?? false,
          avatar: p.avatar
        }));

        setPlayers(sanitizedPlayers);
        
        if (data.upcomingMatches) setUpcomingMatches(data.upcomingMatches);
        else if (data.currentMatch) setUpcomingMatches([data.currentMatch]); // migration
        else {
          const savedMatches = localStorage.getItem('eva-upcoming');
          if (savedMatches) setUpcomingMatches(JSON.parse(savedMatches));
        }
        
        setMatchHistory(loadedHistory);

        if (data.archives) setArchives(data.archives);
        else {
          const savedArchives = localStorage.getItem('eva-archives');
          if (savedArchives) setArchives(JSON.parse(savedArchives));
        }

        let hasLoadedMatrices = false;
        if (data.presenceHistory && data.teamHistory && data.opponentHistory) {
          setPresenceHistory(data.presenceHistory);
          setTeamHistory(data.teamHistory);
          setOpponentHistory(data.opponentHistory);
          hasLoadedMatrices = true;
        } else {
          const savedPresence = localStorage.getItem('eva-presence-history');
          const savedTeam = localStorage.getItem('eva-team-history');
          const savedOpponent = localStorage.getItem('eva-opponent-history');
          if (savedPresence && savedTeam && savedOpponent) {
            setPresenceHistory(JSON.parse(savedPresence));
            setTeamHistory(JSON.parse(savedTeam));
            setOpponentHistory(JSON.parse(savedOpponent));
            hasLoadedMatrices = true;
          }
        }

        // Auto-rebuild matrices if we have a match history but no matrices are saved
        if (!hasLoadedMatrices && loadedHistory.length > 0) {
          const { players: updatedPlayers, presence, team, opponent } = rebuildStatsFromHistory(sanitizedPlayers, loadedHistory);
          setPlayers(updatedPlayers);
          setPresenceHistory(presence);
          setTeamHistory(team);
          setOpponentHistory(opponent);
        }

        setLoading(false);
      })
      .catch(err => {
        console.warn("API Error, falling back to localStorage", err);
        const savedPlayers = localStorage.getItem('eva-players');
        const savedMatches = localStorage.getItem('eva-upcoming');
        const savedHistory = localStorage.getItem('eva-history');
        const savedArchives = localStorage.getItem('eva-archives');
        const savedPresence = localStorage.getItem('eva-presence-history');
        const savedTeam = localStorage.getItem('eva-team-history');
        const savedOpponent = localStorage.getItem('eva-opponent-history');
        
        let loadedPlayers = savedPlayers ? JSON.parse(savedPlayers) : [];
        let loadedHistory = savedHistory ? JSON.parse(savedHistory) : [];

        const sanitizedPlayers = loadedPlayers.map(p => ({
          id: p.id,
          name: p.name,
          level: p.level ?? p.skill ?? 5,
          matchesPlayed: p.matchesPlayed ?? p.gamesPlayed ?? 0,
          consecutiveBench: p.consecutiveBench ?? 0,
          lastPlayedAt: p.lastPlayedAt ?? 0,
          isPaused: p.isPaused ?? false,
          avatar: p.avatar
        }));

        setPlayers(sanitizedPlayers);
        if (savedMatches) setUpcomingMatches(JSON.parse(savedMatches));
        setMatchHistory(loadedHistory);
        if (savedArchives) setArchives(JSON.parse(savedArchives));
        
        let hasLoadedMatrices = false;
        if (savedPresence && savedTeam && savedOpponent) {
          setPresenceHistory(JSON.parse(savedPresence));
          setTeamHistory(JSON.parse(savedTeam));
          setOpponentHistory(JSON.parse(savedOpponent));
          hasLoadedMatrices = true;
        }

        if (!hasLoadedMatrices && loadedHistory.length > 0) {
          const { players: updatedPlayers, presence, team, opponent } = rebuildStatsFromHistory(sanitizedPlayers, loadedHistory);
          setPlayers(updatedPlayers);
          setPresenceHistory(presence);
          setTeamHistory(team);
          setOpponentHistory(opponent);
        }

        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (loading) return;
    
    // Helper to remove large avatar strings from history to prevent payload too large
    const cleanMatch = (m) => ({
      ...m,
      team1: m.team1.map(({ avatar, ...p }) => p),
      team2: m.team2.map(({ avatar, ...p }) => p)
    });

    const cleanedUpcoming = upcomingMatches.map(cleanMatch);
    const cleanedHistory = matchHistory.map(cleanMatch);
    const cleanedArchives = archives.map(arch => ({
      ...arch,
      upcomingMatches: arch.upcomingMatches.map(cleanMatch),
      matchHistory: arch.matchHistory.map(cleanMatch)
    }));

    // Save locally always
    localStorage.setItem('eva-players', JSON.stringify(players));
    localStorage.setItem('eva-upcoming', JSON.stringify(cleanedUpcoming));
    localStorage.setItem('eva-history', JSON.stringify(cleanedHistory));
    localStorage.setItem('eva-archives', JSON.stringify(cleanedArchives));
    localStorage.setItem('eva-presence-history', JSON.stringify(presenceHistory));
    localStorage.setItem('eva-team-history', JSON.stringify(teamHistory));
    localStorage.setItem('eva-opponent-history', JSON.stringify(opponentHistory));

    // Try saving to DB
    const data = { 
      players, 
      upcomingMatches: cleanedUpcoming, 
      matchHistory: cleanedHistory, 
      archives: cleanedArchives,
      presenceHistory,
      teamHistory,
      opponentHistory
    };
    fetch('/api/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).catch(() => {}); // ignore error locally
  }, [players, upcomingMatches, matchHistory, archives, presenceHistory, teamHistory, opponentHistory, loading]);

  const addPlayer = (name, level) => {
    const newPlayer = {
      id: Date.now().toString(),
      name,
      level: parseInt(level),
      matchesPlayed: 0,
      consecutiveBench: 0,
      lastPlayedAt: 0,
      isPaused: false
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
    const team1Ids = match.team1.map(p => p.id);
    const team2Ids = match.team2.map(p => p.id);
    const participatingIds = [...team1Ids, ...team2Ids];

    // 1. Update player stats
    const updatedPlayers = players.map(p => {
      if (p.isPaused) return p;
      if (participatingIds.includes(p.id)) {
        return {
          ...p,
          matchesPlayed: p.matchesPlayed + 1,
          consecutiveBench: 0,
          lastPlayedAt: Date.now()
        };
      } else {
        return {
          ...p,
          consecutiveBench: p.consecutiveBench + 1
        };
      }
    });

    // 2. Update matrices
    const newPresence = { ...presenceHistory };
    const newTeam = { ...teamHistory };
    const newOpponent = { ...opponentHistory };

    const addPair = (matrix, a, b, val) => {
      if (!matrix[a]) matrix[a] = {};
      if (!matrix[b]) matrix[b] = {};
      matrix[a][b] = (matrix[a][b] || 0) + val;
      matrix[b][a] = (matrix[b][a] || 0) + val;
    };

    const decay = (matrix) => {
      Object.keys(matrix).forEach(a => {
        Object.keys(matrix[a]).forEach(b => {
          matrix[a][b] *= 0.95;
        });
      });
    };

    // Presence
    for (let i = 0; i < participatingIds.length; i++) {
      for (let j = i + 1; j < participatingIds.length; j++) {
        addPair(newPresence, participatingIds[i], participatingIds[j], 1);
      }
    }

    // Team
    for (let i = 0; i < team1Ids.length; i++) {
      for (let j = i + 1; j < team1Ids.length; j++) {
        addPair(newTeam, team1Ids[i], team1Ids[j], 1);
      }
    }
    for (let i = 0; i < team2Ids.length; i++) {
      for (let j = i + 1; j < team2Ids.length; j++) {
        addPair(newTeam, team2Ids[i], team2Ids[j], 1);
      }
    }

    // Opponent
    for (let i = 0; i < team1Ids.length; i++) {
      for (let j = 0; j < team2Ids.length; j++) {
        addPair(newOpponent, team1Ids[i], team2Ids[j], 1);
      }
    }

    // Decay
    decay(newPresence);
    decay(newTeam);
    decay(newOpponent);

    // 3. Save match record
    const newMatchRecord = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      team1: match.team1,
      team2: match.team2
    };
    
    setPlayers(updatedPlayers);
    setPresenceHistory(newPresence);
    setTeamHistory(newTeam);
    setOpponentHistory(newOpponent);
    setMatchHistory([newMatchRecord, ...matchHistory]);
    setUpcomingMatches(upcomingMatches.slice(1));
  };

  const deleteFinishedMatch = (matchId) => {
    const newHistory = matchHistory.filter(m => m.id !== matchId);
    const { players: updatedPlayers, presence, team, opponent } = rebuildStatsFromHistory(players, newHistory);
    
    setPlayers(updatedPlayers);
    setPresenceHistory(presence);
    setTeamHistory(team);
    setOpponentHistory(opponent);
    setMatchHistory(newHistory);
  };

  const exportData = () => {
    const data = { players, upcomingMatches, matchHistory, archives, presenceHistory, teamHistory, opponentHistory };
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
        
        // Dynamic rebuild on import
        const { players: updatedPlayers, presence, team, opponent } = rebuildStatsFromHistory(data.players || [], data.matchHistory || []);
        setPlayers(updatedPlayers);
        setPresenceHistory(presence);
        setTeamHistory(team);
        setOpponentHistory(opponent);

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
    setPresenceHistory({});
    setTeamHistory({});
    setOpponentHistory({});
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
          className={`eva-button ${activeTab === 'double_arena' ? 'secondary' : ''}`}
          onClick={() => setActiveTab('double_arena')}
        >
          <Swords size={20} />
          Double Arène
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
            presenceHistory={presenceHistory}
            teamHistory={teamHistory}
            opponentHistory={opponentHistory}
            isAdmin={userRole === 'admin'}
          />
        )}
        {activeTab === 'double_arena' && (
          <DoubleArena 
            players={players}
            doubleArenaMatches={doubleArenaMatches}
            setDoubleArenaMatches={setDoubleArenaMatches}
            doubleArenaHistory={doubleArenaHistory}
            setDoubleArenaHistory={setDoubleArenaHistory}
            isAdmin={userRole === 'admin'}
          />
        )}
        {activeTab === 'history' && (
          <MatchHistory 
            matchHistory={matchHistory} 
            deleteFinishedMatch={deleteFinishedMatch}
            isAdmin={userRole === 'admin'}
          />
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

      {/* Version de l'application - S'affiche en bas à droite de l'outil */}
      <div 
        style={{ 
          position: 'fixed', 
          bottom: '12px', 
          right: '12px', 
          zIndex: 1000, 
          fontSize: '0.7rem', 
          fontFamily: 'var(--font-display)', 
          letterSpacing: '2px', 
          opacity: 0.4, 
          pointerEvents: 'none',
          background: 'rgba(11, 12, 16, 0.6)',
          padding: '2px 6px',
          borderRadius: '4px',
          border: '1px solid rgba(0, 240, 255, 0.15)'
        }} 
        className="glow-text text-primary"
      >
        V1.8.0
      </div>
    </div>
  );
}

export default App;
