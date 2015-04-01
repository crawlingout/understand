var tracking = 0; // state of tracking - on/off
var session_time = Number(loadData('session_time')) || 1; // in seconds - it's not 0 to avoid problems with dividing by zero
var session_audio_time = Number(loadData('session_audio_time')) || 0; // in seconds
var previously_translated = Number(loadData('previously_translated')) || 0; // how many words translated in one session

var timer;

function loadData(what) {
    return localStorage.getItem(what);
}

function storeData(what, val) {
    localStorage.setItem(what, val);
}

function convertSeconds(seconds) { // this function only gets seconds after whole minutes
    var hours_minutes = '0:00', hours, minutes;

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

// track and display session time
function sessionTime() {
    if (tracking) {
        session_time++;

        // if the whole minute
        if (!(session_time % 60)) {
            // update timer
            $("#session_time").text(convertSeconds(session_time));
        }
    }
}


// track and display audio time
function audioTime(difference) {
    if (tracking) {
        session_audio_time = session_audio_time + difference;
        $("#audio_time").text(convertSeconds(session_audio_time));
    }
}


// ratio between session time and audio time
function showRatio() {
    if (tracking) {
        $("#session_audio_ratio").text(Math.floor((session_audio_time/session_time)*100));
        storeData('session_time', session_time);
        storeData('session_audio_time', session_audio_time);
    }
}

// display number of translated words
function showHowManyTranslated() {
    if (tracking) {
        previously_translated++;
        $("#track_translated_words").text(previously_translated);
        storeData('previously_translated', previously_translated);
    }
}

// when RESET button clicked
function resetTracking() {
    session_time = 1; storeData('session_time', 1);$("#session_time").text('0:00');
    session_audio_time = 0; storeData('session_audio_time', 0); $("#audio_time").text('0:00');
    previously_translated = 0; storeData('previously_translated', 0); $("#track_translated_words").text('0');
    $("#session_audio_ratio").text('-');
}


$(document).ready(function() {
    if (previously_translated) {
        $("#track_translated_words").text(previously_translated);
    }

    if (session_audio_time && session_time) {
        $("#audio_time").text(convertSeconds(session_audio_time));
        $("#session_time").text(convertSeconds(session_time));
        $("#session_audio_ratio").text(Math.floor((session_audio_time/session_time)*100));

        $('#track_session').hide();
        $('#stop_tracking').hide();
        $('#tracking_info').show();
    }

    // RESET button clicked
    $("#reset_tracking").click(function() {
        if (confirm('Are you sure?')) {
            resetTracking();
        }
    });
});
