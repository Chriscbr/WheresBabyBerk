var natural = require('natural');
var locations = require('./locations');
var moment = require('moment-timezone');

// Regex used for tokenizing tweet text, used by parseTweet and parseText
var timeIntervalRegex = /((?:(?:\d{1,2}:\d\d)|(?:\d{3,4})|(?:\d{1,2}))(?:(?:\s?-\s?)|\s?to\s?)(?:(?:\d{1,2}:\d\d)|(?:\d{3,4})|(?:\d{1,2})))/g;

/*
Extracts data from a list of tweets obtained from the Twitter API.
Operates by checking for valid tweets, and passing on operation to parseTweet.
Output format:
{
  found: bool,
  places: [list of strings],
  times: [list of strings]
}
*/
exports.extractData = function (tweets) {
  console.log('Starting extractData...');

  var output = {
    found: false,
    places: [],
    times: [],
    lastUpdate: '',
    early: false
  };

  if (tweets.length > 0) {
    output = parseTweet(tweets[0], output);
    output = filterByTime(tweets[0], output, moment());
  } else {
    console.log('No tweets found.');
  }

  console.log('Data returned:')
  console.log(output);
  console.log('Finished extractData.');

  return output;
}

/*
Extracts data from an individual tweet obtained from the Twitter API.
Operates by tokenizing the tweet text into sections of time intervals and text
in between time intervals, and parses each token, adding to the data object.
Finally the data is checked for validity and returned if valid.
*/
function parseTweet(tweet, data) {
  console.log(tweet.user.screen_name + ' tweeted: "' + tweet.text + '"');

  // Assign lastUpdate to a timestamp of when the last tweet was.
  tweet_time = moment(tweet.created_at, 'ddd MMM DD HH:mm:ss Z YYYY');
  data.lastUpdate = tweet_time.format('MMMM Do YYYY, h:mm:ss a');
  console.log('Last update: ' + data.lastUpdate);

  // End parsing early if tweet is more than 12 hours old.
  if (!isRecent(tweet)) {
    console.log('Tweet is not recent enough to be shown.');
    return data;
  }

  // Begin tokenizing tweet's text into its components
  var completeText = tweet.text;
  var tokenizer = new natural.RegexpTokenizer({pattern: timeIntervalRegex});
  var components = tokenizer.tokenize(completeText);
  console.log('Tweet components: ');
  console.log(components);

  // Parse the text from each component into the data object
  for (var i = 0; i < components.length; i++) {
    data = parseText(components[i], data);
  }

  // If there was a positive number of times or locations found but they
  // weren't obtained in a 2:1 ratio, then the parsing is unsuccessful.
  if (2 * data.places.length !== data.times.length &&
      data.places.length > 0) {
    console.log('Data extracted from tweet is invalid.');
    return data;
  }

  data.found = true;
  return data;
}

/**
 * Convert a string containing a time interval into an array containing a
 * start time string and an end time string. Time intervals can come in a
 * variety of forms such as '7-9:30', '12-330', and '6:30 to 7:00'.
 * @param {string} str - The time interval.
 * @return {string[]} The array of time intervals.
 */
function parseTime(str) {

  // Create array of matches formatted like '7:30', '1215', or '9'
  var times = str.match(/((?:\d{1,2}:\d\d)|(?:\d{3,4})|(?:\d{1,2}))/g);

  for (var i = 0; i < times.length; i++) {

    // Convert times like '7' or '12' to '7:00' or '12:00'
    if (/(\d{1,2})/g.test(times[i])) times[i] += ':00';

    // Convert times like '930' or '1115' to '9:30' or '11:15'
    if (/(\d{3,4})/g.test(times[i])) {
      var len = times[i].length;
      times[i] = times[i].substring(0, len-2) + ':' +
          times[i].substring(len-2);
    }

  }

  return times;
}

/*
Parses a "section" of tweet text, which is either a time interval
(i.e. "2:30-4") or a string of words in between those
There should only be one matching location in between each time interval
otherwise there cannot be a one-to-one location/time interval correspondence.
*/
function parseText(text, data) {

  function parseWords(str) {
    var tokenizer = new natural.WordTokenizer();
    var words = tokenizer.tokenize(str);
    var match = '';
    var i = 0;

    /*
    TODO: improve processing control structure?
    The way the entire string is looped through, but exited by using
    multiple break statements seems janky. But I'm not entirely sure
    how to make it more elegant/simple.
    */

    while (i < words.length) { // loops through i words in string
      var curr = words[i];
      var diff = 0; // (0 = no match, 1 = exact match)

      // check for matching single word at index i
      for (var j = 0; j < locations.length; j++) {
        diff = natural.JaroWinklerDistance(curr, locations[j][0]);
        if (diff > 0.8) {
          match = locations[j][1];
          break;
        }
      }
      if (match != '') {
        console.log('"' + curr + '" matches to "' + match + '"');
        break;
      }

      // check for matching pair of words at indices i, i+1
      if (i + 1 < words.length) { // check that it isn't the last token
        curr = words[i] + ' ' + words[i+1];
        for (var j = 0; j < locations.length; j++) {
          diff = natural.JaroWinklerDistance(curr, locations[j][0]);
          if (diff > 0.8) {
            match = locations[j][1];
            break;
          }
        }
        if (match != '') {
          console.log('"' + curr + '" matches to "' + match + '"');
          break;
        }
      }

      i++;
    }

    // break statements ensure this line will be reached after first match
    if (match != '') {
      output.places.push(match);
    }

  }

  output = data;

  if (timeIntervalRegex.test(text)) { // case 1: time interval
    var times = parseTime(text);
    output.times = output.times.concat(times);
  } else {                            // case 2: non-time interval
    parseWords(text);
  }

  return output;
}

// checks if a tweet was made in the last 12 hours
function isRecent(tweet) {
  return moment(tweet.created_at, 'ddd MMM DD HH:mm:ss Z YYYY')
    .add(12, 'h')
    .isAfter(moment());
}

/* Removes data (place/time pairs) that end before the current time.
Assumes that times listed in a tweet are within the 12 hour period after
its posting.
time: moment obj
tweet: tweet json
*/
function filterByTime(tweet, data, time) {
  var items = []; // indexes of items to remove

  // Loop through to determine items to remove and add to the list
  for (var i=0; i<data.places.length; i++) {
    var endHour = data.times[i*2 + 1]; // ex. '6:30' or '12:00'
    var endTime = moment.tz(endHour, 'h:mm', 'America/New_York');

    var baseTime = moment(tweet.created_at, 'ddd MMM DD HH:mm:ss Z YYYY');
    baseTime.subtract(2, 'hours'); // compensate for tweets posted late

    // prevents date from preemptively being set to the next day
    // which occurs sometimes during moment initialization
    endTime.date(baseTime.date()); 

    // console.log(moment.tz('10:00', 'h:mm', 'America/New_York')
    //   .format('ddd MMM DD HH:mm:ss'));
    // console.log(endTime.format('ddd MMM DD HH:mm:ss'));
    // console.log(baseTime.format('ddd MMM DD HH:mm:ss'));

    // Add 12 hours up to 2 times until right time is found
    // (ex. 6pm tweet lists 2:00, can be corrected to 2am of next day)
    for (var j=0; j<2; j++) {
      if (endTime.isBefore(baseTime)) {
        endTime.add(12, 'hours');
      }
    }
    console.log(endHour + ' interpreted as ' +
                endTime.format('ddd MMM DD HH:mm:ss Z'));
    console.log('baseTime is ' + baseTime.format('ddd MMM DD HH:mm:ss Z'));
    
    if (endTime.isBefore(time)) {
      items.push(i);
    } else {

      var startHour = data.times[i*2];
      var startTime = moment.tz(startHour, 'h:mm', 'America/New_York');
      startTime.date(baseTime.date());
      for (var j=0; j<2; j++) {
        if (startTime.isBefore(baseTime)) {
          startTime.add(12, 'hours');
        }
      }

      if (time.isBefore(startTime)) {
        data.early = true;
      }

      // break the loop, since all removable timeslots are consecutive
      i = data.places.length;
    }
  }

  for (var i=items.length-1; i>=0; i--) {
    console.log('Removing ' + data.places[i]);
    data.places.splice(i, 1);
    data.times.splice(i*2, 2);
  }

  // Prevents bug where text is displayed with blank location and time
  if (data.places.length == 0) {
    data.found = false;
  }

  return data;
}
