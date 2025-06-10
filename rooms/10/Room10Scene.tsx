// Room 10 – Minimalist Cube Gallery
// Scaffold for @react-three/fiber scene
// Auto-generated from design specs

import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { OrbitControls, Reflector, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { Suspense, useMemo } from "react";

const ROOM_SIZE = 20;
const PANEL_SIZE = { x: 1.5, y: 2 };
const PANEL_SPACING = 3.5;
const PEDESTAL_TOP = 0.5;
const PEDESTAL_MIN = 0.5;
const PEDESTAL_MAX = 1.5;
const FLOOR_DISPLAY_SIZE = 1;
const DEFAULT_GREY = new THREE.MeshStandardMaterial({ color: "#777", roughness: 0.5 });

const DUMMY_NFTS = Array.from({ length: 40 }, (_, i) => `/assets/room10/nft_${i}.jpg`);

function usePanelPositions() {
  return useMemo(() => {
    const positions: [number, number, number][] = [];
    for (let x = -ROOM_SIZE / 2 + 3; x <= ROOM_SIZE / 2 - 3; x += PANEL_SPACING) {
      for (let z = -ROOM_SIZE / 2 + 3; z <= ROOM_SIZE / 2 - 3; z += PANEL_SPACING) {
        if (Math.abs(x) < 1.5 && Math.abs(z) < 1.5) continue;
        positions.push([x, PANEL_SIZE.y / 2, z]);
      }
    }
    return positions;
  }, []);
}

function usePedestalData() {
  return useMemo(() => {
    const data: { pos: [number, number, number]; h: number }[] = [];
    const count = 12;
    for (let i = 0; i < count; i++) {
      const x = THREE.MathUtils.randFloatSpread(ROOM_SIZE - 4);
      const z = THREE.MathUtils.randFloatSpread(ROOM_SIZE - 4);
      const h = THREE.MathUtils.randFloat(PEDESTAL_MIN, PEDESTAL_MAX);
      data.push({ pos: [x, h / 2, z], h });
    }
    return data;
  }, []);
}

function useFloorDisplayPositions() {
  return useMemo(() => {
    const positions: [number, number][] = [];
    const count = 10;
    for (let i = 0; i < count; i++) {
      positions.push([THREE.MathUtils.randFloatSpread(ROOM_SIZE - 4), THREE.MathUtils.randFloatSpread(ROOM_SIZE - 4)]);
    }
    return positions;
  }, []);
}

const WallShell = () => (
  <mesh position={[0, 0, 0]}>
    <boxGeometry args={[ROOM_SIZE, ROOM_SIZE, ROOM_SIZE]} />
    <meshStandardMaterial side={THREE.BackSide} color="#e0e0e0" roughness={0.9} metalness={0.05} />
  </mesh>
);

const ReflectiveFloor = () => (
  <Reflector
    args={[ROOM_SIZE, ROOM_SIZE]}
    resolution={1024}
    mirror={0.6}
    mixBlur={1}
    mixStrength={1}
    blur={[400, 100]}
    rotation={[-Math.PI / 2, 0, 0]}
  />
);

const Panel = ({ idx, position }: { idx: number; position: [number, number, number] }) => {
  const texture = useTexture(DUMMY_NFTS[idx % DUMMY_NFTS.length], (tx) => { tx.flipY = false; });
  const mat = texture ? new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }) : DEFAULT_GREY;
  return (
    <group position={position}>
      <mesh>
        <planeGeometry args={[PANEL_SIZE.x, PANEL_SIZE.y]} />
        <meshStandardMaterial attach="material" color="#555" emissive="#000" />
      </mesh>
      <mesh position={[0, 0, 0.01]} material={mat}>
        <planeGeometry args={[PANEL_SIZE.x - 0.1, PANEL_SIZE.y - 0.1]} />
      </mesh>
      <spotLight position={[0, 3, 0]} intensity={1.2} angle={0.45} castShadow />
    </group>
  );
};

const Pedestal = ({ idx, data }: { idx: number; data: { pos: [number, number, number]; h: number } }) => {
  const texture = useTexture(DUMMY_NFTS[(idx + 20) % DUMMY_NFTS.length], (tx) => (tx.flipY = false));
  const nftMat = texture ? new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }) : DEFAULT_GREY;
  return (
    <group position={data.pos}>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[PEDESTAL_TOP, data.h, PEDESTAL_TOP]} />
        <meshStandardMaterial color="#ffffff" roughness={0.4} metalness={0.05} />
      </mesh>
      <mesh position={[0, data.h / 2 + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} material={nftMat}>
        <planeGeometry args={[PEDESTAL_TOP - 0.02, PEDESTAL_TOP - 0.02]} />
      </mesh>
      <spotLight position={[0, data.h + 1, 0]} intensity={1} angle={0.5} />
    </group>
  );
};

const FloorDisplay = ({ idx, pos }: { idx: number; pos: [number, number] }) => {
  const yBelow = -0.26;
  const texture = useTexture(DUMMY_NFTS[(idx + 30) % DUMMY_NFTS.length], (tx) => (tx.flipY = false));
  const nftMat = texture ? new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }) : DEFAULT_GREY;
  return (
    <>
      <mesh position={[pos[0], 0.01, pos[1]]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[FLOOR_DISPLAY_SIZE, FLOOR_DISPLAY_SIZE]} />
        <meshPhysicalMaterial transparent opacity={0.15} roughness={0} metalness={0} transmission={1} thickness={0.02} />
      </mesh>
      <mesh position={[pos[0], yBelow, pos[1]]} rotation={[-Math.PI / 2, 0, 0]} material={nftMat}>
        <planeGeometry args={[FLOOR_DISPLAY_SIZE - 0.05, FLOOR_DISPLAY_SIZE - 0.05]} />
      </mesh>
      <spotLight position={[pos[0], 1, pos[1]]} intensity={0.8} angle={0.6} />
    </>
  );
};

export default function Room10Scene() {
  const panelPositions = usePanelPositions();
  const pedestalData = usePedestalData();
  const floorPositions = useFloorDisplayPositions();

  return (
    <Canvas shadowMap camera={{ position: [0, 2, 10], fov: 60 }}>
      <ambientLight intensity={0.3} />
      <WallShell />
      <ReflectiveFloor />
      <Suspense fallback={null}>
        {panelPositions.map((p, i) => (
          <Panel key={i} idx={i} position={p} />
        ))}
        {pedestalData.map((d, i) => (
          <Pedestal key={i} idx={i} data={d} />
        ))}
        {floorPositions.map((p, i) => (
          <FloorDisplay key={i} idx={i} pos={p} />
        ))}
      </Suspense>
      <OrbitControls makeDefault enablePan enableZoom enableRotate />
    </Canvas>
  );
}

