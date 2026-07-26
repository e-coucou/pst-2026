'use client';

import { Canvas, ThreeEvent, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, Text, Edges, GizmoHelper, GizmoViewport } from '@react-three/drei';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { residenceData } from '@/data/residence';
import { createClient } from '@/utils/supabase/client';

// Largeur/profondeur d'un pan (façade ou cour) d'un appartement — factorisé hors de Apartment
// pour être réutilisé tel quel par la fiche d'info (dimensions + surface estimée), sans risquer
// de dupliquer la formule et de la laisser diverger (cf. le bug CouloirCdB19a26/courExtraWidth).
function getApartmentBoxDims(data: any, type: 'facade' | 'cour', building: any, config: any) {
  const s: any = (building.sections as any)[data.section];
  if (!s) return null;
  const colWidth = s.colWidth || config.gridColWidth;
  const isCour = type === 'cour';

  const hasCourOverride = isCour && data.colSpanCour !== undefined;
  const sideColSpan = hasCourOverride ? data.colSpanCour : (data.colSpan || 1);
  const courExtraWidth = isCour ? (data.courExtraWidth || 0) : 0;
  const width = sideColSpan * colWidth + courExtraWidth;

  const depth = isCour
    ? (data.courDepthMeters ?? (data.corridorRear ? config.corridorDepth : config.courDepth))
    : config.facadeDepth + (data.southCorridorExtra ? config.corridorDepth : 0) + (data.extraSouthDepth || 0);

  return { width, depth };
}

// Fiche dimensions/surface d'un appartement sélectionné : un badge par pan existant (façade
// et/ou cour), largeur×profondeur en mètres, plus une surface totale estimée (somme des pans).
function ApartmentDimensions({ apt }: { apt: any }) {
  const { building, config } = residenceData.residence;
  const facade = (apt.face === 'facade' || apt.face === 'both') ? getApartmentBoxDims(apt, 'facade', building, config) : null;
  const cour = (apt.face === 'cour' || apt.face === 'both') ? getApartmentBoxDims(apt, 'cour', building, config) : null;
  const surface = (facade ? facade.width * facade.depth : 0) + (cour ? cour.width * cour.depth : 0);

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {facade && (
        <span className="px-2 py-1 bg-zinc-800/80 text-zinc-300 text-[10px] font-black uppercase tracking-widest rounded-md">
          Façade {facade.width.toFixed(1)}×{facade.depth.toFixed(1)}
        </span>
      )}
      {cour && (
        <span className="px-2 py-1 bg-zinc-800/80 text-zinc-300 text-[10px] font-black uppercase tracking-widest rounded-md">
          Cour {cour.width.toFixed(1)}×{cour.depth.toFixed(1)}
        </span>
      )}
      <span className="px-2 py-1 bg-red-600/20 text-red-400 text-[10px] font-black uppercase tracking-widest rounded-md">
        ≈ {surface.toFixed(1)} m²
      </span>
    </div>
  );
}

function Apartment({ data, selected, onSelect }: { data: any; selected: any; onSelect: (data: any) => void }) {
  const { config, building } = residenceData.residence;
  const sectionKey = data.section as keyof typeof building.sections;
  const s = building.sections[sectionKey];

  if (!s) return null;

  const isAvant = data.avant === "oui";
  const colWidth = (s as any).colWidth || config.gridColWidth;

  // Sélectionné directement, OU via un garage lié qui pointe vers cet appartement (lien
  // bidirectionnel garage <-> appartement, cf. linkedApartmentId sur les garages).
  const isSelected =
    (selected?.kind === 'apartment' && selected.id === data.id) ||
    (selected?.kind === 'garage' && selected.linkedApartmentId === data.id);
  const select = () => onSelect({ ...data, kind: 'apartment' });

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
    const { width, depth } = getApartmentBoxDims(data, type, building, config)!;
    // colCour permet d'ancrer le pan cour sur une autre colonne que la façade
    // (ex: studio dont seule la moitié OUEST a un pan cour, cf. colCour: colonne+1).
    const sideCol = (isCour && data.colCour !== undefined) ? data.colCour : data.col;
    const xPos = (s as any).startX + ((s as any).leftMargin || 0) + (sideCol * colWidth) + (width / 2) - ((isExtendLeft && !hasCourOverride) ? colWidth / 2 : 0);

    // 2. POSITIONNEMENT DU CENTRE (zPos)
    // Three.js positionne le centre de l'objet. 
    // Centre = FaceAvant - (Profondeur / 2)
    let zPos = 0;
    if (!isCour) {
      zPos = faceAvantFacade - (depth / 2);
    } else {
      zPos = faceAvantCour - (depth / 2);
    }

    return (
      <group position={[xPos, yFinal, zPos]}>
        <mesh
          onDoubleClick={(e: ThreeEvent<MouseEvent>) => {
            e.stopPropagation();
            select();
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

    return (
      <group position={[xPos, yFinal, zPos]}>
        <mesh
          onDoubleClick={(e: ThreeEvent<MouseEvent>) => {
            e.stopPropagation();
            select();
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

  // Extension arrière (appartements 21-29) : bloc plein calé sur la même emprise (largeur/X)
  // que le pan cour, de hauteur un demi étage (slopeOffsetMeters), juste EN DESSOUS du pan
  // cour (son sommet touche le bas du pan cour). Sa face nord est alignée avec la face nord
  // du pan cour (même faceAvantCour) : il occupe une tranche de la même profondeur, pas au-delà.
  const renderRearExtension = () => {
    if (data.rearExtensionDepth === undefined) return null;

    const isUp = data.up !== "non";
    const isExtendLeft = data.extendLeft === "oui";
    const yBase = data.row * config.gridRowHeight;
    const yOffsetCour = data.courNoSlope ? 0 : (isUp ? 1 : -1) * config.slopeOffsetMeters;
    const height = config.slopeOffsetMeters; // demi étage
    const yFinal = yBase + yOffsetCour - height / 2; // sommet du bloc = bas du pan cour

    const hasCourOverride = data.colSpanCour !== undefined;
    const sideColSpan = hasCourOverride ? data.colSpanCour : (data.colSpan || 1);
    const courExtraWidth = data.courExtraWidth || 0;
    const width = sideColSpan * colWidth + courExtraWidth;
    const sideCol = data.colCour !== undefined ? data.colCour : data.col;
    const xPos = (s as any).startX + ((s as any).leftMargin || 0) + (sideCol * colWidth) + (width / 2) - ((isExtendLeft && !hasCourOverride) ? colWidth / 2 : 0);

    const depth = data.rearExtensionDepth;
    // Face nord alignée avec la face nord du pan cour : le bloc s'étend vers le Sud à partir
    // de cette même limite (pas au-delà, vers la façade).
    const zPos = faceAvantCour - depth / 2;

    return (
      <group position={[xPos, yFinal, zPos]}>
        <mesh
          onDoubleClick={(e: ThreeEvent<MouseEvent>) => {
            e.stopPropagation();
            select();
          }}
        >
          <boxGeometry args={[width - 0.1, height - 0.1, depth]} />
          <meshStandardMaterial color={isSelected ? "#dc2626" : "#27272a"} transparent opacity={0.8} />
          <Edges color={isSelected ? "#ffffff" : "#f2f2fb"} threshold={15} />
        </mesh>
      </group>
    );
  };

  return (
    <group>
      {(data.face === 'facade' || data.face === 'both') && renderBox('facade')}
      {(data.face === 'cour' || data.face === 'both') && renderBox('cour')}
      {renderNorthCorridor()}
      {renderRearExtension()}
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

// Calcule le mur EST (bord X le plus petit) d'un appartement — pendant de getWestWallX, pour
// aligner un élément sur le bord opposé (ex: le bord de l'appartement 10 qui fait face au 9).
function getEastWallX(aptId: number) {
  const { apartments, building, config } = residenceData.residence;
  const apt: any = apartments.find((a: any) => a.id === aptId);
  if (!apt) return 0;
  const sec: any = (building.sections as any)[apt.section];
  const colWidth = sec.colWidth || config.gridColWidth;
  const width = (apt.colSpan || 1) * colWidth;
  const isExtendLeft = apt.extendLeft === "oui";
  const xPos = sec.startX + (sec.leftMargin || 0) + (apt.col * colWidth) + width / 2 - (isExtendLeft ? colWidth / 2 : 0);
  return xPos - width / 2;
}

// --- CHAMBRES DE BONNE (CdB 1 à 26) ---
// Data-driven depuis residenceData.residence.chambresDeBonne : chaque entrée référence son
// appartement/studio parent (parentId), sa position au sein de celui-ci (index / splitCount).
// CdB1-18 (parents 21-29, splitCount 2) et CdB19-26 (parents 19-20, splitCount 4) partagent
// exactement la même hauteur (1 étage), profondeur (courDepth - 1.5 - corridorDepth) et face
// Sud (= face sud du pan cour des appartements 21-29 / 30-33, mathématiquement identique dans
// les deux cas puisqu'aucun de ces appartements n'a "avant") — d'où la formule commune,
// indépendante du parent. Seuls le niveau (Y) et la position en X dépendent du parent.
function ChambresDeBonne({ selected, onSelect }: { selected: any; onSelect: (data: any) => void }) {
  const { config, building, apartments, chambresDeBonne } = residenceData.residence;

  const height = 2 * config.gridRowHeight; // 1 étage
  const roomDepth = config.courDepth - 1.5 - config.corridorDepth;
  const faceSudCour = 0 - config.facadeDepth - config.courDepth;
  const zCenter = faceSudCour + roomDepth / 2;

  return (
    <>
      {chambresDeBonne.map((cdb: any) => {
        const parent: any = apartments.find((a: any) => a.id === cdb.parentId);
        const sec: any = (building.sections as any)[parent.section];
        const colWidth = sec.colWidth || config.gridColWidth;
        // + courExtraWidth : le pan cour du parent peut déborder vers l'Ouest (ex: studio 20)
        // — sans ce terme, pas de décroché sur la façade arrière : la largeur cumulée des CdB
        // doit correspondre exactement à la largeur réelle (rendue) du studio/appartement parent.
        const parentWidth = colWidth * (parent.colSpan || 1) + (parent.courExtraWidth || 0);
        const roomWidth = parentWidth / cdb.splitCount;

        const yBase = parent.row * config.gridRowHeight;
        const isUp = parent.up !== "non";
        const yOffsetCour = (isUp ? 1 : -1) * config.slopeOffsetMeters;
        const yFinal = yBase + yOffsetCour - height / 2;

        const parentXStart = sec.startX + (sec.leftMargin || 0) + parent.col * colWidth;
        const xCenter = parentXStart + roomWidth * cdb.index + roomWidth / 2;

        const isSelected = selected?.kind === 'cdb' && selected.id === cdb.id;

        return (
          <group key={cdb.id} position={[xCenter, yFinal, zCenter]}>
            <mesh
              onDoubleClick={(e: ThreeEvent<MouseEvent>) => {
                e.stopPropagation();
                onSelect({ ...cdb, kind: 'cdb' });
              }}
            >
              <boxGeometry args={[roomWidth - 0.1, height - 0.1, roomDepth]} />
              <meshStandardMaterial color={isSelected ? "#dc2626" : "#27272a"} transparent opacity={0.8} />
              <Edges color={isSelected ? "#ffffff" : "#f2f2fb"} threshold={15} />
            </mesh>
            <Text
              position={[0, 0, -(roomDepth / 2 + 0.05)]}
              rotation={[0, Math.PI, 0]}
              fontSize={0.35}
              color="white"
              anchorX="center"
              anchorY="middle"
            >
              {`CdB${cdb.num}`}
            </Text>
          </group>
        );
      })}
    </>
  );
}

// --- GARAGES (G11 à G28) ---
// Data-driven depuis residenceData.residence.garages (même schéma parentId/index/splitCount
// que les CdB — un garage par CdB, même emprise en X, juste en dessous). Face Sud identique
// aux CdB ; face Nord calée contre la face sud des studios 1-9 (façade + southCorridorExtra +
// extraSouthDepth), d'où la profondeur dérivée. Chaque garage peut porter un linkedApartmentId
// (nullable) : si renseigné, double-cliquer le garage OU l'appartement lié illumine les deux en
// rouge (lien bidirectionnel — la réciproque est gérée côté Apartment).
function Garages({ selected, onSelect }: { selected: any; onSelect: (data: any) => void }) {
  const { config, building, apartments, garages } = residenceData.residence;

  const cdbHeight = 2 * config.gridRowHeight; // hauteur des CdB, pour caler le dessus des garages juste dessous
  const height = 2 * config.gridRowHeight; // 1 étage

  // Face nord = face sud des studios 1-9 (avant + facadeDepth + corridorDepth du southCorridorExtra + extraSouthDepth)
  const faceNord = config.avantOffset - (config.facadeDepth + config.corridorDepth + 1.5);
  // Face sud = face sud du pan cour (identique aux CdB)
  const faceSud = 0 - config.facadeDepth - config.courDepth;

  const depth = faceNord - faceSud;
  const zCenter = faceSud + depth / 2;

  return (
    <>
      {garages.map((g: any) => {
        const parent: any = apartments.find((a: any) => a.id === g.parentId);
        const sec: any = (building.sections as any)[parent.section];
        const colWidth = sec.colWidth || config.gridColWidth;
        const parentWidth = colWidth * (parent.colSpan || 1) + (parent.courExtraWidth || 0);
        const roomWidth = parentWidth / g.splitCount;

        const yBase = parent.row * config.gridRowHeight;
        const isUp = parent.up !== "non";
        const yOffsetCour = (isUp ? 1 : -1) * config.slopeOffsetMeters;
        const cdbBottom = yBase + yOffsetCour - cdbHeight; // base des CdB = sommet des garages
        const yFinal = cdbBottom - height / 2;

        const parentXStart = sec.startX + (sec.leftMargin || 0) + parent.col * colWidth;
        const xCenter = parentXStart + roomWidth * g.index + roomWidth / 2;

        const isSelected =
          (selected?.kind === 'garage' && selected.id === g.id) ||
          (selected?.kind === 'apartment' && g.linkedApartmentId === selected.id);

        return (
          <group key={g.id} position={[xCenter, yFinal, zCenter]}>
            <mesh
              onDoubleClick={(e: ThreeEvent<MouseEvent>) => {
                e.stopPropagation();
                onSelect({ ...g, kind: 'garage' });
              }}
            >
              <boxGeometry args={[roomWidth - 0.1, height - 0.1, depth]} />
              <meshStandardMaterial color={isSelected ? "#dc2626" : "#27272a"} transparent opacity={0.8} />
              <Edges color={isSelected ? "#ffffff" : "#f2f2fb"} threshold={15} />
            </mesh>
            <Text
              position={[0, 0, -(depth / 2 + 0.05)]}
              rotation={[0, Math.PI, 0]}
              fontSize={0.35}
              color="white"
              anchorX="center"
              anchorY="middle"
            >
              {`G${g.num}`}
            </Text>
          </group>
        );
      })}
    </>
  );
}

// --- COULOIR INTÉRIEUR (studios 47 à 51) ---
// Parallélépipède bleu matérialisant le couloir : même niveau (Y) que les studios 47-51,
// hauteur 1 étage, profondeur = largeur couloir standard (corridorDepth), flush contre la
// face nord du bloc cour de ces studios (même principe que renderNorthCorridor / l'extension
// arrière 21-29), sur toute la longueur cumulée des studios 47 à 51 (bord ouest du 47 au bord
// est du 51).
function CouloirStudios47a51() {
  const { config, building } = residenceData.residence;
  const s = building.sections.principale;
  const colWidth = s.colWidth || config.gridColWidth;

  const xWestEdge47 = s.startX + (s.leftMargin || 0) + 1 * colWidth; // bord ouest du 47 (col1)
  const xEastEdge51 = s.startX + (s.leftMargin || 0) + (9 + 1) * colWidth; // bord est du 51 (col9 + colSpan1)
  const width = xEastEdge51 - xWestEdge47;
  const xCenter = xWestEdge47 + width / 2;

  const row = 6;
  const yBase = row * config.gridRowHeight;
  const height = 2 * config.gridRowHeight; // 1 étage, même hauteur que les studios 47-51
  // avant="oui", pas de "up" (donc isUp=true par défaut), pas de courNoSlope — même niveau que les studios
  const yFinal = yBase + config.slopeOffsetMeters + height / 2;

  const depth = config.corridorDepth;
  // Face nord du bloc cour des studios 47-51 (avant="oui" → double offsetArriere)
  const faceAvantFacade = config.avantOffset;
  const ligneDeSoudure = faceAvantFacade - config.facadeDepth;
  const faceAvantCour = ligneDeSoudure - 2 * config.avantOffset;
  const zPos = faceAvantCour + depth / 2;

  return (
    <mesh position={[xCenter, yFinal, zPos]}>
      <boxGeometry args={[width - 0.1, height - 0.1, depth]} />
      <meshStandardMaterial color="#3b82f6" transparent opacity={0.8} />
      <Edges color="#93c5fd" threshold={15} />
    </mesh>
  );
}

// --- COULOIR INTÉRIEUR (studios 14 à 18) ---
// Identique au couloir des studios 47-51 (même largeur/profondeur=corridorDepth, même hauteur
// =1 étage, même longueur=46.8m sur les mêmes X). Seuls changent : le niveau (row2 au lieu de
// row6, studios "façade" donc pas d'offset cour) et le sens d'accroche — ces studios n'ayant
// qu'un bloc façade (pas de bloc cour), le couloir est flush contre la face SUD de ce bloc
// façade (la ligne de soudure) et s'étend encore vers le Sud, plutôt que flush contre une face
// nord de bloc cour en s'étendant vers le Nord.
function CouloirStudios14a18() {
  const { config, building } = residenceData.residence;
  const s = building.sections.principale;
  const colWidth = s.colWidth || config.gridColWidth;

  const xWestEdge14 = s.startX + (s.leftMargin || 0) + 1 * colWidth; // bord ouest du 14 (col1)
  const xEastEdge = s.startX + (s.leftMargin || 0) + (9 + 1) * colWidth; // même longueur que le couloir 47-51
  const width = xEastEdge - xWestEdge14;
  const xCenter = xWestEdge14 + width / 2;

  const row = 2;
  const yBase = row * config.gridRowHeight;
  const height = 2 * config.gridRowHeight; // 1 étage, identique au couloir 47-51
  // face="facade" : pas d'offset (le slope/décalage ne s'applique qu'au pan cour)
  const yFinal = yBase + height / 2;

  const depth = config.corridorDepth; // identique au couloir 47-51
  // Face sud du bloc façade des studios 14-18 (avant="oui" → faceAvantFacade = avantOffset)
  const faceAvantFacade = config.avantOffset;
  const ligneDeSoudure = faceAvantFacade - config.facadeDepth;
  const zPos = ligneDeSoudure - depth / 2;

  return (
    <mesh position={[xCenter, yFinal, zPos]}>
      <boxGeometry args={[width - 0.1, height - 0.1, depth]} />
      <meshStandardMaterial color="#3b82f6" transparent opacity={0.8} />
      <Edges color="#93c5fd" threshold={15} />
    </mesh>
  );
}

// --- COULOIR INTÉRIEUR (niveau des CdB, appartements 21-29) ---
// Identique aux deux précédents (largeur/profondeur=corridorDepth, hauteur=1 étage,
// longueur=46.8m sur les mêmes X que les CdB/l'extension arrière). Positionné au niveau des
// CdB (même yFinal/hauteur qu'elles). En Z, comble exactement l'espace laissé vacant entre
// l'extension arrière (1.5m, flush face nord du pan cour) et les CdB (flush face sud du pan
// cour) — c'est ce même "couloir" déjà comptabilisé dans le calcul de leur profondeur
// (courDepth - 1.5 - corridorDepth), ici enfin matérialisé.
function CouloirCdB21a29() {
  const { config, building } = residenceData.residence;
  const s = building.sections.principale;
  const colWidth = s.colWidth || config.gridColWidth;

  const xWestEdge21 = s.startX + (s.leftMargin || 0) + 1 * colWidth; // bord ouest du 21 (col1)
  const xEastEdge = s.startX + (s.leftMargin || 0) + (9 + 1) * colWidth; // même longueur que les couloirs précédents
  const width = xEastEdge - xWestEdge21;
  const xCenter = xWestEdge21 + width / 2;

  const row = 4;
  const yBase = row * config.gridRowHeight;
  const height = 2 * config.gridRowHeight; // 1 étage, identique aux précédents et aux CdB
  const yOffsetCour = -config.slopeOffsetMeters; // up="non" pour les appartements 21-29
  const yFinal = yBase + yOffsetCour - height / 2; // même niveau que les CdB

  const depth = config.corridorDepth; // identique aux précédents
  // Face nord du pan cour des appartements 21-29, puis face sud de l'extension arrière (1.5m)
  const faceAvantCour = 0 - config.facadeDepth;
  const rearExtensionSouthFace = faceAvantCour - 1.5;
  const zPos = rearExtensionSouthFace - depth / 2;

  return (
    <mesh position={[xCenter, yFinal, zPos]}>
      <boxGeometry args={[width - 0.1, height - 0.1, depth]} />
      <meshStandardMaterial color="#3b82f6" transparent opacity={0.8} />
      <Edges color="#93c5fd" threshold={15} />
    </mesh>
  );
}

// --- COULOIR INTÉRIEUR (studios 52 et 53) ---
// Même principe que CouloirStudios14a18 (studios façade, couloir flush contre la face SUD du
// bloc façade, même hauteur 1 étage, même profondeur=corridorDepth). Bord Est = bord Est du 52
// (col1, colSpan2.5, extendLeft). Bord Ouest : NE VA PAS jusqu'au bout du 53 — il bute sur
// l'extension en L du studio 53 (son pan cour à colCour=4, qui absorbe le couloir sur la
// moitié Ouest du 53, cf. courNoSlope+courDepthMeters:3 dans les données). Le couloir s'arrête
// donc au bord Est de cette extension (col4), pas au bord Ouest du 53 (qui irait jusqu'à col5).
function CouloirStudios52a53() {
  const { config, building } = residenceData.residence;
  const s = building.sections.sectionB;
  const colWidth = s.colWidth || config.gridColWidth;

  const xEastEdge = s.startX + (s.leftMargin || 0) + 1 * colWidth - colWidth / 2; // bord Est du 52 (extendLeft)
  const xWestEdge = s.startX + (s.leftMargin || 0) + 4 * colWidth; // bute ici sur l'extension en L du 53
  const width = xWestEdge - xEastEdge;
  const xCenter = xEastEdge + width / 2;

  const row = 7;
  const yBase = row * config.gridRowHeight;
  const height = 2 * config.gridRowHeight; // 1 étage
  const yFinal = yBase + height / 2; // façade : pas d'offset

  const depth = config.corridorDepth;
  const ligneDeSoudure = config.avantOffset - config.facadeDepth; // face sud du bloc façade (avant="oui")
  const zPos = ligneDeSoudure - depth / 2;

  return (
    <mesh position={[xCenter, yFinal, zPos]}>
      <boxGeometry args={[width - 0.1, height - 0.1, depth]} />
      <meshStandardMaterial color="#3b82f6" transparent opacity={0.8} />
      <Edges color="#93c5fd" threshold={15} />
    </mesh>
  );
}

// --- CAGE D'ESCALIER (1ère partie) ---
// Volume entre les appartements 9 et 10 tels qu'ils sont réellement rendus (leur bord réel
// diffère légèrement de la section "cageEscalier" déclarée dans les données — d'où l'usage de
// getWestWallX/getEastWallX plutôt que building.sections.cageEscalier). En hauteur : du bas de
// l'appartement 9 (row0, y=0) au bas du studio 18 (row2, y=2.3) — soit 1 étage. En profondeur :
// de la ligne "avant" (comme les appartements 9/18, tous deux avant="oui") à la façade sud du
// studio 18 (ligne de soudure) — soit la profondeur façade standard.
function CageEscalierPartie1() {
  const { config } = residenceData.residence;

  const xNearApt9 = getWestWallX(9);
  const xNearApt10 = getEastWallX(10);
  const width = xNearApt10 - xNearApt9;
  const xCenter = xNearApt9 + width / 2;

  const yBottom = 0 * config.gridRowHeight; // bas de l'appartement 9 (row0)
  const yTop = 2 * config.gridRowHeight; // bas du studio 18 (row2)
  const height = yTop - yBottom;
  const yFinal = yBottom + height / 2;

  const zNord = config.avantOffset; // ligne "avant" (appartement 9 / studio 18)
  const zSud = config.avantOffset - config.facadeDepth; // façade sud du studio 18
  const depth = zNord - zSud;
  const zPos = zNord - depth / 2;

  return (
    <mesh position={[xCenter, yFinal, zPos]}>
      <boxGeometry args={[width - 0.1, height - 0.1, depth]} />
      <meshStandardMaterial color="#27272a" transparent opacity={0.8} />
      <Edges color="#f2f2fb" threshold={15} />
    </mesh>
  );
}

// --- COULOIR (entre appartement 9 et appartement 10) ---
// Largeur = entre le bord réel de l'appartement 9 et le bord réel de l'appartement 10 (cf.
// getWestWallX/getEastWallX, plus fiable que la section "cageEscalier" déclarée). Profondeur =
// profondeur du studio 18 (avantOffset à la ligne de soudure, soit facadeDepth). Niveau = même
// niveau que l'appartement 9 (row0, hauteur 1 étage, pas d'offset — façade). Coïncide donc
// exactement avec CageEscalierPartie1, mais matérialisé ici en bleu comme un couloir (élément
// de circulation) plutôt qu'en gris (structure).
function CouloirCage9a10() {
  const { config } = residenceData.residence;

  const xNearApt9 = getWestWallX(9);
  const xNearApt10 = getEastWallX(10);
  const width = xNearApt10 - xNearApt9;
  const xCenter = xNearApt9 + width / 2;

  const row = 0; // niveau de l'appartement 9
  const yBase = row * config.gridRowHeight;
  const height = 2 * config.gridRowHeight; // hauteur de l'appartement 9 (rowSpan2)
  const yFinal = yBase + height / 2;

  const zNord = config.avantOffset;
  const zSud = config.avantOffset - config.facadeDepth; // profondeur du studio 18
  const depth = zNord - zSud;
  const zPos = zNord - depth / 2;

  return (
    <mesh position={[xCenter, yFinal, zPos]}>
      <boxGeometry args={[width - 0.1, height - 0.1, depth]} />
      <meshStandardMaterial color="#3b82f6" transparent opacity={0.8} />
      <Edges color="#93c5fd" threshold={15} />
    </mesh>
  );
}

// --- COULOIR (entre appartement 9 et appartement 10, prolongement Sud) ---
// Même largeur (X) que CouloirCage9a10, flush contre sa face Sud (avantOffset-facadeDepth) et
// s'étend encore vers le Sud sur une profondeur couloir standard (corridorDepth), plutôt que la
// profondeur du studio 18. Hauteur = 2 étages + 1/2 étage (au lieu d'1), même bas (y=0, niveau
// du 9).
function CouloirCage9a10Sud() {
  const { config } = residenceData.residence;

  const xNearApt9 = getWestWallX(9);
  const xNearApt10 = getEastWallX(10);
  const width = xNearApt10 - xNearApt9;
  const xCenter = xNearApt9 + width / 2;

  const yBottom = 0; // même bas que CouloirCage9a10 (niveau du 9)
  const height = 4 * config.gridRowHeight + config.slopeOffsetMeters; // 2 étages + 1/2 étage
  const yFinal = yBottom + height / 2;

  const zNord = config.avantOffset - config.facadeDepth; // face Sud de CouloirCage9a10
  const depth = config.corridorDepth; // profondeur couloir standard
  const zPos = zNord - depth / 2;

  return (
    <mesh position={[xCenter, yFinal, zPos]}>
      <boxGeometry args={[width - 0.1, height - 0.1, depth]} />
      <meshStandardMaterial color="#3b82f6" transparent opacity={0.8} />
      <Edges color="#93c5fd" threshold={15} />
    </mesh>
  );
}

// --- COULOIR (entre appartement 9 et appartement 10, prolongement) ---
// Même largeur (X) que les précédents. Descendu de 1/2 étage par rapport au sommet de
// CouloirCage9a10Sud (donc un recouvrement de 1/2 étage avec lui, plutôt qu'un empilement bord
// à bord), puis encore descendu de 2,5 étages supplémentaires ("bloc escalier"). En profondeur
// (Sud), flush contre la face Sud de CouloirCage9a10Sud, sur une dimension = 1 couloir
// (corridorDepth) + la profondeur du studio 19 (courDepth, son pan cour n'a pas de
// courDepthMeters spécifique). Hauteur totale = 5 étages.
function CouloirCage9a10Partie3() {
  const { config } = residenceData.residence;

  const xNearApt9 = getWestWallX(9);
  const xNearApt10 = getEastWallX(10);
  const width = xNearApt10 - xNearApt9;
  const xCenter = xNearApt9 + width / 2;

  const previousTop = 4 * config.gridRowHeight + config.slopeOffsetMeters; // sommet de CouloirCage9a10Sud
  const yBottom = previousTop - config.slopeOffsetMeters - 2.5 * 2 * config.gridRowHeight; // descendu de 1/2 étage, puis de 2,5 étages supplémentaires
  const height = 5 * 2 * config.gridRowHeight; // 5 étages
  const yFinal = yBottom + height / 2;

  const zNord = config.avantOffset - config.facadeDepth - config.corridorDepth; // face Sud de CouloirCage9a10Sud
  const depth = config.corridorDepth + config.courDepth; // 1 couloir + profondeur du studio 19
  const zPos = zNord - depth / 2;

  return (
    <mesh position={[xCenter, yFinal, zPos]}>
      <boxGeometry args={[width - 0.1, height - 0.1, depth]} />
      <meshStandardMaterial color="#3b82f6" transparent opacity={0.8} />
      <Edges color="#93c5fd" threshold={15} />
    </mesh>
  );
}

// --- COULOIR INTÉRIEUR (niveau des CdB, côté Ouest : CdB 19-26 sous les studios 19-20) ---
// Continuation vers l'Ouest de CouloirCdB21a29 : mêmes Y/Z/hauteur/profondeur (même niveau
// des CdB, même espace comblé entre l'extension arrière et les CdB), mais sur l'emprise en X
// des studios 19-20 (sectionB) pour desservir les CdB 19-26.
function CouloirCdB19a26() {
  const { config, building, apartments, chambresDeBonne } = residenceData.residence;
  const s = building.sections.sectionB;
  const colWidth = s.colWidth || config.gridColWidth;

  // Largeur = somme des largeurs réelles des CdB 19 à 26 (même formule que ChambresDeBonne) —
  // reste automatiquement synchro avec elles plutôt que de redériver la largeur des studios
  // 19-20 séparément (source d'un précédent désaccord après la correction de courExtraWidth).
  const group = chambresDeBonne.filter((cdb: any) => cdb.id >= 19 && cdb.id <= 26);
  const width = group.reduce((sum: number, cdb: any) => {
    const parent: any = apartments.find((a: any) => a.id === cdb.parentId);
    const parentWidth = colWidth * (parent.colSpan || 1) + (parent.courExtraWidth || 0);
    return sum + parentWidth / cdb.splitCount;
  }, 0);

  const xEastEdge = s.startX + (s.leftMargin || 0) + 1 * colWidth; // bord est (col1, studio 19 = CdB19)
  const xCenter = xEastEdge + width / 2;

  const row = 1; // row des studios 19-20
  const yBase = row * config.gridRowHeight;
  const height = 2 * config.gridRowHeight; // identique aux autres couloirs
  const yOffsetCour = config.slopeOffsetMeters; // pas de "up: non" sur les studios 19-20
  const yFinal = yBase + yOffsetCour - height / 2; // même niveau que les CdB 19-26

  const depth = config.corridorDepth; // identique aux autres couloirs
  const faceAvantCour = 0 - config.facadeDepth;
  const rearExtensionSouthFace = faceAvantCour - 1.5;
  const zPos = rearExtensionSouthFace - depth / 2;

  return (
    <mesh position={[xCenter, yFinal, zPos]}>
      <boxGeometry args={[width - 0.1, height - 0.1, depth]} />
      <meshStandardMaterial color="#3b82f6" transparent opacity={0.8} />
      <Edges color="#93c5fd" threshold={15} />
    </mesh>
  );
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

// --- SONDE DE COORDONNÉES (mode super uniquement) ---
// Raycast à chaque frame depuis la caméra vers le pointeur, contre toute la scène : remonte le
// point 3D survolé (repère LOCAL, cf. groupOffsetX — annule le décalage du <group position=
// {[-35,0,0]}> qui centre le bâtiment à l'écran, pour que X/Y/Z affichés correspondent aux
// mêmes coordonnées que celles utilisées dans les formules/résidence.ts). Facilite les
// indications ("mets ça à x=30, z=-8") sans avoir à redériver la position à la main.
function CoordinateProbe({ onHover, groupOffsetX }: { onHover: (p: { x: number; y: number; z: number } | null) => void; groupOffsetX: number }) {
  const last = useRef<{ x: number; y: number; z: number } | null>(null);
  useFrame(({ raycaster, camera, pointer, scene }) => {
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(scene.children, true).find((i) => (i.object as any).isMesh);
    const next = hit
      ? { x: Math.round((hit.point.x - groupOffsetX) * 100) / 100, y: Math.round(hit.point.y * 100) / 100, z: Math.round(hit.point.z * 100) / 100 }
      : null;
    const changed =
      (next === null) !== (last.current === null) ||
      (next && last.current && (next.x !== last.current.x || next.y !== last.current.y || next.z !== last.current.z));
    if (changed) {
      last.current = next;
      onHover(next);
    }
  });
  return null;
}

// --- LA PAGE PRINCIPALE ---
export default function RenderPage() {
  // Memoisation des appartements pour la performance
  const apartments = useMemo(() => residenceData.residence.apartments, []);
  const [selected, setSelected] = useState<any>(null);

  // Rôle utilisateur (pour le bouton flip/flop réservé au mode super)
  const [userRole, setUserRole] = useState<string | null>(null);
  // Flip/flop : masque le bâtiment (appartements, CdB, garages, piscine, terrain de boules) et
  // ne garde que les couloirs + la cage d'escalier
  const [onlyCorridors, setOnlyCorridors] = useState(false);

  // Gizmo de coordonnées (mode super) : point 3D survolé par le curseur
  const [hoverCoords, setHoverCoords] = useState<{ x: number; y: number; z: number } | null>(null);
  const groupOffsetX = -35; // doit rester synchro avec le <group position={[groupOffsetX, 0, 0]}> ci-dessous

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.rpc('get_my_role').then(({ data: role, error }) => {
        if (!error && role) setUserRole(role);
      });
    });
  }, []);

  return (
    <div className="relative w-full h-screen bg-[#09090b]">
      <Canvas camera={{ position: [50, 30, 50], fov: 35 }}>
        <color attach="background" args={['#09090b']} />

        <ambientLight intensity={0.7} />
        <pointLight position={[100, 100, 100]} intensity={1} />

        {userRole === 'super' && <CoordinateProbe onHover={setHoverCoords} groupOffsetX={groupOffsetX} />}

        <Suspense fallback={null}>
          {/* Centrage du bâtiment (environ la moitié de 71m) */}
          <group position={[groupOffsetX, 0, 0]}>
            {!onlyCorridors && apartments.map((apt) => (
              <Apartment key={apt.id} data={apt} selected={selected} onSelect={setSelected} />
            ))}
            {!onlyCorridors && (
              <>
                <Pool />
                <TerrainDeBoules />
                <ChambresDeBonne selected={selected} onSelect={setSelected} />
                <Garages selected={selected} onSelect={setSelected} />
              </>
            )}
            <CouloirStudios47a51 />
            <CouloirStudios14a18 />
            <CouloirStudios52a53 />
            <CageEscalierPartie1 />
            <CouloirCage9a10 />
            <CouloirCage9a10Sud />
            <CouloirCage9a10Partie3 />
            <CouloirCdB21a29 />
            <CouloirCdB19a26 />
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

      {/* Flip/flop couloirs+escalier seul (réservé au mode super) */}
      {userRole === 'super' && (
        <div className="absolute top-8 right-8">
          <button
            onClick={() => setOnlyCorridors((v) => !v)}
            className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-lg ${
              onlyCorridors
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            {onlyCorridors ? 'Bâtiment masqué' : 'Masquer le bâtiment'}
          </button>
        </div>
      )}

      {/* Titre / Fiche + gizmo de coordonnées, empilés en haut à gauche */}
      <div className="absolute top-8 left-8 pointer-events-none max-w-sm flex flex-col gap-3">
      {userRole === 'super' && (
        <div className="inline-flex gap-3 px-3 py-2 rounded-lg bg-zinc-900/80 border border-zinc-700/50 font-mono text-xs font-bold w-fit">
          <span className="text-zinc-500">X</span>
          <span className="text-white">{hoverCoords ? hoverCoords.x.toFixed(2) : '—'}</span>
          <span className="text-zinc-500">Y</span>
          <span className="text-white">{hoverCoords ? hoverCoords.y.toFixed(2) : '—'}</span>
          <span className="text-zinc-500">Z</span>
          <span className="text-white">{hoverCoords ? hoverCoords.z.toFixed(2) : '—'}</span>
        </div>
      )}
      <div>
        {selected?.kind === 'cdb' ? (
          <>
            <h1 className="text-4xl font-black italic text-white leading-none uppercase">
              CdB<span className="text-red-600">{selected.num}</span>
            </h1>
            <p className="text-zinc-500 font-bold text-xs uppercase tracking-widest mt-2">
              Chambre de bonne
            </p>
          </>
        ) : selected?.kind === 'garage' ? (
          <>
            <h1 className="text-4xl font-black italic text-white leading-none uppercase">
              G<span className="text-red-600">{selected.num}</span>
            </h1>
            <p className="text-zinc-500 font-bold text-xs uppercase tracking-widest mt-2">
              Garage
              {selected.linkedApartmentId != null && (
                <span className="text-red-500"> ↔ Appartement {selected.linkedApartmentId}</span>
              )}
            </p>
          </>
        ) : selected ? (
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
            <ApartmentDimensions apt={selected} />
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
    </div>
  );
}