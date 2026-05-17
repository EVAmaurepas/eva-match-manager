import { useState } from 'react';
import { Play, Flag, Swords, Check, GripVertical, RefreshCw, PenTool, Plus, ArrowLeftRight } from 'lucide-react';

// Helper: Get all combinations of size k from an array
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

// Helper: calculate total level of a team
const getTeamLevel = (team) => team.reduce((sum, p) => sum + p.level, 0);

function MatchMaker({ 
  players, 
  upcomingMatches, 
  setUpcomingMatches, 
  finishMatch, 
  matchHistory, 
  presenceHistory, 
  teamHistory, 
  opponentHistory, 
  isAdmin 
}) {
  const MIN_PLAYERS = 8; // 4v4 format
  const getPlayerAvatar = (id) => players.find(p => p.id === id)?.avatar;
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualTeam1, setManualTeam1] = useState([]);
  const [manualTeam2, setManualTeam2] = useState([]);
  const [substitutingPlayer, setSubstitutingPlayer] = useState(null);

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
    if (draggedItem.matchIndex !== targetMatchIndex) return; // Only swap within the same match for now

    const sourceTeamKey = draggedItem.teamKey;
    const matchIndex = draggedItem.matchIndex;
    
    const newUpcoming = [...upcomingMatches];
    const match = { ...newUpcoming[matchIndex] };
    
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
    
    newUpcoming[matchIndex] = match;
    setUpcomingMatches(newUpcoming);
  };

  const removeMatch = (index) => {
    setUpcomingMatches(upcomingMatches.filter((_, i) => i !== index));
  };

  const handleSubstitute = (benchPlayer) => {
    if (!substitutingPlayer) return;
    const { player: targetPlayer, teamKey, matchIndex } = substitutingPlayer;

    const newUpcoming = [...upcomingMatches];
    const match = { ...newUpcoming[matchIndex] };

    // Replace the player in the correct team
    match[teamKey] = match[teamKey].map(p => 
      p.id === targetPlayer.id ? benchPlayer : p
    );

    // Recalculate level difference
    match.levelDiff = Math.abs(getTeamLevel(match.team1) - getTeamLevel(match.team2));

    newUpcoming[matchIndex] = match;
    setUpcomingMatches(newUpcoming);
    setSubstitutingPlayer(null);
  };

  const getVirtualState = (baseUpcomingMatches) => {
    const virtualPlayers = players.map(p => ({
      ...p,
      level: p.level ?? p.skill ?? 5,
      matchesPlayed: p.matchesPlayed ?? p.gamesPlayed ?? 0,
      consecutiveBench: p.consecutiveBench ?? 0,
      lastPlayedAt: p.lastPlayedAt ?? 0,
      isPaused: p.isPaused ?? false
    }));

    const virtualPresence = JSON.parse(JSON.stringify(presenceHistory || {}));
    const virtualTeam = JSON.parse(JSON.stringify(teamHistory || {}));
    const virtualOpponent = JSON.parse(JSON.stringify(opponentHistory || {}));

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

    baseUpcomingMatches.forEach(match => {
      const team1Ids = match.team1.map(p => p.id);
      const team2Ids = match.team2.map(p => p.id);
      const participatingIds = [...team1Ids, ...team2Ids];
      const matchTime = Date.now();

      virtualPlayers.forEach(p => {
        if (p.isPaused) return;
        if (participatingIds.includes(p.id)) {
          p.matchesPlayed = (p.matchesPlayed || 0) + 1;
          p.consecutiveBench = 0;
          p.lastPlayedAt = matchTime;
        } else {
          p.consecutiveBench = (p.consecutiveBench || 0) + 1;
        }
      });

      // Presence
      for (let i = 0; i < participatingIds.length; i++) {
        for (let j = i + 1; j < participatingIds.length; j++) {
          addPair(virtualPresence, participatingIds[i], participatingIds[j], 1);
        }
      }

      // Team
      for (let i = 0; i < team1Ids.length; i++) {
        for (let j = i + 1; j < team1Ids.length; j++) {
          addPair(virtualTeam, team1Ids[i], team1Ids[j], 1);
        }
      }
      for (let i = 0; i < team2Ids.length; i++) {
        for (let j = i + 1; j < team2Ids.length; j++) {
          addPair(virtualTeam, team2Ids[i], team2Ids[j], 1);
        }
      }

      // Opponent
      for (let i = 0; i < team1Ids.length; i++) {
        for (let j = 0; j < team2Ids.length; j++) {
          addPair(virtualOpponent, team1Ids[i], team2Ids[j], 1);
        }
      }

      decay(virtualPresence);
      decay(virtualTeam);
      decay(virtualOpponent);
    });

    return {
      players: virtualPlayers,
      presenceHistory: virtualPresence,
      teamHistory: virtualTeam,
      opponentHistory: virtualOpponent
    };
  };

  const getTimeSinceLastMatch = (lastPlayedAt) => {
    if (!lastPlayedAt) {
      return 120; // 2 hours boost for players who have never played
    }
    const diffMs = Date.now() - lastPlayedAt;
    const diffMins = diffMs / 60000;
    return Math.max(0, diffMins);
  };

  const createMatchForUpcomingList = (baseUpcomingMatches) => {
    const W_BENCH = 10;
    const W_RECENCY = 1;
    const W_TOTAL_GAMES = 3;
    const W_MATCH_REPEAT = 4;
    const W_TEAM_REPEAT = 5;
    const W_OPPONENT_REPEAT = 2;
    const W_SKILL_BALANCE = 6;

    const virtualState = getVirtualState(baseUpcomingMatches);
    const virtualPlayers = virtualState.players;
    const virtualPresence = virtualState.presenceHistory;
    const virtualTeam = virtualState.teamHistory;
    const virtualOpponent = virtualState.opponentHistory;

    const activePlayers = virtualPlayers.filter(p => !p.isPaused);
    if (activePlayers.length < MIN_PLAYERS) {
      throw new Error("Pas assez de joueurs actifs");
    }

    // Step 1: Calculate individual score with slight randomization to break ties naturally
    const playerScores = activePlayers.map(p => {
      const timeSince = getTimeSinceLastMatch(p.lastPlayedAt);
      const score =
        W_BENCH * p.consecutiveBench +
        W_RECENCY * timeSince -
        W_TOTAL_GAMES * p.matchesPlayed +
        (Math.random() - 0.5);
      return { ...p, priorityScore: score };
    });

    // Step 2: Select group of 8 players
    const sortedPlayers = [...playerScores].sort((a, b) => b.priorityScore - a.priorityScore);
    const candidatePool = sortedPlayers.slice(0, Math.min(12, sortedPlayers.length));

    // Test combinations of 8
    const possibleGroups = getCombinations(candidatePool, 8);
    let bestGroup = null;
    let bestGroupScore = -Infinity;

    possibleGroups.forEach(group => {
      const fairnessScore = group.reduce((sum, p) => sum + p.priorityScore, 0);
      
      let repetitionPenalty = 0;
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const aId = group[i].id;
          const bId = group[j].id;
          repetitionPenalty += (virtualPresence[aId]?.[bId] || 0);
        }
      }

      const groupScore = fairnessScore - W_MATCH_REPEAT * repetitionPenalty;

      if (groupScore > bestGroupScore) {
        bestGroupScore = groupScore;
        bestGroup = group;
      }
    });

    // Step 3: Create teams of 4v4
    const team1Combinations = getCombinations(bestGroup, 4);
    let bestTeam1 = null;
    let bestTeam2 = null;
    let bestTeamScore = -Infinity;

    team1Combinations.forEach(t1 => {
      const t1Ids = t1.map(p => p.id);
      const t2 = bestGroup.filter(p => !t1Ids.includes(p.id));

      const balanceScore = -Math.abs(getTeamLevel(t1) - getTeamLevel(t2));

      // Teammate penalty
      let teammatePenalty = 0;
      for (let i = 0; i < t1.length; i++) {
        for (let j = i + 1; j < t1.length; j++) {
          teammatePenalty += (virtualTeam[t1[i].id]?.[t1[j].id] || 0);
        }
      }
      for (let i = 0; i < t2.length; i++) {
        for (let j = i + 1; j < t2.length; j++) {
          teammatePenalty += (virtualTeam[t2[i].id]?.[t2[j].id] || 0);
        }
      }

      // Opponent penalty
      let opponentPenalty = 0;
      for (let i = 0; i < t1.length; i++) {
        for (let j = 0; j < t2.length; j++) {
          opponentPenalty += (virtualOpponent[t1[i].id]?.[t2[j].id] || 0);
        }
      }

      const teamScore =
        W_SKILL_BALANCE * balanceScore -
        W_TEAM_REPEAT * teammatePenalty -
        W_OPPONENT_REPEAT * opponentPenalty;

      if (teamScore > bestTeamScore) {
        bestTeamScore = teamScore;
        bestTeam1 = t1;
        bestTeam2 = t2;
      }
    });

    return {
      team1: bestTeam1,
      team2: bestTeam2,
      levelDiff: Math.abs(getTeamLevel(bestTeam1) - getTeamLevel(bestTeam2)),
      id: Date.now().toString()
    };
  };

  const generateMatch = () => {
    setUpcomingMatches([...upcomingMatches, createMatchForUpcomingList(upcomingMatches)]);
  };

  const refreshMatch = (index) => {
    const baseUpcomingMatches = upcomingMatches.slice(0, index);
    const newMatch = createMatchForUpcomingList(baseUpcomingMatches);
    const newUpcoming = [...upcomingMatches];
    newUpcoming[index] = newMatch;
    setUpcomingMatches(newUpcoming);
  };

  const activePlayersCount = players.filter(p => !p.isPaused).length;
  if (activePlayersCount < MIN_PLAYERS) {
    return (
      <div className="eva-card text-center py-12">
        <Swords size={64} className="mx-auto mb-4 text-secondary opacity-50" />
        <h2 className="text-xl mb-2">Pas assez de joueurs actifs</h2>
        <p className="opacity-70">
          Vous avez {activePlayersCount} joueur(s) actif(s) sur les {MIN_PLAYERS} nécessaires pour un match 4v4. (Total inscrits: {players.length})
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-8">
      <div className="eva-card">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl glow-text flex items-center gap-2">
            <Swords className="text-primary" /> PROGRAMME DE LA JOURNÉE
          </h2>
          {isAdmin && (
            <div className="flex gap-2">
              <button 
                onClick={() => {
                  setManualTeam1([]);
                  setManualTeam2([]);
                  setShowManualModal(true);
                }} 
                className="eva-button"
                style={{ background: 'transparent', borderColor: 'rgba(255, 0, 85, 0.5)' }}
              >
                <PenTool size={20} /> Manuel
              </button>
              <button onClick={generateMatch} className="eva-button">
                <Play size={20} /> Préparer le match {matchHistory.length + upcomingMatches.length + 1}
              </button>
            </div>
          )}
        </div>

        {upcomingMatches.length === 0 ? (
          <p className="text-center py-8 opacity-60 italic">Aucun match préparé. Cliquez sur le bouton pour générer la suite !</p>
        ) : (
          <div className="grid gap-8">
            {upcomingMatches.map((match, index) => (
              <div key={match.id} className={`eva-card relative ${index === 0 ? 'border-primary' : 'opacity-80'}`} 
                   style={{ borderStyle: index === 0 ? 'solid' : 'dashed', borderWidth: '1px' }}>
                
                {index === 0 && <div className="absolute -top-3 left-4 bg-primary text-black text-xs font-bold px-2 py-1 rounded">MATCH EN COURS</div>}
                
                <div className="flex justify-between items-center mb-6 mt-2">
                  <div>
                    <h3 className="text-xl font-bold flex items-center gap-2">
                      {index === 0 ? <Flag className="text-secondary" /> : <Play size={16} />}
                      Match {matchHistory.length + index + 1}
                    </h3>
                    {isAdmin && <p className="text-xs opacity-50">Écart : {match.levelDiff} | Niv. Total : {getTeamLevel(match.team1) + getTeamLevel(match.team2)}</p>}
                  </div>
                  
                  <div className="flex gap-3">
                    {isAdmin && (
                      index === 0 ? (
                        <>
                          <button onClick={() => refreshMatch(index)} className="eva-button" title="Générer de nouveau" style={{ background: 'transparent', color: '#00f0ff', border: '1px solid #00f0ff', padding: '0.4rem', minWidth: 'auto' }}>
                            <RefreshCw size={16} />
                          </button>
                          <button onClick={finishMatch} className="eva-button secondary">
                            <Check size={18} /> Terminer
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => refreshMatch(index)} className="eva-button" title="Générer de nouveau" style={{ background: 'transparent', color: '#00f0ff', border: '1px solid #00f0ff', padding: '0.4rem', minWidth: 'auto' }}>
                            <RefreshCw size={16} />
                          </button>
                          <button onClick={() => removeMatch(index)} className="eva-button" style={{ background: 'transparent', color: '#ff4444', border: '1px solid #ff4444' }}>
                            Supprimer
                          </button>
                        </>
                      )
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 md-grid-cols-1">
                  {/* Team 1 */}
                  <div className="table-responsive rounded border border-primary/20" style={{ background: 'rgba(0, 240, 255, 0.05)' }}>
                    <table className="w-full">
                      <thead>
                        <tr>
                          <th colSpan="2" className="text-primary text-xs py-1 border-b border-primary/20">ÉQUIPE BLEUE {isAdmin && `(${getTeamLevel(match.team1)})`}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {match.team1.map(player => (
                          <tr 
                            key={player.id}
                            draggable={isAdmin}
                            onDragStart={(e) => handleDragStart(e, player, 'team1', index)}
                            onDragEnd={handleDragEnd}
                            onDragOver={(e) => isAdmin ? handleDragOver(e, player.id) : null}
                            onDragLeave={isAdmin ? handleDragLeave : null}
                            onDrop={(e) => isAdmin ? handleDrop(e, player, 'team1', index) : null}
                            className={`draggable-row ${dragOverId === player.id ? 'drag-over' : ''} ${!isAdmin ? 'cursor-default' : ''}`}
                          >
                            <td className="p-2 text-sm flex items-center gap-2">
                              {isAdmin && <GripVertical size={14} className="opacity-30" />} 
                              {getPlayerAvatar(player.id) ? (
                                <img src={getPlayerAvatar(player.id)} alt={player.name} style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} />
                              ) : (
                                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', flexShrink: 0 }}>
                                  {player.name.substring(0, 2).toUpperCase()}
                                </div>
                              )}
                              <span>{player.name}</span>
                              {isAdmin && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSubstitutingPlayer({ player, teamKey: 'team1', matchIndex: index });
                                  }}
                                  className="ml-auto text-secondary hover:text-white transition-colors p-1 flex items-center justify-center opacity-40 hover:opacity-100"
                                  title="Remplacer ce joueur"
                                  style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                                >
                                  <ArrowLeftRight size={12} />
                                </button>
                              )}
                            </td>
                            <td className="p-2 text-right text-xs opacity-60">{isAdmin && `Niv. ${player.level}`}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Team 2 */}
                  <div className="table-responsive rounded border border-secondary/20" style={{ background: 'rgba(255, 0, 85, 0.05)' }}>
                    <table className="w-full">
                      <thead>
                        <tr>
                          <th colSpan="2" className="text-secondary text-xs py-1 border-b border-secondary/20">ÉQUIPE ROUGE {isAdmin && `(${getTeamLevel(match.team2)})`}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {match.team2.map(player => (
                          <tr 
                            key={player.id}
                            draggable={isAdmin}
                            onDragStart={(e) => handleDragStart(e, player, 'team2', index)}
                            onDragEnd={handleDragEnd}
                            onDragOver={(e) => isAdmin ? handleDragOver(e, player.id) : null}
                            onDragLeave={isAdmin ? handleDragLeave : null}
                            onDrop={(e) => isAdmin ? handleDrop(e, player, 'team2', index) : null}
                            className={`draggable-row ${dragOverId === player.id ? 'drag-over' : ''} ${!isAdmin ? 'cursor-default' : ''}`}
                          >
                            <td className="p-2 text-sm flex items-center gap-2">
                              {isAdmin && <GripVertical size={14} className="opacity-30" />} 
                              {getPlayerAvatar(player.id) ? (
                                <img src={getPlayerAvatar(player.id)} alt={player.name} style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} />
                              ) : (
                                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', flexShrink: 0 }}>
                                  {player.name.substring(0, 2).toUpperCase()}
                                </div>
                              )}
                              <span>{player.name}</span>
                              {isAdmin && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSubstitutingPlayer({ player, teamKey: 'team2', matchIndex: index });
                                  }}
                                  className="ml-auto text-secondary hover:text-white transition-colors p-1 flex items-center justify-center opacity-40 hover:opacity-100"
                                  title="Remplacer ce joueur"
                                  style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                                >
                                  <ArrowLeftRight size={12} />
                                </button>
                              )}
                            </td>
                            <td className="p-2 text-right text-xs opacity-60">{isAdmin && `Niv. ${player.level}`}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="text-center text-sm opacity-40">
        * Préparez vos matchs à l'avance pour voir la rotation. Cliquez sur "Terminer" pour valider le résultat et passer au suivant.
      </div>

      {showManualModal && (
        <div className="modal-overlay">
          <div className="eva-card" style={{ maxWidth: '800px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 className="text-secondary mb-4">Créer un match manuellement</h2>
            
            <div className="grid grid-cols-3 gap-4 md-grid-cols-1">
              {/* Disponibles */}
              <div className="p-4 border border-gray-700 rounded bg-black/20">
                <h3 className="font-bold mb-4 opacity-80 text-sm">JOUEURS DISPONIBLES</h3>
                <div className="flex flex-col gap-2">
                  {players.filter(p => !p.isPaused && !manualTeam1.find(x => x.id === p.id) && !manualTeam2.find(x => x.id === p.id)).map(p => (
                    <div key={p.id} className="flex justify-between items-center bg-white/5 p-2 rounded">
                      <div className="flex items-center gap-2 overflow-hidden">
                        {p.avatar ? (
                          <img src={p.avatar} alt={p.name} style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                        ) : (
                          <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', flexShrink: 0 }}>
                            {p.name.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <span className="text-sm truncate" title={p.name}>{p.name} <span className="text-xs opacity-50 font-normal">(Niv. {p.level})</span></span>
                      </div>
                      <div className="flex gap-1 flex-shrink-0 ml-2">
                        <button 
                          onClick={() => manualTeam1.length < 4 && setManualTeam1([...manualTeam1, p])}
                          disabled={manualTeam1.length >= 4}
                          className="disabled:opacity-20 hover:opacity-80 transition"
                          style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'var(--primary)', border: 'none', cursor: manualTeam1.length >= 4 ? 'not-allowed' : 'pointer' }}
                          title="Ajouter à l'Équipe Bleue"
                        ></button>
                        <button 
                          onClick={() => manualTeam2.length < 4 && setManualTeam2([...manualTeam2, p])}
                          disabled={manualTeam2.length >= 4}
                          className="disabled:opacity-20 hover:opacity-80 transition"
                          style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'var(--secondary)', border: 'none', cursor: manualTeam2.length >= 4 ? 'not-allowed' : 'pointer' }}
                          title="Ajouter à l'Équipe Rouge"
                        ></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Team 1 */}
              <div className="p-4 border border-primary/30 bg-primary/5 rounded">
                <h3 className="font-bold text-primary mb-4 text-sm flex justify-between items-center">
                  <span>ÉQUIPE BLEUE ({manualTeam1.length}/4)</span>
                  <span className="opacity-70 text-xs">Niv: {getTeamLevel(manualTeam1)}</span>
                </h3>
                <div className="flex flex-col gap-2">
                  {manualTeam1.map(p => (
                    <div key={p.id} className="flex justify-between items-center bg-black/40 p-2 rounded border border-primary/20">
                      <div className="flex items-center gap-2 overflow-hidden">
                        {p.avatar ? (
                          <img src={p.avatar} alt={p.name} style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                        ) : (
                          <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', flexShrink: 0 }}>
                            {p.name.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <span className="text-sm truncate" title={p.name}>{p.name} <span className="text-xs opacity-50 font-normal">(Niv. {p.level})</span></span>
                      </div>
                      <button onClick={() => setManualTeam1(manualTeam1.filter(x => x.id !== p.id))} className="text-red-500 hover:text-red-400 text-xs font-bold px-2 py-1">X</button>
                    </div>
                  ))}
                  {manualTeam1.length < 4 && (
                    <div className="p-2 border border-dashed border-primary/20 text-center opacity-30 text-sm rounded">
                      En attente...
                    </div>
                  )}
                </div>
              </div>

              {/* Team 2 */}
              <div className="p-4 border border-secondary/30 bg-secondary/5 rounded">
                <h3 className="font-bold text-secondary mb-4 text-sm flex justify-between items-center">
                  <span>ÉQUIPE ROUGE ({manualTeam2.length}/4)</span>
                  <span className="opacity-70 text-xs">Niv: {getTeamLevel(manualTeam2)}</span>
                </h3>
                <div className="flex flex-col gap-2">
                  {manualTeam2.map(p => (
                    <div key={p.id} className="flex justify-between items-center bg-black/40 p-2 rounded border border-secondary/20">
                      <div className="flex items-center gap-2 overflow-hidden">
                        {p.avatar ? (
                          <img src={p.avatar} alt={p.name} style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                        ) : (
                          <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', flexShrink: 0 }}>
                            {p.name.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <span className="text-sm truncate" title={p.name}>{p.name} <span className="text-xs opacity-50 font-normal">(Niv. {p.level})</span></span>
                      </div>
                      <button onClick={() => setManualTeam2(manualTeam2.filter(x => x.id !== p.id))} className="text-red-500 hover:text-red-400 text-xs font-bold px-2 py-1">X</button>
                    </div>
                  ))}
                  {manualTeam2.length < 4 && (
                    <div className="p-2 border border-dashed border-secondary/20 text-center opacity-30 text-sm rounded">
                      En attente...
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end mt-6">
              <button onClick={() => setShowManualModal(false)} className="eva-button" style={{ borderColor: 'rgba(255,255,255,0.2)', color: 'white', background: 'transparent' }}>
                Annuler
              </button>
              <button 
                onClick={() => {
                  setUpcomingMatches([...upcomingMatches, {
                    team1: manualTeam1,
                    team2: manualTeam2,
                    levelDiff: Math.abs(getTeamLevel(manualTeam1) - getTeamLevel(manualTeam2)),
                    id: Date.now().toString()
                  }]);
                  setShowManualModal(false);
                }}
                disabled={manualTeam1.length !== 4 || manualTeam2.length !== 4}
                className="eva-button secondary"
                style={{ opacity: (manualTeam1.length !== 4 || manualTeam2.length !== 4) ? 0.5 : 1 }}
              >
                Créer le match
              </button>
            </div>
          </div>
        </div>
      )}

      {substitutingPlayer && (
        <div className="modal-overlay">
          <div className="eva-card" style={{ maxWidth: '800px', width: '95%' }}>
            <h2 className="text-secondary mb-2 flex items-center gap-2">
              <ArrowLeftRight className="text-secondary" /> REMPLACER UN JOUEUR
            </h2>
            <p className="mb-4 text-sm opacity-80">
              Sélectionnez un joueur du banc pour remplacer <strong className="text-primary">{substitutingPlayer.player.name}</strong> dans le match.
            </p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem', maxHeight: '50vh', overflowY: 'auto', marginBottom: '1.5rem', paddingRight: '0.25rem' }}>
              {(() => {
                const match = upcomingMatches[substitutingPlayer.matchIndex];
                if (!match) return null;
                const playingIds = [...match.team1.map(p => p.id), ...match.team2.map(p => p.id)];
                const benchPlayers = players.filter(p => !p.isPaused && !playingIds.includes(p.id));

                if (benchPlayers.length === 0) {
                  return <p className="text-center py-4 opacity-50 italic text-sm" style={{ gridColumn: '1 / -1' }}>Aucun joueur n'est disponible sur le banc.</p>;
                }

                return benchPlayers.map(p => (
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
                        {p.consecutiveBench > 0 && (
                          <span className="text-xs text-secondary opacity-85">⏳ Banc : {p.consecutiveBench} match{p.consecutiveBench > 1 ? 'es' : ''}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right text-xs opacity-75 flex flex-col items-end">
                      <span className="text-primary font-bold">Niveau {p.level}</span>
                      <span>{p.matchesPlayed ?? 0} match{ (p.matchesPlayed ?? 0) > 1 ? 's' : ''} joués</span>
                    </div>
                  </div>
                ));
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

export default MatchMaker;
