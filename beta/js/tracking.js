var today = moment().format('YYYY-MM-DD');

var createObject = function(day) {
    var obj = {};
    obj[day] = 0;
    return obj;
};
var previously_translated = loadFromStorage('previously_translated') || createObject(today); // how many words translated in one session
var audio_time = loadFromStorage('audio_time') || createObject(today); // in seconds
var session_time = loadFromStorage('session_time') || createObject(today); // in seconds
var idle = 0, allowed_idle = 5; // in minutes
var pause_timer = 0, pause_time = 0;

function loadFromStorage(what) {//console.log(localStorage.getItem(what));
    return JSON.parse(localStorage.getItem(what)) || {};
}

function saveToStorage(what, val) {
    localStorage.setItem(what, JSON.stringify(val));
}

function convertSeconds(seconds) {
    var hours_minutes = '0:00', mmt, hours, minutes;

    if (seconds > 0) {
        mmt = moment.duration(seconds, 'seconds');
        hours = mmt.hours();
        minutes = mmt.minutes();

        if (minutes < 10) {
            minutes = '0'+minutes;
        }

        hours_minutes = hours+':'+minutes;
    }

    return hours_minutes;
}

// display data other than number of translated words
function displayData(day) {
    $("#audio_time").text(convertSeconds(audio_time[day]));
    $("#session_time").text(convertSeconds(session_time[day]));
    $("#session_audio_ratio").text(calculateRatio(audio_time[day], session_time[day]));
}

// store data other than number of translated wor
function storeData() {console.log('storeData', session_time);
    saveToStorage('previously_translated', previously_translated);
    saveToStorage('audio_time', audio_time);
    saveToStorage('session_time', session_time);
}

function calculateRatio(at, st) {
    if (at && st) {
        return Math.floor((at/st)*100);
    }
    else {
        return '-';
    }
}

// external functions
var TRACK = {};

// track audio time
TRACK.addAudioTime = function(difference) {//console.log('addAudioTime', difference);
    audio_time[today] = audio_time[today] + difference;

    // if it is not difference caused by jumpback or manual knob manipulation
    if (difference > 0 && difference < 1) {
        session_time[today] = session_time[today] + difference;
    }
    idle = 0;
};

// track session time
TRACK.startPauseTimer = function() {
    pause_timer = setInterval(function() {
        pause_time++;
    }, 1000);
};

// add pause time only if pause not loong -> idle
TRACK.addPauseTime = function() {
    if (idle < allowed_idle) {
        session_time[today] = session_time[today] + pause_time;
    }
    clearInterval(pause_timer);
    pause_time = 0;
};

/*
confirm user activity

activated when:
- user clicked on a word
- user scrolled text
- user pressed pause button
- continually when player is playing
*/
TRACK.userActive = function() {
    idle = 0;
};

// display number of translated words
TRACK.addTranslatedWord = function () {
    previously_translated[today]++;
    $("#track_translated_words").text(previously_translated[today]);
    saveToStorage('previously_translated', previously_translated);
};

$(document).ready(function() {
    var interval = setInterval(function() {
        idle++;//console.log(idle);

        // if not idle
        if (idle < allowed_idle) {

            // is it new day?
            if (today !== moment().format('YYYY-MM-DD')) {
                today = moment().format('YYYY-MM-DD');

                session_time[today] = 0;
                audio_time[today] = 0;
                previously_translated[today] = 0;
            }

            displayData(today);
            storeData();
        }
    }, 60000); // 1 min

    // show stored data on load
    displayData(today);
    $("#track_translated_words").text(previously_translated[today]);
});