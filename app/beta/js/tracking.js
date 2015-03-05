var tracking = 0; // state of tracking - on/off
var session_time = 1; // in seconds - it's not 0 to avoid problems with dividing by zero
var session_audio_time = 0; // in seconds

var timer;

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
            document.getElementById("session_time").innerHTML = convertSeconds(session_time);

        }
    }
}


// track and display audio time
function audioTime(difference) {
    if (tracking) {//console.log('diff='+difference);
        session_audio_time = session_audio_time + difference;
        document.getElementById("audio_time").innerHTML = convertSeconds(session_audio_time);
    }
}


// ratio between session time and audio time
function showRatio() {
    if (tracking) {
        document.getElementById("session_audio_ratio").innerHTML = Math.floor((session_audio_time/session_time)*100);
    }
}
