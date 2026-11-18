NOAM CUTS V8.0 — NH CUTZ

NOUVEAU EN V8
- Ouverture instantanée : l'appli s'affiche depuis le cache, puis se met à jour
  en arrière-plan (petit message « Nouvelle version disponible »).
- Écran de lancement iOS avec le logo NHCUTZ (noir ou blanc selon le mode du téléphone).
- Nouveau logo NHCUTZ partout (icônes, en-tête).
- Design style iOS, mode clair et sombre automatiques.
- Notifications push à chaque réservation, modification ou annulation sur nhcutz.ch.
- Résumé du soir à 20h (heure suisse) : « Demain : 3 RDV · premier à 14h00 ».
- Écran « Dispos » (Agenda › Dispos) : horaires, jours bloqués, créneaux exceptionnels.
- Sauvegarde en ligne automatique, 1 fois par jour (les 30 dernières sont gardées).
- La clé Cal.com est sur le serveur Netlify, plus sur le téléphone.

TES DONNÉES
- Mêmes clés qu'avant (noamcuts-v1, noamcuts-stock-v3, noamcuts-goal-v3,
  noamcuts-settings-v4, noamcuts-clients-v6, noamcuts-meta-v6, noamcuts-cal-v7,
  noamcuts-snapshot-avant-v6). Rien n'est supprimé.
- Au 1er lancement de la V8, une copie de sécurité de tout est faite
  (Plus › Réglages › « Restaurer les données d'avant la V8 »).
- L'appli doit rester sur LE MÊME site Netlify (même adresse), sinon les données
  du téléphone ne sont plus visibles.

MISE EN LIGNE (une seule fois)
1) Netlify › ton site EXISTANT › Project configuration › Build & deploy ›
   Continuous deployment › Link repository › GitHub › noamhugonnaud/Noam-cuts,
   branche main. Laisse « Base directory » et « Build command » vides :
   le fichier netlify.toml s'occupe du reste (dossier publié : noam-cuts-github).
   Ne crée PAS de nouveau site.
2) Netlify › Project configuration › Environment variables, ajoute :
   APP_SECRET, CAL_API_KEY, CAL_WEBHOOK_SECRET, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY
   puis Deploys › Trigger deploy.
3) Cal.com › Settings › Developer › Webhooks › New :
   URL : https://TON-SITE/api/webhook-cal
   Événements : Booking Created, Booking Rescheduled, Booking Cancelled
   Secret : la même valeur que CAL_WEBHOOK_SECRET. Clique « Ping test ».
4) Sur l'iPhone (iOS 16.4 minimum), ouvre Noam Cuts depuis son icône :
   Plus › Réglages › Saisir le code secret (APP_SECRET), puis
   « Activer les notifications » et « Envoyer une notif test ».

NOUVELLE ICÔNE SUR L'IPHONE
iOS garde l'ancienne icône tant que l'appli n'est pas réinstallée, et
SUPPRIMER L'ICÔNE SUPPRIME LES DONNÉES DU TÉLÉPHONE. Donc, dans cet ordre :
1) Ouvre l'appli V8, saisis le code secret, puis Réglages › Sauvegarde en ligne ›
   « Sauvegarder maintenant ». Fais AUSSI « Exporter mes données (.json) »
   et garde le fichier dans Fichiers / iCloud Drive.
2) Vérifie dans « Voir les sauvegardes » que celle du jour est là.
3) Supprime l'icône, puis Safari › ton site › Partager › Sur l'écran d'accueil.
4) Ouvre la nouvelle icône, saisis le code secret, Réglages › Voir les sauvegardes ›
   Restaurer la plus récente. Réactive les notifications.
Si tu préfères ne prendre aucun risque : garde l'ancienne icône, tout le reste
de la V8 fonctionne quand même.

POUR LE DÉVELOPPEMENT (ordinateur)
npm install · npm run dev (netlify dev) · npm test · npm run images (régénère icônes et écrans)
