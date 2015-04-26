window.requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;
var fs = null;

var max_translation_length = 1; // number of words allowed to be translated - if changed, change also note in #whentoolong
var from = localStorage.getItem('read_stored_lang_from') || 'es';
var to = localStorage.getItem('read_stored_lang_to') || 'en';
var previous_translated_words = [];
var scrollposition = Number(localStorage.getItem('read_lang_scrollposition')) || 0;
var textfile = localStorage.getItem('read_stored_text_file_content') || 0;
var audiofile = localStorage.getItem('read_stored_audio_file_url') || 0;
var player = 0;
var stored_audio_time = Number(localStorage.getItem('read_stored_audio_time')) || 0;

var interval = 0;

var just_reloaded = 1;

// workaround: some browsers do not load duration immediately - stored duration is used to set knob
var stored_duration = Number(localStorage.getItem('read_stored_duration')) || 0;

var warning = '<i class="fa fa-exclamation-triangle"></i> \
                <span>&nbsp;This app is in BETA state. Some features are supported only in Google Chrome.</span>';


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

    localStorage.setItem('read_previous_translated_words', JSON.stringify(previous_translated_words));
}

function callBing(from, to, text) {
    $.ajax({
        type: 'POST',
        data: {"authtype": "js"},
        //url: '../../server/localtoken.php', // local
        url: 'https://www.simplyeasy.cz/services/token.php', // external
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

        // trim trailing dot or comma
        if (text[text.length-1] === "." || text[text.length-1] === ",") {
            text = text.slice(0,-1);
        }

        // string NOT too long
        if (text.split(' ').length <= max_translation_length) {
            // hide warning text shown when text is too long
            $('#whentoolong').hide();

            // remove trailing characters
            var len = text.length;
            var lastchar = text.substr(len-1,1);
            if (lastchar === "," || lastchar === "." || lastchar === '"' || lastchar === ")" || lastchar === ":") {;
                text = text.substring(0,len-1);
            }

            // insert word to be translated into visible element
            $('#selectedword').text(text);

            // try to translate
            getTranslation(text);

            // unhide pair word_to_translate: translated_word
            $('#translations').show();

            // ONLY FOR BETA
            $('#linktodict').attr('href','http://slovnik.seznam.cz/'+from+'-cz/word/?q='+encodeURIComponent(text));
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

function resetText() {
    $('#backhome').hide();
    $('#content').hide().html('');
    $('#instructions').show();

    scrollposition = 0;
    localStorage.setItem('read_lang_scrollposition', scrollposition);
    localStorage.removeItem('read_stored_text_file_content');

    // grey out the 'load text' button
    $('#textFileSelect').css({
        "background-color": "#4ba3d9",
        "color": "#ffffff"
    });
}

function loadText(text) {

    // un-green the 'load text' button
    $('#textFileSelect').css({
        "background-color": "#FFFFFF",
        "color": "#565656"
    });
    
    // split paragraphs by empty lines
    var paragraphs = text.split("\n");

    var content = '<p class="mycontent"> ';

    for (var i=0, l=paragraphs.length; i<l; i++) {
        if (paragraphs[i] !== '\r' && paragraphs[i] !== '') {
            content = content + paragraphs[i]+' ';
        }
        else {
            content = content + '</p><p class="mycontent"> ';
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
        localStorage.setItem('read_lang_scrollposition', this.scrollTop);
    });
}

function handleTextFileSelect(evt) {

    // reset stored scroll position
    scrollposition = 0;
    localStorage.setItem('read_lang_scrollposition', scrollposition);
 
    // file reader supported
    if (window.FileReader) {

        var reader = new FileReader();

        // closure to capture the file information.
        reader.onload = function(e) {
            loadText(e.target.result);

            // store text
            localStorage.setItem('read_stored_text_file_content', e.target.result);
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
    
    // detect clicked word
    // based on http://stackoverflow.com/a/9304990/716001 - space at the beginning of each paragraph needed!
    $('#content').on('click', 'p.mycontent', function(e) {
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
        localStorage.setItem('read_stored_lang_'+$(this).attr('id'), $(this).val());
    });


    // handle file select

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


    // CLEAR EVERYTHING AND GO BACK TO THE MAIN PAGE
    $('#backhome').click(function() {
        resetText();
    });


    // load previously translated words
    var i;
    previous_translated_words = JSON.parse(localStorage.getItem('read_previous_translated_words')) || [];

    for (i in previous_translated_words) {
        if (previous_translated_words[i][from] && previous_translated_words[i][to]) {
            prependPrevWord(previous_translated_words[i]);
        }
    }

    // remove previously translated words
    $('#remove_words').click(function() {
        $('#previous_translated_words').empty();
        previous_translated_words = [];
        localStorage.setItem('read_previous_translated_words', '[]');
    });
});