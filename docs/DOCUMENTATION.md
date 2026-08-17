# DMX Master - Documentation Complète du Projet

**DMX Master** est une application logicielle professionnelle de contrôle d'éclairage DMX de bout en bout, construite avec **Electron**, **React**, et **TypeScript**. Elle permet de contrôler des projecteurs réels (via USB et Réseau) ainsi que des projecteurs virtuels (via un visualiseur 3D).

Ce document résume l'architecture complète du projet et l'ensemble des 15 phases de fonctionnalités implémentées.

---

## 🏗 Architecture Globale

L'application suit une architecture stricte séparant le Backend (Node.js/Electron) du Frontend (React) via un système de communication IPC (Inter-Process Communication) à haute performance.

### 1. Le Processus Principal (Backend / Electron)
- **DmxEngine (Le Cœur à 44Hz) :** Une boucle de rendu asynchrone ultra-rapide tournant à 44Hz (la vitesse standard du protocole DMX512). Ce moteur fusionne toutes les données (Scènes, Effets, Pixel Mapping) dans un tableau (buffer) de 512 octets représentant un univers DMX complet.
- **Gestionnaires de Périphériques :**
  - **SerialManager :** Gère la communication via port série (USB) vers des dongles matériels comme l'Enttec Open DMX USB. (Baud rate matériel fixé à 57600).
  - **NetworkManager (Art-Net) :** Diffuse l'univers DMX via le réseau UDP en broadcast pour piloter des contrôleurs LED comme WLED.
  - **MidiManager :** Écoute les entrées MIDI pour le contrôle physique (ex: Novation Launchpad) et renvoie des données MIDI OUT pour allumer les pads.
- **Gestionnaires de Logique & Sauvegarde :**
  - **FixtureManager :** Gère la bibliothèque de projecteurs, le Patch (adressage DMX), les Groupes, et le Grand Master. Sauvegarde sur disque (`Profiles`, `Patch.json`, `Groups.json`).
  - **SceneManager :** Gère l'enregistrement et la restitution de "Looks" d'éclairage statiques avec des temps de fondu enchaîné (crossfade).
  - **EffectsEngine :** Générateur de LFOs mathématiques (Sinus, Triangle, Sawtooth, Pulse) superposés en temps réel sur les canaux DMX (pour les mouvements Pan/Tilt ou les Chases de couleurs).
  - **PixelEngine :** Calcule les adresses DMX en temps réel à partir de coordonnées 2D pour mapper des vidéos et images sur des matrices LED.
  - **TimelineManager :** Gère l'importation de fichiers audio (MP3/WAV) et la structure des shows temporels.
  - **ShowManager :** Archive la totalité du dossier de configuration (dans les Documents de l'utilisateur) dans un fichier zip `.dmxshow` pour le backup et le transfert.

### 2. Le Processus de Rendu (Frontend / React)
- **UI & Hooks :** L'interface utilisateur est construite en React. Elle communique avec le Backend via des appels `window.api` exposés dans un script de "Preload" sécurisé.
- **Réactivité Haute Performance :** Des hooks personnalisés (`useDmx`, `useSerial`, `useTimeline`) s'abonnent aux événements poussés par le Backend. Par exemple, le Frontend maintient une copie locale du tableau DMX de 512 canaux et se met à jour à 44 images par seconde pour refléter le visuel 3D et les UI de contrôle en temps réel.
- **Visualiseur 3D :** Un environnement `react-three-fiber` qui lit directement le buffer DMX brut et le traduit en rotations physiques (Pan/Tilt) et en faisceaux lumineux volumétriques.

---

## 🚀 Les 15 Modules (Phases) de Fonctionnalités

### 1 & 2. Moteur DMX et Communication Série USB
La fondation de l'application. Elle établit la boucle de rendu à 44Hz et injecte un buffer de 512 octets dans un dongle USB-to-DMX matériel via l'API Web Serial et Node SerialPort. 

### 3 & 4. Profils d'Appareils & Gestion Intelligente (Fixtures)
Passage du contrôle DMX brut (canal 1 à 512) au contrôle logique d'appareils. L'application possède un système de "Profils de Projecteurs" (ex: "Generic Moving Head 4-channel"). L'interface permet de définir un modèle universel de projecteur, comprenant ses types de canaux (Intensité, Rouge, Vert, Pan, Tilt, Smoke). Les profils peuvent être générés par une IA (intégration du modèle LLM).

### 5. Système de Scènes & Cues
Permet aux utilisateurs de capturer l'état actuel de leurs lumières dans une "Scène" et de la sauvegarder sur le disque (`Scenes.json`). Le système de rappel intègre un moteur de fondu enchaîné (crossfade) qui interpole doucement les valeurs d'une scène à l'autre sans saut brusque.

### 6. Moteur d'Effets (FX Engine / LFOs)
Un moteur mathématique permettant d'appliquer des formes d'onde (Sine, Triangle, etc.) sur des paramètres de projecteurs. On peut définir une vitesse (BPM/Hz), une taille, et un décalage de phase (Offset) pour créer des vagues (chases) parfaites à travers plusieurs appareils.

### 7. Grille de Busking & Intégration Launchpad (MIDI)
Une interface de grille 8x8 conçue pour le direct (busking). Les utilisateurs peuvent assigner des Scènes ou des Effets aux pads. L'application supporte le MIDI IN pour déclencher ces pads depuis un clavier ou un Launchpad physique, et envoie du MIDI OUT pour allumer les boutons du contrôleur avec les couleurs correspondantes.

### 8. Analyse Audio (Sound-to-Light FFT)
Intégration de l'API Web Audio pour écouter le microphone du système en temps réel. L'application décompose le signal sonore (FFT) en bandes de fréquences (Bass, Mids, Highs) pour piloter l'intensité ou les effets des lumières de manière synchronisée avec la musique.

### 9. Réseau & Art-Net (Intégration WLED)
Une implémentation du protocole standard de l'industrie : Art-Net. Le `NetworkManager` du Backend diffuse l'univers DMX sur le réseau local via des paquets UDP, permettant de contrôler des centaines de LED adressables (ex: des rubans pilotés par des contrôleurs WLED) sans fil.

### 10. Moteur de Pixel Mapping (Matrices LED)
Permet de configurer des projecteurs "Matriciels" (ex: des panneaux 10x10 LED). L'application possède un canevas HTML5 caché qui lit les pixels d'images, de vidéos ou d'effets génératifs et les traduit instantanément en valeurs DMX R, G, et B en calculant le routage (ex: Snake ou ZigZag).

### 11. Console Virtuelle (Drag & Drop)
Une interface entièrement personnalisable pour le direct (Live & Playback). Les utilisateurs peuvent glisser-déposer (Drag & Drop) des curseurs (Faders), des boutons Flash, des roues de couleurs (Color Pickers) et des Pads X/Y pour créer un tableau de bord sur mesure, adapté à leur façon de mixer la lumière.

### 12. Application Mobile (Web Server Remote)
Un serveur web Express léger tourne en tâche de fond dans le processus principal, permettant à n'importe quel smartphone connecté sur le même réseau WiFi d'ouvrir une interface web mobile et de déclencher des scènes de la Grille de Busking à distance.

### 12. Séquenceur Temporel (NLE Timeline)
Une Timeline professionnelle de type montage vidéo (NLE). L'utilisateur peut importer un fichier audio (MP3/WAV), voir la forme d'onde (`waveform`) décimée sur un canevas haute vitesse, et placer des "marqueurs". Lors de la lecture de la musique, le système utilise `requestAnimationFrame` pour déclencher les Scènes et Effets assignés aux marqueurs avec une précision au millième de seconde ("Fire-on-Pass").

### 13. Groupes de Projecteurs & Submasters
Fonctionnalité clé pour les concerts live : permet de grouper plusieurs appareils (ex: "Tous les stroboscopes"). Une console "Submasters" générée dynamiquement permet de baisser l'intensité globale de ces groupes de manière proportionnelle (Highest Takes Precedence) sans altérer la donnée des scènes en cours de lecture. Le système inclut également un Grand Master global.

### 14. Export/Import de "Showfile" (.dmxshow)
Un gestionnaire de fichiers intégrant `adm-zip`. Il permet d'archiver (zipper) l'intégralité du dossier utilisateur (Profils, Patchs, Scènes, Audio) dans un fichier unique `.dmxshow`. Lors de l'import d'un show, l'application s'écrase proprement et déclenche un `app.relaunch()` natif pour rafraîchir tous les singletons et la mémoire sans aucune fuite.

### 15. Visualiseur 3D (React Three Fiber)
Un simulateur de scène 3D complet tournant directement dans l'interface de l'application via WebGL. 
Les projecteurs y sont automatiquement placés et construits de manière procédurale (geometries simples). Ils lisent les octets DMX *réels* depuis le tampon 512 canaux et mappent directement ces données sur l'inclinaison, le panoramique, la couleur et le faisceau volumétrique (via `SpotLight`). Cela permet de programmer un spectacle entier chez soi, avec un rendu fidèle des FX et des Submasters, sans équipement physique.

---

## 🗂 Structure Principale des Fichiers Clés

```text
/electron
  ├── main.ts              # Point d'entrée, initialise tous les Singletons
  ├── ipcHandlers.ts       # Registre de toutes les communications Frontend <-> Backend
  ├── preload.ts           # Expose les API sécurisées (window.dmxAPI, window.fixtureAPI...)
  ├── dmxEngine.ts         # Le cœur tournant à 44Hz
  ├── serialManager.ts     # Gère le port USB
  ├── networkManager.ts    # Gère le flux Art-Net UDP
  ├── showManager.ts       # Gère les backups ZIP .dmxshow
  └── ... (fixtureManager, sceneManager, timelineManager, etc.)

/src
  ├── App.tsx              # Le squelette UI principal (Navbar, Tabs, Routing interne)
  ├── hooks/               # Logique React (useDmx, useFixtures, useTimeline...) connectée à l'IPC
  ├── components/
  │   ├── control/         # Console des Submasters et curseurs physiques
  │   ├── fixtures/        # Grille de Patch et créateur de Profils
  │   ├── scenes/          # Enregistreur de Scènes et Grille de Busking Live
  │   ├── visualizer/      # Visualiseur 3D (Canvas, VirtualMovingHead)
  │   └── timeline/        # Interface d'édition NLE avec forme d'onde audio
  └── styles/              # Fichiers CSS vanille pour un design moderne, réactif et dark-mode
```

Ce document scelle l'architecture et les capacités exhaustives du projet DMX Master.
