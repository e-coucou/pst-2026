'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Text, Edges } from '@react-three/drei';
import { Suspense, useMemo } from 'react';
import { residenceData } from '@/data/residence';

// Configuration extraite du JSON
const { config } = residenceData.residence;

function Apartment({ data }: { data: any }) {
  const { config, buildings } = residenceData.residence;

  const buildingKey = data.building as keyof typeof buildings;
  const b = buildings[buildingKey];

  // Calcul du X universel
  const x = b.startX + b.leftMargin + (data.col * b.colWidth);

  // Fonction pour générer un bloc (Mesh)
  const renderBlock = (faceType: 'facade' | 'cour', offsetZ: number, currentDepth: number, isLowered: boolean) => {
    const yBase = data.row * config.gridRowHeight;
    const yPos = isLowered ? yBase - config.slopeOffsetMeters : yBase;
    // On centre le mesh verticalement par rapport à sa hauteur
    const yFinal = yPos + (data.rowSpan * config.gridRowHeight) / 2;

    return (
      <mesh position={[x, yFinal, offsetZ]}>
        <boxGeometry args={[b.colWidth - 0.2, data.rowSpan * config.gridRowHeight - 0.1, currentDepth]} />
        <meshStandardMaterial 
          color={data.id === 13 ? "#dc2626" : "#27272a"} 
          transparent 
          opacity={0.7} 
        />
        <Edges color="white" threshold={15} opacity={0.3} />
      </mesh>
    );
  };

  // Logique de génération selon le type de face
  return (
    <group>
      {/* BLOC FAÇADE : si 'facade' ou 'both' */}
      {(data.face === 'facade' || data.face === 'both') && 
        renderBlock('facade', config.buildingDepth / 4, config.facadeDepth, false)
      }

      {/* BLOC COUR : si 'cour' ou 'both' */}
      {(data.face === 'cour' || data.face === 'both') && 
        renderBlock('cour', -config.buildingDepth / 4, config.courDepth, true)
      }
      
      {/* Optionnel : Ajout d'un numéro d'appartement flottant */}
      <Text position={[x, (data.row * config.gridRowHeight) + 2, 8]} fontSize={0.5} color="white">
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