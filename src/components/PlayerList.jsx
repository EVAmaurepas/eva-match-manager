import { useState } from 'react';
import { UserPlus, Trash2, Edit2, Check, Image as ImageIcon, PauseCircle, PlayCircle } from 'lucide-react';

function PlayerList({ players, onAdd, onUpdate, onDelete, isAdmin }) {
  const [newName, setNewName] = useState('');
  const [newLevel, setNewLevel] = useState('5');
  const [editingId, setEditingId] = useState(null);
  const [editLevel, setEditLevel] = useState('');
  const [editName, setEditName] = useState('');

  const handleAdd = (e) => {
    e.preventDefault();
    if (newName.trim()) {
      onAdd(newName.trim(), newLevel);
      setNewName('');
      setNewLevel('5');
    }
  };

  const startEdit = (player) => {
    setEditingId(player.id);
    setEditLevel(player.level.toString());
    setEditName(player.name);
  };

  const saveEdit = (id) => {
    if (editName.trim()) {
      onUpdate(id, { name: editName.trim(), level: parseInt(editLevel) });
    }
    setEditingId(null);
  };

  const handleImageUpload = (e, playerId) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const size = 64;
        canvas.width = size;
        canvas.height = size;
        
        const minDim = Math.min(img.width, img.height);
        const startX = (img.width - minDim) / 2;
        const startY = (img.height - minDim) / 2;

        ctx.drawImage(img, startX, startY, minDim, minDim, 0, 0, size, size);
        
        const base64Avatar = canvas.toDataURL('image/jpeg', 0.8);
        onUpdate(playerId, { avatar: base64Avatar });
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = null;
  };

  return (
    <div className="grid gap-6">
      {isAdmin && (
        <div className="eva-card">
          <h2 className="mb-4 flex items-center gap-2">
            <UserPlus className="text-primary" />
            Ajouter un joueur
          </h2>
          <form onSubmit={handleAdd} className="flex md-flex-col gap-4 items-center md-items-start">
            <input 
              type="text" 
              placeholder="Nom du joueur" 
              className="eva-input w-full"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
            />
            <div className="flex items-center gap-2 w-full">
              <label>Niveau (1-10):</label>
              <input 
                type="number" 
                min="1" max="10" 
                className="eva-input flex-1"
                value={newLevel}
                onChange={(e) => setNewLevel(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="eva-button w-full">
              Ajouter
            </button>
          </form>
        </div>
      )}

      <div className="eva-card">
        <h2 className="mb-4">Joueurs Enregistrés ({players.length})</h2>
        {players.length === 0 ? (
          <p className="text-center opacity-50 py-4">Aucun joueur dans le roster. Ajoutez-en pour commencer.</p>
        ) : (
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Nom</th>
                  {isAdmin && <th>Niveau</th>}
                  <th>Matchs Joués</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {players.map(player => (
                  <tr key={player.id} style={{ backgroundColor: player.isPaused ? 'rgba(255, 0, 85, 0.05)' : 'transparent' }}>
                    <td className="font-bold">
                      <div className={`flex items-center gap-3 ${player.isPaused ? 'opacity-60' : ''}`}>
                        {player.avatar ? (
                          <img src={player.avatar} alt={player.name} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>
                            {player.name.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        {editingId === player.id ? (
                          <input 
                            type="text"
                            className="eva-input" style={{ width: '120px', padding: '0.25rem', fontWeight: 'normal' }}
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            {player.name}
                            {player.isPaused && (
                              <span 
                                className="text-xs px-2 py-0.5 rounded font-bold tracking-wider" 
                                style={{ backgroundColor: '#ff0055', color: 'white', boxShadow: '0 0 10px rgba(255,0,85,0.4)' }}
                              >
                                EN PAUSE
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    {isAdmin && (
                      <td>
                        {editingId === player.id ? (
                          <div className="flex items-center gap-2">
                            <input 
                              type="number" min="1" max="10" 
                              className="eva-input" style={{ width: '60px', padding: '0.25rem' }}
                              value={editLevel}
                              onChange={(e) => setEditLevel(e.target.value)}
                            />
                            <button onClick={() => saveEdit(player.id)} className="text-primary hover:text-white">
                              <Check size={18} />
                            </button>
                          </div>
                        ) : (
                          <span className="text-primary">{player.level} / 10</span>
                        )}
                      </td>
                    )}
                    <td>{player.matchesPlayed}</td>
                    <td className="text-right flex gap-2 justify-end items-center" style={{ minHeight: '48px' }}>
                      {isAdmin && (
                        <>
                          <label className="text-secondary hover:text-white transition-colors cursor-pointer mb-0" title="Uploader Icône">
                            <ImageIcon size={18} />
                            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleImageUpload(e, player.id)} />
                          </label>
                          <button 
                            onClick={() => onUpdate(player.id, { isPaused: !player.isPaused })} 
                            className={`transition-colors ${player.isPaused ? 'hover:scale-110' : 'hover:text-white'}`}
                            style={{ 
                              color: player.isPaused ? '#00ff88' : 'var(--secondary)',
                              filter: player.isPaused ? 'drop-shadow(0 0 5px rgba(0,255,136,0.6))' : 'none'
                            }}
                            title={player.isPaused ? "Reprendre (Actif)" : "Mettre en pause"}
                          >
                            {player.isPaused ? <PlayCircle size={22} /> : <PauseCircle size={18} />}
                          </button>
                          <button 
                            onClick={() => editingId === player.id ? saveEdit(player.id) : startEdit(player)} 
                            className="text-secondary hover:text-white transition-colors"
                            title="Modifier joueur"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button 
                            onClick={() => onDelete(player.id)} 
                            className="text-secondary hover:text-white transition-colors"
                            title="Supprimer joueur"
                          >
                            <Trash2 size={18} />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default PlayerList;
