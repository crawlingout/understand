window.requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;
var fs = null;

var max_translation_length = 5; // number of words allowed to be translated - if changed, change also note in #whentoolong
var from = localStorage.getItem('stored_lang_from') || 'en';
var to = localStorage.getItem('stored_lang_to') || 'es';
var previous_translated_words = [];
var scrollposition = Number(localStorage.getItem('lang_scrollposition')) || 0;
var textfile = localStorage.getItem('stored_text_file_content') || 0;
var audiofile = localStorage.getItem('stored_audio_file_url') || 0;
var player = 0;
var stored_audio_time = Number(localStorage.getItem('stored_audio_time')) || 0;

var interval = 0;

var just_reloaded = 1;

// workaround: some browsers do not load duration immediately - stored duration is used to set knob
var stored_duration = Number(localStorage.getItem('stored_duration')) || 0;

var warning = '<i class="fa fa-exclamation-triangle"></i> \
                <span>&nbsp;This is an experimental app. Some functionality is supported only in Google Chrome.</span>';


function errorHandler(e) {
    console.log('error>', e.message);
}

function prependPrevWord(word) {
    //$('#previous_translated_words').prepend('<p><span>'+word[from]+'</span>&nbsp;&nbsp;'+word[to]+'</p>');

    // ONLY FOR BETA - link to Seznam Slovník
    $('#previous_translated_words').prepend('<p><a target="_blank" href="http://slovnik.seznam.cz/'+from+'-cz/word/?q='+word[from]+'+"><span>'+word[from]+'</span>&nbsp;&nbsp;'+word[to]+'</a></p>');
}

function mycallback(response) {
    $('#translatedword').html(response);

    var new_word = {};
    new_word[from] = $('#selectedword').text();
    new_word[to] = response;

    previous_translated_words.push(new_word);

    localStorage.setItem('previous_translated_words', JSON.stringify(previous_translated_words));
}

function callBing(from, to, text) {
    $.ajax({
        type: 'POST',
        data: {"authtype": "js"},
        //url: '../../server/localtoken.php', // local
        url: 'http://www.simplyeasy.cz/services/token.php', // external
        success: function(data) {

            var s = document.createElement("script");
            s.src = "http://api.microsofttranslator.com/V2/Ajax.svc/Translate" +
                "?appId=Bearer " + encodeURIComponent(data) +
                "&from=" + encodeURIComponent(from) +
                "&to=" + encodeURIComponent(to) +
                "&text=" + encodeURIComponent(text) +
                "&oncomplete=mycallback";
            document.body.appendChild(s);
        },
        error: function(xhr, type) {console.log('error');
            $('#translatedword').text('UNTRANSLATED');
        }
    });

    //showQuota(text.length);
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

function handleSelectedText() {
    var text = getTextSelection(), previous_word = {};

    // get previously selected word
    previous_word[from] = $('#selectedword').html();

    // get previously translated word
    previous_word[to] = $('#translatedword').html();

    // TODO - measure translation lenght in words, not characters, and inform users about it, offer translation via Google translate link

    // if not empty or the same word again
    if (text !== '' && text !== ' ' && text !== '.' && text !== previous_word[from]) {
        // clear previous result
        $('#translatedword').html('...');

        // strip spaces before/after words
        text = text.trim();

        // get length of transtlated string
        var translation_length = text.split(' ').length;

        // too long string
        if (translation_length <= max_translation_length) {
            // hide warning text shown when text is too long
            $('#whentoolong').hide();

            // insert word to be translated into visible element
            $('#selectedword').text(text);

            // try to translate
            getTranslation(text);

            // unhide pair word_to_translate: translated_word
            $('#translations').show();

            // ONLY FOR BETA - link to Seznam Slovník
            if (translation_length <= 5) {
                $('#seznam').attr('href','https://translate.google.com/#'+from+'/'+to+'/'+encodeURIComponent(text));
            }
            // =============
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

    // set color of play/pause icon to golden
    $('.circle').css('color', '#FFD700');

    // un-green the 'load audio' button
    $('#audioFileSelect').css({
        "background-color": "#FFFFFF",
        "color": "#565656"
    });

    // when the player is ready
    player.addEventListener("canplay", function() {//console.log(player.duration, player.currentTime);

        // detect if player loaded propperly
        if (player.duration) {
            // set knob
            setKnob(player.duration, player.currentTime);
        }
        else {
            // if at least stored duration available (after reload), use it to set knob
            // workaround for browsers that load player later
            if (stored_duration) {
                setKnob(stored_duration, stored_audio_time);
            }
            // else attempt to handle it after play button is pushed
        }
    });

    // listener for finished audio
    player.addEventListener("ended", function() {console.log('ended');
        // set icon to play
        $('#pause_btn').hide();
        $('#play_btn').show();

        // reset stored time
        localStorage.setItem('stored_audio_time', '0');
    });
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
    stored_duration = 0;
    localStorage.removeItem('stored_duration');

    // clear interval updating progress bar
    window.clearInterval(interval);

    // set icon to play
    $('#pause_btn').hide();
    $('#play_btn').show();

    // reset audio progress bar
    $('.knob').val(0).trigger('change');

    // reset color of play icon
    $('.circle').css('color', '#AEAEAE');

    // grey out the 'load audio' button
    $('#audioFileSelect').css({
        "background-color": "#ffa900",
        "color": "#ffffff"
    });
}

function resetText() {
    $('#backhome').hide();
    $('#content').hide().html('');
    $('#instructions').show();

    scrollposition = 0;
    localStorage.setItem('lang_scrollposition', scrollposition);
    localStorage.removeItem('stored_text_file_content');

    // grey out the 'load text' button
    $('#textFileSelect').css({
        "background-color": "#ffa900",
        "color": "#ffffff"
    });
}

function handleAudioFileSelect(evt) {
    audiofile = evt.target.files[0];

    loadAudioToPlayer(URL.createObjectURL(audiofile));

    // store file via FileSystem API
    var storeFile = function() {
        fs.root.getFile(audiofile.name, {create: true, exclusive: true}, function(fileEntry) {
            // store file's local URL in local storage
            localStorage.setItem('stored_audio_file_url', fileEntry.toURL());

            fileEntry.createWriter(function(fileWriter) {
                fileWriter.write(audiofile);
            }, errorHandler);
        }, errorHandler);
    };

    // if FileSystem API supported
    if (fs) {
        // remove file previously stored via FileSystem API
        var dirReader = fs.root.createReader();
        dirReader.readEntries(function(entries) {
            for (var i = 0; i < entries.length; ++i) {
                entries[i].remove(function() { // store after removing previously stored file
                    storeFile();
                }, errorHandler);
            }
            if (entries.length === 0) { // store even if no file previously stored
                storeFile();
            }
        }, errorHandler);
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

    var content = '<p>';

    for (var i=0, l=paragraphs.length; i<l; i++) {
        if (paragraphs[i] !== '\r' && paragraphs[i] !== '') {
            content = content + paragraphs[i]+' ';
        }
        else {
            content = content + '</p><p>';
        }
    }
    content = content + '</p>';

    // hideinstructions on how to use the site
    $('#instructions').hide();
    $('#backhome').show();
    $('#translated_words').show();

    $('#content').show().html(content);

    // jump to stored scroll position
    $('#content_wrapper').scrollTop(scrollposition);

    // store scroll position
    $('#content_wrapper').scroll(function() {
        localStorage.setItem('lang_scrollposition', this.scrollTop);
    });
}

function handleTextFileSelect(evt) {

    // reset stored scroll position
    scrollposition = 0;
    localStorage.setItem('lang_scrollposition', scrollposition);
 
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
    else {console.log('File reader not supported.');
        // show 'browser not fully supported' message 
        $('#warning').html(warning);
        $('#warning').show();
    }
}

function loadDemo(demoid) {

    $.get('../demo/'+demoid+'.txt', function(data) { // URL specific for Beta!
    //$.get('demo/'+demoid+'.txt', function(data) { 
        loadText(data);
        localStorage.setItem('stored_text_file_content', data);
    });

    audiofile = 1;
    loadAudioToPlayer('http://www.simplyeasy.cz/files/'+demoid+'.mp3');
    localStorage.setItem('stored_audio_file_url', 'http://www.simplyeasy.cz/files/'+demoid+'.mp3');
}

function jumpBack() {
    // get current time
    current_time = player.currentTime;

    // get how much seconds to jump
    var jumpstep = $(".jumpback").data('jump');

    if (current_time > jumpstep) {
        player.currentTime = current_time - jumpstep;

        // TRACKING
        audioTime(-jumpstep);

    }
    else {
        player.currentTime = 0;

        // TRACKING
        audioTime(-current_time);

    }
}

function playPause() {

    // in browser which loads player late (no player.duration when canplay event called)
    if (!player.duration) {
        // wait
        setTimeout(function() {

            // check if player already loaded
            if (player.duration) {
                // store duration so it could be used to set knob after reload
                localStorage.setItem('stored_duration', player.duration);

                // set knob
                setKnob(player.duration, player.currentTime);

                if (just_reloaded) {
                    // jump to stored time
                    player.currentTime = stored_audio_time;
                    
                    just_reloaded = 0;
                }
            }
            //$('#debug1').text('deb1: '+player.duration+' / '+player.currentTime+'='+stored_audio_time);
        }, 200); // TODO - could shorter time be used?
    }
    else {
        if (just_reloaded) {
            // jump to stored time
            player.currentTime = stored_audio_time;

            just_reloaded = 0;
            //$('#debug2').text('deb2: '+player.duration+' / '+player.currentTime+'='+stored_audio_time);
        }
    }

    // if not playing
    if (player.paused || player.ended) {
        // play
        player.play();

        // set icon to pause
        $('#play_btn').hide();
        $('#pause_btn').show();

        // regularly update progress bar
        interval = window.setInterval(function(){
            $('.knob').val(player.currentTime).trigger('change');

            // TRACKING
            // track audio time
            audioTime(1);
            showRatio();

        }, 1000);
    }
    // if playing
    else {
        // pause
        player.pause();

        // set icon to play
        $('#pause_btn').hide();
        $('#play_btn').show();

        // pause interval updating progress bar
        window.clearInterval(interval);

        // store time
        localStorage.setItem('stored_audio_time', player.currentTime);
    }
}


$(document).ready(function() {

    if (textfile) {
        loadText(textfile);
    }
    else {
        // show instructions on how to use the site
        $('#instructions').show();
        $('#backhome').hide();
    }



    // TRANSLATOR

    // when mouse button released, get and handle selected text
    $("#content").mouseup(function() {
        handleSelectedText();
    });

    // support for touch devices
    document.getElementById('content').addEventListener('touchend', function() {
        handleSelectedText();
    }, false);


    // preload selected from/to languages
    $('#from').val(from);
    $('#to').val(to);

    // change selected from/to languages
    $('.select_lang').change(function() {
        if ($(this).attr('id') === 'from') {
            from = $(this).val();
        }
        if ($(this).attr('id') === 'to') {
            to = $(this).val();
        }
        localStorage.setItem('stored_lang_'+$(this).attr('id'), $(this).val());
    });



    // PLAYER
    
    $(".knob").knob({
        'change': function(e){
            player.currentTime = e;
            $('.knob').val(player.currentTime).trigger('change');
        }
    });

    $("#audioFileSelect").click(function() {
        resetPlayer();
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
    $(".jumpback").click(function() {
        jumpBack();
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


    // check for FileSystem API support
    if (window.requestFileSystem) {
        // all the APIs are supported

        // initialise file system
        window.requestFileSystem(window.TEMPORARY, 50*1024*1024, function(filesystem) {
            fs = filesystem;

            // try to preload previously selected file
            if (audiofile) {
                loadAudioToPlayer(audiofile);
            }

        }, errorHandler);
    }
    else {console.log('The FileSystem API not fully supported in this browser.');

        resetPlayer();
        resetText();

        // show 'browser not fully supported' message 
        $('#warning').html(warning);
        $('#warning').show();

    }


    // CLEAR EVERYTHING AND GO BACK TO THE MAIN PAGE
    $('#backhome').click(function() {
        resetPlayer();
        resetText();
    });


    // DEMO

    $('.demo').click(function() {

        $("#more").hide();
        loadDemo($(this).attr('id'));

        // swicth to the language of the demo
        $('#from').val($(this).parent().data('lang'));
    });

    // show demos pop-up
    $('#tryitnow').click(function() {
        $('#more').show();

        // scroll to the top of the page
        $('html, body').animate({ scrollTop: 0 }, 'slow');
    });

    // hide demos pop-up
    $(".overlay").click(function(){
        $(".hidepopup").hide();
    });
    $(".closepopup").click(function(){
        $(".hidepopup").hide();
    });


    // load previously translated words
    var i;
    previous_translated_words = JSON.parse(localStorage.getItem('previous_translated_words')) || [];

    for (i in previous_translated_words) {
        if (previous_translated_words[i][from] && previous_translated_words[i][to]) {
            prependPrevWord(previous_translated_words[i]);
        }
    }

    // remove previously translated words
    $('#remove_words').click(function() {
        if (confirm('Are you sure?')) {
            $('#previous_translated_words').empty();
            previous_translated_words = [];
            localStorage.setItem('previous_translated_words', '[]');
        }
    });


    // keyboar shortcuts
    window.onkeyup = function(e) {
       var key = e.keyCode ? e.keyCode : e.which;

       if (key == 37) { // left arrow
           // jump back
           jumpBack();
       }
       else if (key == 39) { // right arrow
           // play/pause
           playPause();
       }
    };


    // TRACKING
    // tracking controls
    $('#start_tracking').on('click', function() {
        tracking = 1;

        $('#start_tracking').hide();
        $('#track_session').hide();

        $('#stop_tracking').show();
        $('#tracking_info').show();

        timer = setInterval(function() {sessionTime();}, 1000);
    });

    $('#stop_tracking').on('click', function() {
        tracking = 0;
        $('#stop_tracking').hide();
        $('#start_tracking').show();

        clearInterval(timer);
    });


    //showQuota(0);

    // show BTC donation qr code on hover
    $('#qr').hover(function() {
        $('#qrimage').show();
    },
    function() {
        $('#qrimage').hide();
    });

    // show BETA warning on hover
    $('#beta').hover(function() {
        $('#betatext').show();
    },
    function() {
        $('#betatext').hide();
    });
});