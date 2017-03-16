FROM ubuntu:16.10

ARG PROXY

ENV http_proxy=$PROXY \
    https_proxy=$PROXY

RUN apt-get update
RUN apt-get -y install expect redis-server nodejs npm
RUN ln -s /usr/bin/nodejs /usr/bin/node

WORKDIR /opt/myhubot

ADD package.json /opt/myhubot/

RUN npm install --production

ADD lib/ /opt/myhubot/lib/
ADD external-scripts.json /opt/myhubot/
ADD bin/ /opt/myhubot/bin/
RUN chmod 755 /opt/myhubot/bin/hubot
ADD scripts/ /opt/myhubot/scripts/

EXPOSE 80

CMD /opt/myhubot/bin/hubot
