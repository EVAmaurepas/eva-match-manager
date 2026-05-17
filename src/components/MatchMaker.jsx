import { useState } from 'react';
import { Play, Flag, Swords, Check, GripVertical, RefreshCw } from 'lucide-react';

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

function MatchMaker({ players, upcomingMatches, setUpcomingMatches, finishMatch, matchHistory, isAdmin }) {
  const MIN_PLAYERS = 8; // 4v4 format
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);

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

  const createMatchForUpcomingList = (baseUpcomingMatches) => {
    const combinedHistory = [...baseUpcomingMatches].reverse().concat(matchHistory);

    const playerStats = players.map(player => {
      let consecutive = 0;
      let sinceLast = 0;
      
      let virtualMatchesPlayed = player.matchesPlayed;
      baseUpcomingMatches.forEach(m => {
        if ([...m.team1, ...m.team2].some(p => p.id === player.id)) {
          virtualMatchesPlayed++;
        }
      });

      for (let i = 0; i < combinedHistory.length; i++) {
        const match = combinedHistory[i];
        const played = [...match.team1, ...match.team2].some(p => p.id === player.id);
        if (played) consecutive++;
        else break;
      }

      for (let i = 0; i < combinedHistory.length; i++) {
        const match = combinedHistory[i];
        const played = [...match.team1, ...match.team2].some(p => p.id === player.id);
        if (!played) sinceLast++;
        else break;
      }

      let priorityScore = virtualMatchesPlayed;
      
      if (sinceLast >= 3) priorityScore -= 500;
      else if (sinceLast === 2) priorityScore -= 50;
      
      if (consecutive >= 3) priorityScore += 500;
      else if (consecutive === 2) priorityScore += 50;

      if (consecutive > 0) priorityScore += 5;

      return { ...player, priorityScore };
    });

    const shuffled = [...playerStats].sort(() => 0.5 - Math.random());
    const sorted = shuffled.sort((a, b) => a.priorityScore - b.priorityScore);
    const selectedPlayers = sorted.slice(0, 8);

    const team1Combinations = getCombinations(selectedPlayers, 4);
    let bestTeam1 = null;
    let bestTeam2 = null;
    let minDifference = Infinity;

    team1Combinations.forEach(t1 => {
      const t1Ids = t1.map(p => p.id);
      const t2 = selectedPlayers.filter(p => !t1Ids.includes(p.id));
      const diff = Math.abs(getTeamLevel(t1) - getTeamLevel(t2));
      if (diff < minDifference) {
        minDifference = diff;
        bestTeam1 = t1;
        bestTeam2 = t2;
      }
    });

    return {
      team1: bestTeam1,
      team2: bestTeam2,
      levelDiff: minDifference,
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

  if (players.length < MIN_PLAYERS) {
    return (
      <div className="eva-card text-center py-12">
        <Swords size={64} className="mx-auto mb-4 text-secondary opacity-50" />
        <h2 className="text-xl mb-2">Pas assez de joueurs</h2>
        <p className="opacity-70">
          Vous avez {players.length} joueur(s) sur les {MIN_PLAYERS} nécessaires pour un match 4v4.
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
            <button onClick={generateMatch} className="eva-button">
              <Play size={20} /> Préparer le match {matchHistory.length + upcomingMatches.length + 1}
            </button>
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
                              {player.avatar ? (
                                <img src={player.avatar} alt={player.name} style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} />
                              ) : (
                                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', flexShrink: 0 }}>
                                  {player.name.substring(0, 2).toUpperCase()}
                                </div>
                              )}
                              {player.name}
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
                              {player.avatar ? (
                                <img src={player.avatar} alt={player.name} style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} />
                              ) : (
                                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', flexShrink: 0 }}>
                                  {player.name.substring(0, 2).toUpperCase()}
                                </div>
                              )}
                              {player.name}
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
    </div>
  );
}

export default MatchMaker;
