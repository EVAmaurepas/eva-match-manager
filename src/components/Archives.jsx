import { useState } from 'react';
import { History, Calendar, Trash2, Eye, ChevronLeft } from 'lucide-react';
import MatchHistory from './MatchHistory';

function Archives({ archives, setArchives, isAdmin }) {
  const [selectedArchive, setSelectedArchive] = useState(null);

  if (selectedArchive) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <button 
            onClick={() => setSelectedArchive(null)}
            className="eva-button"
            style={{ padding: '0.5rem 1rem' }}
          >
            <ChevronLeft size={20} /> Retour
          </button>
          <div className="text-right">
            <h2 className="text-primary">{selectedArchive.name}</h2>
            <p className="text-sm opacity-60">
              {new Date(selectedArchive.date).toLocaleDateString('fr-FR', {
                day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
              })}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 md-grid-cols-1 gap-4 mb-4">
          <div className="eva-card text-center">
            <p className="text-xs opacity-50 uppercase tracking-widest mb-1">Joueurs</p>
            <p className="text-2xl font-bold text-primary">{selectedArchive.players.length}</p>
          </div>
          <div className="eva-card text-center">
            <p className="text-xs opacity-50 uppercase tracking-widest mb-1">Matchs</p>
            <p className="text-2xl font-bold text-secondary">{selectedArchive.matchHistory.length}</p>
          </div>
          <div className="eva-card text-center">
            <p className="text-xs opacity-50 uppercase tracking-widest mb-1">Total Points</p>
            <p className="text-2xl font-bold">
              {selectedArchive.players.reduce((sum, p) => sum + p.level, 0)}
            </p>
          </div>
        </div>

        <MatchHistory matchHistory={selectedArchive.matchHistory} />
      </div>
    );
  }

  if (!archives || archives.length === 0) {
    return (
      <div className="eva-card text-center py-12">
        <History size={64} className="mx-auto mb-4 text-secondary opacity-50" />
        <h2 className="text-xl mb-2">Aucune archive</h2>
        <p className="opacity-70">
          Les sessions réinitialisées et sauvegardées apparaîtront ici.
        </p>
      </div>
    );
  }

  const deleteArchive = (id) => {
    if (window.confirm("Supprimer cette archive définitivement ?")) {
      setArchives(archives.filter(a => a.id !== id));
    }
  };

  return (
    <div className="grid gap-6">
      <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold">
        <History className="text-primary" />
        Archives des Sessions ({archives.length})
      </h2>

      <div className="grid grid-cols-2 md-grid-cols-1 gap-4">
        {archives.map((archive) => (
          <div key={archive.id} className="eva-card flex justify-between items-center hover-glow" style={{ cursor: 'pointer' }} onClick={() => setSelectedArchive(archive)}>
            <div>
              <h3 className="text-lg text-primary">{archive.name}</h3>
              <p className="text-sm opacity-60 flex items-center gap-2">
                <Calendar size={14} />
                {new Date(archive.date).toLocaleDateString('fr-FR')}
              </p>
              <p className="text-xs opacity-50 mt-1">
                {archive.players.length} joueurs • {archive.matchHistory.length} matchs
              </p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={(e) => { e.stopPropagation(); setSelectedArchive(archive); }}
                className="eva-button"
                style={{ padding: '0.5rem', minWidth: 'auto' }}
                title="Voir"
              >
                <Eye size={18} />
              </button>
              {isAdmin && (
                <button 
                  onClick={(e) => { e.stopPropagation(); deleteArchive(archive.id); }}
                  className="eva-button secondary"
                  style={{ padding: '0.5rem', minWidth: 'auto' }}
                  title="Supprimer"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Archives;
