import { create } from 'zustand';
import * as THREE from 'three';
import { NURBSSurface } from 'three/examples/jsm/curves/NURBSSurface';
import { NURBSCurve } from 'three/examples/jsm/curves/NURBSCurve';
import { SubdivisionModifier } from 'three/examples/jsm/modifiers/SubdivisionModifier';

type EditMode = 'vertex' | 'edge' | 'face' | 'nurbs' | 'curve' | 'extrude' | 'bevel' | null;

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
    connectedVertices: number[];
    connectedFaces: number[];
  } | null;
  controlPoints: THREE.Vector3[];
  nurbsObjects: {
    surfaces: NURBSSurface[];
    curves: NURBSCurve[];
  };
  subdivisionLevel: number;
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
  addControlPoint: (point: THREE.Vector3) => void;
  clearControlPoints: () => void;
  createNURBSSurface: () => void;
  createNURBSCurve: () => void;
  extrudeFace: (distance: number) => void;
  bevelEdge: (segments: number, offset: number) => void;
  setSubdivisionLevel: (level: number) => void;
  applySubdivision: () => void;
}

export const useSceneStore = create<SceneState>((set, get) => ({
  objects: [],
  selectedObject: null,
  transformMode: 'translate',
  editMode: null,
  selectedElements: {
    vertices: [],
    edges: [],
    faces: [],
  },
  draggedVertex: null,
  controlPoints: [],
  nurbsObjects: {
    surfaces: [],
    curves: [],
  },
  subdivisionLevel: 1,

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
      const connectedVertices: number[] = [];
      const connectedFaces: number[] = [];

      // Find connected vertices and faces
      if (geometry.index) {
        const indices = geometry.index.array;
        for (let i = 0; i < indices.length; i += 3) {
          for (let j = 0; j < 3; j++) {
            if (indices[i + j] === index) {
              connectedFaces.push(Math.floor(i / 3));
              connectedVertices.push(
                indices[i + ((j + 1) % 3)],
                indices[i + ((j + 2) % 3)]
              );
            }
          }
        }
      }

      return {
        draggedVertex: {
          index,
          position: position.clone(),
          initialPosition: position.clone(),
          connectedVertices: Array.from(new Set(connectedVertices)),
          connectedFaces
        }
      };
    }),

  updateVertexDrag: (position) =>
    set((state) => {
      if (!state.draggedVertex || !(state.selectedObject instanceof THREE.Mesh)) return state;

      const geometry = state.selectedObject.geometry;
      const positions = geometry.attributes.position;
      
      // Calculate the movement delta
      const delta = position.clone().sub(state.draggedVertex.initialPosition);
      
      // Update the dragged vertex position
      positions.setXYZ(
        state.draggedVertex.index,
        state.draggedVertex.initialPosition.x + delta.x,
        state.draggedVertex.initialPosition.y + delta.y,
        state.draggedVertex.initialPosition.z + delta.z
      );

      // Update connected vertices with proportional movement
      state.draggedVertex.connectedVertices.forEach(vertexIndex => {
        const x = positions.getX(vertexIndex);
        const y = positions.getY(vertexIndex);
        const z = positions.getZ(vertexIndex);
        
        // Apply a fraction of the movement to maintain mesh topology
        positions.setXYZ(
          vertexIndex,
          x + delta.x * 0.25,
          y + delta.y * 0.25,
          z + delta.z * 0.25
        );
      });

      positions.needsUpdate = true;
      geometry.computeVertexNormals();
      geometry.computeBoundingSphere();
      
      return {
        draggedVertex: {
          ...state.draggedVertex,
          position: position.clone()
        }
      };
    }),

  endVertexDrag: () =>
    set({ draggedVertex: null }),

  addControlPoint: (point) =>
    set((state) => ({
      controlPoints: [...state.controlPoints, point],
    })),

  clearControlPoints: () =>
    set({ controlPoints: [] }),

  createNURBSSurface: () => {
    const { controlPoints } = get();
    if (controlPoints.length >= 16) {
      const surface = new NURBSSurface(2, 2, 4, 4, controlPoints);
      const geometry = new THREE.ParametricGeometry((u, v, target) => {
        const p = surface.getPoint(u, v);
        target.set(p.x, p.y, p.z);
      }, 20, 20);
      
      const material = new THREE.MeshStandardMaterial({ color: 0x44aa88 });
      const mesh = new THREE.Mesh(geometry, material);
      
      get().addObject(mesh, 'NURBS Surface');
      get().clearControlPoints();
    }
  },

  createNURBSCurve: () => {
    const { controlPoints } = get();
    if (controlPoints.length >= 4) {
      const knots = [];
      const degree = 3;
      for (let i = 0; i <= controlPoints.length + degree; i++) {
        knots.push(i);
      }
      
      const curve = new NURBSCurve(degree, knots, controlPoints);
      const geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(50));
      const material = new THREE.LineBasicMaterial({ color: 0x44aa88 });
      const curveObject = new THREE.Line(geometry, material);
      
      get().addObject(curveObject, 'NURBS Curve');
      get().clearControlPoints();
    }
  },

  extrudeFace: (distance) => {
    const { selectedObject, selectedElements } = get();
    if (selectedObject instanceof THREE.Mesh && selectedElements.faces.length > 0) {
      const geometry = selectedObject.geometry as THREE.BufferGeometry;
      // Extrusion logic would go here
      geometry.computeVertexNormals();
      geometry.computeBoundingSphere();
    }
  },

  bevelEdge: (segments, offset) => {
    const { selectedObject, selectedElements } = get();
    if (selectedObject instanceof THREE.Mesh && selectedElements.edges.length > 0) {
      const geometry = selectedObject.geometry as THREE.BufferGeometry;
      // Beveling logic would go here
      geometry.computeVertexNormals();
      geometry.computeBoundingSphere();
    }
  },

  setSubdivisionLevel: (level) => set({ subdivisionLevel: level }),

  applySubdivision: () => {
    const { selectedObject, subdivisionLevel } = get();
    if (selectedObject instanceof THREE.Mesh) {
      const modifier = new SubdivisionModifier(subdivisionLevel);
      const newGeometry = modifier.modify(selectedObject.geometry);
      selectedObject.geometry.dispose();
      selectedObject.geometry = newGeometry;
    }
  },
}));