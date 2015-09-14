module.exports = {
    "db": "**************************",
    "app": {
        "frequency": 3600,
        "postsLimit": 10,
        "feedLimit": 5,
        "logging_level": "info"
    },
    "apps": {
        "twitter": {
            "key": "**************************",
            "secret": "**************************"
        },
        "facebook": {
            "key": "**************************",
            "secret": "**************************"
        },
        "instagram": {
            "key": "**************************",
            "secret": "**************************",
            "redirectUri": "http://localhost:8080/instagram/authcallback",
            "access_token": ""
        },
        "google": {
            "key": "**************************"
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
