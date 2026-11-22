import { useState, useMemo } from 'react';
import { 
  BarChart2, 
  Users, 
  Shield, 
  Swords, 
  Search, 
  Calendar, 
  ChevronRight, 
  CheckCircle2, 
  Award,
  Sparkles,
  Layers
} from 'lucide-react';

function PlayerStats({ players = [], matchHistory = [], doubleArenaHistory = [] }) {
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [filterPlayedOnly, setFilterPlayedOnly] = useState(true);
  const [historySource, setHistorySource] = useState('all'); // 'all', 'classic', 'double'
  const [searchQuery, setSearchQuery] = useState('');

  // Normalize match history based on selected source
  const allMatches = useMemo(() => {
    const list = [];
    if (historySource === 'all' || historySource === 'classic') {
      matchHistory.forEach((m, idx) => {
        list.push({
          id: m.id || `classic-${idx}`,
          source: 'Arène Simple',
          date: m.date,
          team1: m.team1 || [],
          team2: m.team2 || []
        });
      });
    }
    if (historySource === 'all' || historySource === 'double') {
      doubleArenaHistory.forEach((m, idx) => {
        list.push({
          id: m.id || `double-${idx}`,
          source: m.arena ? `Arène ${m.arena}` : 'Double Arène',
          date: m.date,
          team1: m.team1 || [],
          team2: m.team2 || []
        });
      });
    }
    return list;
  }, [matchHistory, doubleArenaHistory, historySource]);

  // Aggregate stats per player
  const playerStatsMap = useMemo(() => {
    const stats = {};

    // Initialize for all known players
    players.forEach(p => {
      stats[p.id] = {
        player: p,
        matchesPlayed: 0,
        teammates: {}, // id -> { name, avatar, level, count }
        opponents: {}, // id -> { name, avatar, level, count }
        matches: []
      };
    });

    // Process all matches
    allMatches.forEach(match => {
      const team1Ids = (match.team1 || []).map(p => p.id);
      const team2Ids = (match.team2 || []).map(p => p.id);

      // Helper to process player in team
      const processPlayer = (player, myTeamIds, enemyTeamIds, myTeamArr, enemyTeamArr, teamColor) => {
        if (!stats[player.id]) {
          stats[player.id] = {
            player,
            matchesPlayed: 0,
            teammates: {},
            opponents: {},
            matches: []
          };
        }

        stats[player.id].matchesPlayed += 1;
        stats[player.id].matches.push({
          matchId: match.id,
          source: match.source,
          date: match.date,
          teamColor,
          myTeam: myTeamArr,
          enemyTeam: enemyTeamArr
        });

        // Teammates
        myTeamArr.forEach(mate => {
          if (mate.id === player.id) return;
          if (!stats[player.id].teammates[mate.id]) {
            const fullP = players.find(x => x.id === mate.id) || mate;
            stats[player.id].teammates[mate.id] = {
              id: mate.id,
              name: mate.name,
              avatar: fullP.avatar,
              level: fullP.level,
              count: 0
            };
          }
          stats[player.id].teammates[mate.id].count += 1;
        });

        // Opponents
        enemyTeamArr.forEach(opp => {
          if (!stats[player.id].opponents[opp.id]) {
            const fullP = players.find(x => x.id === opp.id) || opp;
            stats[player.id].opponents[opp.id] = {
              id: opp.id,
              name: opp.name,
              avatar: fullP.avatar,
              level: fullP.level,
              count: 0
            };
          }
          stats[player.id].opponents[opp.id].count += 1;
        });
      };

      match.team1.forEach(p => processPlayer(p, team1Ids, team2Ids, match.team1, match.team2, 'Bleue'));
      match.team2.forEach(p => processPlayer(p, team2Ids, team1Ids, match.team2, match.team1, 'Rouge'));
    });

    return stats;
  }, [players, allMatches]);

  // Filtered & sorted player list
  const filteredPlayers = useMemo(() => {
    let list = players.map(p => {
      const stat = playerStatsMap[p.id] || { matchesPlayed: 0 };
      return {
        ...p,
        matchesPlayedTotal: stat.matchesPlayed
      };
    });

    if (filterPlayedOnly) {
      list = list.filter(p => p.matchesPlayedTotal > 0);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q));
    }

    // Sort by matches played descending, then alphabetical
    return list.sort((a, b) => {
      if (b.matchesPlayedTotal !== a.matchesPlayedTotal) {
        return b.matchesPlayedTotal - a.matchesPlayedTotal;
      }
      return a.name.localeCompare(b.name);
    });
  }, [players, playerStatsMap, filterPlayedOnly, searchQuery]);

  // Active selected player stats
  const activeStats = useMemo(() => {
    if (!selectedPlayerId) {
      // Default to the first player in the filtered list if available
      return filteredPlayers.length > 0 ? playerStatsMap[filteredPlayers[0].id] : null;
    }
    return playerStatsMap[selectedPlayerId] || null;
  }, [selectedPlayerId, filteredPlayers, playerStatsMap]);

  const currentSelectedId = activeStats?.player?.id;

  // Sorted teammates & opponents
  const sortedTeammates = useMemo(() => {
    if (!activeStats) return [];
    return Object.values(activeStats.teammates).sort((a, b) => b.count - a.count);
  }, [activeStats]);

  const sortedOpponents = useMemo(() => {
    if (!activeStats) return [];
    return Object.values(activeStats.opponents).sort((a, b) => b.count - a.count);
  }, [activeStats]);

  const maxTeammateCount = sortedTeammates[0]?.count || 1;
  const maxOpponentCount = sortedOpponents[0]?.count || 1;

  return (
    <div className="grid gap-6">
      {/* Header Controls */}
      <div className="eva-card flex flex-wrap justify-between items-center gap-4">
        <div>
          <h2 className="glow-text text-primary flex items-center gap-2 mb-1">
            <BarChart2 className="text-primary" size={24} />
            Statistiques & Synergies Joueurs
          </h2>
          <p className="text-xs opacity-70">
            Visualisez qui a joué avec qui, le nombre d'affrontements et l'historique complet par joueur.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Source Filter */}
          <div className="flex bg-black/40 border border-white/10 rounded p-1 text-xs">
            <button
              onClick={() => setHistorySource('all')}
              className={`px-3 py-1 rounded transition-all font-bold ${historySource === 'all' ? 'bg-primary text-black' : 'text-white/70 hover:text-white'}`}
            >
              Tous ({allMatches.length} matchs)
            </button>
            <button
              onClick={() => setHistorySource('classic')}
              className={`px-3 py-1 rounded transition-all font-bold ${historySource === 'classic' ? 'bg-primary text-black' : 'text-white/70 hover:text-white'}`}
            >
              Arène Simple ({matchHistory.length})
            </button>
            <button
              onClick={() => setHistorySource('double')}
              className={`px-3 py-1 rounded transition-all font-bold ${historySource === 'double' ? 'bg-primary text-black' : 'text-white/70 hover:text-white'}`}
            >
              Double Arène ({doubleArenaHistory.length})
            </button>
          </div>

          {/* Toggle Played Only */}
          <button
            onClick={() => setFilterPlayedOnly(!filterPlayedOnly)}
            className={`eva-button ${filterPlayedOnly ? '' : 'secondary'}`}
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', minWidth: 'auto' }}
          >
            {filterPlayedOnly ? <CheckCircle2 size={14} /> : <Users size={14} />}
            {filterPlayedOnly ? 'Joueurs Ayant Joué' : 'Tous les Joueurs'}
          </button>
        </div>
      </div>

      {/* Main Layout: Left Roster Selection + Right Detailed Player Dossier */}
      <div className="grid grid-cols-12 gap-6 items-start">
        {/* Left Column: Player Selector (5 cols) */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-3">
          <div className="eva-card p-4">
            <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded px-3 py-2 mb-3">
              <Search size={16} className="opacity-50" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un joueur..."
                className="bg-transparent border-none outline-none text-xs w-full text-white placeholder-white/40"
              />
            </div>

            <div className="flex justify-between items-center text-xs opacity-60 mb-2 px-1">
              <span>Joueurs ({filteredPlayers.length})</span>
              <span>Matchs Joués</span>
            </div>

            {filteredPlayers.length === 0 ? (
              <p className="text-center py-8 opacity-50 text-xs italic">
                {filterPlayedOnly ? "Aucun joueur n'a encore disputé de match." : "Aucun joueur trouvé."}
              </p>
            ) : (
              <div className="flex flex-col gap-1.5 max-h-[600px] overflow-y-auto pr-1">
                {filteredPlayers.map(p => {
                  const isSelected = p.id === currentSelectedId;
                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPlayerId(p.id)}
                      className={`flex items-center justify-between p-2.5 rounded cursor-pointer transition-all ${
                        isSelected 
                          ? 'border border-primary' 
                          : 'border border-transparent bg-white/5 hover:bg-white/10'
                      }`}
                      style={{
                        backgroundColor: isSelected ? 'rgba(0, 240, 255, 0.12)' : undefined,
                        boxShadow: isSelected ? '0 0 12px rgba(0, 240, 255, 0.2)' : 'none'
                      }}
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        {p.avatar ? (
                          <img 
                            src={p.avatar} 
                            alt={p.name} 
                            style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} 
                          />
                        ) : (
                          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', flexShrink: 0 }}>
                            {p.name.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="flex flex-col text-left truncate">
                          <span className="font-bold text-xs truncate">{p.name}</span>
                          <span className="text-[10px] opacity-60">Niveau {p.level}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span 
                          className="px-2 py-0.5 rounded text-xs font-bold"
                          style={{
                            background: p.matchesPlayedTotal > 0 ? 'rgba(0, 255, 136, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                            color: p.matchesPlayedTotal > 0 ? '#00ff88' : 'rgba(255, 255, 255, 0.4)',
                            border: p.matchesPlayedTotal > 0 ? '1px solid rgba(0, 255, 136, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)'
                          }}
                        >
                          {p.matchesPlayedTotal} {p.matchesPlayedTotal > 1 ? 'matchs' : 'match'}
                        </span>
                        <ChevronRight size={14} className={isSelected ? 'text-primary' : 'opacity-30'} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Player Stats Dossier (7 cols) */}
        <div className="col-span-12 lg:col-span-8">
          {!activeStats ? (
            <div className="eva-card text-center py-16">
              <Users size={48} className="mx-auto mb-3 opacity-30 text-primary" />
              <h3 className="text-lg font-bold opacity-80">Sélectionnez un joueur</h3>
              <p className="text-xs opacity-50">Cliquez sur un joueur dans la liste de gauche pour afficher ses synergies.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {/* Profile Card */}
              <div className="eva-card p-6 border border-primary/30">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {activeStats.player.avatar ? (
                      <img 
                        src={activeStats.player.avatar} 
                        alt={activeStats.player.name} 
                        style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary)' }} 
                      />
                    ) : (
                      <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(0, 240, 255, 0.15)', border: '2px solid var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 'bold' }}>
                        {activeStats.player.name.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-2xl font-bold tracking-wide">{activeStats.player.name}</h2>
                        <span 
                          className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                          style={{
                            background: activeStats.player.isPaused ? 'rgba(255, 0, 85, 0.15)' : 'rgba(0, 255, 136, 0.15)',
                            color: activeStats.player.isPaused ? '#ff4081' : '#00ff88',
                            border: activeStats.player.isPaused ? '1px solid rgba(255, 0, 85, 0.3)' : '1px solid rgba(0, 255, 136, 0.3)'
                          }}
                        >
                          {activeStats.player.isPaused ? 'En Pause' : 'Actif'}
                        </span>
                      </div>
                      <p className="text-xs opacity-70">
                        Niveau évalué : <strong className="text-primary">{activeStats.player.level} / 10</strong>
                      </p>
                    </div>
                  </div>

                  {/* Big Counter */}
                  <div className="flex gap-4">
                    <div 
                      className="px-5 py-3 rounded-lg text-center"
                      style={{ background: 'rgba(0, 240, 255, 0.08)', border: '1px solid rgba(0, 240, 255, 0.25)' }}
                    >
                      <span className="text-3xl font-black glow-text text-primary block leading-none mb-1">
                        {activeStats.matchesPlayed}
                      </span>
                      <span className="text-[10px] font-bold tracking-widest uppercase opacity-75">
                        Matchs Joués
                      </span>
                    </div>

                    <div 
                      className="px-5 py-3 rounded-lg text-center"
                      style={{ background: 'rgba(255, 0, 85, 0.08)', border: '1px solid rgba(255, 0, 85, 0.25)' }}
                    >
                      <span className="text-3xl font-black glow-text text-secondary block leading-none mb-1">
                        {sortedTeammates.length}
                      </span>
                      <span className="text-[10px] font-bold tracking-widest uppercase opacity-75">
                        Coéquipiers
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Synergies Grid: Teammates VS Opponents */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 1. Teammates (Dans sa team) */}
                <div className="eva-card p-5 border border-primary/20">
                  <div className="flex items-center justify-between mb-4 pb-2 border-b border-primary/20">
                    <h3 className="text-sm font-bold text-primary flex items-center gap-2 tracking-wider">
                      <Shield size={16} /> COÉQUIPIERS ({sortedTeammates.length})
                    </h3>
                    <span className="text-[11px] opacity-60">Dans la même équipe</span>
                  </div>

                  {sortedTeammates.length === 0 ? (
                    <p className="text-center py-8 opacity-40 text-xs italic">
                      N'a pas encore joué en équipe sur cette session.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-2 max-h-[380px] overflow-y-auto pr-1">
                      {sortedTeammates.map(tm => {
                        const ratio = Math.round((tm.count / maxTeammateCount) * 100);
                        return (
                          <div 
                            key={tm.id}
                            className="p-2.5 rounded bg-white/5 border border-white/5 hover:border-primary/30 transition-all"
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2">
                                {tm.avatar ? (
                                  <img 
                                    src={tm.avatar} 
                                    alt={tm.name} 
                                    style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover' }} 
                                  />
                                ) : (
                                  <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px' }}>
                                    {tm.name.substring(0, 2).toUpperCase()}
                                  </div>
                                )}
                                <span className="font-bold text-xs">{tm.name}</span>
                              </div>

                              <span 
                                className="px-2 py-0.5 rounded text-xs font-bold"
                                style={{
                                  background: 'rgba(0, 240, 255, 0.15)',
                                  color: '#00f0ff',
                                  border: '1px solid rgba(0, 240, 255, 0.3)'
                                }}
                              >
                                {tm.count} {tm.count > 1 ? 'fois' : 'fois'}
                              </span>
                            </div>

                            {/* Frequency gauge bar */}
                            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                              <div 
                                className="h-full rounded-full" 
                                style={{ 
                                  width: `${ratio}%`, 
                                  background: 'linear-gradient(90deg, #00f0ff, #00ff88)' 
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 2. Opponents (Contre qui il a joué) */}
                <div className="eva-card p-5 border border-secondary/20">
                  <div className="flex items-center justify-between mb-4 pb-2 border-b border-secondary/20">
                    <h3 className="text-sm font-bold text-secondary flex items-center gap-2 tracking-wider">
                      <Swords size={16} /> ADVERSAIRES ({sortedOpponents.length})
                    </h3>
                    <span className="text-[11px] opacity-60">Équipe d'en face</span>
                  </div>

                  {sortedOpponents.length === 0 ? (
                    <p className="text-center py-8 opacity-40 text-xs italic">
                      N'a pas encore affronté d'adversaires sur cette session.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-2 max-h-[380px] overflow-y-auto pr-1">
                      {sortedOpponents.map(opp => {
                        const ratio = Math.round((opp.count / maxOpponentCount) * 100);
                        return (
                          <div 
                            key={opp.id}
                            className="p-2.5 rounded bg-white/5 border border-white/5 hover:border-secondary/30 transition-all"
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2">
                                {opp.avatar ? (
                                  <img 
                                    src={opp.avatar} 
                                    alt={opp.name} 
                                    style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover' }} 
                                  />
                                ) : (
                                  <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px' }}>
                                    {opp.name.substring(0, 2).toUpperCase()}
                                  </div>
                                )}
                                <span className="font-bold text-xs">{opp.name}</span>
                              </div>

                              <span 
                                className="px-2 py-0.5 rounded text-xs font-bold"
                                style={{
                                  background: 'rgba(255, 0, 85, 0.15)',
                                  color: '#ff4081',
                                  border: '1px solid rgba(255, 0, 85, 0.3)'
                                }}
                              >
                                {opp.count} {opp.count > 1 ? 'fois' : 'fois'}
                              </span>
                            </div>

                            {/* Frequency gauge bar */}
                            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                              <div 
                                className="h-full rounded-full" 
                                style={{ 
                                  width: `${ratio}%`, 
                                  background: 'linear-gradient(90deg, #ff0055, #ff4081)' 
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Match Log for this player */}
              <div className="eva-card p-5">
                <h3 className="text-sm font-bold opacity-80 mb-4 flex items-center gap-2">
                  <Calendar size={16} className="text-primary" />
                  Détail des Matchs disputés par {activeStats.player.name} ({activeStats.matches.length})
                </h3>

                {activeStats.matches.length === 0 ? (
                  <p className="text-center py-6 opacity-40 text-xs italic">Aucun match joué.</p>
                ) : (
                  <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-1">
                    {activeStats.matches.map((m, idx) => (
                      <div 
                        key={m.matchId || idx}
                        className="p-3 rounded bg-white/5 border border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <span 
                            className="px-2 py-1 rounded font-bold text-[10px] tracking-wider uppercase"
                            style={{
                              background: m.teamColor === 'Bleue' ? 'rgba(0, 240, 255, 0.15)' : 'rgba(255, 0, 85, 0.15)',
                              color: m.teamColor === 'Bleue' ? '#00f0ff' : '#ff4081',
                              border: m.teamColor === 'Bleue' ? '1px solid rgba(0, 240, 255, 0.3)' : '1px solid rgba(255, 0, 85, 0.3)'
                            }}
                          >
                            Équipe {m.teamColor}
                          </span>
                          <span className="opacity-50 text-[11px]">{m.source}</span>
                          {m.date && (
                            <span className="opacity-40 text-[11px]">
                              {new Date(m.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-[11px]">
                          <div>
                            <span className="opacity-50 mr-1">Coéquipiers:</span>
                            <span className="font-semibold text-primary">
                              {m.myTeam.filter(p => p.id !== activeStats.player.id).map(p => p.name).join(', ') || 'Seul'}
                            </span>
                          </div>
                          <div>
                            <span className="opacity-50 mr-1">Adversaires:</span>
                            <span className="font-semibold text-secondary">
                              {m.enemyTeam.map(p => p.name).join(', ')}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PlayerStats;
