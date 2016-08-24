var fs = require('fs');
var readline = require('readline');
var google = require('googleapis');
var googleAuth = require('google-auth-library');
var moment = require('moment');
var _ = require('lodash');

// If modifying these scopes, delete your previously saved credentials
// at ~/.credentials/calendar-nodejs-quickstart.json
var SCOPES = ['https://www.googleapis.com/auth/calendar'];
var CALENDAR = google.calendar('v3');
var TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
  process.env.USERPROFILE) + '/.credentials/';
var TOKEN_PATH = TOKEN_DIR + 'calendar-nodejs-quickstart.json';
var secret = JSON.parse(fs.readFileSync('client_secret.json', 'utf-8'));
var schedule = fs.readFileSync('schedule.txt', 'utf-8');
var sched_arr = schedule.split('\n');

sched_arr = sched_arr.filter(function(v) {
  return v !== "";
});

var events = con2goog(parseRawSchedule(sched_arr));
authorize(secret, function(auth){
 createCalendar(auth, "Concordia Schedule", function(err, response){
   if (err) {
     console.log(err);
     return;
   }
   _.forEach(events, function(event) {
     createEvent(auth, response.id, event, function(err, resp){
       if (err) {
         console.log(err);
         return;
       }
     });
   });
 });
});


// authorize(secret, function(auth){
//   listCalendars(auth, function(err, response){
//     if (err) {
//       console.log(err);
//       return;
//     }
//     var calendars = response.items.filter(function(cal){ return cal.summary === "Concordia Schedule" });
//     _.forEach(calendars, function(cal){
//       console.log(cal.id);
//       deleteCalendar(auth, cal.id, function(err, resp){
//         if (err)
//           console.log(err);
//         console.log(resp);
//       });
//     });
//   });
// });

function parseRawSchedule(sched_arr) {
  var schedule = [];
  var i = 0;
  var courseName = '';
  while(i < sched_arr.length) {
    var course = {};
    if (sched_arr[i].search(/[A-Z]{4}\s\d{3}/) !== -1) {
      // lecture
      courseName = sched_arr[i];
      course.name = courseName;
      course.startEndDate = sched_arr[i + 13];
      course.dayTime = sched_arr[i + 10];
      course.type = sched_arr[i + 9];
      course.section = sched_arr[i + 8];
      course.professor = sched_arr[i + 12];
      course.location = sched_arr[i + 11];
      i += 14;
    } else {
      // tutorial
      course.name = courseName;
      course.startEndDate = sched_arr[i + 6];
      course.dayTime = sched_arr[i + 3];
      course.type = sched_arr[i + 2];
      course.section = sched_arr[i + 1];
      course.professor = sched_arr[i + 5];
      course.location = sched_arr[i + 4];
      i += 7;
    }
    schedule.push(course);
  }

  return schedule;
}

function con2goog(schedule) {
  var events = [];
  _.forEach(schedule, function(course){
    var startendate = course.startEndDate.split(' - ');
    var days = course.dayTime.match(/[A-Z][a-z]/g);
    var times = course.dayTime.match(/[0-9]{1,2}:[0-9]{1,2}(AM|PM)/g);

    var officialStartDate = moment(startendate[0].trim() + ' ' + '06:00AM', 'MM/DD/YYYY hh:mmA');
    var officialEndDate = moment(startendate[1].trim() + ' ' + '11:59PM', 'MM/DD/YYYY hh:mmA');

    var classStartDate = moment(startendate[0].trim() + " " + times[0], 'MM/DD/YYYY hh:mmA');
    if(days.length === 1) {
      classStartDate.day(days[0]);
      if (classStartDate < officialStartDate)
        classStartDate.add('7', 'days');
    } else {
      for(var i = 0; i < days.length; i++) {
        if (officialStartDate <= classStartDate.day(days[i]))
          break;
      }
    }

    var classStartDateTime = moment(classStartDate.format('MM/DD/YYYY') + " " + times[0], 'MM/DD/YYYY hh:mmA');
    var classEndDateTime = moment(classStartDate.format('MM/DD/YYYY') + " " + times[1], 'MM/DD/YYYY hh:mmA');

    var event = {
      summary: course.type + ' - ' + course.name.split(' - ')[0] + ' - ' + course.section,
      description: course.name + '\n' + course.type + ' section ' + course.section + '\n' + course.professor,
      location: course.location,
      start:
      {
        dateTime: classStartDateTime.format(),
        timeZone: 'America/New_York'
      },
      end: {
        dateTime: classEndDateTime.format(),
        timeZone :'America/New_York'
      },
      recurrence: ['RRULE:FREQ=WEEKLY;BYDAY=' + _.join(days, ',') + ';UNTIL=' + officialEndDate.utc().format('YYYYMMDDThhmmss') + 'Z'],
      reminders:
      {
        useDefault: false
      }
    };

    events.push(event);
  });
  console.log(events);
  return events;
}

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  var clientSecret = credentials.web.client_secret;
  var clientId = credentials.web.client_id;
  var redirectUrl = credentials['web']['redirect_uris'][1];
  var auth = new googleAuth();
  var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, function(err, token) {
    if (err) {
      getNewToken(oauth2Client, callback);
    } else {
      oauth2Client.credentials = JSON.parse(token);
      callback(oauth2Client);
    }
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */
function getNewToken(oauth2Client, callback) {
  var authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES
  });
  console.log('Authorize this app by visiting this url: ', authUrl);
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.question('Enter the code from that page here: ', function(code) {
    rl.close();
    oauth2Client.getToken(code, function(err, token) {
      if (err) {
        console.log('Error while trying to retrieve access token', err);
        return;
      }
      oauth2Client.credentials = token;
      storeToken(token);
      callback(oauth2Client);
    });
  });
}

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
function storeToken(token) {
  try {
    fs.mkdirSync(TOKEN_DIR);
  } catch (err) {
    if (err.code != 'EEXIST') {
      throw err;
    }
  }
  fs.writeFile(TOKEN_PATH, JSON.stringify(token));
  console.log('Token stored to ' + TOKEN_PATH);
}

function createCalendar(auth, title, cb) {
  CALENDAR.calendars.insert({
    auth: auth,
    resource: {summary: title }
  }, function(err, response) {
    if (err) {
      cb('The API returned an error: ' + err);
      return;
    }
    cb(err, response);
  });
}

function deleteCalendar(auth, id, cb) {
  CALENDAR.calendars.delete({
    auth: auth,
    calendarId: id
  }, function(err, response) {
    if (err) {
      cb('The API returned an error: ' + err);
      return;
    }
    cb(err, response);
  });
}

function listCalendars(auth, cb) {
  CALENDAR.calendarList.list({
    auth: auth
  }, function(err, response) {
    if (err) {
      cb('The API returned an error: ' + err);
      return;
    }
    cb(err, response);
  });
}

/**
 * Lists the next 10 events on the user's primary calendar.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function createEvent(auth, calendarId, event, cb) {
  CALENDAR.events.insert({
    auth: auth,
    calendarId: calendarId,
    resource: event
  }, function(err, response) {
    if (err) {
      cb('The API returned an error: ' + err + "\n" + JSON.stringify(event));
      return;
    }
    cb(err, response);
  });
}
