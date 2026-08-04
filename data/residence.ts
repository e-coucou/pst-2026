export const residenceData = {
  "residence": {
    "name": "Résidence",
    "architecture": "Style Le Corbusier, années 1950",
    "notes": [
      "UN SEUL BÂTIMENT en deux sections séparées par la cage d'escalier principale (2.7m).",
      "Système de grille : gridRowHeight=1.5m, gridColWidth=5.2m.",
      "Appartements standards = rowSpan:2 = 3m de hauteur.",
      "Les STUDIOS sont au niveau des couloirs intérieurs (Le Corbusier) : mono-face, rowSpan:2.",
      "Studios façade : 14-18 (section principale), 52-53 (section B)",
      "Studios cour   : 47-51 (section principale), 19-20 (section B)",
      "face=facade : côté rue | face=cour : côté cour | face=both : appartement traversant",
      "Les rows 3 et 8 (section principale) sont les couloirs intérieurs.",
      "occupantCour : nom différent relevé côté cour sur les plans (à confirmer)"
    ],
    "config": {
      "gridRowHeight": 1.15,
      "gridColWidth": 1.2,
      "buildingDepth": 213.0,
      "facadeDepth": 5.8,
      "corridorDepth": 1.3,
      "stepDepth": 1.77,
      "stepWidth": 0.85,
      "courDepth": 6.35,
      "slopeOffsetMeters": 1.15,
      "courRowOffset": 1.3,
      "avantOffset": 1.3,
      "studioFacadeDepth": 4.3,
      "studioCourDepth": 5.8+1.3
    },
    "building": {
      "id": "batiment_unique",
      "label": "Bâtiment unique",
      "totalWidth": 71.7,
      "sections": {
        "principale": {
          "id": "principale",
          "label": "Section principale",
          "startX": 0.0,
          "cols": 9,
          "colWidth": 5.2,
          "leftMargin": 1.4,
          "width": 48.2,
          "gridRows": 10
        },
        "cageEscalier": {
          "id": "cageEscalier",
          "label": "Cage d'escalier principale",
          "startX": 48.2,
          "width": 2.7,
          "comment": "Circulation verticale principale. N'est PAS un second bâtiment."
        },
        "sectionB": {
          "id": "sectionB",
          "label": "Section B",
          "startX": 50.9,
          "cols": 4,
          "colWidth": 5.2,
          "leftMargin": 0.0,
          "width": 20.8,
          "gridRows": 10
        }
      }
    },
    "commonAreas": [
      {
        "type": "palier_escalier",
        "label": "Palier / Couloir intérieur",
        "section": "principale",
        "col": 0, "colSpan": 1, "row": 0, "rowSpan": 11,
        "face": "both",
        "widthM": 1.4
      },
      {
        "type": "couloir_interieur",
        "label": "Couloir intérieur niveau 1 (row 3)",
        "section": "principale",
        "col": 0, "colSpan": 10, "row": 3, "rowSpan": 1,
        "face": "both",
        "comment": "Couloir horizontal Le Corbusier entre 1er et 2ème étage"
      },
      {
        "type": "couloir_interieur",
        "label": "Couloir intérieur niveau 2 (row 8)",
        "section": "principale",
        "col": 0, "colSpan": 10, "row": 8, "rowSpan": 1,
        "face": "both",
        "comment": "Couloir horizontal entre 3ème et 4ème étage"
      },
      {
        "type": "ascenseur",
        "label": "Ascenseur",
        "section": "principale",
        "col": 10, "colSpan": 1, "row": 0, "rowSpan": 11,
        "face": "both"
      },
      {
        "type": "cage_escalier_principale",
        "label": "Cage d'escalier principale",
        "section": "cageEscalier",
        "col": 0, "colSpan": 1, "row": 0, "rowSpan": 11,
        "face": "both",
        "widthM": 2.7
      },
      {
        "type": "palier_escalier",
        "label": "Palier section B",
        "section": "sectionB",
        "col": 0, "colSpan": 1, "row": 0, "rowSpan": 11,
        "face": "both",
        "widthM": 1.1
      },
      {
        "type": "garages",
        "label": "Garages",
        "section": "principale",
        "col": 1, "colSpan": 9, "row": 0, "rowSpan": 1,
        "face": "cour"
      },
      {
        "type": "chambres_de_bonne",
        "label": "Chambre de bonne",
        "section": "principale",
        "col": 1, "colSpan": 9, "row": 1, "rowSpan": 2,
        "face": "cour"
      },
      {
        "type": "caves",
        "label": "Caves (façade)",
        "section": "sectionB",
        "col": 1, "colSpan": 2, "row": -1, "rowSpan": 1,
        "face": "facade"
      },
      {
        "type": "caves",
        "label": "Caves (cour)",
        "section": "sectionB",
        "col": 3, "colSpan": 2, "row": -1, "rowSpan": 1,
        "face": "cour"
      },
      {
        "type": "garage",
        "label": "Garage h=1.15m",
        "section": "sectionB",
        "col": 3, "colSpan": 2, "row": 0, "rowSpan": 1,
        "face": "cour"
      },
      {
        "type": "chambres_de_bonne",
        "label": "Chambre de bonne",
        "section": "sectionB",
        "col": 1, "colSpan": 2, "row": 0, "rowSpan": 1,
        "face": "cour"
      }
    ],
    "apartments": [
      {
        "id": 1, "num": "1", "lot1957": 49, "ownerVerified": true, "occupant": "François Pozzo",
        "section": "principale", "col": 1, "colSpan": 1, "row": 0, "rowSpan": 2, "face": "facade", "avant": "oui", "southCorridorExtra": true, "extraSouthDepth": 1.5
      },
      {
        "id": 2, "num": "2", "lot1957": 50, "ownerVerified": true, "occupant": "Perruzi",
        "section": "principale", "col": 2, "colSpan": 1, "row": 0, "rowSpan": 2, "face": "facade", "avant": "oui", "southCorridorExtra": true, "extraSouthDepth": 1.5
      },
      {
        "id": 3, "num": "3", "lot1957": 51, "ownerVerified": true, "occupant": "Miniotte",
        "section": "principale", "col": 3, "colSpan": 1, "row": 0, "rowSpan": 2, "face": "facade", "avant": "oui", "southCorridorExtra": true, "extraSouthDepth": 1.5
      },
      {
        "id": 4, "num": "4", "lot1957": 52, "ownerVerified": false, "occupant": "Millian-Perrin",
        "section": "principale", "col": 4, "colSpan": 1, "row": 0, "rowSpan": 2, "face": "facade", "avant": "oui", "southCorridorExtra": true, "extraSouthDepth": 1.5
      },
      {
        "id": 5, "num": "5", "lot1957": 53, "ownerVerified": true, "occupant": "Bonhomme",
        "section": "principale", "col": 5, "colSpan": 1, "row": 0, "rowSpan": 2, "face": "facade", "avant": "oui", "southCorridorExtra": true, "extraSouthDepth": 1.5
      },
      {
        "id": 6, "num": "6", "lot1957": 54, "ownerVerified": true, "occupant": "Bonhomme",
        "section": "principale", "col": 6, "colSpan": 1, "row": 0, "rowSpan": 2, "face": "facade", "avant": "oui", "southCorridorExtra": true, "extraSouthDepth": 1.5
      },
      {
        "id": 7, "num": "7", "lot1957": 55, "ownerVerified": false, "occupant": "Chauvin",
        "section": "principale", "col": 7, "colSpan": 1, "row": 0, "rowSpan": 2, "face": "facade", "avant": "oui", "southCorridorExtra": true, "extraSouthDepth": 1.5
      },
      {
        "id": 8, "num": "8", "lot1957": 56, "ownerVerified": true, "occupant": "Seguin",
        "section": "principale", "col": 8, "colSpan": 1, "row": 0, "rowSpan": 2, "face": "facade", "avant": "oui", "southCorridorExtra": true, "extraSouthDepth": 1.5
      },
      {
        "id": 9, "num": "9", "lot1957": 57, "ownerVerified": false, "occupant": "Vahé",
        "section": "principale", "col": 9, "colSpan": 1, "row": 0, "rowSpan": 2, "face": "facade", "avant": "oui", "southCorridorExtra": true, "extraSouthDepth": 1.5
      },
      {
        "id": 10, "num": "10", "lot1957": 58, "ownerVerified": true, "occupant": "Mailian",
        "section": "sectionB", "col": 1, "colSpan": 1, "row": 1, "rowSpan": 2, "face": "both", "up": "non", "corridorRear": true
      },
      {
        "id": 11, "num": "11", "lot1957": 59, "ownerVerified": true, "occupant": "Mailian",
        "section": "sectionB", "col": 2, "colSpan": 1, "row": 1, "rowSpan": 2, "face": "both", "up": "non", "corridorRear": true
      },
      {
        "id": 12, "num": "12", "lot1957": 60, "ownerVerified": false, "occupant": "Casellas Bethuel",
        "section": "sectionB", "col": 3, "colSpan": 1, "row": 1, "rowSpan": 2, "face": "both", "up": "non", "corridorRear": true
      },
      {
        "id": 13, "num": "13", "lot1957": 61, "ownerVerified": false, "occupant": "Repetto Carboneschi",
        "section": "sectionB", "col": 4, "colSpan": 1, "row": 1, "rowSpan": 2, "face": "both", "up": "non", "corridorRear": true, "colCour": 1, "colSpanCour": 4, "courExtraWidth": 0.8
      },
      {
        "id": 14, "num": "14", "type": "studio", "corridorLevel": true,
        "occupant": "Strietz",
        "section": "principale", "col": 1, "colSpan": 2, "row": 2, "rowSpan": 2, "face": "facade", "avant": "oui"
      },
      {
        "id": 15, "num": "15", "type": "studio", "corridorLevel": true,
        "occupant": "Coquelet",
        "section": "principale", "col": 3, "colSpan": 2, "row": 2, "rowSpan": 2, "face": "facade", "avant": "oui"
      },
      {
        "id": 16, "num": "16", "type": "studio", "corridorLevel": true,
        "occupant": "d'Ousteau",
        "section": "principale", "col": 5, "colSpan": 2, "row": 2, "rowSpan": 2, "face": "facade", "avant": "oui"
      },
      {
        "id": 17, "num": "17", "type": "studio", "corridorLevel": true,
        "occupant": "Bazard",
        "section": "principale", "col": 7, "colSpan": 2, "row": 2, "rowSpan": 2, "face": "facade", "avant": "oui"
      },
      {
        "id": 18, "num": "18", "type": "studio", "corridorLevel": true,
        "occupant": "Benamou",
        "section": "principale", "col": 9, "colSpan": 1.5, "row": 2, "rowSpan": 2, "face": "facade","extendRight": "oui", "avant": "oui"
      },
      {
        "id": 19, "num": "19", "type": "studio", "corridorLevel": true,
        "occupant": "Oliva",
        "section": "sectionB", "col": 1, "colSpan": 2, "row": 1, "rowSpan": 2, "face": "cour", "avant": "oui"
      },
      {
        "id": 20, "num": "20", "type": "studio", "corridorLevel": true,
        "occupant": "Palombo",
        "section": "sectionB", "col": 3, "colSpan": 2, "courExtraWidth": 0.8, "row": 1, "rowSpan": 2, "face": "cour", "avant": "oui",
        "northCorridorWidthMeters": 3
      },
      {
        "id": 21, "num": "21", "lot1957": 69, "ownerVerified": false, "occupant": "Hyams Wikler", "occupantCour": "Arthur",
        "section": "principale", "col": 1, "colSpan": 1, "row": 4, "rowSpan": 2, "face": "both","up": "non", "rearExtensionDepth": 1.5
      },
      {
        "id": 22, "num": "22", "lot1957": 70, "ownerVerified": true, "occupant": "Cancel",
        "section": "principale", "col": 2, "colSpan": 1, "row": 4, "rowSpan": 2, "face": "both","up": "non", "rearExtensionDepth": 1.5
      },
      {
        "id": 23, "num": "23", "lot1957": 71, "ownerVerified": true, "occupant": "Coppola",
        "section": "principale", "col": 3, "colSpan": 1, "row": 4, "rowSpan": 2, "face": "both","up": "non", "rearExtensionDepth": 1.5
      },
      {
        "id": 24, "num": "24", "lot1957": 72, "ownerVerified": true, "occupant": "Milot-Mercet",
        "section": "principale", "col": 4, "colSpan": 1, "row": 4, "rowSpan": 2, "face": "both","up": "non", "rearExtensionDepth": 1.5
      },
      {
        "id": 25, "num": "25", "lot1957": 73, "ownerVerified": true, "occupant": "Chassagne",
        "section": "principale", "col": 5, "colSpan": 1, "row": 4, "rowSpan": 2, "face": "both","up": "non", "rearExtensionDepth": 1.5
      },
      {
        "id": 26, "num": "26", "lot1957": 74, "ownerVerified": true, "occupant": "Niederhauser",
        "section": "principale", "col": 6, "colSpan": 1, "row": 4, "rowSpan": 2, "face": "both","up": "non", "rearExtensionDepth": 1.5
      },
      {
        "id": 27, "num": "27", "lot1957": 75, "ownerVerified": false, "occupant": "Capitani",
        "section": "principale", "col": 7, "colSpan": 1, "row": 4, "rowSpan": 2, "face": "both","up": "non", "rearExtensionDepth": 1.5
      },
      {
        "id": 28, "num": "28", "lot1957": 76, "ownerVerified": false, "occupant": "Laberine",
        "section": "principale", "col": 8, "colSpan": 1, "row": 4, "rowSpan": 2, "face": "both","up": "non", "rearExtensionDepth": 1.5
      },
      {
        "id": 29, "num": "29", "lot1957": 77, "ownerVerified": true, "occupant": "Letexier",
        "section": "principale", "col": 9, "colSpan": 1, "row": 4, "rowSpan": 2, "face": "both","up": "non", "rearExtensionDepth": 1.5
      },
      {
        "id": 30, "num": "30", "lot1957": 78, "ownerVerified": true, "occupant": "RochedePins", "occupantCour": "Pipige",
        "section": "sectionB", "col": 1, "colSpan": 1, "row": 3, "rowSpan": 2, "face": "both", "up": "oui"
      },
      {
        "id": 31, "num": "31", "lot1957": 79, "ownerVerified": false, "occupant": "Wissler",
        "section": "sectionB", "col": 2, "colSpan": 1, "row": 3, "rowSpan": 2, "face": "both", "up": "oui"
      },
      {
        "id": 32, "num": "32", "lot1957": 80, "ownerVerified": false, "occupant": "Schumacher",
        "section": "sectionB", "col": 3, "colSpan": 1, "row": 3, "rowSpan": 2, "face": "both", "up": "oui"
      },
      {
        "id": 33, "num": "33", "lot1957": 81, "ownerVerified": false, "occupant": "Smadja",
        "section": "sectionB", "col": 4, "colSpan": 1, "courExtraWidth": 0.8, "row": 3, "rowSpan": 2, "face": "both", "up": "oui"
      },
      {
        "id": 34, "num": "34", "lot1957": 82, "ownerVerified": true, "occupant": "Montezin","pos":"haute",
        "section": "principale", "col": 1, "colSpan": 1, "row": 6, "rowSpan": 2, "face": "both", "up": "non", "step": "right"
      },
      {
        "id": 35, "num": "35", "lot1957": 83, "ownerVerified": false, "occupant": "Prevot Arquin","pos":"haute",
        "section": "principale", "col": 2, "colSpan": 1, "row": 6, "rowSpan": 2, "face": "both", "up": "non","step": "left"
      },
      {
        "id": 36, "num": "36", "lot1957": 84, "ownerVerified": false, "occupant": "Donville","pos":"haute",
        "section": "principale", "col": 3, "colSpan": 1, "row": 6, "rowSpan": 2, "face": "both", "up": "non", "step": "right"
      },
      {
        "id": 37, "num": "37", "lot1957": 85, "ownerVerified": true, "occupant": "Berthet","pos":"haute",
        "section": "principale", "col": 4, "colSpan": 1, "row": 6, "rowSpan": 2, "face": "both", "up": "non","step": "left"
      },
      {
        "id": 38, "num": "38", "lot1957": 86, "ownerVerified": true, "occupant": "Floriot","pos":"haute",
        "section": "principale", "col": 5, "colSpan": 1, "row": 6, "rowSpan": 2, "face": "both", "up": "non", "step": "right"
      },
      {
        "id": 39, "num": "39", "lot1957": 87, "ownerVerified": false, "occupant": "Bresson","pos":"haute",
        "section": "principale", "col": 6, "colSpan": 1, "row": 6, "rowSpan": 2, "face": "both", "up": "non","step": "left"
      },
      {
        "id": 40, "num": "40", "lot1957": 88, "ownerVerified": true, "occupant": "Marcet","pos":"haute",
        "section": "principale", "col": 7, "colSpan": 1, "row": 6, "rowSpan": 2, "face": "both", "up": "non", "step": "right"
      },
      {
        "id": 41, "num": "41", "lot1957": 89, "ownerVerified": true, "occupant": "Souchon","pos":"haute",
        "section": "principale", "col": 8, "colSpan": 1, "row": 6, "rowSpan": 2, "face": "both", "up": "non","step": "left"
      },
      {
        "id": 42, "num": "42", "lot1957": 90, "ownerVerified": true, "occupant": "Dumont-Maur","pos":"haute",
        "section": "principale", "col": 9, "colSpan": 1, "row": 6, "rowSpan": 2, "face": "both", "up": "non", "step": "right"
      },
      {
        "id": 43, "num": "43", "lot1957": 91, "ownerVerified": false, "occupant": "Onfray","pos":"haute",
        "section": "sectionB", "col": 1, "colSpan": 1.5, "colSpanCour": 1, "row": 5, "rowSpan": 2, "face": "both", "up": "oui","extendLeft": "oui","step": "right"
      },
      {
        "id": 44, "num": "44", "lot1957": 92, "ownerVerified": true, "occupant": "Jenny-Staub", "occupantCour": "Daniel","pos":"haute",
        "section": "sectionB", "col": 2, "colSpan": 1, "row": 5, "rowSpan": 2, "face": "both", "up": "oui", 'step': "left",
      },
      {
        "id": 45, "num": "45", "lot1957": 93, "ownerVerified": true, "occupant": "Griffoul","pos":"haute",
        "section": "sectionB", "col": 3, "colSpan": 1, "row": 5, "rowSpan": 2, "face": "both", "up": "oui", "step": "right"
      },
      {
        "id": 46, "num": "46", "lot1957": 94, "ownerVerified": true, "occupant": "Tristan", "type" : "cour","pos":"haute",
        "section": "sectionB", "col": 4, "colSpan": 1, "courExtraWidth": 0.8, "row": 5, "rowSpan": 2, "face": "both", "up": "oui", "step":"left"
      },
      {
        "id": 47, "num": "47", "type": "studio", "corridorLevel": true,
        "occupant": "Courtial",
        "section": "principale", "col": 1, "colSpan": 2, "row": 6, "rowSpan": 2, "face": "cour", "avant": "oui"
      },
      {
        "id": 48, "num": "48", "type": "studio", "corridorLevel": true,
        "occupant": "Mireille",
        "section": "principale", "col": 3, "colSpan": 2, "row": 6, "rowSpan": 2, "face": "cour", "avant": "oui"
      },
      {
        "id": 49, "num": "49", "type": "studio", "corridorLevel": true,
        "occupant": "Bresson",
        "section": "principale", "col": 5, "colSpan": 2, "row": 6, "rowSpan": 2, "face": "cour", "avant": "oui"
      },
      {
        "id": 50, "num": "50", "type": "studio", "corridorLevel": true,
        "occupant": "Basso",
        "section": "principale", "col": 7, "colSpan": 2, "row": 6, "rowSpan": 2, "face": "cour", "avant": "oui"
      },
      {
        "id": 51, "num": "51", "type": "studio", "corridorLevel": true,
        "occupant": "xxxx",
        "section": "principale", "col": 9, "colSpan": 1, "row": 6, "rowSpan": 2, "face": "cour", "avant": "oui",
        "comment": "Occupant non renseigné"
      },
      {
        "id": 52, "num": "52", "type": "studio", "corridorLevel": true,
        "occupant": "Amster Wilhem",
        "section": "sectionB", "col": 1, "colSpan": 2.5, "row": 7, "rowSpan": 2, "face": "facade","extendLeft": "oui","avant":"oui",
        "comment": "2.5 blocs de large selon plan"
      },
      {
        "id": 53, "num": "53", "type": "studio", "corridorLevel": true,
        "occupant": "Trucchi",
        "section": "sectionB", "col": 3, "colSpan": 2, "row": 7, "rowSpan": 2, "face": "both","avant":"oui",
        "colSpanCour": 1, "colCour": 4, "courDepthMeters": 3, "courNoSlope": true,
        "comment": "2 blocs de large selon plan, démarre à la col 3.5. Absorbe le couloir intérieur sur sa moitié ouest (forme en L, 3m vers le sud, même niveau que la façade)"
      },
      {
        "id": 54, "num": "54", "lot1957": 102, "ownerVerified": false, "occupant": "Bellemin-Noel","pos":"haute",
        "section": "principale", "col": 1, "colSpan": 1, "row": 8, "rowSpan": 2, "face": "both", "up": "oui","step":"right"
      },
      {
        "id": 55, "num": "55", "lot1957": 103, "ownerVerified": true, "occupant": "Barat","pos":"haute",
        "section": "principale", "col": 2, "colSpan": 1, "row": 8, "rowSpan": 2, "face": "both", "up":"oui", "step":"left"
      },
      {
        "id": 56, "num": "56", "lot1957": 104, "ownerVerified": true, "occupant": "Innebel","pos":"haute",
        "section": "principale", "col": 3, "colSpan": 1, "row": 8, "rowSpan": 2, "face": "both", "up":"oui", "step":"right"
      },
      {
        "id": 57, "num": "57", "lot1957": 105, "ownerVerified": false, "occupant": "Consorts","pos":"haute",
        "section": "principale", "col": 4, "colSpan": 1, "row": 8, "rowSpan": 2, "face": "both", "up":"oui", "step":"left"
      },
      {
        "id": 58, "num": "58", "lot1957": 106, "ownerVerified": true, "occupant": "Frealle","pos":"haute",
        "section": "principale", "col": 5, "colSpan": 1, "row": 8, "rowSpan": 2, "face": "both", "up":"oui", "step":"right"
      },
      {
        "id": 59, "num": "59", "lot1957": 107, "ownerVerified": false, "occupant": "Autin","pos":"haute",
        "section": "principale", "col": 6, "colSpan": 1, "row": 8, "rowSpan": 2, "face": "both", "up":"oui", "step":"left"
      },
      {
        "id": 60, "num": "60", "lot1957": 108, "ownerVerified": false, "occupant": "Lepersonne","pos":"haute",
        "section": "principale", "col": 7, "colSpan": 1, "row": 8, "rowSpan": 2, "face": "both", "up":"oui", "step":"right"
      },
      {
        "id": 61, "num": "61", "lot1957": 109, "ownerVerified": false, "occupant": "Mitsou Coste","pos":"haute",
        "section": "principale", "col": 8, "colSpan": 1, "row": 8, "rowSpan": 2, "face": "both", "up":"oui", "step":"left"
      },
      {
        "id": 62, "num": "62", "lot1957": 110, "ownerVerified": false, "occupant": "Griffoul","pos":"haute",
        "section": "principale", "col": 9, "colSpan": 1, "colSpanCour": 1.5, "row": 8, "rowSpan": 2, "face": "both", "up":"oui", "step":"right"
      },
      {
        "id": 63, "num": "63", "lot1957": 111, "ownerVerified": true, "occupant": "Peyron","pos":"haute",
        "section": "sectionB", "col": 1, "colSpan": 1.5, "colSpanCour": 1, "row": 9, "rowSpan": 2, "face": "both","up": "non","extendLeft": "oui","step":"right"
      },
      {
        "id": 64, "num": "64", "lot1957": 112, "ownerVerified": true, "occupant": "Morello","pos":"haute",
        "section": "sectionB", "col": 2, "colSpan": 1, "row": 9, "rowSpan": 2, "face": "both","up": "non","step":"left"
      },
      {
        "id": 65, "num": "65", "lot1957": 113, "ownerVerified": false, "occupant": "Borgialli","pos":"haute",
        "section": "sectionB", "col": 3, "colSpan": 1, "row": 9, "rowSpan": 2, "face": "both","up": "non", "step":"right"
      },
      {
        "id": 66, "num": "66", "lot1957": 114, "ownerVerified": false, "occupant": "Charpin", "occupantCour": "Olivier","pos":"haute",
        "section": "sectionB", "col": 4, "colSpan": 1, "courExtraWidth": 0.8, "row": 9, "rowSpan": 2, "face": "both","up": "non", 'step': "left"
      }
    ],
    "chambresDeBonne": [
      { "id": 1, "num": "1", "parentId": 21, "index": 0, "splitCount": 2, "lot1957": 170, "ownerNameOfficial": null, "ownerSource": null, "linkedApartmentId": null },
      { "id": 2, "num": "2", "parentId": 21, "index": 1, "splitCount": 2, "lot1957": 171, "ownerNameOfficial": "SCI MARIOUDOU (Mme Cadel)", "ownerSource": "PV/convocation AG 2026", "linkedApartmentId": null },
      { "id": 3, "num": "3", "parentId": 22, "index": 0, "splitCount": 2, "lot1957": 172, "ownerNameOfficial": "SCI MARIOUDOU (Mme Cadel)", "ownerSource": "PV/convocation AG 2026", "linkedApartmentId": null },
      { "id": 4, "num": "4", "parentId": 22, "index": 1, "splitCount": 2, "lot1957": 173, "ownerNameOfficial": "SCI MARIOUDOU (Mme Cadel)", "ownerSource": "PV/convocation AG 2026", "linkedApartmentId": null },
      { "id": 5, "num": "5", "parentId": 23, "index": 0, "splitCount": 2, "lot1957": 174, "ownerNameOfficial": null, "ownerSource": null, "linkedApartmentId": null },
      { "id": 6, "num": "6", "parentId": 23, "index": 1, "splitCount": 2, "lot1957": 175, "ownerNameOfficial": null, "ownerSource": null, "linkedApartmentId": null },
      { "id": 7, "num": "7", "parentId": 24, "index": 0, "splitCount": 2, "lot1957": 176, "ownerNameOfficial": null, "ownerSource": null, "linkedApartmentId": null },
      { "id": 8, "num": "8", "parentId": 24, "index": 1, "splitCount": 2, "lot1957": 177, "ownerNameOfficial": null, "ownerSource": null, "linkedApartmentId": null },
      { "id": 9, "num": "9", "parentId": 25, "index": 0, "splitCount": 2, "lot1957": 178, "ownerNameOfficial": null, "ownerSource": null, "linkedApartmentId": null },
      { "id": 10, "num": "10", "parentId": 25, "index": 1, "splitCount": 2, "lot1957": 179, "ownerNameOfficial": null, "ownerSource": null, "linkedApartmentId": null },
      { "id": 11, "num": "11", "parentId": 26, "index": 0, "splitCount": 2, "lot1957": 180, "ownerNameOfficial": null, "ownerSource": null, "linkedApartmentId": null },
      { "id": 12, "num": "12", "parentId": 26, "index": 1, "splitCount": 2, "lot1957": 181, "ownerNameOfficial": null, "ownerSource": null, "linkedApartmentId": null },
      { "id": 13, "num": "13", "parentId": 27, "index": 0, "splitCount": 2, "lot1957": 182, "ownerNameOfficial": "Madame DIOT", "ownerSource": "PV/convocation AG 2022", "linkedApartmentId": null },
      { "id": 14, "num": "14", "parentId": 27, "index": 1, "splitCount": 2, "lot1957": 183, "ownerNameOfficial": "Madame DIOT", "ownerSource": "PV/convocation AG 2022", "linkedApartmentId": null },
      { "id": 15, "num": "15", "parentId": 28, "index": 0, "splitCount": 2, "lot1957": 184, "ownerNameOfficial": "Madame DIOT", "ownerSource": "PV/convocation AG 2022", "linkedApartmentId": null },
      { "id": 16, "num": "16", "parentId": 28, "index": 1, "splitCount": 2, "lot1957": 185, "ownerNameOfficial": null, "ownerSource": null, "linkedApartmentId": null },
      { "id": 17, "num": "17", "parentId": 29, "index": 0, "splitCount": 2, "lot1957": 186, "ownerNameOfficial": null, "ownerSource": null, "linkedApartmentId": null },
      { "id": 18, "num": "18", "parentId": 29, "index": 1, "splitCount": 2, "lot1957": 187, "ownerNameOfficial": null, "ownerSource": null, "linkedApartmentId": null },
      { "id": 19, "num": "19", "parentId": 19, "index": 0, "splitCount": 4, "lot1957": 188, "ownerNameOfficial": "Madame MAILIAN Tamara (convocation 2026)", "ownerSource": "PV/convocation AG 2026", "linkedApartmentId": 10 },
      { "id": 20, "num": "20", "parentId": 19, "index": 1, "splitCount": 4, "lot1957": 189, "ownerNameOfficial": "Madame et Monsieur VIGNIER Eric", "ownerSource": "PV/convocation AG 2025", "linkedApartmentId": 42 },
      { "id": 21, "num": "21", "parentId": 19, "index": 2, "splitCount": 4, "lot1957": 190, "ownerNameOfficial": null, "ownerSource": null, "linkedApartmentId": null },
      { "id": 22, "num": "22", "parentId": 19, "index": 3, "splitCount": 4, "lot1957": 191, "ownerNameOfficial": null, "ownerSource": null, "linkedApartmentId": null },
      { "id": 23, "num": "23", "parentId": 20, "index": 0, "splitCount": 4, "lot1957": 192, "ownerNameOfficial": null, "ownerSource": null, "linkedApartmentId": null },
      { "id": 24, "num": "24", "parentId": 20, "index": 1, "splitCount": 4, "lot1957": 193, "ownerNameOfficial": null, "ownerSource": null, "linkedApartmentId": null },
      { "id": 25, "num": "25", "parentId": 20, "index": 2, "splitCount": 4, "lot1957": 194, "ownerNameOfficial": null, "ownerSource": null, "linkedApartmentId": null },
      { "id": 26, "num": "26", "parentId": 20, "index": 3, "splitCount": 4, "lot1957": 195, "ownerNameOfficial": null, "ownerSource": null, "linkedApartmentId": null }
    ],
    "garages": [
      { "id": 11, "num": "11", "parentId": 21, "index": 0, "splitCount": 2, "linkedApartmentId": 62, "lot1957": 115, "ownerNameOfficial": null, "ownerSource": null, "linkedApartmentIdOfficial": null },
      { "id": 12, "num": "12", "parentId": 21, "index": 1, "splitCount": 2, "linkedApartmentId": 45, "lot1957": 116, "ownerNameOfficial": null, "ownerSource": null, "linkedApartmentIdOfficial": null },
      { "id": 13, "num": "13", "parentId": 22, "index": 0, "splitCount": 2, "linkedApartmentId": null, "lot1957": 117, "ownerNameOfficial": null, "ownerSource": null, "linkedApartmentIdOfficial": null },
      { "id": 14, "num": "14", "parentId": 22, "index": 1, "splitCount": 2, "linkedApartmentId": 63, "lot1957": 118, "ownerNameOfficial": "Madame Geneviève PEYRON", "ownerSource": "PV/convocation AG 2025", "linkedApartmentIdOfficial": 63 },
      { "id": 15, "num": "15", "parentId": 23, "index": 0, "splitCount": 2, "linkedApartmentId": null, "lot1957": 119, "ownerNameOfficial": "Monsieur et Madame ROCHE", "ownerSource": "PV/convocation AG 2010", "linkedApartmentIdOfficial": 30 },
      { "id": 16, "num": "16", "parentId": 23, "index": 1, "splitCount": 2, "linkedApartmentId": null, "lot1957": 120, "ownerNameOfficial": "Madame DONVILLE", "ownerSource": "PV/convocation AG 2016", "linkedApartmentIdOfficial": null },
      { "id": 17, "num": "17", "parentId": 24, "index": 0, "splitCount": 2, "linkedApartmentId": null, "lot1957": 121, "ownerNameOfficial": "Madame et Monsieur VIGNIER Eric", "ownerSource": "PV/convocation AG 2025", "linkedApartmentIdOfficial": 42 },
      { "id": 18, "num": "18", "parentId": 24, "index": 1, "splitCount": 2, "linkedApartmentId": null, "lot1957": 122, "ownerNameOfficial": null, "ownerSource": null, "linkedApartmentIdOfficial": null },
      { "id": 19, "num": "19", "parentId": 25, "index": 0, "splitCount": 2, "linkedApartmentId": null, "lot1957": 123, "ownerNameOfficial": null, "ownerSource": null, "linkedApartmentIdOfficial": null },
      { "id": 20, "num": "20", "parentId": 25, "index": 1, "splitCount": 2, "linkedApartmentId": null, "lot1957": 124, "ownerNameOfficial": null, "ownerSource": null, "linkedApartmentIdOfficial": null },
      { "id": 21, "num": "21", "parentId": 26, "index": 0, "splitCount": 2, "linkedApartmentId": null, "lot1957": 125, "ownerNameOfficial": null, "ownerSource": null, "linkedApartmentIdOfficial": null },
      { "id": 22, "num": "22", "parentId": 26, "index": 1, "splitCount": 2, "linkedApartmentId": null, "lot1957": 126, "ownerNameOfficial": null, "ownerSource": null, "linkedApartmentIdOfficial": null },
      { "id": 23, "num": "23", "parentId": 27, "index": 0, "splitCount": 2, "linkedApartmentId": null, "lot1957": 127, "ownerNameOfficial": "Monsieur et Madame TRUCCHI", "ownerSource": "PV/convocation AG 2026", "linkedApartmentIdOfficial": 53 },
      { "id": 24, "num": "24", "parentId": 27, "index": 1, "splitCount": 2, "linkedApartmentId": null, "lot1957": 128, "ownerNameOfficial": null, "ownerSource": null, "linkedApartmentIdOfficial": null },
      { "id": 25, "num": "25", "parentId": 28, "index": 0, "splitCount": 2, "linkedApartmentId": null, "lot1957": 129, "ownerNameOfficial": null, "ownerSource": null, "linkedApartmentIdOfficial": null },
      { "id": 26, "num": "26", "parentId": 28, "index": 1, "splitCount": 2, "linkedApartmentId": null, "lot1957": 130, "ownerNameOfficial": null, "ownerSource": null, "linkedApartmentIdOfficial": null },
      { "id": 27, "num": "27", "parentId": 29, "index": 0, "splitCount": 2, "linkedApartmentId": null, "lot1957": 131, "ownerNameOfficial": null, "ownerSource": null, "linkedApartmentIdOfficial": null },
      { "id": 28, "num": "28", "parentId": 29, "index": 1, "splitCount": 2, "linkedApartmentId": 66, "lot1957": 132, "ownerNameOfficial": null, "ownerSource": null, "linkedApartmentIdOfficial": null }
    ],
    "derivedFormulas": {
      "description": "Calcul boîte 3D pour Three.js / React Three Fiber",
      "x": "section.startX + section.leftMargin + (col - 1) * gridColWidth",
      "y": "row * gridRowHeight",
      "z_facade": "0",
      "z_cour": "buildingDepth - courDepth",
      "z_both": "0",
      "width":  "colSpan * gridColWidth",
      "height": "rowSpan * gridRowHeight",
      "depth_facade": "facadeDepth (5.5m)",
      "depth_cour":   "courDepth (5.5m)",
      "depth_both":   "buildingDepth (14.0m)"
    }
  }
}  