# Manuel d'Utilisation - DMX Master

Bienvenue dans le manuel d'utilisation de **DMX Master**. Ce guide est structuré en fonction du flux de travail naturel de la lumière (Setup, Programmation, et Live).

---

## 1. Setup (Configuration)

L'onglet **Setup** est le cœur de la préparation de votre show. C'est ici que vous définissez quelles machines vous utilisez et comment elles communiquent.

### 1.1 Le Patch
Le "Patch" consiste à adresser vos projecteurs (Fixtures) et à les faire reconnaître par le logiciel.
1. Allez dans l'onglet **Patch**.
2. Parcourez la **Librairie de profils** sur la gauche. Si votre projecteur n'existe pas, vous pouvez créer un profil dans l'onglet "Library".
3. Faites glisser (drag-and-drop) un profil vers l'univers central, ou cliquez sur "Patch Fixture".
4. Spécifiez l'adresse de départ de la machine.
5. Une fois patchées, vous verrez vos machines apparaître avec un numéro `[ID]` unique (User Number).

### 1.2 Network & RDM
Si vous utilisez des interfaces en réseau (Art-Net, sACN) ou du RDM :
1. Allez dans l'onglet **Network & RDM**.
2. Vérifiez que la carte réseau adéquate est sélectionnée.
3. C'est également ici que vous trouverez le **QR Code** de l'Application Compagnon Mobile.

### 1.3 MIDI Mapping (Interface MIDI Learn)
DMX Master supporte les contrôleurs physiques via "MIDI Learn" :
1. Connectez votre contrôleur USB MIDI et allez dans **MIDI Mapping**.
2. Cliquez sur le bouton **MIDI LEARN**.
3. Allez dans n'importe quel onglet (par exemple, la *Virtual Console*).
4. Cliquez sur un fader ou un bouton virtuel à l'écran (il se mettra à clignoter).
5. Touchez le bouton ou bougez le fader correspondant sur votre contrôleur physique. Le lien est fait instantanément !

---

## 2. Programmation

Une fois vos machines patchées, passez au mode **Program** pour créer vos états lumineux.

### 2.1 Dashboard & Contrôle Rapide
- Le **Dashboard** affiche une grille visuelle de tous vos canaux par univers. Cliquez sur un canal pour en forcer la valeur via un curseur local.
- L'onglet **Control** affiche une vue complète des paramètres de chaque machine sélectionnée (Dimmer, Couleurs, Gobos).

### 2.2 Création de Groupes
Si vous avez beaucoup de machines, regroupez-les !
1. Allez dans l'onglet **Groups**.
2. Sélectionnez plusieurs machines.
3. Créez un nouveau groupe (ex: "Tous les Spots", "Wash de Face").
4. Les groupes disposent d'un **Submaster** automatique. Baisser le Submaster d'un groupe limite l'intensité lumineuse de toutes les machines de ce groupe, très pratique en live.

### 2.3 Scènes et Palettes
L'état actuel de votre sélection (le "Programmer") peut être sauvegardé.
- **Palettes** : Sauvegardez une couleur spécifique (ex: "Rouge Vif") ou une position pour la réappliquer rapidement.
- **Scènes** : Sauvegardez l'état complet du Programmer dans une Scène (ex: "Intro Sombre"). Vous pourrez la rappeler plus tard. Note : Utilisez le bouton "Clear" (Trash) pour vider votre Programmer avant de créer une nouvelle Scène !

### 2.4 FX Generator & Pixel Mapper
- Allez dans **FX Generator** pour appliquer rapidement des effets oscillants (Sinus, Triangle, Pulse) sur les canaux de Pan/Tilt, Intensité ou Couleur de vos machines sélectionnées.
- Le **Pixel Mapper** permet de jouer des médias (vidéos, animations) et de projeter l'image sur une grille (Matrix) de LED (ex: Rubans LED, panneaux LED matricés).

---

## 3. Playback & Live

C'est l'heure du show !

### 3.1 Virtual Console
La Console Virtuelle est un tableau de bord entièrement personnalisable que vous construisez vous-même.
1. Cliquez sur **EDIT** en haut à droite.
2. Cliquez sur une case vide pour ajouter un Fader, un Bouton, un Pad X/Y ou un sélecteur de couleurs.
3. Assignez une cible à votre widget (ex: Fader assigné au Submaster du groupe "Face").
4. Repassez en mode **PLAY** pour piloter le show de façon sécurisée.
*Note : La Virtual Console est entièrement compatible avec le MIDI Learn.*

### 3.2 Live Grid & Cuelist
- La **Live Grid** est un pad de type Launchpad (64 boutons) idéal pour l'improvisation et le "busking". Assignez-y des scènes et effets !
- La **Cuelist** est pour le théâtre et les concerts très scriptés (Cue 1, Cue 2, "Go").

### 3.3 Audio Engine & Tap Tempo
DMX Master "écoute" pour vous.
1. Allez dans **Audio Input**.
2. Activez l'écoute du micro (le graphique sonore apparaîtra).
3. Le système détectera automatiquement le BPM de la musique et l'enverra à tous les chasers "Sound-to-Light".
4. Vous pouvez aussi utiliser l'application Mobile ou le bouton **TAP** pour imposer manuellement la cadence à vos effets.

---

## 4. L'Application Compagnon Mobile

DMX Master inclut une Remote Control via le navigateur d'un smartphone, parfaite pour s'éloigner de la console pendant le réglage des projecteurs.
1. Allez dans l'onglet **Network & RDM** de l'application PC/Mac.
2. Un grand **QR Code** y est affiché. 
3. Scannez-le avec l'appareil photo de votre smartphone (assurez-vous d'être connecté au même réseau WiFi que l'ordinateur).
4. Le navigateur web mobile s'ouvrira avec une interface adaptée. Vous pourrez y déclencher :
   - Le *Tap Tempo*.
   - Le bouton *Micro Auto* (qui donne l'ordre à l'ordinateur d'écouter la musique).
   - Les Faders et boutons essentiels de la Virtual Console.
   
*(Conçu par Fullann)*
