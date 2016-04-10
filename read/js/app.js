var server = 'https://www.simplyeasy.cz/understand-server/';
//var server = '../understand-server/';

var max_translation_length = 1; // number of words allowed to be translated - if changed, change also note in #whentoolong
var from = localStorage.getItem('read_stored_lang_from') || 'es';
var to = localStorage.getItem('read_stored_lang_to') || 'en';
var previous_translated_words = [];
var scrollposition = Number(localStorage.getItem('read_scrollposition')) || 0;
var textfile = localStorage.getItem('read_stored_text_file_content') || 0;


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
    }
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

            // regex to remove weird leading and trailing characters
            text = text.replace(/^[¿¡(„‚“‘'"‹›«»—-]+|[,.:;?!)“”‘’'"‹›«»—-]+$/g, '');

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
    localStorage.setItem('read_scrollposition', scrollposition);
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
        localStorage.setItem('read_scrollposition', this.scrollTop);
    });
}

function handleTextFileSelect(evt) {

    // reset stored scroll position
    scrollposition = 0;
    localStorage.setItem('read_scrollposition', scrollposition);
 
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
    else {
        console.log('File reader not supported.');
    }
}

function setContentHeight() {
    // calculate content height on smaller mobile devices
    window_width = $(window).width();
    window_height = $(window).height();
    var content_wrapper_height = window_height;

    if (window_width < 1100) {

        if (window_width > 725) {
            content_wrapper_height = window_height - 90;
        }
        else {
            content_wrapper_height = window_height - 60;
        }
    }

    $('#content_wrapper').css({'height': content_wrapper_height+'px'});
}


$(document).ready(function() {

    // set content height
    // on load
    setContentHeight();
    // and when mobile device orientation changes
    window.addEventListener("orientationchange", function() {
        setTimeout(setContentHeight, 400);
    }, false);


    // load textfile
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
});