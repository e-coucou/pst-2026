'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Text, Edges } from '@react-three/drei';
import { Suspense, useMemo } from 'react';
import { residenceData } from '@/data/residence';

function Apartment({ data }: { data: any }) {
  const { config, building } = residenceData.residence;
  const sectionKey = data.section as keyof typeof building.sections;
  const s = building.sections[sectionKey];

  if (!s) return null;

  const renderBox = (type: 'facade' | 'cour') => {
    const isCour = type === 'cour';
    const isUp = data.up !== "non";
    const isAvant = data.avant === "oui";
    const isExtendLeft = data.extendLeft === "oui";   
    const isExtendRight = data.extendRight === "oui";   
    const yBase = data.row * config.gridRowHeight;
    const yOffset = isCour ? (isUp ? 1 : -1) *config.slopeOffsetMeters : 0;
    const height = data.rowSpan * config.gridRowHeight;
    const yFinal = yBase + yOffset + height / 2;

    const colWidth = (s as any).colWidth || config.gridColWidth;
    const width = (data.colSpan || 1) * colWidth;
    const xPos = (s as any).startX + ((s as any).leftMargin || 0) + (data.col * colWidth) + (width / 2) - (isExtendLeft ? colWidth / 2 : 0);

    const avantOffset = isAvant ? config.avantOffset : 0;
//    const zPos = isCour ? 0 : config.courDepth +config.facadeDepth;
      const zPos = isCour ? (-config.facadeDepth - avantOffset) : avantOffset;  //config.facadeDepth : +config.facadeDepth ;
    const depth = isCour ? config.courDepth : config.facadeDepth;

    return (
      <group position={[xPos, yFinal, zPos]}>
        <mesh>
          <boxGeometry
            args={[width - 0.1, height - 0.1, depth]}
            attach="geometry"
            onUpdate={(self) => self.translate(0, 0, - depth / 2)} // Décale l'origine au bord                    
          />
          <meshStandardMaterial 
            color={data.id === 46 ? "#dc2626" : "#27272a"} 
            transparent 
            opacity={0.8} 
          />
          <Edges color={data.id === 46 ? "#ffffff" : "#f2f2fb"} threshold={15} />
        </mesh>

        {/* --- AJOUT DES NUMÉROS --- */}
        <Text
          position={[0, 0, depth / 2 + 0.05]} // Placé juste devant la face du cube
          fontSize={0.5}
          color="white"
          anchorX="center"
          anchorY="middle"
        >
          {data.num}
        </Text>
      </group>
    );
  };

  return (
    <group>
      {(data.face === 'facade' || data.face === 'both') && renderBox('facade')}
      {(data.face === 'cour' || data.face === 'both') && renderBox('cour')}
    </group>
  );
}
// --- LA PAGE PRINCIPALE ---
export default function RenderPage() {
  // Memoisation des appartements pour la performance
  const apartments = useMemo(() => residenceData.residence.apartments, []);

  return (
    <div className="w-full h-screen bg-[#09090b]">
      <Canvas camera={{ position: [50, 30, 50], fov: 35 }}>
        <color attach="background" args={['#09090b']} />
        
        <ambientLight intensity={0.7} />
        <pointLight position={[100, 100, 100]} intensity={1} />
        
        <Suspense fallback={null}>
          {/* Centrage du bâtiment (environ la moitié de 71m) */}
          <group position={[-35, 0, 0]}>
            {apartments.map((apt) => (
              <Apartment key={apt.id} data={apt} />
            ))}
          </group>
        </Suspense>

        <Grid 
          infiniteGrid 
          fadeDistance={150} 
          sectionColor="#dc2626" 
          cellColor= "#ffffff" 
        />
        <OrbitControls makeDefault />
      </Canvas>

      {/* Titre en overlay */}
      <div className="absolute top-8 left-8 pointer-events-none">
        <h1 className="text-4xl font-black italic text-white leading-none uppercase">
          Plan <span className="text-red-600">3D</span>
        </h1>
        <p className="text-zinc-500 font-bold text-xs uppercase tracking-widest mt-2">
          Génération dynamique PST-2026
        </p>
      </div>
    </div>
  );
}