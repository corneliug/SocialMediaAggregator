module.exports = {
    "db": "mongodb://sma:sma1@ds031873.mongolab.com:31873/socialmediaaggregator",
    "app": {
        "frequency": 3600,          // frequency of running platform data aggregators, in seconds
        "postsLimit": 4,            // max posts to be extracted from platforms, in one call
        "feedLimit": 5,             // max posts to be retrieved by an API call
        "logging_level": "info"     // {info, debug}
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
        "instagram": {  // to be replaced
            "key": "1da7d5643ac64630b99eba92610c7583",
            "secret": "ca04749b72d047dfa8e03bca7df98ec9",
            "redirectUri": "http://localhost:8080/instagram/authcallback"
        },
        "google": {     // to be replaced 
            "key": "AIzaSyA7qCOvn3YgjDqeBuNvOLYqnceVfzfCND0"
        }
    },
    "accounts": {
        "twitter": [
            "@cristiano",
            "@facebook",
            "#govtech"
        ],
        "facebook": [
            "@cristiano",
            "@facebook"
        ],
        "instagram": [
            "@repostapp",
            "@nike",
            "#shoes"
        ],
        "youtube": [
            "@overboardhumor",
            "#sports"
        ]
    }
}