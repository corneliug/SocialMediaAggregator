FROM mhart/alpine-node:0.12

# copy app and install deps

# RUN npm install

RUN npm install -g forever

RUN apk add --update tzdata

EXPOSE 8080

# CMD [ "node", "/src/app.js" ]
# CMD ["forever","-l","/src/logs/server.log","-o","/src/logs/out.log","-e","/src/logs/err.log","/src/app.js"]
CMD forever -l /src/logs/server.log -o /src/logs/out.log -e /src/logs/err.log /src/app.js