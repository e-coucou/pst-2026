'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Text, Edges } from '@react-three/drei';
import { Suspense, useMemo } from 'react';
import { residenceData } from '@/data/residence';

// Configuration extraite du JSON
const { config } = residenceData.residence;

function Apartment({ data }: { data: any }) {
  // --- LOGIQUE DE POSITIONNEMENT (Basée sur tes formules JSON) ---
  
  // X : Horizontal (Colonnes)
  const x = data.col * config.gridColWidth;
  
  // Y : Vertical (Étage)
  // On calcule la base. Si c'est côté cour, on applique l'offset de pente (1.15m)
  const isCour = data.face === 'cour';
  const yBase = data.row * config.gridRowHeight;
  const yOffset = isCour ? -config.slopeOffsetMeters : 0;
  const y = yBase + yOffset + (data.rowSpan * config.gridRowHeight) / 2;

  // Z : Profondeur (Rue <-> Cour)
  let z = 0;
  let depth = config.buildingDepth;

  if (data.face === 'facade') {
    depth = config.facadeDepth;
    z = config.buildingDepth / 2 - depth / 2; // Positionné devant
  } else if (data.face === 'cour') {
    depth = config.courDepth;
    z = -config.buildingDepth / 2 + depth / 2; // Positionné derrière
  }
  // Si 'both', la profondeur reste buildingDepth et z reste 0 (centré)

  return (
    <group position={[x, y, z]}>
      <mesh>
        <boxGeometry args={[config.gridColWidth - 0.1, data.rowSpan * config.gridRowHeight - 0.1, depth - 0.1]} />
        {/* Style : Semi-transparent pour voir la structure */}
        <meshStandardMaterial 
          color={data.building === 'main' ? "#27272a" : "#3f3f46"} 
          transparent 
          opacity={0.6} 
        />
        {/* Contour néon pour le style PST */}
        <Edges color={data.id === 13 ? "#dc2626" : "#52525b"} threshold={15} />
      </mesh>

      {/* Petit texte flottant avec le numéro d'appartement */}
      <Text
        position={[0, 0, depth / 2 + 0.1]}
        fontSize={0.4}
        color="white"
//        font="/fonts/Geist-Bold.ttf" // Si tu as une police, sinon retire cette ligne
      >
        {data.num}
      </Text>
    </group>
  );
}

export default function RenderPage() {
  const apartments = useMemo(() => residenceData.residence.apartments, []);

  return (
    <div className="w-full h-screen bg-[#09090b]">
      <Canvas camera={{ position: [30, 20, 40], fov: 35 }}>
        <color attach="background" args={['#09090b']} />
        
        <ambientLight intensity={0.8} />
        <pointLight position={[100, 100, 100]} intensity={1} />
        
        <Suspense fallback={null}>
          <group position={[-25, 0, 0]}> {/* Centre le bâtiment dans la vue */}
            {apartments.map((apt) => (
              <Apartment key={apt.id} data={apt} />
            ))}
          </group>
        </Suspense>

        <Grid 
          infiniteGrid 
          fadeDistance={100} 
          sectionColor="#dc2626" 
          cellColor="#27272a" 
        />
        
        <OrbitControls makeDefault />
      </Canvas>

      {/* Overlay UI */}
      <div className="absolute top-8 left-8 pointer-events-none">
        <h1 className="text-4xl font-black italic text-white leading-none">
          PLAN <span className="text-red-600">3D</span>
        </h1>
        <p className="text-zinc-500 font-bold text-xs uppercase tracking-[0.3em] mt-2">
          Résidence Paris Saint-Tropez
        </p>
      </div>
    </div>
  );
}