import fs = require('fs');
import Log from '../Util';
var readline = require('readline');
var google = require('googleapis');
var googleAuth = require('google-auth-library');
var SCOPES = ['https://www.googleapis.com/auth/calendar'];
var TOKEN_DIR = './credentials/';
var TOKEN_PATH = TOKEN_DIR + 'calendar-nodejs-quickstart.json';

export default class CalendarController {

    public static main(room: any) {
        fs.readFile('client_secret.json', function processClientSecrets(err: any, content: any) {
            console.log('1');
            if (err) {
                console.log('Error loading client secret file: ' + err);
                return;
            }
            // Authorize a client with the loaded credentials, then call the
            // Google Calendar API.
            console.log('2');
            CalendarController.authorize(JSON.parse(String(content)), function(res: any) {
                CalendarController.createAllEvents(res, room);
            });
        });
    }

    /**
     * Create an OAuth2 client with the given credentials, and then execute the
     * given callback function.
     *
     * @param {Object} credentials The authorization client credentials.
     * @param {function} callback The callback to call with the authorized client.
     */
    public static authorize(credentials: any, callback: any) {
        Log.trace('CalendarController::authorize(..)');
        var clientSecret = credentials.installed.client_secret;
        var clientId = credentials.installed.client_id;
        var redirectUrl = credentials.installed.redirect_uris[0];
        var auth = new googleAuth();
        var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

        // Check if we have previously stored a token.
        fs.readFile(TOKEN_PATH, function(err, token) {
            if (err) {
                CalendarController.getNewToken(oauth2Client, callback);
            } else {
                oauth2Client.credentials = JSON.parse(token.toString('utf-8'));
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
    public static getNewToken(oauth2Client: any, callback: any) {
        Log.trace('CalendarController::getNewToken(..)');
        var authUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES
        });
        console.log('Authorize this app by visiting this url: ', authUrl);
        var rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        rl.question('Enter the code from that page here: ', function(code: any) {
            rl.close();
            oauth2Client.getToken(code, function(err: any, token: any) {
                if (err) {
                    console.log('Error while trying to retrieve access token', err);
                    return;
                }
                oauth2Client.credentials = token;
                CalendarController.storeToken(token);
                callback(oauth2Client);
            });
        });
    }

    /**
     * Store token to disk be used in later program executions.
     *
     * @param {Object} token The token to store to disk.
     */
    public static storeToken(token: any) {
        Log.trace('CalendarController::storeToken(..)');
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

    /**
     * Lists the next 10 events on the user's primary calendar.
     *
     * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
     */
    public static listEvents(auth: any) {
        Log.trace('CalendarController::listEvents(..)');
        var calendar = google.calendar('v3');
        calendar.events.list({
            auth: auth,
            calendarId: 'primary',
            timeMin: (new Date()).toISOString(),
            maxResults: 10,
            singleEvents: true,
            orderBy: 'startTime'
        }, function(err: any, response: any) {
            if (err) {
                console.log('The API returned an error: ' + err);
                return;
            }
            var events = response.items;
            if (events.length == 0) {
                console.log('No upcoming events found.');
            } else {
                console.log('Upcoming 10 events:');
                for (var i = 0; i < events.length; i++) {
                    var event = events[i];
                    var start = event.start.dateTime || event.start.date;
                    console.log('%s - %s', start, event.summary);
                }
            }
        });
    }

    public static createAllEvents(auth: any, room: any) {
        for(var i = 0; i < room['MWF'].length; i += 2) {
            if(room['MWF'][i] !== null) {
                CalendarController.createEvent(auth, 0, i, room['MWF'][i]);
            }
        }
        for(var j = 0; j < room['TT'].length; j += 3) {
            if(room['TT'][j] !== null) {
                CalendarController.createEvent(auth, 1, j, room['TT'][j]);
            }
        }
    }

    public static createEvent(auth: any, day: number, time: number, name: string) {
        var calendar = google.calendar('v3');
        let date = 5 + day;
        let hourStart = 8 + Math.floor(time / 2);
        let hourEnd = hourStart + 1 + Math.floor(time % 2);
        let minuteStart = 0;
        let minuteEnd = 0;
        let rec = "RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR";
        if(day === 1) {
            rec = "RRULE:FREQ=WEEKLY;BYDAY=TU,TH";
            if(time % 2 === 1) {
                minuteStart = 30;
            } else {
                minuteEnd = 30;
            }
        }
        let fullStart = new Date(2016, 11, date, hourStart, minuteStart, 0);
        let fullEnd = new Date(2016, 11, date, hourEnd, minuteEnd, 0);
        console.log();
        var event = {
            'summary': name,
            'start': {
                'dateTime': fullStart.toISOString(),
                'timeZone': 'America/Los_Angeles',
            },
            'end': {
                'dateTime': fullEnd.toISOString(),
                'timeZone': 'America/Los_Angeles',
            },
            "recurrence": [
                rec
            ]
        };

        calendar.events.insert({
            auth: auth,
            calendarId: 'another310room@gmail.com',
            resource: event,
        }, function(err: any, event: any) {
            if (err) {
                console.log('There was an error contacting the Calendar service: ' + err);
                return;
            }
            console.log('Event created: %s', event.htmlLink);
        });
    }

}
