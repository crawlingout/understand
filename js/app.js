window.requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;
var fs = null;

var max_translation_length = 30;
var from = localStorage.getItem('stored_lang_from') || 'en';
var to = localStorage.getItem('stored_lang_to') || 'es';
var previous_translated_words = [];
var quota = 5000; // config
var quota_used = Number(localStorage.getItem('quota_used')) || 0;
var quota_month = Number(localStorage.getItem('quota_month')) || 0;
var scrollposition = Number(localStorage.getItem('lang_scrollposition')) || 0;
var textfile = localStorage.getItem('stored_text_file_content') || 0;
var audiofile = localStorage.getItem('stored_audio_file_url') || 0;
var player = 0;
var stored_audio_time = Number(localStorage.getItem('stored_audio_time')) || 0;
var interval = 0;

// workaround to load duration in Chrome for Android at least for demos (stored in data attr)
var loaded_duration = Number(localStorage.getItem('stored_loaded_duration')) || 0;

var warning = '<i class="fa fa-exclamation-triangle"></i> \
                <span>&nbsp;This is an experimental app. Some functionality is supported only in Google Chrome.</span>';


function errorHandler(e) {
    console.log('error>', e.message);
}

// handle monthly quota
function showQuota(add) {
    var d = new Date();
    var m = d.getMonth();
    var percent;

    // still the same month
    if (m === quota_month) {
    	quota_used = quota_used + add;
        percent = Math.round((quota_used/quota)*100);
    	$('.quota_used').text(percent);
    	localStorage.setItem('quota_used', quota_used);
    }
    else {
        quota_used = 0 + add;
        percent = Math.round((quota_used/quota)*100);
        $('.quota_used').text(percent);
        localStorage.setItem('quota_used', quota_used);

        quota_month = m;
        localStorage.setItem('quota_month', quota_month);
    }
}

function prependPrevWord(word) {
	$('#previous_translated_words').prepend('<p><span>'+word[from]+'</span>&nbsp;&nbsp;'+word[to]+'</p>');
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
		//url: 'server/localtoken.php', // local
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
    // if (quota_used < quota) {

        // call Bing API
    	callBing(from, to, word);
    // }
    // else {
    //     $('#quota_used_wrapper').html('<div class="failed">Over quota! Could not translate.</div>');
    //     $('#translatedword').text('UNTRANSLATED');
    // }
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

    // TODO strip spaces before/after words and commas, semilocons and dots after words

    // get previously selected word
	previous_word[from] = $('#selectedword').html();

    // if not empty or too long string
    if (text !== '' && text !== ' ' && text !== '.' && text !== previous_word[from] && text.length < max_translation_length) {
    	// get previously translated word
		previous_word[to] = $('#translatedword').html();

    	// insert into visible element
    	$('#selectedword').text(text);

    	// clear previous result
    	$('#translatedword').html('...');

        // try to translate
        getTranslation(text);

    	// unhide pair word_to_translate: translated_word
    	$('#translations').show();

    	// if previous word not empty
    	if (previous_word[from] !== '' || previous_word[to] !== '...') {

			// show previously translated word
			prependPrevWord(previous_word);
		}
    }
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
	player.addEventListener("canplay", function() {

		// configure audio progress bar
		$('.knob').trigger('configure', {
	        "max": player.duration || loaded_duration
	    });
        //$('#debug1').text('dur: '+player.duration);

        // get time for the player to jump to - get stored time if page just loaded or get current time if just paused ('canplay' event also called)
        var jumpto = player.currentTime || stored_audio_time;
		
		// set stored time
		$('.knob').val(jumpto).trigger('change');
	});

	// listener for finished audio
	player.addEventListener("ended", function() {
		// set icon to play
		$('#pause_btn').hide();
		$('#play_btn').show();

		// reset stored time
		localStorage.setItem('stored_audio_time', '0');
	});
}

function resetPlayer() {

    // reset stored time and url
    stored_audio_time = 0;
    localStorage.setItem('stored_audio_time', stored_audio_time);
    audiofile = 0;
    localStorage.removeItem('stored_audio_file_url');

    loaded_duration = 0;
    localStorage.removeItem('stored_loaded_duration');

    // reset audio progress bar
    $('.knob').val(0).trigger('change');

    // reset color of play icon
    $('.circle').css('color', '#AEAEAE');

    // green the 'load audio' button
    $('#audioFileSelect').css({
        "background-color": "#ffa900",
        "color": "#000000"
    });
}

function resetText() {
    $('#backhome').hide();
    $('#content').hide().html('');
    $('#explanation').show();

    scrollposition = 0;
    localStorage.setItem('lang_scrollposition', scrollposition);
    localStorage.removeItem('stored_text_file_content');

    // green the 'load text' button
    $('#textFileSelect').css({
        "background-color": "#ffa900",
        "color": "#000000"
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

    var content = '<p>';//console.log(paragraphs);

    for (var i=0, l=paragraphs.length; i<l; i++) {
    	if (paragraphs[i] !== '\r' && paragraphs[i] !== '') {
    		content = content + paragraphs[i]+' ';
    	}
    	else {
    		content = content + '</p><p>';
    	}
    }
    content = content + '</p>';

    // hideexplanation on how to use the site
	$('#explanation').hide();
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

    $.get('demo/'+demoid+'.txt', function(data) {
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
    }
    else {
        player.currentTime = 0;
    }
}

function playPause() {
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
		// show explanation on how to use the site
		$('#explanation').show();
        $('#backhome').hide();
	}



	// TRANSLATOR

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

	var just_reloaded = 1;

	// player controls
	$('#play_pause').click(function() {
		
		// if file loaded
		if (audiofile) {

			// preload stored time when site loaded
			if (just_reloaded) {
				player.currentTime = stored_audio_time;
				just_reloaded = 0;
			}

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
        // get duration (workaround for Android)
        loaded_duration = $(this).data('duration') || 0;
        localStorage.setItem('stored_loaded_duration', loaded_duration);

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
		$('#previous_translated_words').empty();
		previous_translated_words = [];
		localStorage.setItem('previous_translated_words', '[]');
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

	//showQuota(0);

    // show BTC donation qr code on hover
    $('#qr').hover(function() {
        $('#qrimage').show();
    },
    function() {
        $('#qrimage').hide();
    });
});