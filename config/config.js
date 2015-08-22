module.exports = {
  db : "mongodb://sma:sma1@ds031873.mongolab.com:31873/socialmediaaggregator",
  app: {
    frequency: 3600, //in seconds=1 hr
    postsLimit: 1,
    logging_level: 'info'
  },
  apps: {
    twitter: {key: "zm1Xhonwx2cy7Uv4TAp7WwsAB", secret: "7Crzdui213HnKwOyDSg1Fu3qJPMjuZEoIzC2KNl38zxR4dcJ8R"},
    facebook: {key: "1020627834636909", secret: "f7e86d6fa5fa5e95f91e94c47c3e5b27"},
    instagram: {key: "1da7d5643ac64630b99eba92610c7583", secret: "ca04749b72d047dfa8e03bca7df98ec9"},
    google: {key: "AIzaSyA7qCOvn3YgjDqeBuNvOLYqnceVfzfCND0", secret: "bDuw-BnTKL12_aBVmOd-9cf3"}
  },
  accounts: {
    twitter: ["@cristiano", "@facebook", "#govtech"],
    facebook: ['@cristano', "@cristiano", "@facebook"],
    instagram: ["@repostapp", "@nike", "#shoes"],
    youtube: ["@overboardhumor", "#sports"]
  }
}

