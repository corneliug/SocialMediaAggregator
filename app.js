var express = require('express'),
    cors = require('cors'),
    path = require('path'),
    reqLogger = require('morgan'),
    winston = require('winston'),
    session = require('express-session'),
    bodyParser = require('body-parser'),
    AggregatorController = require(__dirname + '/social_media_aggregator/AggregatorController'),
    ApiRoutes = require(__dirname + '/api/routes/ApiRoutes'),
    UserRoutes = require(__dirname + '/api/routes/UserRoutes'),
    InstagramRoutes = require(__dirname + '/social_media_aggregator/routes/InstagramRoutes');

global.config = require(__dirname + "/config/config.js");

var app = express();

winston.level = config.app.logging_level;
global.logger = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)({
            timestamp: function() {
                var dt = new Date();
                var formatted = dt.getDate() + "/" + (dt.getMonth() + 1) + "/" + dt.getFullYear() + " ";
                formatted += dt.getHours() + ":" + dt.getMinutes() + ":" + dt.getSeconds() + ":" + dt.getMilliseconds();

                return formatted;
            },
            formatter: function(options) {
                // Return string will be passed to logger.
                return options.timestamp() +' '+ options.level.toUpperCase() +' '+ (undefined !== options.message ? options.message : '') +
                    (options.meta && Object.keys(options.meta).length ? '\n\t'+ JSON.stringify(options.meta) : '' );
            }
        }),
        new (winston.transports.File)({ filename: 'app.log' })
    ]
});

app.use(cors({
    'methods': ['GET', 'POST']
}));
app.use(reqLogger('dev'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({ 
    secret: 'asd13asd786youtasvasdas3a78vwe123',
    resave: true,
    saveUninitialized: true
}));
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
app.use(bodyParser.json()); // for parsing application/json

require('./config/db');

// Test home route
app.get('/', function(req, res) {
    res.send("Hello");
    AggregatorController.startExecution();
});

app.listen(config.port);

// AggregatorController.startExecution();

// Routes
app.use('/instagram', InstagramRoutes);
app.use('/api', ApiRoutes);
app.use('/user', UserRoutes);

module.exports = app;
