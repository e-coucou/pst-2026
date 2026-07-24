'use client';

import { Canvas, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Grid, Text, Edges, GizmoHelper, GizmoViewport } from '@react-three/drei';
import { Suspense, useMemo, useState } from 'react';
import * as THREE from 'three';
import { residenceData } from '@/data/residence';

function Apartment({ data, selectedId, onSelect }: { data: any; selectedId: number | null; onSelect: (data: any) => void }) {
  const { config, building } = residenceData.residence;
  const sectionKey = data.section as keyof typeof building.sections;
  const s = building.sections[sectionKey];

  if (!s) return null;

  const isAvant = data.avant === "oui";
  const colWidth = (s as any).colWidth || config.gridColWidth;

  // Repères de profondeur partagés (façade / cour) — calculés une fois pour être réutilisés
  // aussi bien par renderBox que par une éventuelle extension "couloir nord" indépendante.
  const offsetAvant = isAvant ? config.avantOffset : 0;
  const faceAvantFacade = 0 + offsetAvant; // La façade commence ici
  const ligneDeSoudure = faceAvantFacade - config.facadeDepth; // La façade finit ICI et la cour commence ICI
  // Pour les studios Cour qui coulissent vers l'ARRIÈRE (le jardin) — ne s'applique pas
  // à un pan attaché de plain-pied (courNoSlope), qui doit rester collé à l'arrière de la façade.
  const offsetArriere = (isAvant && !data.courNoSlope) ? 2 * config.avantOffset : 0;
  const faceAvantCour = ligneDeSoudure - offsetArriere;

  const renderBox = (type: 'facade' | 'cour') => {
    const isCour = type === 'cour';
    const isUp = data.up !== "non";
    const isExtendLeft = data.extendLeft === "oui";
    const isExtendRight = data.extendRight === "oui";
    const yBase = data.row * config.gridRowHeight;
    // courNoSlope : le pan cour reste au même niveau que la façade (annexe de plain-pied,
    // ex: studio qui absorbe un couloir attenant), sans le décalage demi-étage habituel.
    const yOffset = (isCour && !data.courNoSlope) ? (isUp ? 1 : -1) * config.slopeOffsetMeters : 0;
    const height = data.rowSpan * config.gridRowHeight;
    const yFinal = yBase + yOffset + height / 2;

    // Certains appartements ont un arrière (cour) de largeur standard alors que
    // leur façade est élargie (ex: colSpan 1.5 + extendLeft) — colSpanCour permet
    // de surcharger la largeur uniquement côté cour, sans toucher à la façade.
    const hasCourOverride = isCour && data.colSpanCour !== undefined;
    const sideColSpan = hasCourOverride ? data.colSpanCour : (data.colSpan || 1);
    // Léger débordement vers l'extérieur côté cour (en mètres, indépendant de la grille de colonnes)
    const courExtraWidth = isCour ? (data.courExtraWidth || 0) : 0;
    const width = sideColSpan * colWidth + courExtraWidth;
    // colCour permet d'ancrer le pan cour sur une autre colonne que la façade
    // (ex: studio dont seule la moitié OUEST a un pan cour, cf. colCour: colonne+1).
    const sideCol = (isCour && data.colCour !== undefined) ? data.colCour : data.col;
    const xPos = (s as any).startX + ((s as any).leftMargin || 0) + (sideCol * colWidth) + (width / 2) - ((isExtendLeft && !hasCourOverride) ? colWidth / 2 : 0);

    // Certains "pans arrière" ne sont qu'un couloir (profondeur réduite), pas une vraie pièce côté cour.
    // courDepthMeters permet une profondeur explicite (ex: 3m d'un couloir absorbé), prioritaire sur les deux autres cas.
    // southCorridorExtra : allonge le bloc façade vers le Sud d'une profondeur de couloir (même
    // bloc, le front reste fixé sur la rue — donc même niveau, pas de décalage vertical).
    const depth = isCour
      ? (data.courDepthMeters ?? (data.corridorRear ? config.corridorDepth : config.courDepth))
      : config.facadeDepth + (data.southCorridorExtra ? config.corridorDepth : 0);

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

  // Extension "couloir nord" : pour un studio dont le corps principal est déjà côté cour
  // (ex: studio 20), l'inverse du cas 53 — un petit pan étroit, ancré sur le flanc OUEST
  // (largeur explicite en mètres, pas alignée sur la grille de colonnes) qui s'attache au
  // bord nord du corps existant et remonte vers la façade sur une profondeur de couloir.
  const renderNorthCorridor = () => {
    if (data.northCorridorWidthMeters === undefined) return null;

    const width = data.northCorridorWidthMeters;
    const westEdgeCol = data.col + (data.colSpan || 1); // col croissant = vers l'ouest (sectionB)
    // + courExtraWidth : le corps cour existant peut déjà déborder vers l'ouest (ex: 80cm) —
    // on aligne le pan nord sur ce même bord réel, pas sur le bord "de grille" sans débordement.
    const westEdgeX = (s as any).startX + ((s as any).leftMargin || 0) + westEdgeCol * colWidth + (data.courExtraWidth || 0);
    const xPos = westEdgeX - width / 2;

    const depth = data.northCorridorDepthMeters ?? config.corridorDepth;
    const yBase = data.row * config.gridRowHeight;
    const height = data.rowSpan * config.gridRowHeight;
    // Même niveau vertical que le corps cour existant : on reprend exactement le même calcul
    // de décalage (isUp / courNoSlope), sinon les deux pans se retrouvent décrochés l'un de l'autre.
    const isUp = data.up !== "non";
    const yOffset = data.courNoSlope ? 0 : (isUp ? 1 : -1) * config.slopeOffsetMeters;
    const yFinal = yBase + yOffset + height / 2;

    // Attaché au bord nord du corps cour existant (faceAvantCour), grandit vers +Z (Nord)
    const zPos = faceAvantCour + depth / 2;

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
          <meshStandardMaterial color={isSelected ? "#dc2626" : "#27272a"} transparent opacity={0.8} />
          <Edges color={isSelected ? "#ffffff" : "#f2f2fb"} threshold={15} />
        </mesh>

        <Text position={[0, 0, depth / 2 + 0.05]} fontSize={0.5} color="white" anchorX="center" anchorY="middle">
          {data.num}
        </Text>
      </group>
    );
  };

  return (
    <group>
      {(data.face === 'facade' || data.face === 'both') && renderBox('facade')}
      {(data.face === 'cour' || data.face === 'both') && renderBox('cour')}
      {renderNorthCorridor()}
    </group>
  );
}

// Calcule le mur OUEST (bord X le plus grand, façade uniquement) d'un appartement, dans le
// même repère que les boîtes rendues — sert à aligner des éléments externes (ex: piscine)
// sur un mur précis plutôt que sur une distance estimée.
function getWestWallX(aptId: number) {
  const { apartments, building, config } = residenceData.residence;
  const apt: any = apartments.find((a: any) => a.id === aptId);
  if (!apt) return 0;
  const sec: any = (building.sections as any)[apt.section];
  const colWidth = sec.colWidth || config.gridColWidth;
  const width = (apt.colSpan || 1) * colWidth;
  const isExtendLeft = apt.extendLeft === "oui";
  const xPos = sec.startX + (sec.leftMargin || 0) + (apt.col * colWidth) + width / 2 - (isExtendLeft ? colWidth / 2 : 0);
  return xPos + width / 2;
}

// --- PISCINE ---
// Repère identique aux appartements (X=0 = mur Est du bâtiment, +X = Ouest, Z=0 = ligne de
// façade, +Z = Nord). Placée au nord du bâtiment, à même le sol (dessus du bassin à Y=0).
// Fond en pente (peu profond à l'Est, profond à l'Ouest) : profil 2D extrudé sur la largeur,
// ce qui évite d'avoir à faire pivoter la forme (X local = longueur, Y local = profondeur,
// Z local = largeur → correspond directement aux axes du monde, sans rotation).
// Profondeur théorique à une distance X donnée depuis le bord Est, sur la pente globale du bassin.
function depthAtX(x: number, length: number, depthEast: number, depthWest: number) {
  return depthEast + (depthWest - depthEast) * (x / length);
}

// Profil 2D (longueur × profondeur) d'un morceau de bassin, avec profondeur de départ et de fin
// explicites — évite de refaire une interpolation fausse quand le morceau ne part pas de X=0.
function trapezoidShape(sectionLength: number, depthStart: number, depthEnd: number) {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.lineTo(0, -depthStart);
  s.lineTo(sectionLength, -depthEnd);
  s.lineTo(sectionLength, 0);
  s.lineTo(0, 0);
  return s;
}

function Pool() {
  const length = 32; // longueur (sens Est-Ouest), fixe
  const shiftEast = 5; // décalage supplémentaire vers l'Est (donc -X)
  const eastX = getWestWallX(9) - length - shiftEast;
  const nearZ = 8.5; // bord sud (le plus proche du bâtiment) : 8.5m au nord de la façade
  const width = 19; // largeur (sens Nord, vers l'extérieur)
  const depthEast = 1.6; // profondeur côté Est (petit bain)
  const depthWest = 3; // profondeur côté Ouest (grand bain)

  // Encoche à l'emplacement de la pataugeoire (angle Nord-Ouest du bassin) : 9m (Est-Ouest) ×
  // 5m (Nord-Sud) — un peu plus grande que la pataugeoire (6,5×3,2) pour laisser une plage
  // tout autour, comme sur la photo. À confirmer : "5m x 9m" interprété ainsi faute d'axe précisé.
  const notchLength = 9; // dimension Est-Ouest de l'encoche
  const notchWidth = 5; // dimension Nord-Sud de l'encoche

  const mainSectionLength = length - notchLength; // portion Est, pleine largeur
  const depthAtNotch = depthAtX(mainSectionLength, length, depthEast, depthWest);
  const mainShape = trapezoidShape(mainSectionLength, depthEast, depthAtNotch);
  const westStripShape = trapezoidShape(notchLength, depthAtNotch, depthWest);

  // Pataugeoire : mesurée sur la photo (repère des 19,34m) — ~6,6m × 3,2m, calée à
  // l'extrémité OUEST du bassin, flush avec le bord NORD, profondeur 50cm (demandée).
  const pataugeoireLength = 6.5;
  const pataugeoireWidth = 3.2;
  const pataugeoireDepth = 0.5;
  const poolWestX = eastX + length;
  const poolFarZ = nearZ + width;
  const pataugeoireX = poolWestX - pataugeoireLength / 2;
  const pataugeoireZ = poolFarZ - pataugeoireWidth / 2;

  // Nageurs : quelques silhouettes dispersées dans le grand bassin (loin de l'encoche/pataugeoire)
  const swimmers = [
    { dx: 6, dz: nearZ + 4, rot: 0.3, color: '#facc15' },
    { dx: 12, dz: nearZ + 12, rot: -0.6, color: '#ef4444' },
    { dx: 18, dz: nearZ + 7, rot: 1.4, color: '#22d3ee' },
    { dx: 8, dz: nearZ + 15, rot: -1.1, color: '#f97316' },
  ];

  return (
    <group>
      {/* Bloc principal : toute la largeur, mais s'arrête avant l'encoche (côté ouest) */}
      <mesh position={[eastX, 0, nearZ]}>
        <extrudeGeometry args={[mainShape, { depth: width, bevelEnabled: false }]} />
        <meshStandardMaterial color="#0ea5e9" transparent opacity={0.85} side={THREE.DoubleSide} />
        <Edges color="#7dd3fc" threshold={15} />
      </mesh>

      {/* Bande ouest, seulement sur la partie sud (sous l'encoche) */}
      <mesh position={[eastX + mainSectionLength, 0, nearZ]}>
        <extrudeGeometry args={[westStripShape, { depth: width - notchWidth, bevelEnabled: false }]} />
        <meshStandardMaterial color="#0ea5e9" transparent opacity={0.85} side={THREE.DoubleSide} />
        <Edges color="#7dd3fc" threshold={15} />
      </mesh>

      <mesh position={[pataugeoireX, -pataugeoireDepth / 2, pataugeoireZ]}>
        <boxGeometry args={[pataugeoireLength, pataugeoireDepth, pataugeoireWidth]} />
        <meshStandardMaterial color="#7dd3fc" transparent opacity={0.85} />
        <Edges color="#bae6fd" threshold={15} />
      </mesh>

      {swimmers.map((sw, i) => (
        <Swimmer key={i} x={eastX + sw.dx} z={sw.dz} rotationY={sw.rot} color={sw.color} />
      ))}
    </group>
  );
}

// --- TERRAIN DE BOULES ---
// Carré ocre/brun, hauteur 2cm, parfaitement aligné sur l'axe du bâtiment (pas de rotation),
// à ~35m au nord de la façade.
function TerrainDeBoules() {
  const size = 15;
  const height = 0.02;
  const centerX = 55; // position Est-Ouest approximative (poussé de 25m vers l'Ouest, à ajuster si besoin)
  const centerZ = 40; // ~40m au nord de la façade (35 + 5m vers le Nord)

  return (
    <group>
      <mesh position={[centerX, height / 2, centerZ]}>
        <boxGeometry args={[size, height, size]} />
        <meshStandardMaterial color="#92400e" />
        <Edges color="#c2843d" threshold={15} />
      </mesh>
      <Petanqueurs centerX={centerX} centerZ={centerZ} />
    </group>
  );
}

// --- PÉTANQUEURS ---
// Bonhommes stylisés (jambes, torse, bras, tête — + une boule en main en pose "tir"),
// dispersés sur le terrain de boules.
const SKIN_COLOR = "#e0ac69";

function Player({ x, z, rotationY, shirtColor, throwing = false }: {
  x: number; z: number; rotationY: number; shirtColor: string; throwing?: boolean;
}) {
  const legH = 0.45;
  const torsoH = 0.5;
  const headR = 0.13;
  const hipY = legH;
  const shoulderY = legH + torsoH * 0.85;

  return (
    <group position={[x, 0, z]} rotation={[0, rotationY, 0]}>
      {/* Jambes */}
      <mesh position={[-0.08, legH / 2, 0]}>
        <cylinderGeometry args={[0.055, 0.065, legH, 6]} />
        <meshStandardMaterial color="#27272a" />
      </mesh>
      <mesh position={[0.08, legH / 2, 0]}>
        <cylinderGeometry args={[0.055, 0.065, legH, 6]} />
        <meshStandardMaterial color="#27272a" />
      </mesh>

      {/* Torse (légèrement conique) */}
      <mesh position={[0, hipY + torsoH / 2, 0]}>
        <cylinderGeometry args={[0.16, 0.14, torsoH, 8]} />
        <meshStandardMaterial color={shirtColor} />
      </mesh>

      {/* Bras droit — tendu vers l'avant/bas en pose de tir, sinon le long du corps */}
      <group position={[0.2, shoulderY, 0]} rotation={[throwing ? -1.3 : -0.15, 0, 0.15]}>
        <mesh position={[0, -0.2, 0]}>
          <cylinderGeometry args={[0.045, 0.05, 0.4, 6]} />
          <meshStandardMaterial color={shirtColor} />
        </mesh>
        {throwing && (
          <mesh position={[0, -0.42, 0]}>
            <sphereGeometry args={[0.07, 10, 10]} />
            <meshStandardMaterial color="#a1a1aa" metalness={0.6} roughness={0.3} />
          </mesh>
        )}
      </group>

      {/* Bras gauche */}
      <group position={[-0.2, shoulderY, 0]} rotation={[0.1, 0, -0.15]}>
        <mesh position={[0, -0.2, 0]}>
          <cylinderGeometry args={[0.045, 0.05, 0.4, 6]} />
          <meshStandardMaterial color={shirtColor} />
        </mesh>
      </group>

      {/* Tête */}
      <mesh position={[0, hipY + torsoH + headR + 0.02, 0]}>
        <sphereGeometry args={[headR, 12, 12]} />
        <meshStandardMaterial color={SKIN_COLOR} />
      </mesh>
    </group>
  );
}

function Petanqueurs({ centerX, centerZ }: { centerX: number; centerZ: number }) {
  const players = [
    { dx: -4, dz: 3, rot: 0.4, color: '#dc2626', throwing: true },
    { dx: -2.2, dz: 4, rot: 0.6, color: '#a855f7', throwing: false },
    { dx: 3, dz: -2, rot: -2.4, color: '#f97316', throwing: true },
    { dx: 4.2, dz: -3.5, rot: -2.6, color: '#22c55e', throwing: false },
    { dx: -0.3, dz: -0.5, rot: 1.2, color: '#3b82f6', throwing: false },
    { dx: -3.4, dz: -3.8, rot: -1.1, color: '#eab308', throwing: false },
  ];

  return (
    <>
      {players.map((p, i) => (
        <Player key={i} x={centerX + p.dx} z={centerZ + p.dz} rotationY={p.rot} shirtColor={p.color} throwing={p.throwing} />
      ))}
    </>
  );
}

// --- NAGEURS ---
// Silhouette allongée (capsule) flottant à la surface de l'eau (Y≈0), tête à une extrémité.
function Swimmer({ x, z, rotationY, color }: { x: number; z: number; rotationY: number; color: string }) {
  return (
    <group position={[x, -0.12, z]} rotation={[0, rotationY, 0]}>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <capsuleGeometry args={[0.15, 0.85, 4, 8]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0.55, 0, 0]}>
        <sphereGeometry args={[0.13, 10, 10]} />
        <meshStandardMaterial color={SKIN_COLOR} />
      </mesh>
    </group>
  );
}

// --- BOUSSOLE ---
// Repère fixe dans la scène : +Z = Nord (façade, vers la rue), -Z = Sud (cour, vers le jardin),
// +X = Ouest, -X = Est. Fixe en coordonnées monde, donc tourne naturellement à l'écran avec l'orbite caméra.
// Lettres posées à plat sur le sol (normale vers le haut) : la caméra étant toujours au-dessus,
// on ne voit jamais leur "dos" (contrairement à des panneaux debout, inversés vus de l'arrière).
function Compass() {
  const r = 45;
  const flat = [-Math.PI / 2, 0, 0] as const;
  const labelProps = { fontSize: 3, rotation: flat, anchorX: 'center' as const, anchorY: 'middle' as const };

  return (
    <group position={[0, 0.15, 0]}>
      <Text position={[0, 0, r]} color="#dc2626" {...labelProps}>N</Text>
      <Text position={[0, 0, -r]} color="#a1a1aa" {...labelProps}>S</Text>
      <Text position={[-r, 0, 0]} color="#a1a1aa" {...labelProps}>E</Text>
      <Text position={[r, 0, 0]} color="#a1a1aa" {...labelProps}>O</Text>
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
            <Pool />
            <TerrainDeBoules />
          </group>
        </Suspense>

        <Grid
          infiniteGrid
          fadeDistance={150}
          sectionColor="#dc2626"
          cellColor= "#ffffff"
        />

        <Compass />

        {/* Gizmo de navigation en bas à droite : +X=Ouest, +Y=Haut, +Z=Nord */}
        <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
          <GizmoViewport labels={['O', 'Haut', 'N']} axisColors={['#a1a1aa', '#52525b', '#dc2626']} labelColor="black" />
        </GizmoHelper>

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