# Skill : commit

Génère et exécute un commit Git en respectant les Conventional Commits du projet.

## Étapes obligatoires

1. **Lire le diff** — exécute `git diff --staged` pour voir exactement ce qui est stagé. Si rien n'est stagé, liste les fichiers modifiés avec `git status --short` et demande confirmation avant de stager.

2. **Lire l'historique** — exécute `git log --oneline -5` pour capter le style et la langue des commits récents (ce projet : français, impératif présent).

3. **Rédiger le message** en respectant **exactement** le format du projet :
   ```
   <type>(<scope>): <description courte en français, impératif présent>

   [corps optionnel : pourquoi, pas quoi — max 72 chars/ligne]

   [footer optionnel : Closes #XX, BREAKING CHANGE: ...]
   ```

   Types autorisés : `feat` `fix` `docs` `style` `refactor` `test` `chore` `ci` `perf` `build`

   Règles strictes :
   - Tout en **minuscules**
   - **Impératif présent** : "ajouter", "corriger", "supprimer" (pas "ajouté", "correction de")
   - **Pas de point** à la fin du titre
   - Titre ≤ **72 caractères**
   - **Jamais** de mention de Claude, Co-Authored-By, ou d'outil dans le message

4. **Présenter le message** à l'utilisateur avant d'exécuter le commit.

5. **Exécuter** : `git commit -m "<message>"` (utilise un HEREDOC si le corps est multiligne).

6. **Vérifier** que le hook lefthook passe (Biome + conventional-commits). Si un hook échoue, corriger le problème et créer un **nouveau** commit (ne jamais amender).

## Exemples

```
feat(auth): ajouter la connexion via OAuth Google
fix(api): corriger le timeout sur les requêtes longues
chore(deps): mettre à jour eslint en v9
refactor(db): extraire la logique de pagination dans un helper
```
