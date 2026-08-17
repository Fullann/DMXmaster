# DMX Master - Manuel d'Utilisation

Bienvenue dans le manuel d'utilisation de **DMX Master** ! Ce guide vous expliquera comment utiliser les principales fonctionnalités du logiciel pour concevoir, programmer et contrôler vos spectacles lumière.

---

## Sommaire
1. [Introduction](#introduction)
2. [Premiers Pas](#premiers-pas)
3. [Le Patch et la Bibliothèque](#le-patch-et-la-bibliothèque)
4. [L'Écran de Contrôle (Virtual Console)](#lécran-de-contrôle)
5. [Création de Scènes et Chasers](#création-de-scènes-et-chasers)
6. [Visualiseur 3D](#visualiseur-3d)
7. [Réseau et Art-Net](#réseau-et-art-net)

---

## 1. Introduction

**DMX Master** est un logiciel professionnel de contrôle d'éclairage DMX. Il a été pensé pour offrir une flexibilité totale lors de spectacles en direct ("Live") tout en gardant une interface intuitive et moderne. 

### Concepts clés :
- **Workspace (Show)** : Votre projet entier contenant le patch, les scènes, la console virtuelle, etc. Vous pouvez sauvegarder et charger des "Shows".
- **Univers DMX** : Un espace de 512 canaux contrôlant vos projecteurs.
- **Fixture (Projecteur)** : Un appareil d'éclairage (Lyre, PAR, Laser, etc.) auquel on assigne un "Profil".

---

## 2. Premiers Pas

À l'ouverture de l'application, l'écran d'accueil (Home) vous propose un résumé de votre installation (Dashboard) et 4 actions principales :
- **Continue Current Show** : Reprendre votre travail en cours.
- **Create New Show** : Partir de zéro pour une nouvelle prestation.
- **Import Show** / **Export Show** : Charger ou sauvegarder votre projet sous la forme d'un fichier.

L'interface est divisée en plusieurs modes de travail accessibles en haut de l'écran :
1. **Setup** : Pour configurer vos projecteurs (Patch), le réseau et la bibliothèque.
2. **Program** : Pour la création d'effets, le matriçage de pixels et la création de palettes.
3. **Playback** : Pour le contrôle en direct de votre show (Virtual Console, Live Grid, Cuelist).

---

## 3. Le Patch et la Bibliothèque

### La Bibliothèque (Library)
Avant de pouvoir utiliser une machine, DMX Master doit la connaître. Rendez-vous dans **Setup > Library**.
- Vous y trouverez les profils de projecteurs déjà enregistrés.
- **Générateur IA** : Vous pouvez générer automatiquement un profil en collant les spécifications de votre projecteur dans la zone de texte prévue. L'IA s'occupera d'écrire la configuration des canaux !

### Le Patch
Rendez-vous dans **Setup > Patch** pour assigner une adresse DMX à vos projecteurs.
1. Sélectionnez un profil depuis la liste déroulante.
2. Entrez l'adresse de départ ou utilisez le bouton **Auto** pour trouver la première adresse libre.
3. Cliquez sur **Patch Fixture**.
4. Votre projecteur apparaîtra dans la liste avec des options pour le *Cloner*, le *Morpher* (changer son modèle sans perdre la programmation) ou le supprimer.

---

## 4. L'Écran de Contrôle (Virtual Console)

La **Virtual Console** (accessible dans *Playback*) est votre espace de jeu pour le direct.
C'est une interface entièrement personnalisable (Drag & Drop) qui vous permet de disposer les contrôles comme vous le souhaitez.

**Comment ajouter des éléments :**
1. Cliquez sur le bouton "Edit Mode" (l'icône de crayon) en haut à droite.
2. Le tiroir d'outils (Widgets) apparaît à gauche.
3. Glissez-déposez un widget sur la grille :
   - **Bouton (Button)** : Pour lancer des scènes (Flash ou Toggle).
   - **Slider (Fader)** : Pour contrôler l'intensité de vos groupes ou faire varier une valeur.
   - **Roue de Couleur (Color Picker)** : Pour changer la couleur de vos machines à la volée.
   - **Pad X/Y** : Pour contrôler le mouvement (Pan/Tilt) de vos lyres avec votre souris ou doigt.
4. Quittez le mode "Edit" pour verrouiller votre interface et l'utiliser en live.

---

## 5. Création de Scènes et Chasers

### Scènes
Une scène est un état d'éclairage figé (ex: Lyres en bleu, pointées vers le centre de la scène).
- Pour créer une scène, réglez vos projecteurs (depuis *Control* ou la *Virtual Console*).
- Allez dans **Scenes** et cliquez sur "Save Current State". 

### Chasers
Un Chaser est une boucle (séquence) de plusieurs scènes.
- Allez dans **Chasers**.
- Créez un nouveau Chaser et ajoutez-y les scènes que vous souhaitez faire défiler.
- Réglez le BPM (battements par minute) pour accélérer ou ralentir l'effet, ou utilisez le bouton "Tap Tempo" en direct.

---

## 6. Visualiseur 3D

Le module **3D View** (disponible dans *Setup* et *Playback*) vous permet de pré-programmer vos shows de chez vous, sans avoir le matériel branché.
- Il génère des faisceaux lumineux volumétriques réalistes (Light beams).
- Il prend en compte les Gobos virtuels (motifs projetés).
- Vous pouvez déplacer vos machines virtuellement en sélectionnant un projecteur et en utilisant les flèches de l'axe X/Y/Z.

*(Astuce : DMX Master utilise un rendu natif optimisé pour ne pas saturer votre carte graphique).*

---

## 7. Réseau et Art-Net

DMX Master est compatible avec les protocoles réseau standards.
- Rendez-vous dans **Setup > Network & RDM** (ou utilisez l'icône **Net** dans la barre supérieure).
- Ajoutez l'adresse IP de votre boîtier Art-Net (ex: un boîtier WLED ou un node DMX standard).
- Le logiciel enverra directement le signal DMX par le réseau Wi-Fi/Ethernet.

---
**Développé par Fullann**
*Bon spectacle ! 🚀*
