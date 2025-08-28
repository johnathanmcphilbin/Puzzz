import { Canvas, useFrame } from '@react-three/fiber';
import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

interface Coin3DProps {
  isFlipping: boolean;
  onFlipComplete?: (result: 'heads' | 'tails') => void;
}

function CoinMesh({ isFlipping, onFlipComplete }: Coin3DProps) {
  const coinRef = useRef<THREE.Group>(null);
  const flipProgress = useRef(0);
  const flipStarted = useRef(false);
  const flipComplete = useRef(false);

  useEffect(() => {
    if (isFlipping && !flipStarted.current) {
      flipStarted.current = true;
      flipComplete.current = false;
      flipProgress.current = 0;
    }

    if (!isFlipping) {
      flipStarted.current = false;
      flipComplete.current = false;
      flipProgress.current = 0;
    }
  }, [isFlipping]);

  useFrame((state, delta) => {
    if (!coinRef.current) return;

    if (flipStarted.current && !flipComplete.current) {
      // Flip animation - horizontal rotation around X axis
      flipProgress.current += delta * 8; // Speed of flip

      const rotationX = flipProgress.current * Math.PI;
      coinRef.current.rotation.x = rotationX;

      // Add some Y rotation for visual effect
      coinRef.current.rotation.y += delta * 2;

      // Bounce effect
      const bounceHeight = Math.sin(flipProgress.current * 4) * 0.5;
      coinRef.current.position.y = bounceHeight;

      // Complete flip after multiple rotations
      if (flipProgress.current > 4 && !flipComplete.current) {
        flipComplete.current = true;
        const result = Math.random() > 0.5 ? 'heads' : 'tails';

        // Final rotation to show result
        const finalRotation = result === 'heads' ? 0 : Math.PI;
        coinRef.current.rotation.x = finalRotation;
        coinRef.current.position.y = 0;

        if (onFlipComplete) {
          onFlipComplete(result);
        }
      }
    } else if (!isFlipping) {
      // Gentle rotation when not flipping
      coinRef.current.rotation.y += delta * 0.5;
    }
  });

  // Create coin geometry
  const coinGeometry = new THREE.CylinderGeometry(1, 1, 0.1, 32);

  // Materials for heads and tails
  const headsMaterial = new THREE.MeshPhongMaterial({
    color: 0xffd700,
    shininess: 100,
  });

  const tailsMaterial = new THREE.MeshPhongMaterial({
    color: 0xffea00,
    shininess: 100,
  });

  const edgeMaterial = new THREE.MeshPhongMaterial({
    color: 0xb8860b,
    shininess: 80,
  });

  return (
    <group ref={coinRef} position={[0, 0, 0]}>
      {/* Main coin body */}
      <mesh geometry={coinGeometry} material={edgeMaterial} />

      {/* Heads side (top) */}
      <mesh position={[0, 0.051, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1, 32]} />
        <primitive object={headsMaterial} attach="material" />
      </mesh>

      {/* Heads symbol */}
      <mesh position={[0, 0.052, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.3, 0.4, 8]} />
        <primitive
          object={new THREE.MeshPhongMaterial({ color: 0xb8860b })}
          attach="material"
        />
      </mesh>

      {/* Tails side (bottom) */}
      <mesh position={[0, -0.051, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1, 32]} />
        <primitive object={tailsMaterial} attach="material" />
      </mesh>

      {/* Tails symbol */}
      <mesh position={[0, -0.052, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.5, 0.6, 6]} />
        <primitive
          object={new THREE.MeshPhongMaterial({ color: 0xb8860b })}
          attach="material"
        />
      </mesh>
    </group>
  );
}

export function CoinFlip3D({ isFlipping, onFlipComplete }: Coin3DProps) {
  return (
    <div className="mx-auto h-32 w-32">
      <Canvas camera={{ position: [0, 0, 4], fov: 50 }}>
        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight
          position={[2, 2, 5]}
          intensity={1}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <pointLight position={[-2, 2, 2]} intensity={0.5} />

        {/* The coin */}
        <CoinMesh
          isFlipping={isFlipping}
          onFlipComplete={onFlipComplete || (() => {})}
        />
      </Canvas>
    </div>
  );
}
