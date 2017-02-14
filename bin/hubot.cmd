@echo off

call npm install
SETLOCAL
SET PATH=node_modules\.bin;node_modules\hubot\node_modules\.bin;%PATH%

SET HUBOT_AUTH_ADMIN="shell"

SET AGM_clientId=api_client_example_1
SET AGM_clientSecret=05example45g
SET AGM_apiUrl=https://agilemanager-itg.saas.hp.com/

SET github_api_url=https://api.github.com/v3
SET github_owner=marcucci
SET github_repo=test

node_modules\.bin\hubot.cmd --name "gitbot" %*
