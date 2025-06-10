// Room 11 — “Gravity-Defying Cube”
// A fresh scaffold implementing the flip-gravity concept.

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Instances, Instance } from "@react-three/drei";
import * as THREE from "three";
import { Suspense, useMemo, useRef, useState } from "react";

const CUBE_LEN = 15;
const GRID_RES = 15;
const TILE = CUBE_LEN / GRID_RES;
const HALF = CUBE_LEN / 2;

const GREY_MAT = new THREE.MeshStandardMaterial({ color: "#666", roughness: 0.4 });
// Placeholder texture sources. Replace with real images in /public/assets/room11
// when available.
const NFT_SOURCES = Array.from({ length: 60 }, (_, i) => `/assets/room11/nft_${i}.jpg`);

const FACE_TRANSFORMS = [
  { normal: new THREE.Vector3(0, 0, 1), rot: new THREE.Euler(0, Math.PI, 0) },
  { normal: new THREE.Vector3(0, 0, -1), rot: new THREE.Euler(0, 0, 0) },
  { normal: new THREE.Vector3(1, 0, 0), rot: new THREE.Euler(0, -Math.PI / 2, 0) },
  { normal: new THREE.Vector3(-1, 0, 0), rot: new THREE.Euler(0, Math.PI / 2, 0) },
  { normal: new THREE.Vector3(0, 1, 0), rot: new THREE.Euler(-Math.PI / 2, 0, 0) },
  { normal: new THREE.Vector3(0, -1, 0), rot: new THREE.Euler(Math.PI / 2, 0, 0) },
] as const;

type FaceIndex = 0 | 1 | 2 | 3 | 4 | 5;

function Face({ face }: { face: FaceIndex }) {
  // Initially all faces use a simple grey material. Texture loading will be
  // hooked up once assets are added to the repository.
  const mat = GREY_MAT;

  const positions = useMemo(() => {
    const arr: [number, number, number][] = [];
    for (let i = 0; i < GRID_RES; i++) {
      for (let j = 0; j < GRID_RES; j++) {
        arr.push([(i - GRID_RES / 2 + 0.5) * TILE, (j - GRID_RES / 2 + 0.5) * TILE, 0]);
      }
    }
    return arr;
  }, []);

  return (
    <group position={FACE_TRANSFORMS[face].normal.clone().multiplyScalar(HALF)} rotation={FACE_TRANSFORMS[face].rot}>
      <Instances limit={positions.length} material={mat} geometry={new THREE.PlaneGeometry(TILE, TILE)}>
        {positions.map((p, idx) => (
          <Instance key={idx} position={p as any} />
        ))}
      </Instances>
    </group>
  );
}

function useSimpleWASD(speed = 2) {
  const { camera } = useThree();
  const keys = useRef<{ [k: string]: boolean }>({});
  const [face, setFace] = useState<FaceIndex>(5);
  const container = useRef<THREE.Group>(null!);

  useMemo(() => {
    const down = (e: KeyboardEvent) => (keys.current[e.key.toLowerCase()] = true);
    const up = (e: KeyboardEvent) => (keys.current[e.key.toLowerCase()] = false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  useFrame((_, dt) => {
    const dir = new THREE.Vector3(
      (keys.current["d"] ? 1 : 0) - (keys.current["a"] ? 1 : 0),
      0,
      (keys.current["s"] ? 1 : 0) - (keys.current["w"] ? 1 : 0)
    );
    if (dir.lengthSq() > 0) {
      dir.normalize().applyEuler(container.current.rotation).multiplyScalar(speed * dt);
      container.current.position.add(dir);
    }

    if (Math.abs(container.current.position.x) > HALF) {
      const next: FaceIndex = container.current.position.x > 0 ? 2 : 3;
      rotateToFace(next);
    } else if (Math.abs(container.current.position.z) > HALF) {
      const next: FaceIndex = container.current.position.z > 0 ? 0 : 1;
      rotateToFace(next);
    } else if (Math.abs(container.current.position.y) > HALF) {
      const next: FaceIndex = container.current.position.y > 0 ? 4 : 5;
      rotateToFace(next);
    }
  });

  function rotateToFace(next: FaceIndex) {
    if (next === face) return;
    const prevNormal = FACE_TRANSFORMS[face].normal;
    const nextNormal = FACE_TRANSFORMS[next].normal;
    const quat = new THREE.Quaternion().setFromUnitVectors(prevNormal, nextNormal);
    container.current.quaternion.premultiply(quat);
    container.current.position.copy(nextNormal.clone().multiplyScalar(-HALF + 0.3));
    setFace(next);
  }

  return container;
}

function GravityGallery() {
  const player = useSimpleWASD();
  return (
    <group ref={player}>
      <Suspense fallback={null}>
        <Face face={0} />
        <Face face={1} />
        <Face face={2} />
        <Face face={3} />
        <Face face={4} />
        <Face face={5} />
      </Suspense>
    </group>
  );
}

export default function Room11Scene() {
  return (
    <Canvas shadows camera={{ position: [0, 0, HALF - 1], fov: 75 }}>
      <ambientLight intensity={0.4} />
      <pointLight position={[HALF, HALF, HALF]} intensity={0.6} distance={50} />
      <GravityGallery />
      {/* <OrbitControls makeDefault enablePan={false}/> */}
    </Canvas>
  );
}

