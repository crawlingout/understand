var server = 'https://www.simplyeasy.cz/understand-server/';
//var server = '../understand-server/';

var from = localStorage.getItem('stored_lang_from') || 'es';
var to = localStorage.getItem('stored_lang_to') || 'en';
var previous_translated_words = [];
var scrollposition = Number(localStorage.getItem('lang_scrollposition')) || 0;
var textfile = localStorage.getItem('stored_text_file_content') || 0;
var audiofile = localStorage.getItem('stored_audio_file_url') || 0;
var player = 0;
var stored_audio_time = Number(localStorage.getItem('stored_audio_time')) || 0;
var uploaded_file_url = localStorage.getItem('uploaded_file_url') || 0;

// workaround: some browsers do not load duration on canplay event; in that case this flag is raised so duration could be obtained later
var correct_knob_duration = 0;

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

    previous_translated_words.push(new_word);

    localStorage.setItem('previous_translated_words', JSON.stringify(previous_translated_words));
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
            if (last === "," || last === "." || last === '"' || last === ")" || last === ":" || last === "!" || last === "?") {
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
            player.currentTime = stored_audio_time + diff;
        }

        $('.knob').val(player.currentTime).trigger('change');

        // calculate time difference between timeupdate events
        diff = (player.currentTime - last_time);
        last_time = player.currentTime;
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
    localStorage.setItem('lang_scrollposition', scrollposition);
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
            success: function(response) {console.log('upload: ', response);
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
        localStorage.setItem('lang_scrollposition', this.scrollTop);
    });
}

function handleTextFileSelect(evt) {
    // validation
    if (evt.target.files[0].name.substr(evt.target.files[0].name.length - 3) === 'txt' && evt.target.files[0].type.substring(0,4) === 'text') {
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
    }
    else {
        player.currentTime = 0;
    }
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
        // play
        player.play();

        // set icon to pause
        $('#play_btn').hide();
        $('#pause_btn').show();
    }
    // if playing, pause
    else {
        // pause
        player.pause();

        // set icon to play
        $('#pause_btn').hide();
        $('#play_btn').show();

        // store time
        localStorage.setItem('stored_audio_time', stored_audio_time);
    }
}


$(document).ready(function() {

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

    $('.demo').click(function() {

        $("#more").hide();
        loadDemo($(this).attr('id'));

        // swicth to the language of the demo
        $('#from').val($(this).parent().data('lang'));
        from = $(this).parent().data('lang');
        localStorage.setItem('stored_lang_from', from);
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
        $('#previous_translated_words').empty();
        previous_translated_words = [];
        localStorage.setItem('previous_translated_words', '[]');
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
    };


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