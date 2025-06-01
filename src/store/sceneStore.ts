import { create } from 'zustand';
import * as THREE from 'three';
import { NURBSSurface } from 'three/examples/jsm/curves/NURBSSurface';
import { NURBSCurve } from 'three/examples/jsm/curves/NURBSCurve';

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
  } | null;
  controlPoints: THREE.Vector3[];
  nurbsObjects: {
    surfaces: NURBSSurface[];
    curves: NURBSCurve[];
  };
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
    set({
      draggedVertex: { index, position: position.clone() }
    }),
  updateVertexDrag: (position) =>
    set((state) => {
      if (!state.draggedVertex || !(state.selectedObject instanceof THREE.Mesh)) return state;

      const geometry = state.selectedObject.geometry;
      const positions = geometry.attributes.position;
      
      positions.setXYZ(
        state.draggedVertex.index,
        position.x,
        position.y,
        position.z
      );
      positions.needsUpdate = true;
      
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
    set((state) => ({
      controlPoints: [],
    })),
  createNURBSSurface: () => {
    const { controlPoints } = get();
    if (controlPoints.length >= 16) {
      const surface = new NURBSSurface(2, 2, 4, 4, controlPoints);
      set((state) => ({
        nurbsObjects: {
          ...state.nurbsObjects,
          surfaces: [...state.nurbsObjects.surfaces, surface],
        },
        controlPoints: [],
      }));
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
      set((state) => ({
        nurbsObjects: {
          ...state.nurbsObjects,
          curves: [...state.nurbsObjects.curves, curve],
        },
        controlPoints: [],
      }));
    }
  },
  extrudeFace: (distance) => {
    const { selectedObject, selectedElements } = get();
    if (selectedObject instanceof THREE.Mesh && selectedElements.faces.length > 0) {
      const geometry = selectedObject.geometry as THREE.BufferGeometry;
      geometry.computeVertexNormals();
      geometry.computeBoundingSphere();
    }
  },
  bevelEdge: (segments, offset) => {
    const { selectedObject, selectedElements } = get();
    if (selectedObject instanceof THREE.Mesh && selectedElements.edges.length > 0) {
      const geometry = selectedObject.geometry as THREE.BufferGeometry;
      geometry.computeVertexNormals();
      geometry.computeBoundingSphere();
    }
  },
}));