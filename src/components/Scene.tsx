import React, { useEffect, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, TransformControls, Grid } from '@react-three/drei';
import { useSceneStore } from '../store/sceneStore';
import * as THREE from 'three';

const VertexPoints = ({ geometry }) => {
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
    </points>
  );
};

const EditModeOverlay = () => {
  const { scene, camera, raycaster, pointer } = useThree();
  const { selectedObject, editMode, setSelectedElements } = useSceneStore();

  useEffect(() => {
    if (!selectedObject || !editMode || !(selectedObject instanceof THREE.Mesh)) return;

    const handlePointerMove = () => {
      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObject(selectedObject);

      if (intersects.length > 0) {
        const intersection = intersects[0];
        if (editMode === 'vertex' && intersection.face) {
          const vertices = [
            intersection.face.a,
            intersection.face.b,
            intersection.face.c
          ];
          setSelectedElements('vertices', vertices);
        } else if (editMode === 'face' && intersection.face) {
          setSelectedElements('faces', [intersection.faceIndex || 0]);
        }
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    return () => window.removeEventListener('pointermove', handlePointerMove);
  }, [selectedObject, editMode, camera, raycaster, pointer, setSelectedElements]);

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