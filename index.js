var express = require('express');
var app = express();
var SCOPES = ['https://www.googleapis.com/auth/calendar'];
var google = require('googleapis');
var googleAuth = require('google-auth-library');
var path = require('path');
var calendar = require("./google.js");
var bodyParser = require('body-parser');
var topSecret = require('./top_secret.json');

var d = require('domain').create();
d.on('error', function(err){
  console.log(err);
  return
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 */

var clientSecret = process.env.CLIENTSECRET || topSecret.client_secret;
var clientId = process.env.CLIENTID || topSecret.client_id;
var redirectUrl = process.env.REDIRECTURL || "http://localhost:3000/cb";
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
    delete_button: req.param('delete_button'),
    code: '',
    access_token: req.param('token') || ''
  });
});

app.get('/cb', function (req, res) {
  res.render('pages/index', {
    authUrl: authUrl,
    code: req.query.code,
    delete_button: false,
    access_token: ''
  });
});

app.post('/createcalendar', function(req, res) {
  d.run(oauth2Client.getToken(req.body.code, function (err, token) {
    if (err) {
      console.log('Error while trying to retrieve access token', err);
      return res.json({success: false});
    }

    oauth2Client.credentials = token;
    calendar.createCalendar(oauth2Client, req.body.calendar, function (err) {
      if (err)
        return res.json({success: false});
      return res.json({success: true, access_token: token.access_token});
    });
  }))
});

app.post('/deletecalendar', function(req, res) {
  d.run(function () {
    oauth2Client.credentials = {access_token: req.body.token};
    calendar.deleteCalendar(oauth2Client, function(err) {
      if (err)
        return res.json({success: false});
      return res.json({success: true});
    });
  })
});


app.listen(process.env.PORT || 3000, function () {
  console.log('Example app listening on port 3000!');
});