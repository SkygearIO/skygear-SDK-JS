var version = process.env.VERSION;

module.exports = {
  "dev": {
    "API_URL": "http://skygear.dev/",
    "SKYGEAR_VERSION": version
  },
  "production": {
    "API_URL": "http://myapp.skygeario.com/",
    "SKYGEAR_VERSION": version
  }
}
