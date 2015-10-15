var server = 'https://www.simplyeasy.cz/understand-server/';
//var server = '../understand-server/';

var from = localStorage.getItem('stored_lang_from') || 'es';
var to = localStorage.getItem('stored_lang_to') || 'en';
var scrollposition = Number(localStorage.getItem('scrollposition')) || 0;
var textfile = localStorage.getItem('stored_text_file_content') || 0;
var audiofile = localStorage.getItem('stored_audio_file_url') || 0;
var player = 0;
var stored_audio_time = Number(localStorage.getItem('stored_audio_time')) || 0;
var uploaded_file_id = localStorage.getItem('uploaded_file_id') || 0;

// workaround: some browsers do not load duration on canplay event; in that case this flag is raised so duration could be obtained later
var correct_progress_bar = 0;

// cache most used selectors
var $body, $audio_time, $session_time, $ratio, $session_audio_ratio, $audio_time_total, $session_time_total, $i_am_done, $backhome,
    $higher_than_ever, $translatedword, $selectedword, $translations, $whentoolong, $play_btn, $pause_btn, $play_pause, $jumpback, $from, $to, $idle,
    $goal_today, $streak, $record_ratio, $previous_translated_words, $linktodict, $googletranslate, $textFileSelect, $audioFileSelect, $content,
    $content_wrapper, $instructions, $tracking, $videocover, $videoafter, $videoreplay, $listened, $progress;

// cache recording/playback selectors
var $playback, $recording;


// UI localization

var ui_loc = {
    'en': {
        'day': 'day',
        'days': 'days'
    },
    'cs': {
        'day': 'den',
        'days': 'dnů'
    }
};


// TRACKING

var today = moment().format('YYYY-MM-DD');
var allowed_idle = 300000; // 5 minutes in miliseconds
var last_pause_time, pause_diff;
var subtract_from_pause_time = 0; // this variable is used to subtract recording/replying time from pause time
var paused_updating_tracking_charts = 0; // pause updating tracking data (prevent jumping when recording time is subtracted)

var data = JSON.parse(localStorage.getItem('data')) || {};

function convertSeconds(seconds) {
    var hours_minutes = '0 min', mmt, days, hours, minutes;

    if (seconds > 0) {
        mmt = moment.duration(seconds, 'seconds');

        hours = mmt.hours();
        days = mmt.days();
        if (hours || days) {
            hours = hours + (24 * days);
            hours = hours+' h ';
        }
        else {
            hours = '';
        }

        minutes = mmt.minutes() || '';
        if (minutes || !hours) { // show minutes if they are not 0 or hours are 0
            minutes = mmt.minutes()+' min';
        }

        hours_minutes = hours+minutes;
    }

    return hours_minutes;
}

function calculateRatio(at, st) {
    var r;
    if (at && st) {
        r = Math.floor((at/st)*100);

        if (r > 100) {
            return 100;
        }
        else {
            return r;
        }
    }
    else {
        return 0;
    }
}

// external functions
var TRACK = {};

/*

1. check the existence of / create tracking data object [language/day]
2. get and display today's goal
3. display tracking data


- new day
1,3

- in tracking interval
3 (only when playing)

- when 'from' language changed
1,2,3

- on load
1,2,3

- daily goal changed (plus or minus)
2,3

*/

// if the object for the language does not exist yet, create it
// 1
TRACK.dataObjectExist = function(day) {
    if (!data[from]) {
        data[from] = {
            'total': {
                'st': 0,
                'at': 0,
                'dg': 1800, // daily goal in seconds - default 30 min
                's': 0, // current streak in days
                'rr': 0 // all thime high ratio in %
            },
            'days': {}
        };
    }
    // if the object for the day does not exist yet, create it
    if (!data[from].days[day]) {
        data[from].days[day] = {
            'at': 0,
            'st': 0,
            'ga': 0
        };
    }
};

// get and display today's goal
// 2
TRACK.displayDailyGoal = function() {
    $goal_today.text(convertSeconds(data[from].total.dg));
};

// display data other than number of translated words
// 3
// runs every second when player playing - needs to be lightweight!!!
TRACK.displayTrackingData = function(day) {
    if (!paused_updating_tracking_charts) {
        $audio_time.text(convertSeconds(data[from].days[day].at));

        var readable_session_time = convertSeconds(data[from].days[day].st);
        $session_time.text(readable_session_time);

        var listened = calculateRatio(data[from].days[day].st, data[from].total.dg);
        $listened.height((listened*1.5)+'px');

        var ratio = calculateRatio(data[from].days[day].at, data[from].days[day].st);
        $session_audio_ratio.text(ratio);
        $ratio.height((listened*ratio*0.015)+'px');

        $audio_time_total.text(convertSeconds(data[from].total.at));
        $session_time_total.text(convertSeconds(data[from].total.st));

        // today's goal not yet marked as achieved
        if (!data[from].days[day].ga) {
            // if today's goal achieved JUST NOW
            if (data[from].days[day].st > data[from].total.dg) {
                $i_am_done.removeClass('hidden');
                $idle.html('<i class="fa fa-check-circle"></i>');
                data[from].days[day].ga = 1;

                TRACK.currentStreak();
            }
        }
        // goal already achieved
        else {
            // if ratio higher than record and record higher than default 0
            if (data[from].total.rr && (ratio > data[from].total.rr)) {
                $higher_than_ever.removeClass('hidden');
            }
            else {
                $higher_than_ever.addClass('hidden');
            }
        }
    }
};

TRACK.currentStreak = function() {
    var yesterday = moment(today).subtract(1, 'days').format('YYYY-MM-DD');

    // today's goal not added to streak yet
    if (data[from].days[today].ga !== 'added') { // = 0 or 1;

        // today's goal just achieved
        if (data[from].days[today].ga) {
            // goal achieved yesterday
            if (data[from].days[yesterday] && data[from].days[yesterday].ga) {
                data[from].total.s = data[from].total.s + data[from].days[today].ga;
            }
            // goal not achieved yesterday
            else {
                data[from].total.s = 1;
            }

            // mark as counted
            data[from].days[today].ga = 'added';

            TRACK.storeTrackingData();
        }
        // not achieved yet
        else {
            // goal not achieved yesterday
            if (!(data[from].days[yesterday] && data[from].days[yesterday].ga)) {
                // reset streak to 0
                data[from].total.s = 0;
            }
        }
    }

    // display days of streak propperly (1 day or 2+ days)
    if (data[from].total.s === 1) {
        $streak.text(data[from].total.s+ ' '+ui_loc[ui_lang].day);
    }
    else {
        $streak.text(data[from].total.s+ ' '+ui_loc[ui_lang].days);
    }
};

TRACK.ratioStats = function() {

    // loop last thirty days NOT including today
    var i, daily_record;
    for (i = 1; i < 31; i++) {
        daily_record = moment(today).subtract(i, 'days').format('YYYY-MM-DD') || 0;
        // if day was recorded
        if (data[from].days[daily_record]) {
            // if goal was achieved that day
            if (data[from].days[daily_record].ga) {
                // if ratio for the day not stored
                if (!data[from].days[daily_record].r) {
                    // calculate ratio
                    data[from].days[daily_record].r = calculateRatio(data[from].days[daily_record].at, data[from].days[daily_record].st);
                }

                // if ratio that day > record ratio
                if (data[from].days[daily_record].r > data[from].total.rr) {
                    // update record ratio
                    data[from].total.rr = data[from].days[daily_record].r;
                }
            }
        }
    }

    if (data[from].total.rr) {
        $record_ratio.text(data[from].total.rr+'%');
    }
};

// store data other than number of translated wor
TRACK.storeTrackingData = function() {
    localStorage.setItem('data', JSON.stringify(data));

    // TODO when storing at Firebase, only send and store the difference, do not keep sending all the data all the time
};

TRACK.addToDayAndTotal = function(addition, to) {
    data[from].days[today][to] = data[from].days[today][to] + addition;
    data[from].total[to] = data[from].total[to] + addition;
};

deleteTrackingData = function() {
    localStorage.removeItem('data');
    document.getElementById('delete').innerHTML = '[ deleted ]';
};

/*

TIME-ADDING MECHANISM

time is only added when player is playing
- play time is added continually when playing
- pause time is added after pause ends, if pause not too long (therefore, user has to press play button to really start tracking)

*/


// track audio time

// !!!
// this function runs every 250 ms - it needs to be lightweight !!!
TRACK.addAudioTime = function(difference) {

    // if diff NOT caused by manual manipulation
    // (bigger than -jumpback (or equal) and smaller than 1)
    if (difference > -7 && difference < 1) {

        // if diff NOT caused by jumpback
        if (difference > 0) {
            // add to session/audio time
            TRACK.addToDayAndTotal(difference, 'st');
            TRACK.addToDayAndTotal(difference, 'at');
        }
        else {
            // only deduce jumpbacks from audio time if audio time is not pushed to negative values by this
            if (difference && (data[from].days[today].at + difference) > 0) {
                TRACK.addToDayAndTotal(difference, 'at');
                TRACK.displayTrackingData(today); // 3
            }
        }
    }
};

// track session time
TRACK.startPauseTimer = function() {
    last_pause_time = moment();
};

// add pause time only if pause not too long
TRACK.addPauseTime = function() {
    if (last_pause_time) {
        pause_diff = moment().diff(last_pause_time);
        subtract_from_pause_time = 0; 

        if (pause_diff < allowed_idle) {
            TRACK.addToDayAndTotal((pause_diff/1000), 'st');
        }
    }
};

// check whether day changed since load
// checked every second when NOT playing
TRACK.newDay = function() {
    // if new day
    if (today !== moment().format('YYYY-MM-DD')) {
        today = moment().format('YYYY-MM-DD');

        TRACK.dataObjectExist(today); // 1

        // reset previously achieved goal
        $i_am_done.addClass('hidden');
        $idle.html('<i class="fa fa-clock-o"></i>');
        $higher_than_ever.addClass('hidden');

        // reset pause time - pause should not ruin beginning of new day, it's better to just drop it
        last_pause_time = 0;

        TRACK.ratioStats();

        TRACK.displayTrackingData(today); // 3

        TRACK.currentStreak();
    }
};

// ========


function errorHandler(e) {
    console.log('error>', e.message);
}

function linkToDict(text) {
    if (to==='cs' && (from==='en' || from==='es' || from==='de' || from==='fr' || from==='it' || from==='ru')) {
        return 'http://slovnik.seznam.cz/'+from+'-cz/word/?q='+encodeURIComponent(text);
    }
    else {
        return 'https://translate.google.com/#'+from+'/'+to+'/'+encodeURIComponent(text);
    }
}

function prependPrevWord(word) {
    $previous_translated_words.
        prepend('<p><a target="_blank" href="'+linkToDict(word[from])+'"><span>'+word[from]+'</span>&nbsp;&nbsp;'+word[to]+' <em>></em></a></p>');
}

function mycallback(response) {
    $translatedword.text(response);
}

function callBing(from, to, text) {
    $.ajax({
        type: 'POST',
        data: {"authtype": "js"},
        url: server+'token.php',
        success: function(data) {

            var s = document.createElement("script");
            s.src = "https://api.microsofttranslator.com/V2/Ajax.svc/Translate" +
                "?appId=Bearer " + encodeURIComponent(data) +
                "&from=" + encodeURIComponent(from) +
                "&to=" + encodeURIComponent(to) +
                "&text=" + encodeURIComponent(text) +
                "&oncomplete=mycallback";
            document.body.appendChild(s);
        },
        error: function(xhr, type) {
            $translatedword.text('ERROR');
        }
    });
}

function getTextSelection() {
    if (window.getSelection) {
        return window.getSelection().toString();
    }
    else if (document.getSelection) {
        return document.getSelection().toString();
    }
    else if (document.selection) {
        return document.selection.createRange().text;
    }
    else {
        return '';
    }
}

function onCopyEvent() {
    handleSelectedText(getTextSelection());
}

var previous_selection = '';
function handleSelectedText(text) {
    // prevent processing empty strings and repeated translations of the same word (double-clicks)
    if (!text || previous_selection === text) {
        return false;
    }
    previous_selection = text;

    var previous_word = {};

    // get previously selected word
    previous_word[from] = $selectedword.text();

    // get previously translated word
    previous_word[to] = $translatedword.text();

    // strip spaces before/after words
    text = text.trim();

    // string NOT too long
    if (text.split(' ').length <= 1) {
        // clear previous result
        $translatedword.text('...');

        // regex to remove weird leading and trailing characters
        // test quotation marks - „‚“‘'"test“‘”’'"
        text = text.replace(/^[¿¡(„‚“‘'"‹›«»—-]+|[,.:;?!)“”‘’'"‹›«»—-]+$/g, ''); // hyphen needs to be at the end (or escaped \-)

        // hide warning text shown when text is too long
        $whentoolong.addClass('hidden');

        // insert word to be translated into visible element
        $selectedword.text(text);

        // try to translate
        callBing(from, to, text);

        // unhide pair word_to_translate: translated_word
        $translations.removeClass('hidden');

        // create link to external dictionary or translator
        $linktodict.attr('href', linkToDict(text));
    }
    // long translation string -> Google Translate
    else {
        // create URL to google translate
        $googletranslate.attr('href','https://translate.google.com/#'+from+'/'+to+'/'+encodeURIComponent(text));

        $translations.addClass('hidden');
        $whentoolong.removeClass('hidden');

        // prevent repeated inserting the last translated word into list of translated words each time translation string is long in a row
        $translatedword.text('...');
    }

    // if previous word not empty and right column visible (not mobile version)
    if ($previous_translated_words.is(':visible') && previous_word[to] !== '...' && previous_word[to] !== 'ERROR') {
        // prepend previously translated word into the list
        prependPrevWord(previous_word);
    }
    return true;
}

function setProgressBar() {
    var progress = (player.currentTime/player.duration)*100 || 0;
    $progress.width(progress+'%');
}

function loadAudioToPlayer(file) {

    // load audio file
    player = new Audio(file);

    // gray out 'load audio' button
    $audioFileSelect.css({
        "background-color": "#f9f9f9"
    });

    // when the player is ready
    var canplay_fired = 0; // workaround to prevent loop - some browsers fire canplay event again on player.currentTime = stored_audio_time
    player.oncanplay = function() {
        if (!canplay_fired) {
            // set color of play/pause icon
            $play_pause.css('color', '#4ba3d9');

            // if duration loaded propperly
            if (player.duration) {
                // set player to stored time
                player.currentTime = stored_audio_time;

                // set player's progress bar
                setProgressBar();
            }
            else {
                // raise flag so duration can be obtained later
                correct_progress_bar = 1;
            }
            canplay_fired = 1;
        }
    };

    // keep updating player's progress bar when audio is playing
    var diff = 0, last_time = stored_audio_time;
    player.ontimeupdate = function() { // this runs every 250 ms - it needs to be lightweight !!!

        // workaround for problem with Android Chrome - randomly setting currentTime to 0 after player.play()
        if (player.currentTime === 0 && stored_audio_time) {
            player.currentTime = stored_audio_time + diff;
        }

        // update player's progress bar
        setProgressBar();

        // calculate time difference between timeupdate events
        diff = (player.currentTime - last_time);
        last_time = player.currentTime;

        // track audio time
        TRACK.addAudioTime(diff);
    };

    // listener for finished audio
    player.onended = function() {
        // set icon to play
        $pause_btn.addClass('hidden');
        $play_btn.removeClass('hidden');
    };
}

function resetPlayer() {

    // if playing
    if (player && !player.paused && !player.ended) {
        player.pause();
    }

    // reset stored time, url and duration
    stored_audio_time = 0;
    localStorage.setItem('stored_audio_time', stored_audio_time);
    audiofile = 0;
    localStorage.removeItem('stored_audio_file_url');

    // set icon to play
    $pause_btn.addClass('hidden');
    $play_btn.removeClass('hidden');

    // reset audio progress bar
    $progress.width('0%');

    // reset color of play icon
    $play_pause.css('color', '#AEAEAE');

    // white out 'load audio' button
    $audioFileSelect.css({
        "background-color": "#ffffff"
    });
}

function resetText() {
    $backhome.addClass('hidden');
    $content.addClass('hidden').text('');
    $instructions.removeClass('hidden');

    scrollposition = 0;
    localStorage.setItem('scrollposition', scrollposition);
    localStorage.removeItem('stored_text_file_content');

    // white out 'load text' button
    $textFileSelect.css({
        "background-color": "#ffffff"
    });

    // if there is some query string in URL (afted demo was opened), remove it
    noParams();
}

function handleAudioFileSelect(evt) {
    resetPlayer();

    // if there is some query string in URL (afted demo was opened), remove it
    noParams();

    audiofile = evt.target.files[0];

    // load audio to player
    loadAudioToPlayer(URL.createObjectURL(audiofile));

    // make sure it's mp3 file
    var isMP3 = function(file) {
        if (file.type.substring(0,5) === 'audio' && file.name.substr(file.name.length - 3) === 'mp3') {
            return true;
        }
        else {
            return false;
        }
    };

    // validate - if smaller than 99MB and MP3
    if (audiofile.size < 103809024 && isMP3(audiofile)) {
        // upload file
        var formData = new FormData($('form')[0]);

        // if previously uploaded file
        if (uploaded_file_id) {
            formData.append("previous", uploaded_file_id);
        }

        $.ajax({
            url: server+'upload.php',
            type: 'POST',
            success: function(response) {
                // if NOT error
                if (response.substring(0,5) !== 'Sorry') {
                    response = $.trim(response);
                    localStorage.setItem('uploaded_file_id', response);
                    localStorage.setItem('stored_audio_file_url', server+'uploads/'+response+'.mp3');
                }
            },
            error: function(response) {
                console.log('error: ', response);
            },
            data: formData,
            cache: false,
            contentType: false,
            processData: false
        });
    }
}

function loadText(text) {

    // hide instructions on how to use the site
    $instructions.addClass('hidden');

    // gray out 'load text' button
    $textFileSelect.css({
        "background-color": "#f9f9f9"
    });
    
    // split paragraphs by empty lines
    var paragraphs = text.split("\n");

    var content = '<p><span class="mycontent"> ';

    for (var i=0, l=paragraphs.length; i<l; i++) {
        if (paragraphs[i] !== '\r' && paragraphs[i] !== '') {
            content = content + paragraphs[i]+' ';
        }
        else {
            content = content + '</span></p><p><span class="mycontent"> ';
        }
    }
    content = content + '</span></p>';

    $backhome.removeClass('hidden');

    $content.removeClass('hidden').html(content);

    // jump to stored scroll position
    $content_wrapper.scrollTop(scrollposition);

    // store scroll position
    $content_wrapper.scroll(function() {
        localStorage.setItem('scrollposition', this.scrollTop);
    });
}

function handleTextFileSelect(evt) {
    // validation
    if (evt.target.files[0].name.substr(evt.target.files[0].name.length - 3) === 'txt' && evt.target.files[0].type.substring(0,4) === 'text') {
        // reset stored scroll position
        scrollposition = 0;
        localStorage.setItem('scrollposition', scrollposition);
     
        // file reader supported
        if (window.FileReader) {

            var reader = new FileReader();

            // closure to capture the file information.
            reader.onload = function(e) {
                loadText(e.target.result);

                // store text
                localStorage.setItem('stored_text_file_content', e.target.result);
            };

            // read in the file
            reader.readAsText(evt.target.files[0]);
        }
        else {
            console.log('File reader not supported.');
        }
    }
    else {
        console.log('This is not a text file!');
    }
}

function loadDemo(demoid, demolang) {

    $instructions.addClass('hidden'); // it's here - although it's also in loadText - to prevent flickering of instructions before loading text

    resetPlayer(); // because demo could be loaded when some audio file is already open

    $.get('../demo/'+demoid+'.txt', function(data) { 
        loadText(data);
    });

    audiofile = 'https://www.simplyeasy.cz/understand-server/files/'+demoid+'.mp3';
    loadAudioToPlayer(audiofile);

    // switch to the language of the demo
    $from.val(demolang);
    $from.change();
}

function jumpBack(jumpstep) {
    // get current time
    var current_time = player.currentTime;

    if (current_time > jumpstep) {
        player.currentTime = current_time - jumpstep;
        stored_audio_time = player.currentTime;
        localStorage.setItem('stored_audio_time', stored_audio_time);
    }
    else {
        player.currentTime = 0;
        stored_audio_time = 0;
        localStorage.setItem('stored_audio_time', stored_audio_time);
    }
}

function playPause() {
    stored_audio_time = player.currentTime;

    // if duration not detected on canplay event (some browsers show duration = 0 at that time)
    if (correct_progress_bar) {
        // get it now
        setTimeout(function() {
            if (player.duration) {
                // and use it to set player's progress bar correctly
                setProgressBar();
                correct_progress_bar = 0;
            }
        }, 200);
    }

    // if not playing, play
    if (player.paused || player.ended) {
        // PLAY
        player.play();

        // set icon to pause
        $play_btn.addClass('hidden');
        $pause_btn.removeClass('hidden');

        TRACK.addPauseTime();

        document.getElementById('idle').style.color = '#4ba3d9'; // set tracking indicator to 'active'
    }
    // if playing, pause
    else {
        // PAUSE
        player.pause();

        // set icon to play
        $pause_btn.addClass('hidden');
        $play_btn.removeClass('hidden');

        // store time
        localStorage.setItem('stored_audio_time', stored_audio_time);

        TRACK.startPauseTimer();

        TRACK.storeTrackingData();
    }
}

// recording state determines whether recorded audio has been replayed already
// 0 - new audio created
// 1 - new audio started playing
// 2 - new audio finished playing
var recording_state = 2;

// if just recorded my own voice -> replay
// if not, record
function recordReplay() {
    // if already played and finished
    if (recording_state === 2) {
        // record
        $recording.click();
    }
    else {
        // play
        $playback.click();
    }
}

function controlsToBottom() {
    var content_wrapper_height = 0;
    var window_height = $(window).height();

    // check CSS media query breaking points
    var lt600px = $lowerthan600px.is(':visible');
    var wt1100px = $previous_translated_words.is(':visible');
    var wt725px = $widerthan725px.is(':visible');

    if (wt1100px) { // wide
        content_wrapper_height = window_height - 158;

        if (lt600px) { // and low
            content_wrapper_height = content_wrapper_height + 65;
        }

    }
    else { // narrow
        if (wt725px) {
            content_wrapper_height = window_height - 140;
        }
        else { // narrower
            content_wrapper_height = window_height - 228;

            if (lt600px) { // and low
                content_wrapper_height = content_wrapper_height + 80;
            }
        }
    }

    if (content_wrapper_height) {
        $content_wrapper.css({'height': content_wrapper_height+'px'});
    }
}

// get URL params
// based on https://css-tricks.com/snippets/javascript/get-url-variables/
function getQueryVariable(query, param) {
       var vars = query.split("&");
       for (var i=0;i<vars.length;i++) {
                var pair = vars[i].split("=");
                if (pair[0] == param) {
                return pair[1];
            }
       }
       return(false);
}

// remove query string from URL (if there is any left, for example after closing demo)
function noParams() {
    if (window.location.search.substring(1)) {
        history.replaceState({}, 'understand', location.href.split("?")[0]);
    }
}


$(document).ready(function() {

    // cache most used selectors
    $body = $('html, body');
    $audio_time = $('#audio_time');
    $session_time = $('#session_time');
    $ratio = $('#ratio');
    $session_audio_ratio = $('#session_audio_ratio');
    $audio_time_total = $('#audio_time_total');
    $session_time_total = $('#session_time_total');
    $i_am_done = $('#i_am_done');
    $idle = $('#idle');
    $higher_than_ever = $('#higher_than_ever');
    $translatedword = $('#translatedword');
    $selectedword = $('#selectedword');
    $translations = $('#translations');
    $whentoolong = $('#whentoolong');
    $play_btn = $('#play_btn');
    $pause_btn = $('#pause_btn');
    $play_pause = $('#play_pause');
    $jumpback = $('#jumpback');
    $from = $('#from');
    $to = $('#to');
    $backhome = $('#backhome');
    $goal_today = $('#goal_today');
    $streak = $('#streak');
    $record_ratio = $('#record_ratio');
    $previous_translated_words = $('#previous_translated_words');
    $linktodict = $('#linktodict');
    $googletranslate = $('#googletranslate');
    $textFileSelect = $('#textFileSelect');
    $audioFileSelect = $('#audioFileSelect');
    $content = $('#content');
    $content_wrapper = $('#content_wrapper');
    $instructions = $('#instructions');
    $tracking = $('#tracking');
    $videocover = $('#videocover');
    $videoafter = $('#videoafter');
    $videoreplay = $('#videoreplay');
    $listened = $('#listened');
    $progress = $('#progress');

    $playback = $('#playback');
    $recording = $('#recording');

    // check CSS media query breaking points
    $widerthan725px = $('#widerthan725px');
    $lowerthan600px = $('#lowerthan600px');

    // put controls to bottom of screen
    // on load
    controlsToBottom();
    // and when mobile device orientation changes
    window.addEventListener("orientationchange", function() {
        setTimeout(controlsToBottom, 400);
    }, false);

    // get how much seconds to jump back
    var jumpback = $jumpback.data('jump');

    // previously opened text file
    if (textfile) {
        loadText(textfile);
    }
    else {
        // show instructions on how to use the site
        $instructions.removeClass('hidden');
        $backhome.addClass('hidden');
    }



    // TRANSLATOR

    // detect clicked word
    // based on http://stackoverflow.com/a/9304990/716001 - space at the beginning of each paragraph needed!
    $content.on('mouseup', function(e) {
        var s = window.getSelection();
        var range = s.getRangeAt(0);

        // just word clicked (no text highlighted) and it is text that is being clicked (not space between paragraphs)
        if (s.toString().length === 0 && $(e.target).is('span.mycontent')) {
            var node = s.anchorNode;
            
            while (range.toString().indexOf(' ') !== 0) {
                range.setStart(node, (range.startOffset - 1));
            }

            range.setStart(node, (range.startOffset + 1));
            if (range.endOffset < node.length) {
                // keep selecting letters until space after word is selected
                do {
                    range.setEnd(node, range.endOffset + 1);

                } while (range.toString().indexOf(' ') === -1);

                // unselect space after selected word
                range.setEnd(node, range.endOffset - 1);
            }
        }

        var str = range.toString().trim();
        handleSelectedText(str);
    });

    // when longer text coppied to clipboard
    document.getElementById('content').addEventListener("copy", onCopyEvent);


    // if no 'to' language stored, select the language of originating site version (czech version / czech 'to' language)
    if (!localStorage.getItem('stored_lang_to')) {
        // set 'to' language
        to = ui_lang;
        // swicth 'to' selector to the language of the site
        $to.val(to);

        // if 'from' language is not previously stored and 'to' language is not english, switch 'from' language to english
        if (!localStorage.getItem('stored_lang_from') && to !== 'en') {
            from = 'en';
            $from.val('en');
        }
    }


    // preload selected from/to languages
    $from.val(from);
    $to.val(to);

    // change selected from/to languages
    $from.change(function() {
        from = $(this).val();

        TRACK.dataObjectExist(today); // 1
        TRACK.displayDailyGoal(); // 2
        TRACK.displayTrackingData(today); // 3

        localStorage.setItem('stored_lang_from', from);
    });
    $to.change(function() {
        to = $(this).val();

        localStorage.setItem('stored_lang_to', to);
    });



    // PLAYER

    // player controls
    $play_pause.click(function() {
        
        // if file loaded
        if (audiofile) {
            playPause();
        }
        else {
            // play explainer video if visible
            if ($videocover.is(':visible')) {
                $videocover.click();
            }
        }
    });

    // jump N (defined in data attribute) seconds back
    $jumpback.click(function() {
        jumpBack(jumpback);
    });

    // handle file selects
    var audio_file_select = document.getElementById('audio_files');
    audio_file_select.addEventListener('change', handleAudioFileSelect, false);

    // fake file select so the native one can be hidden
    var audioFileSelect = document.getElementById("audioFileSelect");
    audioFileSelect.addEventListener("click", function (e) {
        if (audio_file_select) {
            audio_file_select.click();
        }
        e.preventDefault();
    }, false);

    var text_file_select = document.getElementById('text_files');
    text_file_select.addEventListener('change', handleTextFileSelect, false);

    // fake file select so the native one can be hidden
    var textFileSelect = document.getElementById("textFileSelect");
    textFileSelect.addEventListener("click", function (e) {
        if (text_file_select) {
            text_file_select.click();
        }
        e.preventDefault();
    }, false);


    // previously loaded audio file?
    if (audiofile) {
        // load the file
        loadAudioToPlayer(audiofile);
    }


    // CLEAR EVERYTHING AND GO BACK TO THE MAIN PAGE
    $backhome.click(function() {
        resetPlayer();
        resetText();
    });


    // DEMO

    // check URL params
    var url_query = window.location.search.substring(1);

    // and if there are any
    if (url_query) {
        var id = getQueryVariable(url_query, 'id');
        var lang = getQueryVariable(url_query, 'lang');

        // load demo
        if (id && lang) {
            loadDemo(id, lang);
        }
    }


    // keyboard shortcuts
    window.onkeyup = function(e) {
        var key = e.keyCode ? e.keyCode : e.which;

        if (key == 37) { // left arrow
            // jump back
            jumpBack(jumpback);
        }
        else if (key == 39) { // right arrow
            // play/pause
            if (audiofile) {
                playPause();
            }
        }
        else if (key == 13) { // enter
            // record/replay
            recordReplay();
        }
        // shift pressed but not with other keys (=browser keyboard shortcut), also HelpCrunch chat not opened
        // should stay undocumented feature?
        else if ((key == 16) && !(e.ctrlKey || e.metaKey) && !$('.helpcrunch-chat').is(':visible')) {
            // click on last translated word(s) link
            if ($googletranslate.is(':visible')) {
                $googletranslate[0].click();
            }
            else if ($selectedword.text()) {
                $linktodict[0].click();
            }
        }
    };


    // RECORDING

    // test audio API support
    // TODO - currently also touch devices blocked via !('ontouchstart' in window) - debug on android and remove
    if (!('ontouchstart' in window) && window.AudioContext || window.webkitAudioContext) {

        var was_playing, init_replay = 1, rec = document.getElementById('rec');

        // detect the end of recorded audio
        rec.onended = function() {
            $playback.removeClass('active');
            recording_state = 2;

            // suptract recording/replaying time from pause time (in ms)
            subtract_from_pause_time = 2000*rec.duration;

            // if audio was playing when recording button was pressed
            if (was_playing) {
                // jump in audiobook back the same amount of seconds
                if (!isNaN(rec.duration)) {
                    // pause updating tracking chart
                    paused_updating_tracking_charts = 1;

                    jumpBack(rec.duration);

                    // if duration of recording (and therefore jumpback) > 7, subtract it from tracked audio time manually
                    // only changes < 7 are subtracted by TRACK.addAudioTime (to prevent manual changes from changing audio time)
                    if (rec.duration > 7) {
                        TRACK.addToDayAndTotal(-rec.duration, 'at');
                    }

                    // subtract jumpback also from session time
                    TRACK.addToDayAndTotal(-rec.duration, 'st');

                    // unpause updating tracking chart when user returns back to where he started recording
                    setTimeout(function() {
                        paused_updating_tracking_charts = 0;
                    }, 1000*rec.duration);
                }
                // play audio book
                if (player.paused) {
                    playPause();
                }

                was_playing = 0;
            }
        };

        // RECORDING
        $recording.on('click', function() {
            // if not replaying right now
            if (!$playback.hasClass('active')) {
            
                // // workaround to make sure that audio can be played on touch devices
                // if (init_replay) {
                //     rec.play();rec.pause();
                //     init_replay = 0;
                // }

                // if audio book playing
                if (player.currentTime && !player.paused && !player.ended) {
                    // pause audio book
                    playPause();

                    // mark that the button was pressed when playing
                    // the app will jump back in audio and start playing again
                    was_playing = 1;
                }

                // if not already recording
                if (!$recording.hasClass('active')) {
                    // record my own voice
                    Fr.voice.record(false, function() {
                        $playback.removeClass('active');
                        $recording.addClass('active');

                        // new audio was recorded but not loaded or played yet
                        recording_state = 0;
                    });
                }
                // click on mic while already recording stops recording
                else {
                    // stop recording
                    Fr.voice.stop();
                    $recording.removeClass('active');
                }
            }
        });

        // REPLAYING
        $playback.on('click', function() {

            // if not replaying already
            if (!$playback.hasClass('active')) {

                // if already recording
                if ($recording.hasClass('active')) {
                    // stop it
                    Fr.voice.stop();
                    $recording.removeClass('active');
                }

                $playback.addClass('active');

                // if audio already played (which means it was already created and loaded)
                if (recording_state && rec.duration) {
                    rec.play();
                }
                else {
                    Fr.voice.replay(function(blobUrl){
                        rec.src = blobUrl;
                        rec.onloadedmetadata = function() {
                            rec.play();
                            recording_state = 1;
                        };

                        // // this workaround with xhr allows playing on Android
                        // var xhrBlobUrl;
                        // var xhr = new XMLHttpRequest();

                        // xhr.open('GET', blobUrl, true);
                        // xhr.responseType = 'blob';
                        // xhr.overrideMimeType('audio/wav');

                        // xhr.onreadystatechange = function () {
                        //     if (xhr.readyState === 4 && xhr.status == 200) {
                        //         xhrBlobUrl = window.URL.createObjectURL(xhr.response);
                        //         rec.src = xhrBlobUrl;
                        //         rec.onloadedmetadata = function() {
                        //             rec.play();
                        //             recording_state = 1;
                        //         }
                        //     }
                        // };
                        // xhr.send();
                    }, "URL");
                }
            }
            else {
                // pause on click while playing
                rec.pause();
                $playback.removeClass('active');
            }
        });
    }
    else { // web audio API not supported
        $('.rec').css({'color': "#c4c4c4", 'background-color': "transparent"}).click(function() {
            alert('Audio recording does not work in this browser :-(');
        });
    }


    // email
    var b = $('#r').text();
    b=b.replace(" at ",String.fromCharCode(64));
    b=b.replace(" dot ",String.fromCharCode(46));
    $('#r').text(b);
    

    // slide to FAQ
    $('.jump_to').click(function(){
        var which_marker = $(this).data('marker');
        $body.animate({
            // scroll to bottom of tracking element
            scrollTop: $('#'+which_marker).offset().top
        }, 1000);
    });


    // TRACKING

    // if object does not exist yet, create it
    TRACK.dataObjectExist(today); // 1

    // get and display today's goal
    TRACK.displayDailyGoal(); // 2

    // show stored data on load
    TRACK.displayTrackingData(today); // 3

    // if today's goal achieved
    if (data[from].days[today].ga) {
        $i_am_done.removeClass('hidden');
        $idle.html('<i class="fa fa-check-circle"></i>');
    }

    TRACK.currentStreak();
    TRACK.ratioStats();

    // initialize tracking interval
    var tracking_interval = setInterval(function() {

        // if NOT PLAYING
        if (player.paused || player.ended) {
            // if pause button last pushed long time ago
            if (last_pause_time && (moment().diff(last_pause_time) > allowed_idle)) {
                // set tracking indicator to 'NOT active'
                document.getElementById('idle').style.color = '#d7d7d7';
            }

            TRACK.newDay();
        }
        // if PLAYING
        else {
            TRACK.displayTrackingData(today); // 3
        }
    }, 1000); // 1 sec

    // set daily goal
    $('#minus').click(function(){
        // if daily goal bigger than 15 min
        if (data[from].total.dg > 900) {
            // subtract 15 min
            data[from].total.dg = data[from].total.dg - 900;

            TRACK.displayDailyGoal(); // 2
            TRACK.displayTrackingData(today); // 3

            TRACK.storeTrackingData();
        }
    });
    $('#plus').click(function(){
        // add 15 min
        data[from].total.dg = data[from].total.dg + 900;

        TRACK.displayDailyGoal(); // 2
        TRACK.displayTrackingData(today); // 3

        TRACK.storeTrackingData();
    });

    // ========


    // explainer video
    var video = document.getElementById('videofile');

    $videocover.click(function() {

        // hide cover
        $videocover.addClass('hidden');

        if (video.paused || video.ended) {
            video.play();
        }
        else {
            video.pause();
        }

        video.addEventListener('ended',function() {
            $videoafter.removeClass('hidden');
        });
    });

    $videoreplay.click(function() {
        $videoafter.addClass('hidden');
        $videocover.click();
    });


    // Hotjar and HelpCrunch not included in beta

});