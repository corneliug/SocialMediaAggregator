var _ = require('lodash');

var port =  _.has(process, 'env.MONGO_PORT_27017_TCP_ADDR') ? 8080 : 8084;

//var externalURL = "http://localhost:" + port;
var externalURL = "http://45.55.8.62:" + port;

module.exports = {
    "port": port,
    "db": _.has(process, 'env.MONGO_PORT_27017_TCP_ADDR')
        ? "mongodb://" + process.env.MONGO_PORT_27017_TCP_ADDR + ":" 
                       + process.env.MONGO_PORT_27017_TCP_PORT + "/socialmediaaggregator"
        : "mongodb://localhost:27017/socialmediaaggregator",
    "app": {
        "frequency": 3600,
        "postsLimit": 10,
        "feedLimit": 5,
        "logging_level": "info"
    },
    "apps": {
        "twitter": {
            "key": "zm1Xhonwx2cy7Uv4TAp7WwsAB",
            "secret": "7Crzdui213HnKwOyDSg1Fu3qJPMjuZEoIzC2KNl38zxR4dcJ8R"
        },
        "facebook": {
            "key": "1020627834636909",
            "secret": "f7e86d6fa5fa5e95f91e94c47c3e5b27"
        },
        "instagram": {
            "key": "1da7d5643ac64630b99eba92610c7583",
            "secret": "ca04749b72d047dfa8e03bca7df98ec9",
            "redirectUri": externalURL + "/instagram/authcallback",
            "access_token": ""
        },
        "google": {
            "key": "AIzaSyA7qCOvn3YgjDqeBuNvOLYqnceVfzfCND0"
        }
    },
}