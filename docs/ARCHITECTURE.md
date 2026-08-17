# Architecture Technique - DMX Master

DMX Master repose sur une architecture moderne de type "Desktop Web", séparant un moteur Node.js performant (Backend) d'une interface utilisateur réactive (Frontend).

## Stack Technologique

- **Environnement** : Electron, Node.js (v18+)
- **Interface Utilisateur (Frontend)** : React (v18), Vite, TypeScript.
- **Gestion d'état** : Zustand (Store management avec persistance).
- **Communication** : IPC (Inter-Process Communication) via l'API Electron `contextBridge`.

---

## Les Trois Piliers de l'Application

### 1. Le Processus Principal (Main Process) / Node.js
C'est le cerveau de l'application, situé dans le dossier `/electron/`. Il n'a pas d'interface visuelle mais a accès aux fichiers locaux, aux ports USB et au réseau.
- **`dmxEngine.ts`** : La boucle temps réel (Tick Loop). Elle tourne à fréquence fixe (environ 43-44 Hz) pour respecter la spécification du protocole DMX512. À chaque *tick*, elle rassemble les données de tous les gestionnaires, calcule l'état final des 512 canaux de chaque univers, et envoie le paquet DMX à l'interface physique (USB ou Art-Net).
- **`fixtureManager.ts`** : Gère les profils des projecteurs (Fixtures) et maintient en mémoire vive l'état logique des machines (le Programmer). C'est lui qui sait que la "Machine 1" est rouge, et qui le traduit en canaux bruts pour le `dmxEngine`.
- **`webServerManager.ts`** : Héberge un petit serveur HTTP (Express) et un serveur WebSocket locaux. C'est ce composant qui permet à l'application Compagnon Mobile de se connecter et d'envoyer des ordres à l'application principale, contournant ainsi les limitations du système d'exploitation mobile (pas d'USB).

### 2. Le Processus de Rendu (Renderer Process) / React
C'est l'interface visuelle que l'utilisateur manipule, située dans `/src/`.
- L'application est divisée en **Workspaces** (`setup`, `program`, `playback`), eux-mêmes divisés en **Views** (`DashboardView`, `VirtualConsoleView`, etc.).
- Chaque vue utilise des hooks `Zustand` (`useMidiStore.ts`, `useFixturesStore.ts`) pour s'abonner aux données pertinentes. L'interface réagit quasi-instantanément aux changements d'état sans recharger la page (Single Page Application).

### 3. Le Pont de Communication (IPC Bridge)
Les deux mondes (Main et Renderer) s'exécutent de façon isolée (pour des raisons de sécurité imposées par Electron). Ils ne peuvent se parler qu'à travers le fichier `preload.ts`.
- **Flux Descendant (React → Node)** : Quand vous bougez un fader, React appelle une fonction exposée par le `preload` (ex: `window.dmxAPI.updateChannel(1, 255)`). Le `preload` relaie ce message au Main Process via `ipcRenderer.invoke()`.
- **Flux Montant (Node → React)** : Le Main Process signale à l'interface que quelque chose a changé (ex: `window.dmxAPI.onUniverseUpdate()`). Zustand capte ce message et met à jour l'écran.

---

## Flux de Données Typique : Le Fader DMX

Que se passe-t-il exactement quand vous montez le Fader d'une machine dans la *Virtual Console* ?

1. **User Input** : Le composant React `<VirtualConsoleView />` détecte le glissement de la souris.
2. **State Mutation** : La fonction `onChange` appelle `window.fixtureAPI.setStates()`.
3. **IPC Transport** : Le message traverse la barrière Electron.
4. **Backend Logic** : `FixtureManager` dans le Main Process reçoit la commande, met à jour le *Programmer* en mémoire pour cette machine spécifique.
5. **Tick Loop** : Quelques millisecondes plus tard, `DmxEngine._tick()` s'exécute. Il demande à `FixtureManager` la valeur finale des canaux, fusionne tout cela (HTP, LTP), applique le Grand Master, et envoie le *Buffer Array* par USB et Art-Net.
6. **UI Feedback** : (Si nécessaire) Le backend renvoie le nouvel état global, Zustand se met à jour, et la LED virtuelle sur l'écran s'illumine.

---

## Gestion Audio et MIDI

- **MIDI** : Implémenté directement dans le Frontend via l'API Web MIDI (`navigator.requestMIDIAccess`). Les signaux du contrôleur MIDI (ex: potentiomètres) modifient le State Zustand, qui envoie ensuite des commandes IPC au backend. Le MTC (MIDI Timecode) est également décodé côté client via la fonction `_handleMidiData`.
- **Audio** : Géré via l'API Web Audio (`navigator.mediaDevices.getUserMedia`). Un analyseur FFT extrait les basses/aigus pour détecter les "Beats" (BPM). L'application compagnon mobile (WebSocket) peut activer cette écoute à distance en envoyant un message au backend, qui ordonne au frontend de lancer le hook `useAudioAnalyzer`.

---

## Stockage et Fichiers Locaux

L'application sauvegarde ses données sous forme de fichiers JSON, lisibles et modifiables par l'utilisateur, dans le dossier racine : `~/Documents/DmxMaster/` (sur macOS/Linux) ou `C:\Users\...\Documents\DmxMaster\` (sur Windows).
- `Profiles/` : Les personnalités (canaux) de chaque projecteur (DMX Traits).
- `Patch.json` : Les projecteurs patchés sur les univers avec leur adresse.
- `Groups.json` : Les groupes de projecteurs et les niveaux de submasters.
- `Scenes/`, `Chasers/`, `Palettes/` : Les shows préenregistrés.
- `VirtualConsole.json` : La grille visuelle et les mappings des widgets.

*(Développé par Fullann)*
