# ShareURL

Petite application pour maintenir une liste de liens partagee, pensee pour rester utilisable depuis des navigateurs tres basiques (liseuses).

## Lancement local

```bash
cp .env.example .env
# editer .env et definir APP_PASSWORD
npm start
```

## Lancement avec Docker

```bash
docker build -t shareurl .
docker run -p 3000:3000 -e APP_PASSWORD=change-me -v $(pwd)/data:/app/data shareurl
```

Ou avec docker-compose (necessite `APP_PASSWORD` dans l'environnement ou un fichier `.env`) :

```bash
docker compose up --build
```

Le fichier `data/links.json` doit etre monte en volume pour conserver les liens entre deux demarrages du conteneur.
