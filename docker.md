# Build image

## If your behind a proxy server

`docker build --build-arg PROXY=http://proxy.company.com:8080 -t myhubot .`

## No Proxy

`docker build -t myhubot .`

## Execute image

Execute the bot and test it interactively

Bash

__Note:__  Replace the environment variable values appropriately.

```bash
docker run -it -p 80:80 \
-e HUBOT_AUTH_ADMIN="1" \
-e AGM_clientId="api_client_example_1" \
-e AGM_clientSecret="05example45g" \
-e AGM_apiUrl="https://agilemanager-itg.saas.hp.com/" \
-e github_api_url="https://api.github.com/v3" \
-e github_owner="marcucci" \
-e github_repo="test" \
-e HUBOT_GITHUB_USER="owner-name" \
-e HUBOT_GITHUB_TOKEN="token" \
myhubot bash
```

Execute the script `bin/hubot` inside the container.

PowerShell

```powershell
docker run -it -p 80:80 `
-e HUBOT_AUTH_ADMIN="1" `
-e AGM_clientId="api_client_example_1" `
-e AGM_clientSecret="05example45g" `
-e AGM_apiUrl="https://agilemanager-itg.saas.hp.com/" `
-e github_api_url="https://api.github.com/v3" `
-e github_owner="marcucci" `
-e github_repo="test" `
-e HUBOT_GITHUB_USER="owner-name" `
-e HUBOT_GITHUB_TOKEN="token" `
myhubot bash
```

Execute the script `bin/hubot` inside the container.
