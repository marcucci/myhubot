FROM ubuntu:16.10

ARG PROXY

ENV http_proxy=$PROXY \
    https_proxy=$PROXY

RUN apt-get update
RUN apt-get -y install curl
RUN curl -sL https://deb.nodesource.com/setup_6.x | bash -
RUN apt-get -y install expect redis-server nodejs

WORKDIR /opt/myhubot

ADD package.json /opt/myhubot/

RUN npm install --production

ADD lib/ /opt/myhubot/lib/
ADD external-scripts.json /opt/myhubot/
ADD bin/ /opt/myhubot/bin/
RUN chmod 755 /opt/myhubot/bin/hubot
ADD scripts/ /opt/myhubot/scripts/

EXPOSE 80

CMD /opt/myhubot/bin/hubot-pro
