var express = require('express');
var app = express();
var SCOPES = ['https://www.googleapis.com/auth/calendar'];
var google = require('googleapis');
var googleAuth = require('google-auth-library');
var path = require('path');
var calendar = require("./google.js");
var bodyParser = require('body-parser')

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 */

var clientSecret = "_l3Ic6ogSDeJnNS5z5szpDts";
var clientId = "301399655599-2rsognkd7fupttdl2gncn2uqdhpo1g5s.apps.googleusercontent.com";
var redirectUrl = "http://localhost:3000/cb";
var auth = new googleAuth();
var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);
var authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES
});

// set the view engine to ejs
app.set('view engine', 'ejs');
app.use( bodyParser.json() );
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', function (req, res) {
  res.render('pages/index', {
    authUrl: authUrl,
    result: ''
  });
});

app.get('/cb', function (req, res) {
  res.render('pages/index', {
    authUrl: authUrl,
    result: req.query.code
  });
});

app.post('/createcalendar', function(req, res) {
  console.log(req.body.code);
  oauth2Client.getToken(req.body.code, function(err, token) {
    if (err) {
      console.log('Error while trying to retrieve access token', err);
      return res.json({success: false});
    }
    oauth2Client.credentials = token;
    calendar.createCalendar(oauth2Client, '');
    return res.json({success: true});
  });
});


app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});