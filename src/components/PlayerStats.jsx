import { useState, useMemo } from 'react';
import { 
  BarChart2, 
  Users, 
  Shield, 
  Swords, 
  Search, 
  Calendar, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  Check,
  ChevronRight
} from 'lucide-react';

function PlayerStats({ players = [], matchHistory = [], doubleArenaHistory = [] }) {
  // Set of player IDs that are currently expanded in the accordion
  const [expandedPlayerIds, setExpandedPlayerIds] = useState(new Set());
  const [filterPlayedOnly, setFilterPlayedOnly] = useState(true);
  const [historySource, setHistorySource] = useState('all'); // 'all', 'classic', 'double'
  const [searchQuery, setSearchQuery] = useState('');

  // Toggle single player accordion
  const togglePlayer = (id) => {
    setExpandedPlayerIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Toggle all players accordion
  const toggleAll = (expandAll, playerList) => {
    if (expandAll) {
      setExpandedPlayerIds(new Set(playerList.map(p => p.id)));
    } else {
      setExpandedPlayerIds(new Set());
    }
  };

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

    players.forEach(p => {
      stats[p.id] = {
        player: p,
        matchesPlayed: 0,
        teammates: {}, // id -> { id, name, avatar, level, count }
        opponents: {}, // id -> { id, name, avatar, level, count }
        matches: []
      };
    });

    allMatches.forEach(match => {
      const team1Ids = (match.team1 || []).map(p => p.id);
      const team2Ids = (match.team2 || []).map(p => p.id);

      const processPlayer = (player, myTeamArr, enemyTeamArr, teamColor) => {
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

        // Teammates in same team
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

        // Opponents in enemy team
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

      (match.team1 || []).forEach(p => processPlayer(p, match.team1, match.team2, 'Bleue'));
      (match.team2 || []).forEach(p => processPlayer(p, match.team2, match.team1, 'Rouge'));
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

    // Sort by matches played descending, then by name
    return list.sort((a, b) => {
      if (b.matchesPlayedTotal !== a.matchesPlayedTotal) {
        return b.matchesPlayedTotal - a.matchesPlayedTotal;
      }
      return a.name.localeCompare(b.name);
    });
  }, [players, playerStatsMap, filterPlayedOnly, searchQuery]);

  const totalPlayedCount = players.filter(p => (playerStatsMap[p.id]?.matchesPlayed || 0) > 0).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
      {/* Header card with filters */}
      <div className="eva-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 className="glow-text text-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <BarChart2 size={24} className="text-primary" />
              Statistiques & Synergies Joueurs
            </h2>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', opacity: 0.7 }}>
              Cliquez sur n'importe quel joueur pour dérouler ses coéquipiers, ses adversaires et ses matchs.
            </p>
          </div>

          {/* Source filters */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '1px' }}>Mode :</span>
            <div style={{ display: 'flex', background: 'rgba(0,0,0,0.4)', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)', padding: '2px' }}>
              <button
                type="button"
                onClick={() => setHistorySource('all')}
                style={{
                  background: historySource === 'all' ? 'var(--primary)' : 'transparent',
                  color: historySource === 'all' ? '#000' : 'rgba(255,255,255,0.7)',
                  border: 'none',
                  padding: '0.3rem 0.6rem',
                  borderRadius: '3px',
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Tous ({allMatches.length})
              </button>
              <button
                type="button"
                onClick={() => setHistorySource('classic')}
                style={{
                  background: historySource === 'classic' ? 'var(--primary)' : 'transparent',
                  color: historySource === 'classic' ? '#000' : 'rgba(255,255,255,0.7)',
                  border: 'none',
                  padding: '0.3rem 0.6rem',
                  borderRadius: '3px',
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Arène Simple ({matchHistory.length})
              </button>
              <button
                type="button"
                onClick={() => setHistorySource('double')}
                style={{
                  background: historySource === 'double' ? 'var(--primary)' : 'transparent',
                  color: historySource === 'double' ? '#000' : 'rgba(255,255,255,0.7)',
                  border: 'none',
                  padding: '0.3rem 0.6rem',
                  borderRadius: '3px',
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Double Arène ({doubleArenaHistory.length})
              </button>
            </div>
          </div>
        </div>

        {/* Search bar & filter buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          {/* Search box with dark styling */}
          <div style={{ position: 'relative', width: '280px', maxWidth: '100%' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un joueur..."
              className="eva-input"
              style={{
                paddingLeft: '2rem',
                paddingTop: '0.4rem',
                paddingBottom: '0.4rem',
                fontSize: '0.85rem'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Toggle Played Only */}
            <button
              type="button"
              onClick={() => setFilterPlayedOnly(!filterPlayedOnly)}
              className={`eva-button ${filterPlayedOnly ? '' : 'secondary'}`}
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', minWidth: 'auto' }}
            >
              {filterPlayedOnly ? <CheckCircle2 size={14} /> : <Users size={14} />}
              {filterPlayedOnly ? `Ont joué (${totalPlayedCount})` : `Tous les joueurs (${players.length})`}
            </button>

            {/* Expand all / Collapse all */}
            {filteredPlayers.length > 0 && (
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <button
                  type="button"
                  onClick={() => toggleAll(true, filteredPlayers)}
                  className="eva-button"
                  style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', minWidth: 'auto', background: 'transparent', color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.2)' }}
                  title="Dérouler tous les joueurs"
                >
                  <ChevronDown size={14} /> Tout dérouler
                </button>
                <button
                  type="button"
                  onClick={() => toggleAll(false, filteredPlayers)}
                  className="eva-button"
                  style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', minWidth: 'auto', background: 'transparent', color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.2)' }}
                  title="Replier tous les joueurs"
                >
                  <ChevronUp size={14} /> Tout replier
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Accordion Roster List */}
      {filteredPlayers.length === 0 ? (
        <div className="eva-card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <Users size={48} style={{ margin: '0 auto 1rem auto', opacity: 0.3, color: 'var(--primary)' }} />
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Aucun joueur trouvé</h3>
          <p style={{ fontSize: '0.85rem', opacity: 0.6 }}>
            {filterPlayedOnly ? "Aucun joueur n'a encore disputé de match dans ce mode." : "Aucun joueur ne correspond à votre recherche."}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filteredPlayers.map((player, index) => {
            const isExpanded = expandedPlayerIds.has(player.id);
            const stats = playerStatsMap[player.id] || { matchesPlayed: 0, teammates: {}, opponents: {}, matches: [] };
            const teammatesList = Object.values(stats.teammates).sort((a, b) => b.count - a.count);
            const opponentsList = Object.values(stats.opponents).sort((a, b) => b.count - a.count);
            const maxTeammate = teammatesList[0]?.count || 1;
            const maxOpponent = opponentsList[0]?.count || 1;

            return (
              <div 
                key={player.id} 
                className="eva-card"
                style={{
                  padding: 0,
                  overflow: 'hidden',
                  border: isExpanded ? '1px solid var(--primary)' : '1px solid rgba(0, 240, 255, 0.2)',
                  boxShadow: isExpanded ? '0 0 15px rgba(0, 240, 255, 0.15)' : 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                {/* Clickable Row Header (Always visible) */}
                <div 
                  onClick={() => togglePlayer(player.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.85rem 1.25rem',
                    cursor: 'pointer',
                    background: isExpanded ? 'rgba(0, 240, 255, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (!isExpanded) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isExpanded) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                  }}
                >
                  {/* Left: Avatar + Name + Level */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <span style={{ fontSize: '0.8rem', opacity: 0.4, minWidth: '20px', fontWeight: 'bold' }}>
                      #{index + 1}
                    </span>

                    {player.avatar ? (
                      <img 
                        src={player.avatar} 
                        alt={player.name} 
                        style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover', border: isExpanded ? '2px solid var(--primary)' : '1px solid rgba(255,255,255,0.2)' }} 
                      />
                    ) : (
                      <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 'bold', border: isExpanded ? '2px solid var(--primary)' : '1px solid rgba(255,255,255,0.2)' }}>
                        {player.name.substring(0, 2).toUpperCase()}
                      </div>
                    )}

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '1rem', color: isExpanded ? 'var(--primary)' : '#fff' }}>
                          {player.name}
                        </span>
                        {player.isPaused && (
                          <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: '3px', background: 'rgba(255,0,85,0.2)', color: '#ff4081', border: '1px solid rgba(255,0,85,0.4)', fontWeight: 'bold' }}>
                            EN PAUSE
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>
                        Niveau {player.level} / 10
                      </span>
                    </div>
                  </div>

                  {/* Right: Matches Played Badge + Accordion Chevron */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ textAlign: 'right' }}>
                      <span 
                        style={{
                          display: 'inline-block',
                          padding: '0.25rem 0.6rem',
                          borderRadius: '4px',
                          fontSize: '0.8rem',
                          fontWeight: 'bold',
                          background: stats.matchesPlayed > 0 ? 'rgba(0, 255, 136, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                          color: stats.matchesPlayed > 0 ? '#00ff88' : 'rgba(255, 255, 255, 0.4)',
                          border: stats.matchesPlayed > 0 ? '1px solid rgba(0, 255, 136, 0.35)' : '1px solid rgba(255, 255, 255, 0.1)'
                        }}
                      >
                        {stats.matchesPlayed} {stats.matchesPlayed > 1 ? 'matchs' : 'match'}
                      </span>
                    </div>

                    <div 
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: isExpanded ? 'var(--primary)' : 'rgba(255,255,255,0.06)',
                        color: isExpanded ? '#000' : 'rgba(255,255,255,0.6)',
                        transition: 'all 0.2s'
                      }}
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>
                </div>

                {/* Unfolded Details Panel (Accordion Content) */}
                {isExpanded && (
                  <div 
                    style={{
                      padding: '1.25rem',
                      background: 'rgba(0, 0, 0, 0.3)',
                      borderTop: '1px solid rgba(0, 240, 255, 0.15)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1.25rem'
                    }}
                  >
                    {/* Summary row */}
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                      <div style={{ flex: '1 1 200px', background: 'rgba(0, 240, 255, 0.06)', border: '1px solid rgba(0, 240, 255, 0.2)', borderRadius: '6px', padding: '0.75rem 1rem' }}>
                        <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.7, display: 'block' }}>
                          Total Matchs Joués
                        </span>
                        <span style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--primary)', lineHeight: 1.2 }}>
                          {stats.matchesPlayed}
                        </span>
                      </div>

                      <div style={{ flex: '1 1 200px', background: 'rgba(0, 255, 136, 0.06)', border: '1px solid rgba(0, 255, 136, 0.2)', borderRadius: '6px', padding: '0.75rem 1rem' }}>
                        <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.7, display: 'block' }}>
                          Coéquipiers distincts
                        </span>
                        <span style={{ fontSize: '1.5rem', fontWeight: '900', color: '#00ff88', lineHeight: 1.2 }}>
                          {teammatesList.length}
                        </span>
                      </div>

                      <div style={{ flex: '1 1 200px', background: 'rgba(255, 0, 85, 0.06)', border: '1px solid rgba(255, 0, 85, 0.2)', borderRadius: '6px', padding: '0.75rem 1rem' }}>
                        <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.7, display: 'block' }}>
                          Adversaires affrontés
                        </span>
                        <span style={{ fontSize: '1.5rem', fontWeight: '900', color: '#ff4081', lineHeight: 1.2 }}>
                          {opponentsList.length}
                        </span>
                      </div>
                    </div>

                    {/* Synergies: Two columns side-by-side */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                      {/* Column 1: Teammates (Dans sa team) */}
                      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(0, 240, 255, 0.2)', borderRadius: '6px', padding: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(0, 240, 255, 0.2)' }}>
                          <span style={{ fontWeight: 'bold', fontSize: '0.85rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.4rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            <Shield size={16} /> Dans sa team ({teammatesList.length})
                          </span>
                          <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>Même équipe</span>
                        </div>

                        {teammatesList.length === 0 ? (
                          <p style={{ textAlign: 'center', padding: '1rem 0', fontSize: '0.8rem', opacity: 0.5, fontStyle: 'italic', margin: 0 }}>
                            Aucun coéquipier enregistré.
                          </p>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                            {teammatesList.map(tm => {
                              const pct = Math.round((tm.count / maxTeammate) * 100);
                              return (
                                <div 
                                  key={tm.id}
                                  style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.35rem',
                                    padding: '0.5rem 0.6rem',
                                    background: 'rgba(255,255,255,0.04)',
                                    borderRadius: '4px',
                                    border: '1px solid rgba(255,255,255,0.05)'
                                  }}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                      {tm.avatar ? (
                                        <img src={tm.avatar} alt={tm.name} style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover' }} />
                                      ) : (
                                        <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>
                                          {tm.name.substring(0, 2).toUpperCase()}
                                        </div>
                                      )}
                                      <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{tm.name}</span>
                                    </div>
                                    <span 
                                      style={{
                                        fontSize: '0.75rem',
                                        fontWeight: 'bold',
                                        padding: '0.15rem 0.5rem',
                                        borderRadius: '3px',
                                        background: 'rgba(0, 240, 255, 0.15)',
                                        color: '#00f0ff',
                                        border: '1px solid rgba(0, 240, 255, 0.3)'
                                      }}
                                    >
                                      {tm.count} {tm.count > 1 ? 'fois ensemble' : 'fois'}
                                    </span>
                                  </div>
                                  {/* Progress bar */}
                                  <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                                    <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, #00f0ff, #00ff88)', borderRadius: '2px' }} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Column 2: Opponents (Contre qui il a joué) */}
                      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255, 0, 85, 0.2)', borderRadius: '6px', padding: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255, 0, 85, 0.2)' }}>
                          <span style={{ fontWeight: 'bold', fontSize: '0.85rem', color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            <Swords size={16} /> Adversaires affrontés ({opponentsList.length})
                          </span>
                          <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>Équipe adverse</span>
                        </div>

                        {opponentsList.length === 0 ? (
                          <p style={{ textAlign: 'center', padding: '1rem 0', fontSize: '0.8rem', opacity: 0.5, fontStyle: 'italic', margin: 0 }}>
                            Aucun adversaire affronté.
                          </p>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                            {opponentsList.map(opp => {
                              const pct = Math.round((opp.count / maxOpponent) * 100);
                              return (
                                <div 
                                  key={opp.id}
                                  style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.35rem',
                                    padding: '0.5rem 0.6rem',
                                    background: 'rgba(255,255,255,0.04)',
                                    borderRadius: '4px',
                                    border: '1px solid rgba(255,255,255,0.05)'
                                  }}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                      {opp.avatar ? (
                                        <img src={opp.avatar} alt={opp.name} style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover' }} />
                                      ) : (
                                        <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>
                                          {opp.name.substring(0, 2).toUpperCase()}
                                        </div>
                                      )}
                                      <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{opp.name}</span>
                                    </div>
                                    <span 
                                      style={{
                                        fontSize: '0.75rem',
                                        fontWeight: 'bold',
                                        padding: '0.15rem 0.5rem',
                                        borderRadius: '3px',
                                        background: 'rgba(255, 0, 85, 0.15)',
                                        color: '#ff4081',
                                        border: '1px solid rgba(255, 0, 85, 0.3)'
                                      }}
                                    >
                                      {opp.count} {opp.count > 1 ? 'fois affronté' : 'fois'}
                                    </span>
                                  </div>
                                  {/* Progress bar */}
                                  <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                                    <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, #ff0055, #ff4081)', borderRadius: '2px' }} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Detailed Match list for this player */}
                    {stats.matches.length > 0 && (
                      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '0.85rem 1rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 'bold', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.6rem' }}>
                          <Calendar size={14} /> Historique des {stats.matches.length} matchs joués
                        </span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '200px', overflowY: 'auto' }}>
                          {stats.matches.map((m, mIdx) => (
                            <div 
                              key={m.matchId || mIdx}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                gap: '0.5rem',
                                padding: '0.4rem 0.6rem',
                                background: 'rgba(255,255,255,0.03)',
                                borderRadius: '4px',
                                fontSize: '0.75rem'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span 
                                  style={{
                                    padding: '0.1rem 0.4rem',
                                    borderRadius: '3px',
                                    fontSize: '0.65rem',
                                    fontWeight: 'bold',
                                    textTransform: 'uppercase',
                                    background: m.teamColor === 'Bleue' ? 'rgba(0, 240, 255, 0.15)' : 'rgba(255, 0, 85, 0.15)',
                                    color: m.teamColor === 'Bleue' ? '#00f0ff' : '#ff4081',
                                    border: m.teamColor === 'Bleue' ? '1px solid rgba(0, 240, 255, 0.3)' : '1px solid rgba(255, 0, 85, 0.3)'
                                  }}
                                >
                                  Équipe {m.teamColor}
                                </span>
                                <span style={{ opacity: 0.5, fontSize: '0.7rem' }}>{m.source}</span>
                                {m.date && (
                                  <span style={{ opacity: 0.4, fontSize: '0.7rem' }}>
                                    {new Date(m.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                )}
                              </div>

                              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.72rem' }}>
                                <div>
                                  <span style={{ opacity: 0.5, marginRight: '0.25rem' }}>Avec :</span>
                                  <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>
                                    {m.myTeam.filter(p => p.id !== player.id).map(p => p.name).join(', ') || 'Seul'}
                                  </span>
                                </div>
                                <div>
                                  <span style={{ opacity: 0.5, marginRight: '0.25rem' }}>Contre :</span>
                                  <span style={{ color: 'var(--secondary)', fontWeight: 'bold' }}>
                                    {m.enemyTeam.map(p => p.name).join(', ')}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default PlayerStats;
