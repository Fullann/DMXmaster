# DMX Master - Documentation Détaillée des Composants

Ce document répertorie et explique en détail le rôle de chaque classe Backend (Node.js/Electron), de chaque Hook React, et de chaque Composant UI (React) qui constitue l'application DMX Master.

---

## 1. Backend : Processus Principal (Dossier `electron/`)

L'architecture backend repose sur une série de Singletons (Classes instanciées une seule fois) qui orchestrent le matériel et la logique. Ils sont tous centralisés et initialisés dans `main.ts` puis exposés au Frontend via `ipcHandlers.ts` et `preload.ts`.

### Moteurs Centraux
* **`dmxEngine.ts`** : Le chef d'orchestre. Il contient la boucle principale (tick) s'exécutant à 44Hz via un `setInterval` haute précision. À chaque tick, il récupère l'état de base (`FixtureManager`), superpose les Scènes (`SceneManager`), ajoute les Effets (`EffectsEngine`), applique la matrice de pixels (`PixelEngine`), puis envoie le tableau de 512 octets résultant vers les interfaces matérielles (`SerialManager`, `NetworkManager`).
* **`effectsEngine.ts`** : Générateur d'oscillateurs basse fréquence (LFO). Il calcule mathématiquement la position actuelle des ondes (Sinus, Triangle, Sawtooth, Pulse) en fonction de la vitesse (BPM/Hz), de la taille et de l'offset, et renvoie une valeur à superposer sur l'état des projecteurs.
* **`pixelEngine.ts`** : Gère la logique de conversion 2D vers DMX 1D. Il convertit les coordonnées X/Y d'un canevas HTML5 en adresses DMX exactes pour des matrices LED, en tenant compte du routage (ZigZag, Snake, Linéaire).

### Gestionnaires de Périphériques (I/O)
* **`serialManager.ts`** : Communique avec les interfaces matérielles USB (type Enttec Open DMX) en utilisant la bibliothèque Node `serialport`. Il s'assure d'écrire le tampon de 512 octets à un *baud rate* strict de 57600.
* **`networkManager.ts`** : Implémente le protocole Art-Net (via UDP). Il prend le même tampon de 512 octets et le diffuse (broadcast) sur le réseau local, permettant le contrôle sans fil d'appareils compatibles WLED ou sACN.
* **`audioEngine.ts`** : Reçoit les données FFT (Fast Fourier Transform) du microphone transmises par le Frontend, lisse les bandes de fréquences (Basses, Médiums, Aigus) pour la réactivité musicale.
* **`liveGridManager.ts` (MIDI)** : Gère le mapping MIDI bidirectionnel. Il écoute les notes d'un contrôleur MIDI physique (comme le Launchpad) et renvoie des messages de "Velocity" pour modifier la couleur des LED des boutons du contrôleur.

### Gestionnaires d'État et de Données
* **`fixtureManager.ts`** : C'est la bibliothèque et le registre de l'application. Il stocke les "Profils" des projecteurs, maintient la liste des machines patchées (le `Patch`), et gère les `FixtureGroup` pour l'application des Submasters (calculs proportionnels HTP).
* **`sceneManager.ts`** : Gère l'enregistrement et le chargement des "Scènes" (des images statiques des valeurs DMX). Il possède un moteur d'interpolation interne permettant de calculer les valeurs de transition (crossfade) en douceur d'une scène à une autre sur une durée donnée.
* **`timelineManager.ts`** : Charge les fichiers audio MP3/WAV, et maintient le dictionnaire JSON des marqueurs temporels (Shows).
* **`showManager.ts`** : Utilise `adm-zip` pour compresser ou extraire tout le dossier de configuration utilisateur (`Documents/DmxMaster`). Il gère le redémarrage (Relaunch) natif de l'application lors de l'import d'un nouveau show pour éviter les fuites de mémoire.

---

## 2. Frontend : Les Hooks React (`src/hooks/`)

Les hooks personnalisés sont la couche d'accès aux données du Frontend. Ils font le pont entre les composants React visuels et les IPC asynchrones du Backend. Ils maintiennent les états locaux pour une UI ultra-réactive.

* **`useDmx.ts`** : Contient un tableau local de 512 valeurs représentant l'univers entier. Il écoute passivement les mises à jour `onUniverseUpdate` à 44Hz pour que la vue 3D et le monitoring restent parfaitement synchronisés.
* **`useFixtures.ts`** : Maintient le registre local des Profils et des Appareils Patchés. Gère l'envoi optimiste des commandes DMX (pour que les curseurs de contrôle paraissent instantanés avant que le Backend ne réponde).
* **`useGroups.ts`** : Maintient l'état des faders de Groupes et du Grand Master. Il gère l'enregistrement local et l'envoi de ces valeurs multiplicatrices au moteur DMX.
* **`useScenes.ts`** : Charge la liste des scènes existantes et expose les fonctions pour rappeler une scène (avec un temps de fondu) ou l'écraser.
* **`useFx.ts`** : S'interface avec le moteur d'effets pour créer, modifier (Vitesse, Forme, Taille) et assigner des FX à des projecteurs spécifiques.
* **`useTimeline.ts`** : Le cœur de l'édition NLE (Non-Linear Editor). Il instancie l'`AudioContext` natif du navigateur, décode les MP3, crée un tableau décimé pour dessiner la forme d'onde, et gère une boucle `requestAnimationFrame` ultra-rapide pour déclencher les actions (Scènes/FX) au millième de seconde près ("Fire-on-Pass").
* **`useLiveGrid.ts`** : Conserve l'état de la grille 8x8 (Launchpad). Associe des actions (Play Scene, Play FX) et des couleurs aux 64 cellules de la grille, et dialogue avec le MIDI In/Out.
* **`useMidi.ts`** : Utilise l'API Web MIDI `navigator.requestMIDIAccess()` pour écouter le matériel directement depuis le navigateur.
* **`useAudioAnalyzer.ts`** : Demande l'accès au microphone de l'utilisateur (`getUserMedia`), crée un nœud `AnalyserNode` FFT, calcule l'énergie des bandes de fréquences et l'envoie au Backend via un processus throttled pour ne pas surcharger l'IPC.
* **`useSerial.ts` / `useNetwork.ts`** : Simples interfaces pour gérer la connexion/déconnexion et l'activation du broadcast Art-Net.

---

## 3. Frontend : Les Composants React (`src/components/`)

Les composants sont groupés par fonctionnalité dans des sous-dossiers.

### 🔌 Patch et Appareils (`fixtures/`)
* **`PatchGrid.tsx`** : L'interface principale pour ajouter de nouveaux appareils. Elle liste les profils disponibles et permet de leur assigner une adresse DMX de départ.
* **`AiImportTool.tsx`** : Outil permettant de soumettre le texte du manuel d'un projecteur à un LLM externe qui retourne le JSON standardisé du Profil à injecter dans l'application.
* **`LogicalControl.tsx`** : Le panneau de contrôle principal (Sliders d'Intensité, Color Picker, Pan/Tilt en X/Y Pad) qui interprète dynamiquement le profil de chaque lumière sélectionnée.
* **`GroupManager.tsx`** : Permet de créer des groupements logiques (ex: "Face", "Contre") et d'y associer des projecteurs via des cases à cocher.

### 🎚 Console de Contrôle (`control/`)
* **`SubmasterConsole.tsx`** : Interface rendant des faders verticaux professionnels pour chaque groupe créé, ainsi que le fameux "Grand Master" rouge pour piloter l'intensité globale du rig.

### 🎭 Scènes et Live (`scenes/` & `fx/`)
* **`SceneRecorder.tsx`** : Panneau pour sauvegarder les valeurs actuelles (le look) dans un nouveau fichier de scène, en définissant son nom et son temps de fondu.
* **`BuskingGrid.tsx`** : Une vue en grille de 64 pads interactifs reproduisant un contrôleur physique. Cliquer sur un pad déclenche instantanément l'action assignée (idéal pour le spectacle vivant).
* **`FxGenerator.tsx`** : Interface pour paramétrer un LFO (vitesse, taille, offset) et générer des vagues (chases) complexes.

### ⏳ Séquenceur et Média (`timeline/`, `pixel/`, `audio/`)
* **`TimelineSequencer.tsx`** : Affiche une immense piste horizontale (NLE) contenant la forme d'onde audio (`<canvas>`). Permet de placer des points clés, de frotter la tête de lecture (scrub) et d'automatiser le show à la perfection.
* **`PixelMapper.tsx`** : Contient un canevas caché, lit des fichiers vidéo HTML5 (`<video>`) ou des générateurs d'images, et échantillonne les pixels pour les envoyer sur des matrices LED DMX complexes (WLED).
* **`AudioDashboard.tsx`** : Interface affichant les barres graphiques des fréquences (Graves, Médiums, Aigus) du micro et permet d'associer ces bandes de fréquences à l'intensité de certaines lumières.

### 👁 Visualiseur 3D (`visualizer/`)
* **`StageVisualizer.tsx`** : Composant intégrant `@react-three/fiber` contenant la caméra de scène (OrbitControls), le sol et la lumière ambiante.
* **`VirtualMovingHead.tsx`** : Modèle 3D procédural (composé de Box et de Cylinders) couplé à une source `SpotLight` volumétrique (`ConeGeometry`). **Composant Critique :** il s'abonne à la boucle d'univers brut (Raw DMX Universe) pour garantir un rendu 3D visuel 1:1, prenant en compte le calcul final des Submasters et FX.

---

Ce fichier maintient l'inventaire complet des composants utilisés pour orchestrer l'application DMX Master. Mettez-le à jour à chaque ajout majeur de module.
