import { create } from 'zustand';
import * as THREE from 'three';
import { NURBSSurface } from 'three/examples/jsm/curves/NURBSSurface';
import { NURBSCurve } from 'three/examples/jsm/curves/NURBSCurve';

type EditMode = 'vertex' | 'edge' | 'face' | 'normal' | null;

interface SceneState {
  objects: Array<{
    id: string;
    object: THREE.Object3D;
    name: string;
    visible: boolean;
  }>;
  selectedObject: THREE.Object3D | null;
  transformMode: 'translate' | 'rotate' | 'scale' | null;
  editMode: EditMode;
  selectedElements: {
    vertices: number[];
    edges: number[];
    faces: number[];
  };
  draggedVertex: {
    index: number;
    position: THREE.Vector3;
    initialPosition: THREE.Vector3;
    connectedVertices: Array<{
      index: number;
      initialPosition: THREE.Vector3;
      weight: number;
    }>;
  } | null;
  addObject: (object: THREE.Object3D, name: string) => void;
  removeObject: (id: string) => void;
  setSelectedObject: (object: THREE.Object3D | null) => void;
  setTransformMode: (mode: 'translate' | 'rotate' | 'scale' | null) => void;
  setEditMode: (mode: EditMode) => void;
  toggleVisibility: (id: string) => void;
  updateObjectName: (id: string, name: string) => void;
  updateObjectProperties: () => void;
  updateObjectColor: (color: string) => void;
  updateObjectOpacity: (opacity: number) => void;
  setSelectedElements: (type: 'vertices' | 'edges' | 'faces', indices: number[]) => void;
  startVertexDrag: (index: number, position: THREE.Vector3) => void;
  updateVertexDrag: (position: THREE.Vector3) => void;
  endVertexDrag: () => void;
}

export const useSceneStore = create<SceneState>((set, get) => ({
  objects: [],
  selectedObject: null,
  transformMode: null,
  editMode: null,
  selectedElements: {
    vertices: [],
    edges: [],
    faces: [],
  },
  draggedVertex: null,

  addObject: (object, name) =>
    set((state) => ({
      objects: [...state.objects, { id: crypto.randomUUID(), object, name, visible: true }],
    })),

  removeObject: (id) =>
    set((state) => ({
      objects: state.objects.filter((obj) => obj.id !== id),
      selectedObject: state.objects.find((obj) => obj.id === id)?.object === state.selectedObject
        ? null
        : state.selectedObject,
    })),

  setSelectedObject: (object) => set({ selectedObject: object }),
  setTransformMode: (mode) => set({ transformMode: mode }),
  setEditMode: (mode) => set({ editMode: mode }),

  toggleVisibility: (id) =>
    set((state) => {
      const updatedObjects = state.objects.map((obj) =>
        obj.id === id ? { ...obj, visible: !obj.visible } : obj
      );
      
      const toggledObject = updatedObjects.find((obj) => obj.id === id);
      
      const newSelectedObject = (toggledObject && !toggledObject.visible && toggledObject.object === state.selectedObject)
        ? null
        : state.selectedObject;

      return {
        objects: updatedObjects,
        selectedObject: newSelectedObject,
      };
    }),

  updateObjectName: (id, name) =>
    set((state) => ({
      objects: state.objects.map((obj) =>
        obj.id === id ? { ...obj, name } : obj
      ),
    })),

  updateObjectProperties: () => set((state) => ({ ...state })),

  updateObjectColor: (color) => 
    set((state) => {
      if (state.selectedObject instanceof THREE.Mesh) {
        const material = state.selectedObject.material as THREE.MeshStandardMaterial;
        material.color.setStyle(color);
        material.needsUpdate = true;
      }
      return state;
    }),

  updateObjectOpacity: (opacity) =>
    set((state) => {
      if (state.selectedObject instanceof THREE.Mesh) {
        const material = state.selectedObject.material as THREE.MeshStandardMaterial;
        material.transparent = opacity < 1;
        material.opacity = opacity;
        material.needsUpdate = true;
      }
      return state;
    }),

  setSelectedElements: (type, indices) =>
    set((state) => ({
      selectedElements: {
        ...state.selectedElements,
        [type]: indices,
      },
    })),

  startVertexDrag: (index, position) =>
    set((state) => {
      if (!(state.selectedObject instanceof THREE.Mesh)) return state;

      const geometry = state.selectedObject.geometry;
      const positions = geometry.attributes.position;
      const connectedVertices: Array<{ index: number; initialPosition: THREE.Vector3; weight: number }> = [];

      // Find connected vertices through faces
      if (geometry.index) {
        const indices = geometry.index.array;
        const vertexFaces = new Map<number, Set<number>>();
        
        // Build vertex-to-face map
        for (let i = 0; i < indices.length; i += 3) {
          const faceIndex = Math.floor(i / 3);
          for (let j = 0; j < 3; j++) {
            const vertexIndex = indices[i + j];
            if (!vertexFaces.has(vertexIndex)) {
              vertexFaces.set(vertexIndex, new Set());
            }
            vertexFaces.get(vertexIndex)!.add(faceIndex);
          }
        }

        // Find connected vertices through shared faces
        const connectedIndices = new Set<number>();
        const faces = vertexFaces.get(index) || new Set();
        faces.forEach(faceIndex => {
          for (let i = 0; i < 3; i++) {
            const vertexIndex = indices[faceIndex * 3 + i];
            if (vertexIndex !== index) {
              connectedIndices.add(vertexIndex);
            }
          }
        });

        // Calculate weights based on distance
        connectedIndices.forEach(vertexIndex => {
          const x = positions.getX(vertexIndex);
          const y = positions.getY(vertexIndex);
          const z = positions.getZ(vertexIndex);
          const connectedPosition = new THREE.Vector3(x, y, z);
          
          const distance = position.distanceTo(connectedPosition);
          const weight = 1 / (1 + distance);

          connectedVertices.push({
            index: vertexIndex,
            initialPosition: connectedPosition,
            weight
          });
        });
      }

      return {
        draggedVertex: {
          index,
          position: position.clone(),
          initialPosition: position.clone(),
          connectedVertices
        }
      };
    }),

  updateVertexDrag: (position) =>
    set((state) => {
      if (!state.draggedVertex || !(state.selectedObject instanceof THREE.Mesh)) return state;

      const geometry = state.selectedObject.geometry;
      const positions = geometry.attributes.position;
      
      // Calculate movement delta
      const delta = position.clone().sub(state.draggedVertex.initialPosition);
      
      // Update dragged vertex position
      positions.setXYZ(
        state.draggedVertex.index,
        state.draggedVertex.initialPosition.x + delta.x,
        state.draggedVertex.initialPosition.y + delta.y,
        state.draggedVertex.initialPosition.z + delta.z
      );

      // Update connected vertices with weighted movement
      state.draggedVertex.connectedVertices.forEach(({ index, initialPosition, weight }) => {
        const weightedDelta = delta.clone().multiplyScalar(weight);
        positions.setXYZ(
          index,
          initialPosition.x + weightedDelta.x,
          initialPosition.y + weightedDelta.y,
          initialPosition.z + weightedDelta.z
        );
      });

      positions.needsUpdate = true;
      geometry.computeVertexNormals();
      
      return {
        draggedVertex: {
          ...state.draggedVertex,
          position: position.clone()
        }
      };
    }),

  endVertexDrag: () => set({ draggedVertex: null }),
}));