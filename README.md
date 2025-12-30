# LightLand RP — Serveur équivalent (clé en main)

## ✅ Important (pour toi)
Tu es sur le plan **Free** Render, donc **pas de disque persistant**.
➡️ Ça veut dire : **les items/contacts/messages peuvent se reset** quand Render redéploie ou redémarre.
(Par défaut, Render a un filesystem éphémère.) 

Si tu veux garder les données pour toujours, il faudra passer sur un plan payant et ajouter un **Persistent Disk** depuis le Dashboard Render.

Docs Render : Persistent disks = dispo pour services payants.

## Déploiement (sans installer quoi que ce soit)
1) Crée un repo GitHub
2) Upload tous les fichiers (y compris `render.yaml`)
3) Render → New → Blueprint → Deploy

## Activer ton joueur (1 seule fois)
POST `https://TON-SITE.onrender.com/api/setup`
Body JSON :
{
  "display": "TonPseudo",
  "panelToken": "TON_PANEL_TOKEN",
  "phoneToken": "TON_PHONE_TOKEN"
}

## Ouvrir les pages
- Inventaire : `https://TON-SITE.onrender.com/#inventaire?panel_token=TON_PANEL_TOKEN`
- Téléphone : `https://TON-SITE.onrender.com/#telephone?phone_token=TON_PHONE_TOKEN`
