var express = require('express'),
    path = require('path'),
    reqLogger = require('morgan'),
    winston = require('winston'),
    session = require('express-session'),
    AggregatorController = require(__dirname + '/social_media_aggregator/AggregatorController'),
    InstagramRoutes = require(__dirname + '/routes/InstagramRoutes');

global.config = require(__dirname + "/config/config.js");
global.sessions = {};

var app = express();

winston.level = config.app.logging_level;
global.logger = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)(),
        new (winston.transports.File)({ filename: 'app.log' })
    ]
});

app.use(reqLogger('dev'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({ secret: 'asd13asd786youtasvasdas3a78vwe123' }));

require('./config/db');

app.listen(8080);

AggregatorController.startExecution();

app.use('/instagram', InstagramRoutes);

module.exports = app;
