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
    InstagramRoutes = require(__dirname + '/social_media_aggregator/routes/InstagramRoutes'),
    basicAuth = require('basic-auth');

require('./config/db');

// Load ENV
var path = process.env.MONGO_PORT_27017_TCP_ADDR 
         ? '/src/.env'
         : '.env';

require('dotenv').config({path: path});

global.config = require(__dirname + "/config/config.js");

var app = express();

global.routeAuth = function (req, res, next) {
  function unauthorized(res) {
    res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
    return res.send(401);
  };

  var user = basicAuth(req);

  if (!user || !user.name || !user.pass) {
    return unauthorized(res);
  };

  if (user.name ===  process.env.API_AUTH_USER && user.pass === process.env.API_AUTH_PASS) {
    return next();
  } else {
    return unauthorized(res);
  };
};

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
// app.use(express.static(path.join(__dirname, 'public')));
app.use(session({ 
    secret: 'asd13asd786youtasvasdas3a78vwe123',
    resave: true,
    saveUninitialized: true
}));
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
app.use(bodyParser.json()); // for parsing application/json

// Test home route
app.get('/', function(req, res) {
    res.send("Hello");
    AggregatorController.extractData();
});

app.listen(config.port);

//AggregatorController.startExecution();

// Routes
app.use('/instagram', InstagramRoutes);
app.use('/api', ApiRoutes);
app.use('/user', UserRoutes);

module.exports = app;
