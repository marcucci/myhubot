FROM node

ENV HTTP_PROXY 'http://proxy.houston.hpecorp.net:8080'
ENV HTTPS_PROXY 'http://proxy.houston.hpecorp.net:8080'

ADD lib/ /opt/myhubot/lib/
ADD bin/ /opt/myhubot/bin/
ADD scripts/ /opt/myhubot/scripts/
ADD package.json /opt/myhubot/
ADD external-scripts.json /opt/myhubot/
ADD bin/hubot-pro /opt/myhubot/bin/
RUN chmod 755 /opt/myhubot/bin/hubot-pro

WORKDIR /opt/myhubot

# -----------------------------------------------------------------------------
# Install
# -----------------------------------------------------------------------------
RUN npm install --production; npm cache clean

EXPOSE 80
VOLUME /opt/myhubot/scripts

CMD ./bin/hubot-pro
