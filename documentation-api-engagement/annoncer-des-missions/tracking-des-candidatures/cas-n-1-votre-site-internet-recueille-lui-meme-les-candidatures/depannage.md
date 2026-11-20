# Dépannage

| Symptôme                                          | Cause probable                                                  | Solution                                                                                  |
| ------------------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Aucune requête ne part lors de `trackApplication` | Cookie absent : la page n'a pas été ouverte via une URL trackée | Ouvrez la page via une URL trackée (`?apiengagement_id=…`) puis réessayez                 |
| Requête en erreur **400**                         | `publisher` (config) ou `mission` invalide                      | Vérifiez le Publisher ID dans `config` et l'identifiant de mission                        |
| JSTag non détecté par l'extension                 | Script absent, mal placé, ou bloqué                             | Placez le script en tête de `<head>` ; vérifiez l'absence de blocage (CSP, ad-blocker)    |
| Comportement différent du script officiel         | Version auto-hébergée obsolète                                  | Vérifiez la version de votre `jstag.js` auto-hébergé, ou repassez à la version officielle |
