var _ = require('lodash');

var port =  _.has(process, 'env.MONGO_PORT_27017_TCP_ADDR') ? 8080 : 8084;

var externalURL = "http://localhost:" + port;

module.exports = {
    "port": port,
    "db": _.has(process, 'env.MONGO_PORT_27017_TCP_ADDR')
        ? "mongodb://" + process.env.MONGO_PORT_27017_TCP_ADDR + ":"
    + process.env.MONGO_PORT_27017_TCP_PORT + "/socialmediaaggregator"
        : "mongodb://sma:sma1@ds031873.mongolab.com:31873/socialmediaaggregator",
    "app": {
        "frequency": 3600,
        "postsLimit": 10,
        "feedLimit": 5,
        "logging_level": "info"
    },
    "apps": {
        "twitter": {
            "key": "zm1Xhonwx2cy7Uv4TAp7WwsAB"
        },
        "facebook": {
            "key": "1020627834636909",
        },
        "instagram": {
            "key": "1da7d5643ac64630b99eba92610c7583",
            "redirectUri": externalURL + "/instagram/authcallback",
            "access_token": "062a590c028f4b2fad2eb64f8dc71c0d"
        },
        "google": {
            "key": "AIzaSyA7qCOvn3YgjDqeBuNvOLYqnceVfzfCND0"
        },
        "foursquare" : {
            "key": "1CAZ5UW5UDQ2F1EDEHFOULURU4K3RBWWITBOONJ2XLXPD52V"
        },
        "yelp" : {
            "consumer_key": "DQ1s8oBXcE3sjYLBB6BX9w",
            "token": "rVH7LgayRFrGQf-p43lT71d9wzswQrXJ"
        }
    }
}