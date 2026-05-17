import { useState } from 'react';
import { Swords, Check, GripVertical, ArrowLeftRight, ShieldAlert, RotateCcw } from 'lucide-react';

const getTeamLevel = (team) => team.reduce((sum, p) => sum + p.level, 0);

function getCombinations(array, k) {
  const results = [];
  function helper(start, combo) {
    if (combo.length === k) {
      results.push([...combo]);
      return;
    }
    for (let i = start; i < array.length; i++) {
      combo.push(array[i]);
      helper(i + 1, combo);
      combo.pop();
    }
  }
  helper(0, []);
  return results;
}

export const computeDoubleArenaStats = (players, history) => {
  const activePlayers = players.filter(p => !p.isPaused);
  const stats = {};
  
  activePlayers.forEach(p => {
    stats[p.id] = {
      ...p,
      matchesPlayed: 0,
      consecutiveBench: 0,
      lastPlayedAt: 0
    };
  });

  const chronologicalHistory = [...history].reverse();

  chronologicalHistory.forEach(match => {
    const playingIds = [...match.team1.map(p => p.id), ...match.team2.map(p => p.id)];
    
    activePlayers.forEach(p => {
      if (!stats[p.id]) return;
      if (playingIds.includes(p.id)) {
        stats[p.id].matchesPlayed += 1;
        stats[p.id].consecutiveBench = 0;
        stats[p.id].lastPlayedAt = match.date ? new Date(match.date).getTime() : Date.now();
      } else {
        stats[p.id].consecutiveBench += 1;
      }
    });
  });

  return stats;
};

export const computeCoArenaMatrix = (players, history) => {
  const matrix = {};
  
  players.forEach(p1 => {
    matrix[p1.id] = {};
    players.forEach(p2 => {
      matrix[p1.id][p2.id] = 0;
    });
  });

  history.forEach(match => {
    const playersInArena = [...match.team1, ...match.team2];
    for (let i = 0; i < playersInArena.length; i++) {
      for (let j = i + 1; j < playersInArena.length; j++) {
        const id1 = playersInArena[i].id;
        const id2 = playersInArena[j].id;
        if (matrix[id1] && matrix[id2]) {
          matrix[id1][id2] += 1;
          matrix[id2][id1] += 1;
        }
      }
    }
  });

  return matrix;
};

export default function DoubleArena({
  players,
  doubleArenaMatches,
  setDoubleArenaMatches,
  doubleArenaHistory,
  setDoubleArenaHistory,
  isAdmin
}) {
  const [substitutingPlayer, setSubstitutingPlayer] = useState(null);
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);

  const activePlayers = players.filter(p => !p.isPaused);
  const sessionStats = computeDoubleArenaStats(players, doubleArenaHistory);
  const coArenaMatrix = computeCoArenaMatrix(players, doubleArenaHistory);

  const handleDragStart = (e, player, teamKey, matchIndex) => {
    if (!isAdmin) return;
    setDraggedItem({ player, teamKey, matchIndex });
    setTimeout(() => {
      if (e.target) e.target.style.opacity = '0.5';
    }, 0);
  };

  const handleDragEnd = (e) => {
    if (e.target) e.target.style.opacity = '1';
    setDraggedItem(null);
    setDragOverId(null);
  };

  const handleDragOver = (e, targetPlayerId) => {
    e.preventDefault();
    if (draggedItem && draggedItem.player.id !== targetPlayerId) {
      setDragOverId(targetPlayerId);
    }
  };

  const handleDragLeave = () => {
    setDragOverId(null);
  };

  const handleDrop = (e, targetPlayer, targetTeamKey, targetMatchIndex) => {
    e.preventDefault();
    setDragOverId(null);
    if (e.target) e.target.style.opacity = '1';

    if (!draggedItem || draggedItem.player.id === targetPlayer.id) return;
    if (draggedItem.matchIndex !== targetMatchIndex) return; // Only swap within the same match

    const sourceTeamKey = draggedItem.teamKey;
    const matchIndex = draggedItem.matchIndex;
    
    const newMatches = [...doubleArenaMatches];
    const match = { ...newMatches[matchIndex] };
    
    const newTeams = {
      team1: [...match.team1],
      team2: [...match.team2]
    };

    newTeams[sourceTeamKey] = newTeams[sourceTeamKey].map(p => 
      p.id === draggedItem.player.id ? targetPlayer : p
    );

    newTeams[targetTeamKey] = newTeams[targetTeamKey].map(p => 
      p.id === targetPlayer.id ? draggedItem.player : p
    );

    match.team1 = newTeams.team1;
    match.team2 = newTeams.team2;
    match.levelDiff = Math.abs(getTeamLevel(newTeams.team1) - getTeamLevel(newTeams.team2));
    
    newMatches[matchIndex] = match;
    setDoubleArenaMatches(newMatches);
  };

  const generateRound = () => {
    if (activePlayers.length < 16) return;

    // 1. Calculate priority score for active players
    const playerScores = activePlayers.map(p => {
      const pStat = sessionStats[p.id] || { matchesPlayed: 0, consecutiveBench: 0, lastPlayedAt: 0 };
      
      let timeSince = 120;
      if (pStat.lastPlayedAt) {
        timeSince = Math.max(0, (Date.now() - pStat.lastPlayedAt) / 60000);
      }

      const score = 
        10 * pStat.consecutiveBench +
        1 * timeSince -
        3 * pStat.matchesPlayed +
        (Math.random() - 0.5);

      return {
        ...p,
        ...pStat,
        priorityScore: score
      };
    });

    // 2. Select top 16 players
    const selected16 = [...playerScores].sort((a, b) => b.priorityScore - a.priorityScore).slice(0, 16);

    // 3. Find the best split of 16 players into 2 groups of 8 to maximize mixing and balance average levels
    const splits = getCombinations(selected16, 8);
    let bestGroupA = null;
    let bestGroupB = null;
    let minCost = Infinity;

    splits.forEach(groupA => {
      const groupAIds = groupA.map(p => p.id);
      const groupB = selected16.filter(p => !groupAIds.includes(p.id));

      const levelSumA = groupA.reduce((sum, p) => sum + p.level, 0);
      const levelSumB = groupB.reduce((sum, p) => sum + p.level, 0);
      const levelDiff = Math.abs(levelSumA - levelSumB);

      // Penalize average level differences heavily (weight 25)
      const levelDiffCost = levelDiff * 25;

      // Penalize players playing in the same arena together repeatedly (weight 1.5)
      let coArenaCost = 0;
      for (let i = 0; i < groupA.length; i++) {
        for (let j = i + 1; j < groupA.length; j++) {
          const p1 = groupA[i].id;
          const p2 = groupA[j].id;
          coArenaCost += (coArenaMatrix[p1]?.[p2] || 0) * 1.5;
        }
      }
      for (let i = 0; i < groupB.length; i++) {
        for (let j = i + 1; j < groupB.length; j++) {
          const p1 = groupB[i].id;
          const p2 = groupB[j].id;
          coArenaCost += (coArenaMatrix[p1]?.[p2] || 0) * 1.5;
        }
      }

      const totalCost = levelDiffCost + coArenaCost;
      if (totalCost < minCost) {
        minCost = totalCost;
        bestGroupA = groupA;
        bestGroupB = groupB;
      }
    });

    const groupA = bestGroupA;
    const groupB = bestGroupB;

    // 4. Balance each group into teams of 4v4
    const balanceGroup = (group, matchIdx) => {
      const combinations = getCombinations(group, 4);
      let bestTeam1 = null;
      let bestTeam2 = null;
      let minDiff = Infinity;

      combinations.forEach(t1 => {
        const t1Ids = t1.map(p => p.id);
        const t2 = group.filter(p => !t1Ids.includes(p.id));
        const diff = Math.abs(getTeamLevel(t1) - getTeamLevel(t2));
        if (diff < minDiff) {
          minDiff = diff;
          bestTeam1 = t1;
          bestTeam2 = t2;
        }
      });

      return {
        team1: bestTeam1,
        team2: bestTeam2,
        levelDiff: minDiff,
        id: Date.now().toString() + '_' + matchIdx,
        finished: false,
        arena: matchIdx === 0 ? 'A' : 'B'
      };
    };

    setDoubleArenaMatches([
      balanceGroup(groupA, 0),
      balanceGroup(groupB, 1)
    ]);
  };

  const handleSubstitute = (benchPlayer) => {
    if (!substitutingPlayer) return;
    const { player: targetPlayer, teamKey, matchIndex } = substitutingPlayer;

    const newMatches = [...doubleArenaMatches];
    const match = { ...newMatches[matchIndex] };

    // Replace the player in the correct team
    match[teamKey] = match[teamKey].map(p => 
      p.id === targetPlayer.id ? benchPlayer : p
    );

    // Recalculate level difference
    match.levelDiff = Math.abs(getTeamLevel(match.team1) - getTeamLevel(match.team2));

    newMatches[matchIndex] = match;
    setDoubleArenaMatches(newMatches);
    setSubstitutingPlayer(null);
  };

  const toggleMatchFinished = (matchIndex) => {
    const newMatches = [...doubleArenaMatches];
    newMatches[matchIndex] = {
      ...newMatches[matchIndex],
      finished: !newMatches[matchIndex].finished
    };
    setDoubleArenaMatches(newMatches);
  };

  const validateRound = () => {
    if (!doubleArenaMatches || !doubleArenaMatches[0].finished || !doubleArenaMatches[1].finished) return;

    // Archive both matches with the current date
    const dateStr = new Date().toISOString();
    const finishedMatches = doubleArenaMatches.map(m => ({
      ...m,
      date: dateStr
    }));

    setDoubleArenaHistory([...finishedMatches, ...doubleArenaHistory]);
    setDoubleArenaMatches(null);
  };

  const resetSession = () => {
    if (window.confirm("Voulez-vous réinitialiser toute la session Double Arène ? (Historique et compteurs remis à zéro)")) {
      setDoubleArenaHistory([]);
      setDoubleArenaMatches(null);
    }
  };

  const getPlayerAvatar = (id) => players.find(p => p.id === id)?.avatar;

  return (
    <div className="eva-container flex flex-col gap-6">
      <div className="flex justify-between items-center md-flex-col md-gap-2">
        <div>
          <h1 className="glow-text text-primary flex items-center gap-2 mb-1">
            <Swords className="text-primary" /> Mode Double Arène
          </h1>
          <p className="opacity-70 text-sm">Organisez des matchs simultanés sur deux arènes sans affecter la session classique.</p>
        </div>
        <div className="flex gap-2">
          {doubleArenaHistory.length > 0 && (
            <button onClick={resetSession} className="eva-button secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
              <RotateCcw size={14} /> Réinitialiser Session
            </button>
          )}
        </div>
      </div>

      {activePlayers.length < 16 ? (
        <div className="eva-card text-center py-10 flex flex-col items-center gap-4 border-red-500/30">
          <ShieldAlert size={48} className="text-secondary" />
          <h2 className="text-secondary">Joueurs Actifs Insuffisants</h2>
          <p className="opacity-80 max-w-md mx-auto text-sm">
            Ce mode nécessite au moins **16 joueurs actifs** dans le roster pour tourner sur deux arènes (4v4 x 2). Actuellement, vous n'avez que <strong className="text-primary">{activePlayers.length}</strong> joueurs actifs.
          </p>
          <p className="opacity-50 text-xs">Rendez-vous dans l'onglet <strong>Roster</strong> pour activer des joueurs ou en rajouter.</p>
        </div>
      ) : (
        <>
          {/* Main Area */}
          {!doubleArenaMatches ? (
            <div className="flex flex-col gap-6">
              <div className="eva-card text-center py-12 flex flex-col items-center gap-6">
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(0, 240, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Swords size={40} className="text-primary glow-text" />
                </div>
                <div>
                  <h2 className="text-primary mb-2">Prêt pour le Round Suivant</h2>
                  <p className="opacity-75 text-sm max-w-lg mx-auto">
                    Le système va sélectionner automatiquement les 16 joueurs prioritaires de la session et composer deux arènes équilibrées de 8 joueurs.
                  </p>
                </div>
                
                {isAdmin ? (
                  <button onClick={generateRound} className="eva-button hover-glow text-lg px-8 py-4">
                    Générer les Matchs (Round {Math.floor(doubleArenaHistory.length / 2) + 1})
                  </button>
                ) : (
                  <p className="text-yellow-500 text-sm">En attente de la génération des matchs par l'administrateur...</p>
                )}
              </div>

              {/* Session Player Priorities */}
              <div className="eva-card">
                <h3 className="text-primary text-sm mb-4 border-b border-primary/20 pb-2">STATISTIQUES DE LA SESSION (DOUBLE ARÈNE)</h3>
                <div className="table-responsive">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th>Nom</th>
                        <th>Niveau</th>
                        <th>Matchs Joués</th>
                        <th>Attente Banc</th>
                        <th>Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...activePlayers].map(p => {
                        const stat = sessionStats[p.id] || { matchesPlayed: 0, consecutiveBench: 0 };
                        return (
                          <tr key={p.id}>
                            <td className="p-2 text-sm font-bold flex items-center gap-2">
                              {p.avatar ? (
                                <img src={p.avatar} alt={p.name} style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} />
                              ) : (
                                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>
                                  {p.name.substring(0, 2).toUpperCase()}
                                </div>
                              )}
                              {p.name}
                            </td>
                            <td className="p-2 text-sm">{p.level} / 10</td>
                            <td className="p-2 text-sm">{stat.matchesPlayed} match{stat.matchesPlayed > 1 ? 's' : ''}</td>
                            <td className="p-2 text-sm">
                              {stat.consecutiveBench > 0 ? (
                                <span className="text-secondary">⏳ {stat.consecutiveBench} match{stat.consecutiveBench > 1 ? 's' : ''}</span>
                              ) : (
                                <span className="opacity-40">-</span>
                              )}
                            </td>
                            <td className="p-2 text-sm">
                              <span className="text-primary text-xs border border-primary/30 px-1.5 py-0.5 rounded bg-primary/5">ACTIF</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {/* Arenas Split */}
              <div className="grid grid-cols-2 gap-6 md-grid-cols-1">
                {/* Arena A */}
                <div className="eva-card" style={{ borderColor: 'rgba(0, 240, 255, 0.4)', background: 'rgba(11, 12, 16, 0.8)' }}>
                  <div className="flex justify-between items-center mb-4 border-b border-primary/20 pb-2">
                    <div>
                      <h2 className="text-primary text-sm flex items-center gap-2">
                        🛡️ ARÈNE A (BLEUE)
                      </h2>
                      <span className="text-xs opacity-60">Écarts: {doubleArenaMatches[0].levelDiff} niv.</span>
                    </div>
                    <div>
                      {doubleArenaMatches[0].finished ? (
                        <span className="text-xs px-2.5 py-1 rounded bg-green-500/20 text-green-400 border border-green-500/30 glow-text" style={{ textShadow: '0 0 5px rgba(74,222,128,0.5)' }}>TERMINÉ</span>
                      ) : (
                        <span className="text-xs px-2.5 py-1 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 glow-text" style={{ textShadow: '0 0 5px rgba(250,204,21,0.5)' }}>EN COURS</span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-4">
                    {/* Team 1 */}
                    <div className="table-responsive rounded border border-primary/10" style={{ background: 'rgba(0, 240, 255, 0.03)' }}>
                      <table className="w-full">
                        <thead>
                          <tr>
                            <th colSpan="2" className="text-primary text-xs py-1 border-b border-primary/15">ÉQUIPE BLEUE ({getTeamLevel(doubleArenaMatches[0].team1)})</th>
                          </tr>
                        </thead>
                        <tbody>
                          {doubleArenaMatches[0].team1.map(player => (
                            <tr 
                              key={player.id}
                              draggable={isAdmin && !doubleArenaMatches[0].finished}
                              onDragStart={(e) => handleDragStart(e, player, 'team1', 0)}
                              onDragEnd={handleDragEnd}
                              onDragOver={(e) => (isAdmin && !doubleArenaMatches[0].finished) ? handleDragOver(e, player.id) : null}
                              onDragLeave={(isAdmin && !doubleArenaMatches[0].finished) ? handleDragLeave : null}
                              onDrop={(e) => (isAdmin && !doubleArenaMatches[0].finished) ? handleDrop(e, player, 'team1', 0) : null}
                              className={`draggable-row ${dragOverId === player.id ? 'drag-over' : ''} ${(!isAdmin || doubleArenaMatches[0].finished) ? 'cursor-default' : ''}`}
                            >
                              <td className="p-2 text-sm flex items-center gap-2">
                                {isAdmin && !doubleArenaMatches[0].finished && <GripVertical size={14} className="opacity-30" />} 
                                {getPlayerAvatar(player.id) ? (
                                  <img src={getPlayerAvatar(player.id)} alt={player.name} style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} />
                                ) : (
                                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', flexShrink: 0 }}>
                                    {player.name.substring(0, 2).toUpperCase()}
                                  </div>
                                )}
                                <span>{player.name}</span>
                                {isAdmin && !doubleArenaMatches[0].finished && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSubstitutingPlayer({ player, teamKey: 'team1', matchIndex: 0 });
                                    }}
                                    className="ml-auto text-secondary hover:text-white transition-colors p-1 flex items-center justify-center opacity-40 hover:opacity-100"
                                    title="Remplacer ce joueur"
                                    style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                                  >
                                    <ArrowLeftRight size={12} />
                                  </button>
                                )}
                              </td>
                              <td className="p-2 text-right text-xs opacity-60">Niv. {player.level}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Team 2 */}
                    <div className="table-responsive rounded border border-primary/10" style={{ background: 'rgba(0, 240, 255, 0.03)' }}>
                      <table className="w-full">
                        <thead>
                          <tr>
                            <th colSpan="2" className="text-primary text-xs py-1 border-b border-primary/15">ÉQUIPE ORANGE ({getTeamLevel(doubleArenaMatches[0].team2)})</th>
                          </tr>
                        </thead>
                        <tbody>
                          {doubleArenaMatches[0].team2.map(player => (
                            <tr 
                              key={player.id}
                              draggable={isAdmin && !doubleArenaMatches[0].finished}
                              onDragStart={(e) => handleDragStart(e, player, 'team2', 0)}
                              onDragEnd={handleDragEnd}
                              onDragOver={(e) => (isAdmin && !doubleArenaMatches[0].finished) ? handleDragOver(e, player.id) : null}
                              onDragLeave={(isAdmin && !doubleArenaMatches[0].finished) ? handleDragLeave : null}
                              onDrop={(e) => (isAdmin && !doubleArenaMatches[0].finished) ? handleDrop(e, player, 'team2', 0) : null}
                              className={`draggable-row ${dragOverId === player.id ? 'drag-over' : ''} ${(!isAdmin || doubleArenaMatches[0].finished) ? 'cursor-default' : ''}`}
                            >
                              <td className="p-2 text-sm flex items-center gap-2">
                                {isAdmin && !doubleArenaMatches[0].finished && <GripVertical size={14} className="opacity-30" />} 
                                {getPlayerAvatar(player.id) ? (
                                  <img src={getPlayerAvatar(player.id)} alt={player.name} style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} />
                                ) : (
                                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', flexShrink: 0 }}>
                                    {player.name.substring(0, 2).toUpperCase()}
                                  </div>
                                )}
                                <span>{player.name}</span>
                                {isAdmin && !doubleArenaMatches[0].finished && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSubstitutingPlayer({ player, teamKey: 'team2', matchIndex: 0 });
                                    }}
                                    className="ml-auto text-secondary hover:text-white transition-colors p-1 flex items-center justify-center opacity-40 hover:opacity-100"
                                    title="Remplacer ce joueur"
                                    style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                                  >
                                    <ArrowLeftRight size={12} />
                                  </button>
                                )}
                              </td>
                              <td className="p-2 text-right text-xs opacity-60">Niv. {player.level}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {isAdmin && (
                      <button 
                        onClick={() => toggleMatchFinished(0)} 
                        className={`eva-button w-full ${doubleArenaMatches[0].finished ? '' : 'secondary'}`}
                        style={{ padding: '0.5rem' }}
                      >
                        {doubleArenaMatches[0].finished ? 'Modifier le match A' : 'Terminer le match A'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Arena B */}
                <div className="eva-card" style={{ borderColor: 'rgba(255, 0, 85, 0.4)', background: 'rgba(11, 12, 16, 0.8)' }}>
                  <div className="flex justify-between items-center mb-4 border-b border-secondary/20 pb-2">
                    <div>
                      <h2 className="text-secondary text-sm flex items-center gap-2">
                        💥 ARÈNE B (ROUGE)
                      </h2>
                      <span className="text-xs opacity-60">Écarts: {doubleArenaMatches[1].levelDiff} niv.</span>
                    </div>
                    <div>
                      {doubleArenaMatches[1].finished ? (
                        <span className="text-xs px-2.5 py-1 rounded bg-green-500/20 text-green-400 border border-green-500/30 glow-text" style={{ textShadow: '0 0 5px rgba(74,222,128,0.5)' }}>TERMINÉ</span>
                      ) : (
                        <span className="text-xs px-2.5 py-1 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 glow-text" style={{ textShadow: '0 0 5px rgba(250,204,21,0.5)' }}>EN COURS</span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-4">
                    {/* Team 1 */}
                    <div className="table-responsive rounded border border-secondary/10" style={{ background: 'rgba(255, 0, 85, 0.03)' }}>
                      <table className="w-full">
                        <thead>
                          <tr>
                            <th colSpan="2" className="text-secondary text-xs py-1 border-b border-secondary/15">ÉQUIPE ROUGE ({getTeamLevel(doubleArenaMatches[1].team1)})</th>
                          </tr>
                        </thead>
                        <tbody>
                          {doubleArenaMatches[1].team1.map(player => (
                            <tr 
                              key={player.id}
                              draggable={isAdmin && !doubleArenaMatches[1].finished}
                              onDragStart={(e) => handleDragStart(e, player, 'team1', 1)}
                              onDragEnd={handleDragEnd}
                              onDragOver={(e) => (isAdmin && !doubleArenaMatches[1].finished) ? handleDragOver(e, player.id) : null}
                              onDragLeave={(isAdmin && !doubleArenaMatches[1].finished) ? handleDragLeave : null}
                              onDrop={(e) => (isAdmin && !doubleArenaMatches[1].finished) ? handleDrop(e, player, 'team1', 1) : null}
                              className={`draggable-row ${dragOverId === player.id ? 'drag-over' : ''} ${(!isAdmin || doubleArenaMatches[1].finished) ? 'cursor-default' : ''}`}
                            >
                              <td className="p-2 text-sm flex items-center gap-2">
                                {isAdmin && !doubleArenaMatches[1].finished && <GripVertical size={14} className="opacity-30" />} 
                                {getPlayerAvatar(player.id) ? (
                                  <img src={getPlayerAvatar(player.id)} alt={player.name} style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} />
                                ) : (
                                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', flexShrink: 0 }}>
                                    {player.name.substring(0, 2).toUpperCase()}
                                  </div>
                                )}
                                <span>{player.name}</span>
                                {isAdmin && !doubleArenaMatches[1].finished && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSubstitutingPlayer({ player, teamKey: 'team1', matchIndex: 1 });
                                    }}
                                    className="ml-auto text-secondary hover:text-white transition-colors p-1 flex items-center justify-center opacity-40 hover:opacity-100"
                                    title="Remplacer ce joueur"
                                    style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                                  >
                                    <ArrowLeftRight size={12} />
                                  </button>
                                )}
                              </td>
                              <td className="p-2 text-right text-xs opacity-60">Niv. {player.level}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Team 2 */}
                    <div className="table-responsive rounded border border-secondary/10" style={{ background: 'rgba(255, 0, 85, 0.03)' }}>
                      <table className="w-full">
                        <thead>
                          <tr>
                            <th colSpan="2" className="text-secondary text-xs py-1 border-b border-secondary/15">ÉQUIPE NOIRE ({getTeamLevel(doubleArenaMatches[1].team2)})</th>
                          </tr>
                        </thead>
                        <tbody>
                          {doubleArenaMatches[1].team2.map(player => (
                            <tr 
                              key={player.id}
                              draggable={isAdmin && !doubleArenaMatches[1].finished}
                              onDragStart={(e) => handleDragStart(e, player, 'team2', 1)}
                              onDragEnd={handleDragEnd}
                              onDragOver={(e) => (isAdmin && !doubleArenaMatches[1].finished) ? handleDragOver(e, player.id) : null}
                              onDragLeave={(isAdmin && !doubleArenaMatches[1].finished) ? handleDragLeave : null}
                              onDrop={(e) => (isAdmin && !doubleArenaMatches[1].finished) ? handleDrop(e, player, 'team2', 1) : null}
                              className={`draggable-row ${dragOverId === player.id ? 'drag-over' : ''} ${(!isAdmin || doubleArenaMatches[1].finished) ? 'cursor-default' : ''}`}
                            >
                              <td className="p-2 text-sm flex items-center gap-2">
                                {isAdmin && !doubleArenaMatches[1].finished && <GripVertical size={14} className="opacity-30" />} 
                                {getPlayerAvatar(player.id) ? (
                                  <img src={getPlayerAvatar(player.id)} alt={player.name} style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} />
                                ) : (
                                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', flexShrink: 0 }}>
                                    {player.name.substring(0, 2).toUpperCase()}
                                  </div>
                                )}
                                <span>{player.name}</span>
                                {isAdmin && !doubleArenaMatches[1].finished && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSubstitutingPlayer({ player, teamKey: 'team2', matchIndex: 1 });
                                    }}
                                    className="ml-auto text-secondary hover:text-white transition-colors p-1 flex items-center justify-center opacity-40 hover:opacity-100"
                                    title="Remplacer ce joueur"
                                    style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                                  >
                                    <ArrowLeftRight size={12} />
                                  </button>
                                )}
                              </td>
                              <td className="p-2 text-right text-xs opacity-60">Niv. {player.level}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {isAdmin && (
                      <button 
                        onClick={() => toggleMatchFinished(1)} 
                        className={`eva-button w-full ${doubleArenaMatches[1].finished ? '' : 'secondary'}`}
                        style={{ padding: '0.5rem' }}
                      >
                        {doubleArenaMatches[1].finished ? 'Modifier le match B' : 'Terminer le match B'}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Central Validation Block */}
              <div className="eva-card text-center flex flex-col items-center gap-4 border-primary/30" style={{ background: 'rgba(0, 240, 255, 0.02)' }}>
                {doubleArenaMatches[0].finished && doubleArenaMatches[1].finished ? (
                  <>
                    <div className="text-green-400 font-bold text-lg glow-text" style={{ textShadow: '0 0 10px rgba(74,222,128,0.4)' }}>
                      🎉 TOUS LES MATCHS DU ROUND SONT TERMINÉS !
                    </div>
                    {isAdmin ? (
                      <button onClick={validateRound} className="eva-button hover-glow text-lg px-8 py-3" style={{ background: 'var(--primary)', color: 'black' }}>
                        Valider le Round et Passer au Suivant
                      </button>
                    ) : (
                      <p className="text-yellow-500 text-sm">En attente de la validation du round par l'administrateur...</p>
                    )}
                  </>
                ) : (
                  <>
                    <div className="text-yellow-500 font-bold text-sm">
                      ⚠️ EN ATTENTE DE LA FIN DES DEUX MATCHS POUR PASSER AU SUIVANT
                    </div>
                    <button disabled className="eva-button" style={{ opacity: 0.4, cursor: 'not-allowed' }}>
                      En attente des 2 matchs...
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Double Arena History */}
          {doubleArenaHistory.length > 0 && (
            <div className="eva-card">
              <h2 className="text-primary text-sm mb-4 border-b border-primary/20 pb-2">HISTORIQUE DES ROUNDS (DOUBLE ARÈNE)</h2>
              <div className="flex flex-col gap-4">
                {Array.from({ length: doubleArenaHistory.length / 2 }).map((_, rIdx) => {
                  const roundNum = Math.floor(doubleArenaHistory.length / 2) - rIdx;
                  const matchB = doubleArenaHistory[rIdx * 2];
                  const matchA = doubleArenaHistory[rIdx * 2 + 1];

                  if (!matchA || !matchB) return null;

                  return (
                    <div key={roundNum} className="p-4 bg-white/5 border border-white/10 rounded flex flex-col gap-3">
                      <div className="flex justify-between items-center border-b border-white/10 pb-2">
                        <span className="font-bold text-primary text-sm">ROUND {roundNum}</span>
                        <span className="text-xs opacity-50">{matchA.date ? new Date(matchA.date).toLocaleTimeString() : ''}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 md-grid-cols-1 text-xs">
                        {/* Arena A */}
                        <div className="flex flex-col gap-1 p-2 bg-primary/5 rounded border border-primary/10">
                          <span className="font-bold text-primary">🛡️ Arène A</span>
                          <span>{matchA.team1.map(x=>x.name).join(', ')}</span>
                          <span className="opacity-50 text-[10px] text-center my-0.5">VS</span>
                          <span>{matchA.team2.map(x=>x.name).join(', ')}</span>
                        </div>
                        {/* Arena B */}
                        <div className="flex flex-col gap-1 p-2 bg-secondary/5 rounded border border-secondary/10">
                          <span className="font-bold text-secondary">💥 Arène B</span>
                          <span>{matchB.team1.map(x=>x.name).join(', ')}</span>
                          <span className="opacity-50 text-[10px] text-center my-0.5">VS</span>
                          <span>{matchB.team2.map(x=>x.name).join(', ')}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Remplacement Modal */}
      {substitutingPlayer && (
        <div className="modal-overlay">
          <div className="eva-card" style={{ maxWidth: '500px', width: '95%' }}>
            <h2 className="text-secondary mb-2 flex items-center gap-2">
              <ArrowLeftRight className="text-secondary" /> REMPLACER UN JOUEUR
            </h2>
            <p className="mb-4 text-sm opacity-80">
              Sélectionnez un joueur du banc pour remplacer <strong className="text-primary">{substitutingPlayer.player.name}</strong> dans l'arène {substitutingPlayer.matchIndex === 0 ? 'A' : 'B'}.
            </p>
            
            <div className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto mb-6 pr-1">
              {(() => {
                const match = doubleArenaMatches[substitutingPlayer.matchIndex];
                if (!match) return null;
                const playingIds = [...match.team1.map(p => p.id), ...match.team2.map(p => p.id)];
                const benchPlayers = players.filter(p => !p.isPaused && !playingIds.includes(p.id));

                if (benchPlayers.length === 0) {
                  return <p className="text-center py-4 opacity-50 italic text-sm">Aucun joueur n'est disponible sur le banc.</p>;
                }

                return benchPlayers.map(p => {
                  const stat = sessionStats[p.id] || { matchesPlayed: 0, consecutiveBench: 0 };
                  return (
                    <div 
                      key={p.id} 
                      onClick={() => handleSubstitute(p)}
                      className="flex justify-between items-center bg-white/5 hover:bg-primary/10 border border-transparent hover:border-primary/20 p-2.5 rounded cursor-pointer transition-all"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        {p.avatar ? (
                          <img src={p.avatar} alt={p.name} style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                        ) : (
                          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', flexShrink: 0 }}>
                            {p.name.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="flex flex-col text-left">
                          <span className="text-sm font-bold truncate">{p.name}</span>
                          {stat.consecutiveBench > 0 && (
                            <span className="text-xs text-secondary opacity-85">⏳ Banc : {stat.consecutiveBench} match{stat.consecutiveBench > 1 ? 'es' : ''}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right text-xs opacity-75 flex flex-col items-end">
                        <span className="text-primary font-bold">Niveau {p.level}</span>
                        <span>{stat.matchesPlayed} match{stat.matchesPlayed > 1 ? 's' : ''} joués</span>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            <div className="flex gap-2 justify-end">
              <button 
                onClick={() => setSubstitutingPlayer(null)} 
                className="eva-button" 
                style={{ borderColor: 'rgba(255,255,255,0.2)', color: 'white', background: 'transparent' }}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
