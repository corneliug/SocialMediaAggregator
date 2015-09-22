FROM mhart/alpine-node:0.12

# copy app and install deps

# RUN npm install -g forever
# RUN npm install

RUN apk add --update tzdata

EXPOSE 8080

CMD [ "node", "/src/app.js" ]