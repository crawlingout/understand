var server = 'https://www.simplyeasy.cz/understand-server/';
//var server = '../understand-server/';

var from = localStorage.getItem('stored_lang_from') || 'es';
var to = localStorage.getItem('stored_lang_to') || 'en';
var previous_translated_words = JSON.parse(localStorage.getItem('previous_translated_words')) || [];
var scrollposition = Number(localStorage.getItem('scrollposition')) || 0;
var textfile = localStorage.getItem('stored_text_file_content') || 0;
var audiofile = localStorage.getItem('stored_audio_file_url') || 0;
var player = 0;
var stored_audio_time = Number(localStorage.getItem('stored_audio_time')) || 0;
var uploaded_file_url = localStorage.getItem('uploaded_file_url') || 0;

// workaround: some browsers do not load duration on canplay event; in that case this flag is raised so duration could be obtained later
var correct_knob_duration = 0;


// TRACKING

var today = moment().format('YYYY-MM-DD');
var allowed_idle = 300000; // 5 minutes in miliseconds
var last_pause_time, pause_diff;

var data = JSON.parse(localStorage.getItem('data')) || {};

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

// display data other than number of translated words
TRACK.displayTrackingData = function(day) {
    // if the object for the language does not exist yet, create it
    if (!data[from]) {
        data[from] = {
            'total': {
                'st': 0,
                'at': 0,
                'tw': 0
            },
            'days': {}
        };
    }
    // if the object for the day does not exist yet, create it
    if (!data[from].days[day]) {
        data[from].days[day] = {
            'at': 0,
            'st': 0,
            'tw': 0
        };
    }

    $("#audio_time").text(convertSeconds(data[from].days[day].at));
    $("#session_time").text(convertSeconds(data[from].days[day].st));
    $("#session_audio_ratio").text(calculateRatio(data[from].days[day].at, data[from].days[day].st));
    $("#track_translated_words").text(data[from].days[day].tw);

    $("#audio_time_total").text(convertSeconds(data[from].total.at));
    $("#session_time_total").text(convertSeconds(data[from].total.st));
    $("#track_translated_words_total").text(data[from].total.tw);
};

// store data other than number of translated wor
TRACK.storeTrackingData = function() {//console.log('storeTrackingData');
    localStorage.setItem('data', JSON.stringify(data));

    // TODO when storing at Firebase, only send and store the difference, do not keep sending all the data all the time
};

TRACK.addToDayAndTotal = function(addition, to) {
    data[from].days[today][to] = data[from].days[today][to] + addition;
    data[from].total[to] = data[from].total[to] + addition;
};

deleteTrackingData = function() {
    localStorage.removeItem('data');
    document.getElementById('delete').innerHTML = '<br /><br />[ deleted ]';
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
TRACK.addAudioTime = function(difference) {//console.log('addAudioTime', difference);

    // if diff NOT caused by manual knob manipulation
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
            if ((data[from].days[today].at + difference) > 0) {
                TRACK.addToDayAndTotal(difference, 'at');
            }
        }
    }
};

// track session time
TRACK.startPauseTimer = function() {//console.log('startPauseTimer');
    last_pause_time = moment();
};

// add pause time only if pause not loong
TRACK.addPauseTime = function() {//console.log('addPauseTime');
    if (last_pause_time) {
        pause_diff = moment().diff(last_pause_time);

        if (pause_diff < allowed_idle) {
            TRACK.addToDayAndTotal((pause_diff/1000), 'st');
        }
    }
};

// check whether day changed since load
TRACK.newDay = function() {
    if (today !== moment().format('YYYY-MM-DD')) {
        today = moment().format('YYYY-MM-DD');

        TRACK.displayTrackingData(today);
    }
};

// display number of translated words
TRACK.addTranslatedWord = function () {
    TRACK.newDay();
    TRACK.addToDayAndTotal(1, 'tw');
    TRACK.displayTrackingData(today);
    TRACK.storeTrackingData();
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
    $('#previous_translated_words').
        prepend('<p><a target="_blank" href="'+linkToDict(word[from])+'"><span>'+word[from]+'</span>&nbsp;&nbsp;'+word[to]+' <em>></em></a></p>');
}

function mycallback(response) {
    $('#translatedword').html(response);

    var new_word = {};
    new_word[from] = $('#selectedword').text();
    new_word[to] = response;

    // if element with previously translated words NOT hidden (in mobile version)
    if ($('#previous_translated_words').is(":visible")) {
        previous_translated_words.push(new_word);
        localStorage.setItem('previous_translated_words', JSON.stringify(previous_translated_words));
    }
}

function callBing(from, to, text) {//console.log('calling Bing');
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

            // track and display number of translated words
            TRACK.addTranslatedWord();
        },
        error: function(xhr, type) {console.log('bing translator error');
            $('#translatedword').text('UNTRANSLATED');
        }
    });
}

function getTranslation(word) {
    callBing(from, to, word);
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

function handleSelectedText(text) {
    var previous_word = {};

    // get previously selected word
    previous_word[from] = $('#selectedword').html();

    // get previously translated word
    previous_word[to] = $('#translatedword').html();

    // if not empty or the same word again
    if (text !== '' && text !== ' ' && text !== '.' && text !== previous_word[from]) {
        // clear previous result
        $('#translatedword').html('...');

        // strip spaces before/after words
        text = text.trim();

        // string NOT too long
        if (text.split(' ').length <= 1) {
            // hide warning text shown when text is too long
            $('#whentoolong').hide();

            // remove trailing characters
            var len = text.length;
            var last = text.substr(len-1,1);
            if (last === "," || last === "." || last === '"' || last === ")" || last === ":" || last === "!" || last === "?" || last === ";") {
                text = text.substring(0,len-1);
            }

            // insert word to be translated into visible element
            $('#selectedword').text(text);

            // try to translate
            getTranslation(text);

            // unhide pair word_to_translate: translated_word
            $('#translations').show();

            // create link to external dictionary or translator
            $('#linktodict').attr('href', linkToDict(text));
        }
        else {
            // create URL to google translate
            $('#googletranslate').attr('href','https://translate.google.com/#'+from+'/'+to+'/'+encodeURIComponent(text));

            $('#whentoolong').show();
            $('#translations').hide();
        }

        // if previous word not empty
        if (previous_word[from] !== '' && previous_word[to] !== '...') {

            // prepend previously translated word into the list
            prependPrevWord(previous_word);
        }
    }
}

function setKnob(dur, cur) {
    // get time for the player to jump to
    var jumpto = cur || stored_audio_time;

    $('.knob').trigger('configure', {
        max: dur
    });
    $('.knob').val(jumpto).trigger('change');
}

function loadAudioToPlayer(file) {

    // load audio file
    player.src = file;

    // un-green the 'load audio' button
    $('#audioFileSelect').css({
        "background-color": "#FFFFFF",
        "color": "#565656"
    });

    // when the player is ready
    var canplay_fired = 0; // workaround to prevent loop - some browsers fire canplay event again on player.currentTime = stored_audio_time
    player.oncanplay = function() {
        if (!canplay_fired) {
            // set color of play/pause icon
            $('.circle').css('color', '#4ba3d9');

            // if duration loaded propperly
            if (player.duration) {
                // set player to stored time
                player.currentTime = stored_audio_time;

                // set knob
                setKnob(player.duration, stored_audio_time);
            }
            else {
                // raise flag so duration can be obtained later
                correct_knob_duration = 1;
            }
            canplay_fired = 1;
        }
    };

    // keep updating knob when audio is playing
    var diff = 0, last_time = stored_audio_time;
    player.ontimeupdate = function() {

        // workaround for problem with Android Chrome - randomly setting currentTime to 0 after player.play()
        if (player.currentTime === 0 && stored_audio_time) {
            player.currentTime = stored_audio_time + diff;//console.log('FIXING PROBLEM', player.currentTime);
        }

        $('.knob').val(player.currentTime).trigger('change');

        // calculate time difference between timeupdate events
        diff = (player.currentTime - last_time);
        last_time = player.currentTime;

        // track audio time
        TRACK.addAudioTime(diff);
    };

    // listener for finished audio
    player.onended = function() {
        // set icon to play
        $('#pause_btn').hide();
        $('#play_btn').show();
    };
}

function resetPlayer() {

    // if playing
    if (!player.paused && !player.ended) {
        player.pause();
    }

    // reset stored time, url and duration
    stored_audio_time = 0;
    localStorage.setItem('stored_audio_time', stored_audio_time);
    audiofile = 0;
    localStorage.removeItem('stored_audio_file_url');

    // set icon to play
    $('#pause_btn').hide();
    $('#play_btn').show();

    // reset audio progress bar
    $('.knob').val(0).trigger('change');

    // reset color of play icon
    $('.circle').css('color', '#AEAEAE');

    // blue 'load audio' button
    $('#audioFileSelect').css({
        "background-color": "#4ba3d9",
        "color": "#ffffff"
    });
}

function resetText() {
    $('#backhome').hide();
    $('#content').hide().html('');
    $('#instructions').show();

    scrollposition = 0;
    localStorage.setItem('scrollposition', scrollposition);
    localStorage.removeItem('stored_text_file_content');

    // blue 'load text' button
    $('#textFileSelect').css({
        "background-color": "#4ba3d9",
        "color": "#ffffff"
    });
}

function handleAudioFileSelect(evt) {
    resetPlayer();

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
        if (uploaded_file_url) {
            formData.append("previous", uploaded_file_url);
        }

        $.ajax({
            url: server+'upload.php',
            type: 'POST',
            success: function(response) {//console.log('upload: ', response);
                // if NOT error
                if (response.substring(0,5) !== 'Sorry') {
                    response = $.trim(response);
                    localStorage.setItem('uploaded_file_url', response);
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

    // un-green the 'load text' button
    $('#textFileSelect').css({
        "background-color": "#FFFFFF",
        "color": "#565656"
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

    // hideinstructions on how to use the site
    $('#instructions').hide();
    $('#backhome').show();
    $('#translated_words').show();

    $('#content').show().html(content);

    // jump to stored scroll position
    $('#content_wrapper').scrollTop(scrollposition);

    // store scroll position
    $('#content_wrapper').scroll(function() {
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

function loadDemo(demoid) {
    resetPlayer();
    resetText();

    $.get('../demo/'+demoid+'.txt', function(data) { 
        loadText(data);
        localStorage.setItem('stored_text_file_content', data);
    });

    audiofile = 'https://www.simplyeasy.cz/understand-server/files/'+demoid+'.mp3';
    loadAudioToPlayer(audiofile);
    localStorage.setItem('stored_audio_file_url', audiofile);
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

    TRACK.newDay();
}

function playPause() {
    stored_audio_time = player.currentTime;

    // if duration not detected on canplay event (some browsers show duration = 0 at that time)
    if (correct_knob_duration) {
        // get it now
        setTimeout(function() {
            if (player.duration) {
                // and use it to set knob correctly
                setKnob(player.duration, stored_audio_time);
                correct_knob_duration = 0;
            }
        }, 200);
    }

    // if not playing, play
    if (player.paused || player.ended) {
        // PLAY
        player.play();

        // set icon to pause
        $('#play_btn').hide();
        $('#pause_btn').show();

        TRACK.addPauseTime();
        TRACK.newDay();
        document.getElementById('idle').style.color = '#4ba3d9'; // set tracking indicator to 'active'
    }
    // if playing, pause
    else {
        // PAUSE
        player.pause();

        // set icon to play
        $('#pause_btn').hide();
        $('#play_btn').show();

        // store time
        localStorage.setItem('stored_audio_time', stored_audio_time);

        TRACK.startPauseTimer();
        TRACK.displayTrackingData(today);
        TRACK.storeTrackingData();
    }
}

function clearTranslatedWords() {//console.log('clearTranslatedWords');
    $('#selectedword').text('');
    $('#previous_translated_words').empty();
    $('#translations').hide();
}

function loadTranslatedWords() {//console.log('loadTranslatedWords');
    clearTranslatedWords();

    for (var i=0, l=previous_translated_words.length; i<l; i++) {
        if (previous_translated_words[i][from] && previous_translated_words[i][to]) {
            prependPrevWord(previous_translated_words[i]);
        }
    }
}


// if just recorded my own voice -> replay
// if not, record
var already_replayed = 1; // this determines whether recorded audio has been replayed already
function recordReplay() {
    // if not played yet
    if (already_replayed === 0) {

        // play
        $('#playback').click();
    }
    else {
        // record
        $('#recording').click();
    }
}


$(document).ready(function() {

    // position controls at bottom of screen
    var content_wrapper_height = 0;
    var window_height = $(window).height();
    if ($(window).width() <= 1100) {
         content_wrapper_height = window_height - 238;
    }
    else {
        content_wrapper_height = window_height - 168;
    }
    if (content_wrapper_height > 400) {
        $('#content_wrapper').css({'height': content_wrapper_height+'px'});
    }

    // get how much seconds to jump back
    var jumpback = $("#jumpback").data('jump');

    // previously opened text file
    if (textfile) {
        loadText(textfile);
    }
    else {
        // show instructions on how to use the site
        $('#instructions').show();
        $('#backhome').hide();
    }



    // TRANSLATOR

    // detect clicked word
    // based on http://stackoverflow.com/a/9304990/716001 - space at the beginning of each paragraph needed!
    $('#content').on('click', 'span.mycontent', function(e) {
        s = window.getSelection();
        var range = s.getRangeAt(0);
        var node = s.anchorNode;

        while (range.toString().indexOf(' ') !== 0) {
            range.setStart(node, (range.startOffset - 1));
        }

        range.setStart(node, range.startOffset + 1);
        if (range.endOffset < node.length) {
            do {
                range.setEnd(node, range.endOffset + 1);

            } while (range.toString().indexOf(' ') === -1 && range.toString().trim() !== '');
        }

        var str = range.toString().trim();
        handleSelectedText(str);
    });

    // when longer text coppied to clipboard
    document.getElementById('content').addEventListener("copy", onCopyEvent);


    // if no 'to' language stored, select the language of originating site version (czech version / czech 'to' language)
    if (!localStorage.getItem('stored_lang_to')) {
        // set 'to' language
        to = $("#content_wrapper").data('language');
        // swicth 'to' selector to the language of the site
        $('#to').val(to);

        // if 'from' language is not previously stored and 'to' language is not english, switch 'from' language to english
        if (!localStorage.getItem('stored_lang_from') && to !== 'en') {
            from = 'en';
            $('#from').val('en');
        }
    }


    // preload selected from/to languages
    $('#from').val(from);
    $('#to').val(to);

    // change selected from/to languages
    $('.select_lang').change(function() {
        if ($(this).attr('id') === 'from') {
            from = $(this).val();
            TRACK.displayTrackingData(today);
        }
        if ($(this).attr('id') === 'to') {
            to = $(this).val();
        }
        localStorage.setItem('stored_lang_'+$(this).attr('id'), $(this).val());
        loadTranslatedWords();
    });



    // PLAYER
    
    $(".knob").knob({
        'change': function(e){
            player.currentTime = e;
            $('.knob').val(player.currentTime).trigger('change');
        }
    });

    // get audioplayer
    player = document.getElementById('audioplayer');

    // player controls
    $('#play_pause').click(function() {
        
        // if file loaded
        if (audiofile) {
            playPause();
        }
    });

    // jump N (defined in data attribute) seconds back
    $("#jumpback").click(function() {
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
    else {
        resetPlayer();
    }


    // CLEAR EVERYTHING AND GO BACK TO THE MAIN PAGE
    $('#backhome').click(function() {
        resetPlayer();
        resetText();
    });


    // DEMO

    // select a demo
    $('.demo').click(function() {

        $("#more").hide();
        $('html, body').scrollTop(0);

        loadDemo($(this).attr('id'));

        // swicth to the language of the demo
        $('#from').val($(this).parent().data('lang'));
        $('.select_lang').change();
    });

    // show demos pop-up
    $('#tryitnow').click(function() {
        $('#more').show();

        // jump to the top of the page
        $('html, body').scrollTop(0);
    });

    // hide demos pop-up
    $(".overlay").click(function(){
        $(".hidepopup").hide();
        $('html, body').scrollTop(0);
    });
    $(".closepopup").click(function(){
        $(".hidepopup").hide();
        $('html, body').scrollTop(0);
    });


    // load previously translated words
    loadTranslatedWords();

    // remove previously translated words
    $('#remove_words').click(function() {
        clearTranslatedWords();

        // remove only words of the 'from' language that is selected
        for (var j=previous_translated_words.length-1; j>=0; j--) {
            if (previous_translated_words[j][from]) {
                previous_translated_words.splice(j, 1);
            }
        }

        localStorage.setItem('previous_translated_words', JSON.stringify(previous_translated_words));
    });


    // keyboard shortcuts
    window.onkeyup = function(e) {
       var key = e.keyCode ? e.keyCode : e.which;

       if (key == 37) { // left arrow
           // jump back
           jumpBack(jumpback);
       }
       else if (key == 39) { // right arrow
           // play/pause
           playPause();
       }
       else if (key == 16) { // shift
           // record/replay
           recordReplay();
       }
    };


    // RECORDING
    var recording_now = 0, ended, was_playing;
    $('#recording').on('click', function() {

        // if audio book playing
        if (!(player.paused || player.ended)) {
            // pause audio book
            playPause();

            // mark that the button was pressed when playing
            // the app will jump back in audio and start playing again
            was_playing = 1;
        }

        // mark as not replayed yet
        already_replayed = 0;

        if (recording_now === 0) {
            // record my own voice
            $.voice.record(function() {//console.log('recorded');
                recording_now = 1;
                $('#playback').removeClass('active');
                $('#recording').addClass('active');
            });
        }
        // click on mic while already recording stops recording
        else {
            // stop recording
            $.voice.stop();
            recording_now = 0;
            $('#recording').removeClass('active');
        }
    });
    $('#playback').on('click', function() {

        // stop recording
        $.voice.stop();
        recording_now = 0;

        // mark as played
        already_replayed = 1;

        // play recording
        $.voice.replay(function(url){//console.log('played');
            $("#myvoice").attr("src", url);
            $("#myvoice")[0].play();

            $('#recording').removeClass('active');
            $('#playback').addClass('active');
        }, "URL");

        // detect the end of recorded audio
        // this could not be done via event listener - event 'ended' does not fire reliably in chrome
        ended = setInterval(function(){
            if (myvoice.ended) {
                clearInterval(ended);
                // done playing
                $('#playback').removeClass('active');

                // if audio was playing when recording button was pressed
                if (was_playing) {
                    // jump audio book back the same amount of seconds
                    if (myvoice.duration) {
                        jumpBack(myvoice.duration);
                    }
                    // play audio book
                    if (player.paused || player.ended) {
                        playPause();
                    }

                    was_playing = 0;
                }
            }
        }, 200);
    });


    // show BTC donation qr code on hover
    $('#qr').hover(function() {
        $('#qrimage').show();
    },
    function() {
        $('#qrimage').hide();
    });


    // TRACKING

    // idle indicator
    var idle_indicator = document.getElementById('idle');

    // display indicator of active tracking
    var interval = setInterval(function() {

        // if active
        if (last_pause_time && moment().diff(last_pause_time) < allowed_idle) {
            // set tracking indicator to 'active'
            idle_indicator.style.color = '#4ba3d9';
        }
        else {
            // // set tracking indicator to 'NOT active'
            idle_indicator.style.color = '#dcdcdc';
        }
    }, 60000); // 1 min

    // show stored data on load
    TRACK.displayTrackingData(today);

    // slide to tracking
    $('#idle').click(function(){
        $('html, body').animate({
            scrollTop: $("#tracking")[0].scrollHeight
        });
    });

    // ========
});