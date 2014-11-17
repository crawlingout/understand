var tracking = 0; // state of tracking
var tracking_session_time = 0; // in seconds
var tracking_audio_time = 0; // in seconds
var session_audio_time;

// take into account stored time -> player does not start at zero
var tracking_audio_time_absolute = Number(localStorage.getItem('stored_audio_time')) || 0;

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

function trackProgress() {
    tracking_session_time++;

    // if the whole minute
    if (!(tracking_session_time % 60)) {
        // update timer
        document.getElementById("session_time").innerHTML = convertSeconds(tracking_session_time);

    }
}

function showAudioTime(audiotime) {
    session_audio_time = audiotime - tracking_audio_time_absolute;
    document.getElementById("audio_time").innerHTML = convertSeconds(session_audio_time);
}

function showRatio() {
    document.getElementById("session_audio_ratio").innerHTML = Math.floor((session_audio_time/tracking_session_time)*100);
}
