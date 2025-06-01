import React, { useState } from 'react';
import { Eye, EyeOff, Trash2, Edit2 } from 'lucide-react';
import { useSceneStore } from '../store/sceneStore';

const LayersPanel: React.FC = () => {
  const { objects, removeObject, toggleVisibility, updateObjectName } = useSceneStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const startEditing = (id: string, name: string) => {
    setEditingId(id);
    setEditingName(name);
  };

  const saveEdit = () => {
    if (editingId && editingName.trim()) {
      updateObjectName(editingId, editingName.trim());
    }
    setEditingId(null);
  };

  return (
    <div className="absolute right-4 top-4 bg-white rounded-lg shadow-lg p-4 w-64">
      <h2 className="text-lg font-semibold mb-4">Layers</h2>
      <div className="space-y-2">
        {objects.map(({ id, name, visible }) => (
          <div key={id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
            {editingId === id ? (
              <input
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={saveEdit}
                onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                className="border rounded px-2 py-1 w-32"
                autoFocus
              />
            ) : (
              <span className="flex-1">{name}</span>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => editingId !== id && startEditing(id, name)}
                className="p-1 hover:text-blue-600"
                title="Rename"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => toggleVisibility(id)}
                className="p-1 hover:text-blue-600"
                title={visible ? 'Hide' : 'Show'}
              >
                {visible ? (
                  <Eye className="w-4 h-4" />
                ) : (
                  <EyeOff className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={() => removeObject(id)}
                className="p-1 hover:text-red-600"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LayersPanel;