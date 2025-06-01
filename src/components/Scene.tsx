import React, { useEffect, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, TransformControls, Grid } from '@react-three/drei';
import { useSceneStore } from '../store/sceneStore';
import * as THREE from 'three';

const VertexPoints = ({ geometry }) => {
  const { editMode, selectedElements, startVertexDrag } = useSceneStore();
  const positions = geometry.attributes.position;
  const vertices = [];
  
  for (let i = 0; i < positions.count; i++) {
    vertices.push(new THREE.Vector3(
      positions.getX(i),
      positions.getY(i),
      positions.getZ(i)
    ));
  }

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={vertices.length}
          array={new Float32Array(vertices.flatMap(v => [v.x, v.y, v.z]))}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.1} color="yellow" />
      {vertices.map((vertex, i) => (
        <mesh
          key={i}
          position={vertex}
          onClick={(e) => {
            e.stopPropagation();
            if (editMode === 'vertex') {
              startVertexDrag(i, vertex);
            }
          }}
        >
          <sphereGeometry args={[0.05]} />
          <meshBasicMaterial
            color={selectedElements.vertices.includes(i) ? 'red' : 'yellow'}
            transparent
            opacity={0.5}
          />
        </mesh>
      ))}
    </points>
  );
};

const EditModeOverlay = () => {
  const { scene, camera, raycaster, pointer } = useThree();
  const { 
    selectedObject, 
    editMode, 
    setSelectedElements,
    draggedVertex,
    updateVertexDrag,
    endVertexDrag
  } = useSceneStore();
  const plane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0)));
  const intersection = useRef(new THREE.Vector3());

  useEffect(() => {
    if (!selectedObject || !editMode || !(selectedObject instanceof THREE.Mesh)) return;

    const handlePointerMove = (event) => {
      if (draggedVertex) {
        raycaster.setFromCamera(pointer, camera);
        raycaster.ray.intersectPlane(plane.current, intersection.current);
        updateVertexDrag(intersection.current);
        return;
      }

      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObject(selectedObject);

      if (intersects.length > 0) {
        const intersect = intersects[0];
        if (editMode === 'vertex' && intersect.face) {
          const vertices = [
            intersect.face.a,
            intersect.face.b,
            intersect.face.c
          ];
          setSelectedElements('vertices', vertices);
        } else if (editMode === 'face' && intersect.face) {
          setSelectedElements('faces', [intersect.faceIndex || 0]);
        }
      }
    };

    const handlePointerUp = () => {
      if (draggedVertex) {
        endVertexDrag();
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [
    selectedObject,
    editMode,
    camera,
    raycaster,
    pointer,
    setSelectedElements,
    draggedVertex,
    updateVertexDrag,
    endVertexDrag
  ]);

  if (!selectedObject || !editMode || !(selectedObject instanceof THREE.Mesh)) return null;

  return (
    <>
      {editMode === 'vertex' && (
        <VertexPoints geometry={selectedObject.geometry} />
      )}
    </>
  );
};

const Scene: React.FC = () => {
  const { objects, selectedObject, setSelectedObject, transformMode } = useSceneStore();

  return (
    <Canvas
      camera={{ position: [5, 5, 5], fov: 75 }}
      className="w-full h-full bg-gray-900"
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      
      <Grid
        infiniteGrid
        cellSize={1}
        sectionSize={3}
        fadeDistance={30}
        fadeStrength={1}
      />

      {objects.map(({ object, visible, id }) => (
        visible && (
          <primitive
            key={id}
            object={object}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedObject(object);
            }}
          />
        )
      ))}

      {selectedObject && transformMode && (
        <TransformControls
          object={selectedObject}
          mode={transformMode}
        />
      )}

      <EditModeOverlay />
      <OrbitControls makeDefault />
    </Canvas>
  );
};

export default Scene;