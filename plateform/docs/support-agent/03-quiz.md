# Quiz

## Séquence commune

La version active du quiz est la version "q2". Les étapes du quiz sont organisées dans l'ordre suivant :

1. **Âge** : L'utilisateur doit indiquer son âge, compris entre 16 et 99 ans inclus. Cette information est stockée comme une valeur numérique et utilisée pour construire une réponse paramétrée pour la taxonomie `tranche_age`.

2. **Handicap** : Cette étape est conditionnelle et n'apparaît que si l'âge de l'utilisateur est compris entre 26 et 30 ans inclus. La réponse à cette question met à jour le paramètre `handicap` de la réponse `tranche_age`.

3. **Localisation** : L'utilisateur doit indiquer où il souhaite chercher des missions. Cette information produit une réponse paramétrée de taxonomie `location`.

4. **Mobilité** : L'utilisateur indique comment il se déplace généralement, ce qui calibre le rayon de recherche autour de la localisation.

5. **Motivation de recherche** : L'utilisateur sélectionne ce qui l'amène à chercher une mission aujourd'hui.

6. **Rythme** : L'utilisateur choisit le rythme qui lui conviendrait le mieux.

7. **Domaines d'engagement** : L'utilisateur sélectionne les domaines qui l'intéressent.

8. **Activités** : L'utilisateur indique ce qu'il aimerait faire concrètement.

9. **Équipe** : L'utilisateur choisit le type d'équipe dans lequel il se sentirait le plus à l'aise.

10. **Interaction** : L'utilisateur indique comment il préfère participer.

11. **Autonomie** : L'utilisateur choisit le cadre qui lui conviendrait le mieux.

12. **Imprévu** : L'utilisateur sélectionne le niveau d'imprévu qui lui conviendrait le mieux.

## Détails des étapes

### Âge

- **Type de réponse** : Numérique
- **Validations** : L'âge doit être compris entre 16 et 99 ans.
- **Embranchement** : Si l'âge est entre 26 et 30 ans, l'étape "Handicap" est affichée.

### Handicap

- **Type de réponse** : Choix unique
- **Options** :
  - Oui (`oui`)
  - Non (`non`)
  - Ne se prononce pas (`ne_se_prononce_pas`)
- **Condition de visibilité** : Âge entre 26 et 30 ans.

### Localisation

- **Type de réponse** : Paramétrée
- **Validations** : L'utilisateur doit sélectionner une adresse valide à partir des suggestions fournies.

### Mobilité

- **Type de réponse** : Choix multiple
- **Options** :
  - À pied ou transports en commun (`pied_transports`)
  - Vélo (`velo`)
  - Voiture (`voiture`)

### Motivation de recherche

- **Type de réponse** : Choix multiple
- **Options** :
  - Première expérience (`premiere_experience`)
  - Découverte métier (`decouverte_metier`)
  - Agir pour une cause (`agir_pour_une_cause`)
  - Sécurité du pays (`securite_pays`)
  - Télétravail (`remote`)
  - Rencontres (`rencontres`)
  - Indemnisation (`indemnisation`)
  - Horaires flexibles (`horaires_flexibles`)
  - Autre (`autre`)

### Rythme

- **Type de réponse** : Choix unique
- **Options** : Non spécifiées dans les sources fournies.

### Domaines d'engagement

- **Type de réponse** : Choix multiple
- **Options** :
  - Santé et bien-être (`sante_bien_etre`)
  - Sport (`sport`)
  - Solidarité et inclusion (`solidarite_inclusion`)
  - Environnement et animaux (`environnement_animaux`)
  - Art et culture (`art_culture`)
  - Sécurité et secours (`securite_secours`)
  - Citoyenneté (`citoyennete`)
  - Numérique (`numerique`)
  - Éducation (`education`)

### Activités

- **Type de réponse** : Choix multiple
- **Options** :
  - Aider et accompagner (`aider_accompagner`)
  - Transmettre et animer (`transmettre_animer`)
  - Fabriquer, réparer, terrain (`fabriquer_reparer_terrain`)
  - Secourir et protéger (`secourir_proteger`)
  - Organiser et coordonner (`organiser_coordonner`)
  - Créer et communiquer (`creer_communiquer`)

### Équipe

- **Type de réponse** : Choix unique
- **Options** :
  - Autonomie (`autonomie`)
  - Petit groupe (`petit_groupe`)
  - Grand collectif (`grand_collectif`)
  - Peu importe (`peu_importe`)

### Interaction

- **Type de réponse** : Choix unique
- **Options** :
  - Interaction collective (`interaction_collective`)
  - Équilibre collectif et autonomie (`equilibre_collectif_autonomie`)
  - Autonomie principale (`autonomie_principale`)
  - Peu importe (`peu_importe`)

### Autonomie

- **Type de réponse** : Choix unique
- **Options** :
  - Organisation libre (`organisation_libre`)
  - Accompagnement initial (`accompagnement_initial`)
  - Cadre avec suivi régulier (`cadre_suivi_regulier`)
  - Je ne sais pas (`je_ne_sais_pas`)

### Imprévu

- **Type de réponse** : Choix unique
- **Options** :
  - Adaptation rapide (`adaptation_rapide`)
  - Imprévu modéré (`imprevu_modere`)
  - Cadre prévisible (`cadre_previsible`)
  - Je ne sais pas (`je_ne_sais_pas`)

## Validation et navigation

Chaque étape nécessite au moins une réponse pour permettre à l'utilisateur de continuer. Certaines étapes de précision permettent de passer la question. Les erreurs de validation sont affichées dans le composant de saisie.

L'ordre de navigation est recalculé en fonction des conditions et des réponses actuelles. Un accès direct à une étape dont la condition n'est pas satisfaite redirige vers la première étape visible. Le bouton retour permet de revenir à l'étape visible précédente ; depuis la première étape, il ramène au début du quiz ou à l'accueil selon le composant utilisé.

## Construction du payload

Les réponses de type `options` sont transformées en une entrée `{ taxonomy, value }` pour chaque valeur sélectionnée. Les réponses de type `params` deviennent `{ taxonomy, params }`. Les réponses purement numériques ou textuelles ne sont pas ajoutées directement par `buildPayload`; elles servent à des conditions ou à d'autres traitements.

## Sources

- `plateform/app/config/quiz-flow/index.ts`
- `plateform/app/config/quiz-flow/q2.ts`
- `plateform/app/routes/quiz/age.tsx`
- `plateform/app/routes/quiz/handicap.tsx`
- `plateform/app/routes/quiz/_layout.tsx`
- `plateform/app/utils/conditions.ts`
- `plateform/app/utils/quiz.ts`
- `plateform/app/stores/quiz.ts`
