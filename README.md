# DMX Master 💡

**DMX Master** est une application professionnelle, moderne et complète de contrôle d'éclairage DMX (Lighting Console) basée sur les technologies Web (Electron, React, Zustand, Vite). Elle est conçue pour être aussi puissante qu'une console physique tout en offrant une interface utilisateur fluide, esthétique et intuitive.

![DMX Master](https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/zap.svg)

## 🚀 Fonctionnalités Principales

- **Moteur DMX 8 Univers** : Contrôle fluide jusqu'à 4096 canaux DMX.
- **Interface par Workspaces** : 
  - **Setup** : Patch de machines, création de profils, RDM, et Mapping MIDI.
  - **Program** : Tableau de bord, contrôle précis (Pan/Tilt, Couleurs), Groupes, Palettes, et Générateur de FX.
  - **Playback** : Live Grid, Cuelist, Console Virtuelle, Mode Audio, et Séquenceur Timeline.
- **Contrôle Audio & Son-lumière** : Analyseur audio intégré (Beat detection) via micro, Tap Tempo, et synchronisation avec les effets.
- **Support MIDI Complet** : Protocole "MIDI Learn" permettant de mapper n'importe quel bouton ou fader d'un contrôleur physique (ex: APC40, Launchpad) vers l'interface logicielle. Synchronisation Timecode MTC.
- **Application Compagnon Mobile (PWA)** : Interface web distante accessible via un QR Code sur le réseau local pour déclencher des actions (Tap Tempo, Micro Auto, Console Virtuelle) depuis un smartphone.
- **Virtual Console Personnalisable** : Créez votre propre tableau de bord avec des boutons, faders, roues chromatiques et pads X/Y.
- **Visualiseur 3D Intégré** : Mode fenêtré détachable pour visualiser vos éclairages sans matériel.

## 🛠 Prérequis

- Node.js (v18+)
- npm (v9+)
- Interface DMX USB (Enttec Pro compatible) ou interface Art-Net réseau.

## 📦 Installation & Lancement

1. Clonez le dépôt :
   ```bash
   git clone https://github.com/votre-compte/DMXmaster.git
   cd DMXmaster
   ```

2. Installez les dépendances :
   ```bash
   npm install
   ```

3. Lancez l'application en mode développement :
   ```bash
   npm run dev
   ```

4. Pour compiler l'application de production :
   ```bash
   npm run build
   ```

## 📚 Documentation

La documentation détaillée est disponible dans le dossier `docs/` :

- [**Manuel Utilisateur (USER_MANUAL.md)**](./docs/USER_MANUAL.md) : Guide pas-à-pas pour patcher vos premières machines, créer des scènes et utiliser la console en live.
- [**Architecture (ARCHITECTURE.md)**](./docs/ARCHITECTURE.md) : Vue d'ensemble technique, communication IPC, architecture Zustand et moteur DMX.

## 👨‍💻 Développé par

**Developed by Fullann**