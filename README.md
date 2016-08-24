# concordia-2-google
##How to run
1. Get your client_secret.json from google apps and place it in the root directory
2. `node google.js`
3. This will create a calendar named "Concordia Schedule" in your google calendar with events. (The events are generated from the schedule..txt file)
4. To delete the calendar you created, comment lines 23-39 and uncomment lines 42-58 and `run google.js`
