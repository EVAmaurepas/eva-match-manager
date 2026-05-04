import { useState } from 'react';
import { UserPlus, Trash2, Edit2, Check } from 'lucide-react';

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
                  <th>Niveau</th>
                  <th>Matchs Joués</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {players.map(player => (
                  <tr key={player.id}>
                    <td className="font-bold">
                      {editingId === player.id ? (
                        <input 
                          type="text"
                          className="eva-input" style={{ width: '120px', padding: '0.25rem', fontWeight: 'normal' }}
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                        />
                      ) : (
                        player.name
                      )}
                    </td>
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
                    <td>{player.matchesPlayed}</td>
                    <td className="text-right flex gap-2 justify-end">
                      {isAdmin && (
                        <>
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
