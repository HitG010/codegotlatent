# Deploying CodeGotLatent

Two small ARM servers (Oracle Cloud's Always Free tier fits both), with
Cloudflare in front:

| Server | Runs | Reachable from |
| --- | --- | --- |
| **app** | Postgres, the API, the judging worker, a Cloudflare Tunnel ([`app/compose.yml`](app/compose.yml)) | Nowhere directly: API traffic arrives through the tunnel, which connects out to Cloudflare |
| **judge** | go-judge, which runs submitted code ([`judge/compose.yml`](judge/compose.yml)) | The app server only, on the private network, with a token |
| **web** | The static web app on Cloudflare Pages | Everyone |

Serve the web app and the API from the same domain (`codegotlatent.com` and
`api.codegotlatent.com`). Sign-in keeps its session in a cookie, which browsers
only send reliably between sites on the same domain.

The judge server holds no data and no secrets except its own token. The
worker sends it programs and test inputs, then checks the output itself, so
expected answers never leave the app server. Submitted programs run with no
network access. Code that escaped the sandbox would find an empty machine.

## One-time setup

**Servers.** Create two Ampere A1 instances running Ubuntu 24.04 (2 OCPU and 12 GB
each fits the free allowance) in the same VCN. Open no ports to the internet except SSH.
On the judge server, allow TCP 5050 from the app server's private IP only.
[Install Docker Engine](https://docs.docker.com/engine/install/ubuntu/) on both. Then
clone this repository to `/opt/codegotlatent` on both.

**Judge server.**

```sh
cd /opt/codegotlatent/infra/deploy/judge
cp .env.example .env && chmod 600 .env   # JUDGE_TOKEN and this server's private IP
docker compose up -d --build
```

**Cloudflare Tunnel.** In Cloudflare Zero Trust, go to Networks, then Tunnels, and
create a tunnel. Add a public hostname for the API (e.g. `api.codegotlatent.com`)
pointing at `http://api:4000`, and copy the tunnel token.

**App server.**

```sh
cd /opt/codegotlatent/infra/deploy/app
cp .env.example .env && chmod 600 .env   # secrets, origins, judge address, tunnel token
docker compose up -d --build
```

Check it from the app server:

```sh
curl -H "authorization: Bearer $JUDGE_TOKEN" http://<judge-private-ip>:5050/file   # {} means the judge is reachable
curl https://api.codegotlatent.com/health                                           # {"ok":true,"db":"up"}
```

**Web app.** Build it with the API's URL and the Google client ID. The build
refuses to run without them, because the app would otherwise fall back to
sample data:

```sh
VITE_API_URL=https://api.codegotlatent.com VITE_GOOGLE_CLIENT_ID=… pnpm --filter @cgl/web build
```

Publish `apps/web/dist` to Cloudflare Pages. It includes `_headers`: a content
security policy that only allows our own code, the API and Google sign-in, plus
long caching for the hashed assets. With no `404.html`, Pages serves
`index.html` for every route, which the app's routing needs. In Google Cloud
Console, add the site's origin to the OAuth client's authorized JavaScript
origins.

## Updating

```sh
git pull && docker compose up -d --build
```

The `migrate` service applies new migrations before the API and worker start.
The worker finishes the submissions it is judging before it stops (up to two
minutes). Anything still unfinished is picked up again when it restarts.

## Problems and contests

Problem packages hold hidden tests and reference solutions, and a contest spec
names a round's problems before it starts. They never go in this public
repository. `.gitignore` refuses the usual places, and the Docker image never
contains them. Keep them in a **private** repository:

```
cgl-problems/
  problems/<slug>/          one package per problem (packages/problem-package/README.md)
  contests/<round>.yaml     contest specs (apps/api/contests/example.yaml)
```

On the app server, clone it with a read-only deploy key, set `PROBLEMS_DIR` in
`.env`, and use [`app/cgl`](app/cgl):

```sh
cd /srv/cgl-problems && git pull
/opt/codegotlatent/infra/deploy/app/cgl import problems/round-3-*             # for a contest: not in practice yet
/opt/codegotlatent/infra/deploy/app/cgl contest contests/round-3.yaml
/opt/codegotlatent/infra/deploy/app/cgl import --practice problems/warmup-*   # practice-only problems
```

Imported test files go to the `blobs` volume, hidden tests included, so back it
up privately.

## When the judge is down

Submissions wait in the queue and are judged when it is back. The worker logs
`sandbox unavailable` and stops taking new submissions. A submission caught
mid-judging uses up one of its five attempts. After five failures it is marked
Internal error, which costs no penalty in a contest. A contest's results are
published only once every submission in it has been judged.
