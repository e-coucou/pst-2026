'use client';

import { Canvas, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Grid, Text, Edges } from '@react-three/drei';
import { Suspense, useMemo, useState } from 'react';
import { residenceData } from '@/data/residence';

function Apartment({ data, selectedId, onSelect }: { data: any; selectedId: number | null; onSelect: (data: any) => void }) {
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
    // Certains appartements ont un arrière (cour) de largeur standard alors que
    // leur façade est élargie (ex: colSpan 1.5 + extendLeft) — colSpanCour permet
    // de surcharger la largeur uniquement côté cour, sans toucher à la façade.
    const hasCourOverride = isCour && data.colSpanCour !== undefined;
    const sideColSpan = hasCourOverride ? data.colSpanCour : (data.colSpan || 1);
    const width = sideColSpan * colWidth;
    const xPos = (s as any).startX + ((s as any).leftMargin || 0) + (data.col * colWidth) + (width / 2) - ((isExtendLeft && !hasCourOverride) ? colWidth / 2 : 0);

    const depth = isCour ? config.courDepth : config.facadeDepth;
    const offsetAvant = isAvant ? config.avantOffset : 0;

    // 1. CALCUL DES FACES (BORDS) - Logique Linéaire
    const faceAvantFacade = 0 + offsetAvant; // La façade commence ici
    const ligneDeSoudure = faceAvantFacade - config.facadeDepth; // La façade finit ICI et la cour commence ICI
    
    // Pour les studios Cour qui coulissent vers l'ARRIÈRE (le jardin)
    const offsetArriere = (isCour && isAvant) ? 2*config.avantOffset : 0;
    const faceAvantCour = ligneDeSoudure - offsetArriere;

    // 2. POSITIONNEMENT DU CENTRE (zPos)
    // Three.js positionne le centre de l'objet. 
    // Centre = FaceAvant - (Profondeur / 2)
    let zPos = 0;
    if (!isCour) {
      zPos = faceAvantFacade - (depth / 2);
    } else {
      zPos = faceAvantCour - (depth / 2);
    }

    const isSelected = data.id === selectedId;

    return (
      <group position={[xPos, yFinal, zPos]}>
        <mesh
          onDoubleClick={(e: ThreeEvent<MouseEvent>) => {
            e.stopPropagation();
            onSelect(data);
          }}
        >
          <boxGeometry args={[width - 0.1, height - 0.1, depth]} />
          <meshStandardMaterial
            color={isSelected ? "#dc2626" : "#27272a"}
            transparent
            opacity={0.8}
          />
          <Edges color={isSelected ? "#ffffff" : "#f2f2fb"} threshold={15} />
        </mesh>

        <Text
          // Façade : face avant (vers la rue). Cour : face arrière extérieure (vers le jardin),
          // donc côté opposé + texte retourné pour rester lisible depuis l'extérieur.
          position={[0, 0, isCour ? -(depth / 2 + 0.05) : (depth / 2 + 0.05)]}
          rotation={isCour ? [0, Math.PI, 0] : [0, 0, 0]}
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
  const [selected, setSelected] = useState<any>(null);

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
              <Apartment key={apt.id} data={apt} selectedId={selected?.id ?? null} onSelect={setSelected} />
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

      {/* Titre / Fiche appartement en overlay */}
      <div className="absolute top-8 left-8 pointer-events-none max-w-sm">
        {selected ? (
          <>
            <h1 className="text-4xl font-black italic text-white leading-none uppercase">
              N°<span className="text-red-600">{selected.num}</span>
            </h1>
            <p className="text-zinc-300 font-bold text-sm uppercase tracking-widest mt-2">
              {selected.occupant}
              {selected.occupantCour && selected.occupantCour !== selected.occupant && (
                <span className="text-zinc-500"> / {selected.occupantCour} (cour)</span>
              )}
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="px-2 py-1 bg-zinc-800/80 text-zinc-300 text-[10px] font-black uppercase tracking-widest rounded-md">
                {selected.type === 'studio' ? 'Studio' : 'Appartement'}
              </span>
              <span className="px-2 py-1 bg-zinc-800/80 text-zinc-300 text-[10px] font-black uppercase tracking-widest rounded-md">
                {selected.face === 'both' ? 'Traversant' : selected.face === 'cour' ? 'Côté cour' : 'Côté façade'}
              </span>
              {selected.pos === 'haute' && (
                <span className="px-2 py-1 bg-zinc-800/80 text-zinc-300 text-[10px] font-black uppercase tracking-widest rounded-md">
                  Étage haut
                </span>
              )}
            </div>
          </>
        ) : (
          <>
            <h1 className="text-4xl font-black italic text-white leading-none uppercase">
              Plan <span className="text-red-600">3D</span>
            </h1>
            <p className="text-zinc-500 font-bold text-xs uppercase tracking-widest mt-2">
              Double-cliquez sur un appartement
            </p>
          </>
        )}
      </div>
    </div>
  );
}