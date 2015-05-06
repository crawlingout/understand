var today = loadFromStorage('today') || moment().format('YYYY-MM-DD');console.log(today);
var previously_translated = Number(loadFromStorage('previously_translated')) || 0; // how many words translated in one session

function loadFromStorage(what) {
    return localStorage.getItem(what);
}

function saveToStorage(what, val) {
    localStorage.setItem(what, val);
}

// track and display audio time
function audioTime(difference) {
//     session_audio_time = session_audio_time + difference;
//     $("#audio_time").text(convertSeconds(session_audio_time));
}

// display number of translated words
function showHowManyTranslated() {
    if (tracking) {
        previously_translated++;
        $("#track_translated_words").text(previously_translated);
        saveToStorage('previously_translated', previously_translated);
    }
}

// store and display data about tracking
function storeAndDisplay() {console.log('storeAndDisplay');

}

$(document).ready(function() {
    // var timer = setInterval(function() {
    //     // track and display session time
    //     storeAndDisplay()
    // }, 1000);

    // show stored number of previously translated words on load
    if (previously_translated) {
        $("#track_translated_words").text(previously_translated);
    }
});