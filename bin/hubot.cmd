@echo off

call npm install
SETLOCAL
SET PATH=node_modules\.bin;node_modules\hubot\node_modules\.bin;%PATH%
SET HUBOT_AUTH_ADMIN=Shell,shell

node_modules\.bin\hubot.cmd --name "BillBot" %*
