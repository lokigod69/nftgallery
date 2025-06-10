import { Canvas } from '@react-three/fiber';
import { useTexture, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useMemo, Suspense } from 'react';

const NUM_PLANES = 100;
const SPHERE_RADIUS = 10;
const NFT_SOURCES = Array.from({ length: NUM_PLANES }, (_, i) => `/assets/room12/nft_${i}.jpg`);
const PLACEHOLDER = new THREE.MeshBasicMaterial({ color: '#777' });

// Fibonacci sphere generator
function fibonacciSpherePoints(count: number, radius: number): THREE.Vector3[] {
  const points = [];
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const radiusAtY = Math.sqrt(1 - y * y);
    const theta = goldenAngle * i;
    const x = Math.cos(theta) * radiusAtY;
    const z = Math.sin(theta) * radiusAtY;
    points.push(new THREE.Vector3(x, y, z).multiplyScalar(radius));
  }
  return points;
}

function NFTPlane({ idx, position }: { idx: number; position: THREE.Vector3 }) {
  const tex = useTexture(NFT_SOURCES[idx], (t) => (t.flipY = false));
  const material = tex ? new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }) : PLACEHOLDER;
  return (
    <mesh position={position} lookAt={[0, 0, 0]} material={material}>
      <planeGeometry args={[1, 1]} />
    </mesh>
  );
}

function GallerySphere() {
  const positions = useMemo(() => fibonacciSpherePoints(NUM_PLANES, SPHERE_RADIUS), []);
  return (
    <Suspense fallback={null}>
      {positions.map((pos, idx) => (
        <NFTPlane key={idx} idx={idx} position={pos} />
      ))}
    </Suspense>
  );
}

export default function Room12Scene() {
  return (
    <Canvas camera={{ position: [0, 0, 0.1], fov: 75 }}>
      <color attach="background" args={["#000"]} />
      <GallerySphere />
      <OrbitControls enableZoom={false} enablePan={false} />
    </Canvas>
  );
}
