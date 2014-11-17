var tracking = 0; // state of tracking
var tracking_session_time = 0; // in seconds
var tracking_audio_time = 0; // in seconds

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

        hours_minutes = hours+':'+minutes;console.log('hm', hours_minutes);
    }

    return hours_minutes;
}

function appTimer() {
    tracking_session_time++;console.log(tracking_session_time);

    // if the whole minute
    if (!(tracking_session_time % 60)) {
        // update timer
        document.getElementById("session_time").innerHTML = convertSeconds(tracking_session_time);

    }
}

$(document).ready(function() {
    $('#start_tracking').on('click', function() {
        var tracking = 1;
        $('.tracking_off').hide();
        $('.tracking_on').show();

        timer = setInterval(function() {appTimer();}, 1000);
    });

    $('#stop_tracking').on('click', function() {
        var tracking = 0;
        $('.tracking_on').hide();
        $('.tracking_off').show();
    });
});