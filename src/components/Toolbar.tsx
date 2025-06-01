import React from 'react';
import { Cuboid, Cherry, Cylinder, Cone, Pyramid, Move, RotateCw, Maximize, Projector as Vector, Box, Link } from 'lucide-react';
import { useSceneStore } from '../store/sceneStore';
import * as THREE from 'three';

const Toolbar: React.FC = () => {
  const { 
    addObject, 
    setTransformMode, 
    transformMode, 
    setEditMode,
    editMode 
  } = useSceneStore();

  const createObject = (geometry: THREE.BufferGeometry, name: string) => {
    const material = new THREE.MeshStandardMaterial({ color: 0x44aa88 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(0, 0, 0);
    addObject(mesh, name);
  };

  const transformTools = [
    {
      icon: Move,
      mode: 'translate',
      title: 'Move Tool',
      type: 'transform'
    },
    {
      icon: RotateCw,
      mode: 'rotate',
      title: 'Rotate Tool',
      type: 'transform'
    },
    {
      icon: Maximize,
      mode: 'scale',
      title: 'Scale Tool',
      type: 'transform'
    },
  ] as const;

  const editTools = [
    {
      icon: Vector,
      mode: 'vertex',
      title: 'Edit Vertices',
      type: 'edit'
    },
    {
      icon: Link,
      mode: 'edge',
      title: 'Edit Edges',
      type: 'edit'
    },
    {
      icon: Box,
      mode: 'face',
      title: 'Edit Faces',
      type: 'edit'
    }
  ] as const;

  return (
    <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-2">
      <div className="flex flex-col gap-2">
        {/* 3D Shapes */}
        <div className="space-y-2 border-b border-gray-200 pb-2">
          <button
            onClick={() => createObject(new THREE.BoxGeometry(), 'Cube')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors w-full flex items-center gap-2"
            title="Add Cube"
          >
            <Cuboid className="w-5 h-5" />
            <span className="text-sm">Cube</span>
          </button>
          <button
            onClick={() => createObject(new THREE.SphereGeometry(0.5, 32, 32), 'Sphere')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors w-full flex items-center gap-2"
            title="Add Sphere"
          >
            <Cherry className="w-5 h-5" />
            <span className="text-sm">Sphere</span>
          </button>
          <button
            onClick={() => createObject(new THREE.CylinderGeometry(0.5, 0.5, 1, 32), 'Cylinder')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors w-full flex items-center gap-2"
            title="Add Cylinder"
          >
            <Cylinder className="w-5 h-5" />
            <span className="text-sm">Cylinder</span>
          </button>
          <button
            onClick={() => createObject(new THREE.ConeGeometry(0.5, 1, 32), 'Cone')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors w-full flex items-center gap-2"
            title="Add Cone"
          >
            <Cone className="w-5 h-5" />
            <span className="text-sm">Cone</span>
          </button>
          <button
            onClick={() => createObject(new THREE.TetrahedronGeometry(0.5), 'Tetrahedron')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors w-full flex items-center gap-2"
            title="Add Tetrahedron"
          >
            <Pyramid className="w-5 h-5" />
            <span className="text-sm">Tetrahedron</span>
          </button>
        </div>

        {/* Transform Tools */}
        <div className="space-y-2 border-b border-gray-200 pb-2">
          <div className="px-2 py-1">
            <h3 className="text-xs font-medium text-gray-500 uppercase">Transform</h3>
          </div>
          {transformTools.map(({ icon: Icon, mode, title }) => (
            <button
              key={mode}
              onClick={() => {
                setTransformMode(mode);
                setEditMode(null);
              }}
              className={`p-2 rounded-lg transition-colors w-full flex items-center gap-2 ${
                transformMode === mode && !editMode ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'
              }`}
              title={title}
            >
              <Icon className="w-5 h-5" />
              <span className="text-sm">{title}</span>
            </button>
          ))}
        </div>

        {/* Edit Tools */}
        <div className="space-y-2">
          <div className="px-2 py-1">
            <h3 className="text-xs font-medium text-gray-500 uppercase">Edit Mode</h3>
          </div>
          {editTools.map(({ icon: Icon, mode, title }) => (
            <button
              key={mode}
              onClick={() => {
                setEditMode(mode);
                setTransformMode(null);
              }}
              className={`p-2 rounded-lg transition-colors w-full flex items-center gap-2 ${
                editMode === mode ? 'bg-green-100 text-green-600' : 'hover:bg-gray-100'
              }`}
              title={title}
            >
              <Icon className="w-5 h-5" />
              <span className="text-sm">{title}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Toolbar;