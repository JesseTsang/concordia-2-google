var readline = require('readline');
var google = require('googleapis');
var moment = require('moment');
var _ = require('lodash');
var CALENDAR = google.calendar('v3');


exports.createCalendar = function (auth, schedule, cb) {
  var sched_arr = schedule.split('\n').filter(function(v) {
    return v.search(/\s+/) || v === "";
  });
  var events = con2goog(parseRawSchedule(sched_arr));
  console.log(events);
   createCalendar(auth, "Concordia Schedule", function(err, response){
     if (err) {
       console.log(err);
       return;
     }
     var error = false;
     _.forEach(events, function(event) {
       createEvent(auth, response.id, event, function(err, resp){
         if (err) {
           console.log(err);
           return;
         }
       });
     });
     if (error)
       cb(true);
     cb();
   });
};

exports.deleteCalendar = function(auth, cb) {
  listCalendars(auth, function (err, response) {
    if (err) {
      console.log(err);
      return;
    }
    var calendars = response.items.filter(function (cal) {
      return cal.summary === "Concordia Schedule"
    });
    var error = false;
    _.forEach(calendars, function (cal) {
      console.log(cal.id);
      deleteCalendar(auth, cal.id, function (err, resp) {
        if (err) {
          console.log(err);
          error = true;
          return;
        }
      });
    });
    if (error)
      cb(true);
    cb();
  });
};

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
  console.log(schedule);
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

  return events;
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
