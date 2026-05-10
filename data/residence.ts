
export const residenceData = {
  "residence": {
    "name": "Résidence",
    "notes": [
      "Système de coordonnées : x = horizontal (façade), y = vertical (étage), z = profondeur (façade→cour)",
      "Chaque 'row' de la grille = 1.5m de hauteur. Un appartement standard = rowSpan:2 = 3m.",
      "Décalage de pente : le côté cour est 1.15m (≈1 row) plus bas que la façade (courRowOffset).",
      "face='facade' → côté rue | face='cour' → côté cour | face='both' → appartement traversant",
      "Les appartements avec occupantCour ont des noms différents côté cour (données des plans)"
    ],
    "config": {
      "gridRowHeight": 1.5,
      "gridColWidth": 5.2,
      "buildingDepth": 14.0,
      "facadeDepth": 5.5,
      "corridorDepth": 3.0,
      "courDepth": 5.5,
      "courRowOffset": 1,
      "slopeOffsetMeters": 1.15
    },
    "buildings": {
      "main": {
        "id": "main",
        "label": "Bâtiment principal",
        "startX": 0.0,
        "cols": 9,
        "colWidth": 5.2,
        "leftMargin": 1.4,
        "totalWidth": 48.2,
        "gridRows": 10,
        "comment": "9 colonnes × 5.2m + 1.4m de palier gauche. Coupe A à droite."
      },
      "wingB": {
        "id": "wingB",
        "label": "Aile B",
        "startX": 50.9,
        "cols": 4,
        "colWidth": 5.2,
        "leftMargin": 2.7,
        "totalWidth": 23.5,
        "gridRows": 10,
        "comment": "4 colonnes × 5.2m + 2.7m de séparation par rapport au bâtiment principal. Coupe B à droite."
      }
    },
    "commonAreas": [
      {
        "type": "palier",
        "label": "Palier / Escalier",
        "building": "main",
        "col": 0,
        "colSpan": 1,
        "row": 0,
        "rowSpan": 11,
        "face": "both",
        "widthM": 1.4,
        "comment": "Colonne de gauche, présente à tous les niveaux"
      },
      {
        "type": "ascenseur",
        "label": "Ascenseur",
        "building": "main",
        "col": 10,
        "colSpan": 1,
        "row": 0,
        "rowSpan": 1,
        "face": "both",
        "comment": "Cage ascenseur côté droit du bâtiment principal (colonne E du plan)"
      },
      {
        "type": "garages",
        "label": "Garages",
        "building": "main",
        "col": 1,
        "colSpan": 9,
        "row": 0,
        "rowSpan": 1,
        "face": "cour",
        "comment": "Niveau bas, côté cour, toute la largeur"
      },
      {
        "type": "chambres_de_bonne",
        "label": "Chambre de bonne",
        "building": "main",
        "col": 1,
        "colSpan": 9,
        "row": 1,
        "rowSpan": 2,
        "face": "cour",
        "comment": "Niveau bas côté cour, au-dessus des garages"
      },
      {
        "type": "palier",
        "label": "Palier / Escalier",
        "building": "wingB",
        "col": 0,
        "colSpan": 1,
        "row": 0,
        "rowSpan": 11,
        "face": "both",
        "widthM": 1.1
      },
      {
        "type": "ascenseur",
        "label": "Ascenseur",
        "building": "wingB",
        "col": 5,
        "colSpan": 1,
        "row": 0,
        "rowSpan": 1,
        "face": "both",
        "comment": "Colonne E de coupe AA/BB"
      },
      {
        "type": "caves",
        "label": "Caves",
        "building": "wingB",
        "col": 1,
        "colSpan": 2,
        "row": -1,
        "rowSpan": 1,
        "face": "both",
        "comment": "Sous-sol côté façade (coupe BB)"
      },
      {
        "type": "caves",
        "label": "Caves",
        "building": "wingB",
        "col": 3,
        "colSpan": 2,
        "row": -1,
        "rowSpan": 1,
        "face": "cour",
        "comment": "Sous-sol côté cour (coupe AA)"
      },
      {
        "type": "garage",
        "label": "Garage",
        "building": "wingB",
        "col": 3,
        "colSpan": 2,
        "row": 0,
        "rowSpan": 1,
        "face": "cour",
        "comment": "h=1.15m (demi-niveau, coupe AA)"
      },
      {
        "type": "chambres_de_bonne",
        "label": "Chambre de bonne",
        "building": "wingB",
        "col": 1,
        "colSpan": 2,
        "row": 0,
        "rowSpan": 1,
        "face": "cour",
        "comment": "Côté cour, niveau bas (coupe BB)"
      }
    ],
    "apartments": [

      // ============================================================
      // RDC — BÂTIMENT PRINCIPAL — Façade (row 0, rowSpan 1)
      // ============================================================
      {
        "id": 1, "num": "1", "occupant": "François Pozzo",
        "building": "main", "col": 1, "colSpan": 1, "row": 0, "rowSpan": 1, "face": "facade"
      },
      {
        "id": 2, "num": "2", "occupant": "Perruzi",
        "building": "main", "col": 2, "colSpan": 1, "row": 0, "rowSpan": 1, "face": "facade"
      },
      {
        "id": 3, "num": "3", "occupant": "Miniotte",
        "building": "main", "col": 3, "colSpan": 1, "row": 0, "rowSpan": 1, "face": "facade"
      },
      {
        "id": 4, "num": "4", "occupant": "Millian-Perrin",
        "building": "main", "col": 4, "colSpan": 1, "row": 0, "rowSpan": 1, "face": "facade"
      },
      {
        "id": 5, "num": "5", "occupant": "Bonhomme",
        "building": "main", "col": 5, "colSpan": 1, "row": 0, "rowSpan": 1, "face": "facade"
      },
      {
        "id": 6, "num": "6", "occupant": "Bonhomme",
        "building": "main", "col": 6, "colSpan": 1, "row": 0, "rowSpan": 1, "face": "facade"
      },
      {
        "id": 7, "num": "7", "occupant": "Chauvin",
        "building": "main", "col": 7, "colSpan": 1, "row": 0, "rowSpan": 1, "face": "facade"
      },
      {
        "id": 8, "num": "8", "occupant": "Seguin",
        "building": "main", "col": 8, "colSpan": 1, "row": 0, "rowSpan": 1, "face": "facade"
      },
      {
        "id": 9, "num": "9", "occupant": "Vahé",
        "building": "main", "col": 9, "colSpan": 1, "row": 0, "rowSpan": 1, "face": "both",
        "comment": "Colonne de jonction avec l'aile B"
      },

      // ============================================================
      // AILE B — RDC (row 1, rowSpan 1)
      // ============================================================
      {
        "id": 10, "num": "10", "occupant": "Mailian",
        "building": "wingB", "col": 1, "colSpan": 1, "row": 1, "rowSpan": 1, "face": "both"
      },
      {
        "id": 11, "num": "11", "occupant": "Mailian",
        "building": "wingB", "col": 2, "colSpan": 1, "row": 1, "rowSpan": 1, "face": "both"
      },
      {
        "id": 12, "num": "12", "occupant": "Casellas Bethuel",
        "building": "wingB", "col": 3, "colSpan": 1, "row": 1, "rowSpan": 1, "face": "both"
      },
      {
        "id": 13, "num": "13", "occupant": "Repetto Carboneschi",
        "building": "wingB", "col": 4, "colSpan": 1, "row": 1, "rowSpan": 1, "face": "both"
      },

      // ============================================================
      // 1er ÉTAGE — BÂTIMENT PRINCIPAL — Façade (rows 1-2, rowSpan 2)
      // Grands appartements larges (colSpan 2)
      // ============================================================
      {
        "id": 14, "num": "14", "occupant": "Strietz",
        "building": "main", "col": 1, "colSpan": 2, "row": 1, "rowSpan": 2, "face": "facade"
      },
      {
        "id": 15, "num": "15", "occupant": "Coquelet",
        "building": "main", "col": 3, "colSpan": 2, "row": 1, "rowSpan": 2, "face": "facade"
      },
      {
        "id": 16, "num": "16", "occupant": "d'Ousteau",
        "building": "main", "col": 5, "colSpan": 2, "row": 1, "rowSpan": 2, "face": "facade"
      },
      {
        "id": 17, "num": "17", "occupant": "Bazard",
        "building": "main", "col": 7, "colSpan": 2, "row": 1, "rowSpan": 2, "face": "facade"
      },
      {
        "id": 18, "num": "18", "occupant": "Benamou",
        "building": "main", "col": 9, "colSpan": 1, "row": 1, "rowSpan": 2, "face": "both",
        "comment": "Colonne de jonction avec l'aile B"
      },

      // ============================================================
      // AILE B — 1er ÉTAGE COUR UNIQUEMENT (rows 2-3, rowSpan 2)
      // Appartements côté cour seulement (19, 20)
      // ============================================================
      {
        "id": 19, "num": "19", "occupant": "Oliva",
        "building": "wingB", "col": 1, "colSpan": 2, "row": 2, "rowSpan": 2, "face": "cour"
      },
      {
        "id": 20, "num": "20", "occupant": "Palombo",
        "building": "wingB", "col": 3, "colSpan": 2, "row": 2, "rowSpan": 2, "face": "cour"
      },

      // ============================================================
      // 2ème ÉTAGE — BÂTIMENT PRINCIPAL — Traversants (rows 4-5)
      // row 3 = palier intermédiaire
      // ============================================================
      {
        "id": 21, "num": "21", "occupant": "Hyams Wikler", "occupantCour": "Arthur",
        "building": "main", "col": 1, "colSpan": 1, "row": 4, "rowSpan": 2, "face": "both",
        "comment": "Deux noms distincts façade/cour sur les plans"
      },
      {
        "id": 22, "num": "22", "occupant": "Cancel",
        "building": "main", "col": 2, "colSpan": 1, "row": 4, "rowSpan": 2, "face": "both"
      },
      {
        "id": 23, "num": "23", "occupant": "Coppola",
        "building": "main", "col": 3, "colSpan": 1, "row": 4, "rowSpan": 2, "face": "both"
      },
      {
        "id": 24, "num": "24", "occupant": "Milot-Mercet",
        "building": "main", "col": 4, "colSpan": 1, "row": 4, "rowSpan": 2, "face": "both"
      },
      {
        "id": 25, "num": "25", "occupant": "Chassagne",
        "building": "main", "col": 5, "colSpan": 1, "row": 4, "rowSpan": 2, "face": "both"
      },
      {
        "id": 26, "num": "26", "occupant": "Niederhauser",
        "building": "main", "col": 6, "colSpan": 1, "row": 4, "rowSpan": 2, "face": "both"
      },
      {
        "id": 27, "num": "27", "occupant": "Capitani",
        "building": "main", "col": 7, "colSpan": 1, "row": 4, "rowSpan": 2, "face": "both"
      },
      {
        "id": 28, "num": "28", "occupant": "Laberine",
        "building": "main", "col": 8, "colSpan": 1, "row": 4, "rowSpan": 2, "face": "both"
      },
      {
        "id": 29, "num": "29", "occupant": "Letexier",
        "building": "main", "col": 9, "colSpan": 1, "row": 4, "rowSpan": 2, "face": "both"
      },

      // ============================================================
      // AILE B — 1er ÉTAGE FAÇADE (rows 2-3, rowSpan 2)
      // row 4 = palier intermédiaire de l'aile B
      // ============================================================
      {
        "id": 30, "num": "30", "occupant": "RochedePins", "occupantCour": "Pipige",
        "building": "wingB", "col": 1, "colSpan": 1, "row": 2, "rowSpan": 2, "face": "both",
        "comment": "Deux noms distincts façade/cour sur les plans"
      },
      {
        "id": 31, "num": "31", "occupant": "Wissler",
        "building": "wingB", "col": 2, "colSpan": 1, "row": 2, "rowSpan": 2, "face": "both"
      },
      {
        "id": 32, "num": "32", "occupant": "Schumacher",
        "building": "wingB", "col": 3, "colSpan": 1, "row": 2, "rowSpan": 2, "face": "both"
      },
      {
        "id": 33, "num": "33", "occupant": "Smadja",
        "building": "wingB", "col": 4, "colSpan": 1, "row": 2, "rowSpan": 2, "face": "both"
      },

      // ============================================================
      // 3ème ÉTAGE — BÂTIMENT PRINCIPAL — Traversants (rows 6-7)
      // ============================================================
      {
        "id": 34, "num": "34", "occupant": "Montezin",
        "building": "main", "col": 1, "colSpan": 1, "row": 6, "rowSpan": 2, "face": "both"
      },
      {
        "id": 35, "num": "35", "occupant": "Prevot Arquin",
        "building": "main", "col": 2, "colSpan": 1, "row": 6, "rowSpan": 2, "face": "both"
      },
      {
        "id": 36, "num": "36", "occupant": "Donville",
        "building": "main", "col": 3, "colSpan": 1, "row": 6, "rowSpan": 2, "face": "both"
      },
      {
        "id": 37, "num": "37", "occupant": "Berthet",
        "building": "main", "col": 4, "colSpan": 1, "row": 6, "rowSpan": 2, "face": "both"
      },
      {
        "id": 38, "num": "38", "occupant": "Benamou",
        "building": "main", "col": 5, "colSpan": 1, "row": 6, "rowSpan": 2, "face": "both"
      },
      {
        "id": 39, "num": "39", "occupant": "Bresson",
        "building": "main", "col": 6, "colSpan": 1, "row": 6, "rowSpan": 2, "face": "both"
      },
      {
        "id": 40, "num": "40", "occupant": "Marcet",
        "building": "main", "col": 7, "colSpan": 1, "row": 6, "rowSpan": 2, "face": "both"
      },
      {
        "id": 41, "num": "41", "occupant": "Souchon",
        "building": "main", "col": 8, "colSpan": 1, "row": 6, "rowSpan": 2, "face": "both"
      },
      {
        "id": 42, "num": "42", "occupant": "Dumont-Maur",
        "building": "main", "col": 9, "colSpan": 1, "row": 6, "rowSpan": 2, "face": "both"
      },

      // ============================================================
      // AILE B — 2ème ÉTAGE (rows 5-6, rowSpan 2)
      // ============================================================
      {
        "id": 43, "num": "43", "occupant": "Onfray",
        "building": "wingB", "col": 1, "colSpan": 1, "row": 5, "rowSpan": 2, "face": "both"
      },
      {
        "id": 44, "num": "44", "occupant": "Jenny-Staub", "occupantCour": "Daniel",
        "building": "wingB", "col": 2, "colSpan": 1, "row": 5, "rowSpan": 2, "face": "both",
        "comment": "Deux noms distincts façade/cour sur les plans"
      },
      {
        "id": 45, "num": "45", "occupant": "Griffoul",
        "building": "wingB", "col": 3, "colSpan": 1, "row": 5, "rowSpan": 2, "face": "both"
      },
      {
        "id": 46, "num": "46", "occupant": "Tristan",
        "building": "wingB", "col": 4, "colSpan": 1, "row": 5, "rowSpan": 2, "face": "both"
      },

      // ============================================================
      // MEZZANINE COUR — BÂTIMENT PRINCIPAL (rows 7-8, rowSpan 2)
      // Appartements côté COUR uniquement, entre 3ème et 4ème étage
      // Rendu possible par le dénivelé de 1.15m de la parcelle
      // ============================================================
      {
        "id": 47, "num": "47", "occupant": "Courtial",
        "building": "main", "col": 1, "colSpan": 2, "row": 7, "rowSpan": 2, "face": "cour"
      },
      {
        "id": 48, "num": "48", "occupant": "Mireille",
        "building": "main", "col": 3, "colSpan": 2, "row": 7, "rowSpan": 2, "face": "cour"
      },
      {
        "id": 49, "num": "49", "occupant": "Bresson",
        "building": "main", "col": 5, "colSpan": 2, "row": 7, "rowSpan": 2, "face": "cour"
      },
      {
        "id": 50, "num": "50", "occupant": "Basso",
        "building": "main", "col": 7, "colSpan": 2, "row": 7, "rowSpan": 2, "face": "cour"
      },
      {
        "id": 51, "num": "51", "occupant": "xxxx",
        "building": "main", "col": 9, "colSpan": 1, "row": 7, "rowSpan": 2, "face": "cour",
        "comment": "Occupant non renseigné sur le plan (xxxx)"
      },

      // ============================================================
      // AILE B — 3ème ÉTAGE (rows 7-8, rowSpan 2)
      // Grands appartements doubles (colSpan 2)
      // ============================================================
      {
        "id": 52, "num": "52", "occupant": "Amster Wilhem",
        "building": "wingB", "col": 1, "colSpan": 2, "row": 7, "rowSpan": 2, "face": "facade"
      },
      {
        "id": 53, "num": "53", "occupant": "Trucchi",
        "building": "wingB", "col": 3, "colSpan": 2, "row": 7, "rowSpan": 2, "face": "both"
      },

      // ============================================================
      // 4ème ÉTAGE — BÂTIMENT PRINCIPAL — Traversants (rows 9-10)
      // row 8 = palier intermédiaire
      // ============================================================
      {
        "id": 54, "num": "54", "occupant": "Bellemin-Noel",
        "building": "main", "col": 1, "colSpan": 1, "row": 9, "rowSpan": 2, "face": "both"
      },
      {
        "id": 55, "num": "55", "occupant": "Barat",
        "building": "main", "col": 2, "colSpan": 1, "row": 9, "rowSpan": 2, "face": "both"
      },
      {
        "id": 56, "num": "56", "occupant": "Innebel",
        "building": "main", "col": 3, "colSpan": 1, "row": 9, "rowSpan": 2, "face": "both"
      },
      {
        "id": 57, "num": "57", "occupant": "Consorts",
        "building": "main", "col": 4, "colSpan": 1, "row": 9, "rowSpan": 2, "face": "both"
      },
      {
        "id": 58, "num": "58", "occupant": "Frealle",
        "building": "main", "col": 5, "colSpan": 1, "row": 9, "rowSpan": 2, "face": "both"
      },
      {
        "id": 59, "num": "59", "occupant": "Autin",
        "building": "main", "col": 6, "colSpan": 1, "row": 9, "rowSpan": 2, "face": "both"
      },
      {
        "id": 60, "num": "60", "occupant": "Lepersonne",
        "building": "main", "col": 7, "colSpan": 1, "row": 9, "rowSpan": 2, "face": "both"
      },
      {
        "id": 61, "num": "61", "occupant": "Mitsou Coste",
        "building": "main", "col": 8, "colSpan": 1, "row": 9, "rowSpan": 2, "face": "both"
      },
      {
        "id": 62, "num": "62", "occupant": "Griffoul",
        "building": "main", "col": 9, "colSpan": 1, "row": 9, "rowSpan": 2, "face": "both"
      },

      // ============================================================
      // AILE B — 4ème ÉTAGE / DERNIER (rows 9-10, rowSpan 2)
      // ============================================================
      {
        "id": 63, "num": "63", "occupant": "Peyron",
        "building": "wingB", "col": 1, "colSpan": 1, "row": 9, "rowSpan": 2, "face": "both"
      },
      {
        "id": 64, "num": "64", "occupant": "Morello",
        "building": "wingB", "col": 2, "colSpan": 1, "row": 9, "rowSpan": 2, "face": "both"
      },
      {
        "id": 65, "num": "65", "occupant": "Borgialli",
        "building": "wingB", "col": 3, "colSpan": 1, "row": 9, "rowSpan": 2, "face": "both"
      },
      {
        "id": 66, "num": "66", "occupant": "Charpin", "occupantCour": "Olivier",
        "building": "wingB", "col": 4, "colSpan": 1, "row": 9, "rowSpan": 2, "face": "both",
        "comment": "Deux noms distincts façade/cour sur les plans"
      }
    ],

    "derivedFormulas": {
      "description": "Formules pour calculer la boîte 3D de chaque appartement",
      "x": "building.startX + building.leftMargin + (col - 1) * colWidth",
      "y": "row * gridRowHeight",
      "z_facade": "0",
      "z_cour": "buildingDepth - courDepth",
      "z_both": "0",
      "width": "colSpan * colWidth",
      "height": "rowSpan * gridRowHeight",
      "depth_facade": "facadeDepth",
      "depth_cour": "courDepth",
      "depth_both": "buildingDepth"
    }
  }
}