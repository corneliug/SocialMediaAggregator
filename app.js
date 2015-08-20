var express = require('express'),
    path = require('path'),
    logger = require('morgan'),
    session = require('express-session'),
    AggregatorController = require(__dirname + '/social_media_aggregator/AggregatorController'),
    InstagramRoutes = require(__dirname + '/routes/InstagramRoutes');

global.credentials = require(__dirname + "/config/credentials.js");
global.sessions = {};

var app = express();

app.use(logger('dev'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({ secret: 'asd13asd786youtasvasdas3a78vwe123' }));

require('./config/db');

app.listen(8080);

AggregatorController.startExecution();

app.use('/instagram', InstagramRoutes);

module.exports = app;
