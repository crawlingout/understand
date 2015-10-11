// modified by me!

/**
 * Francium Voice plugin 0.3 (22 Sep 2015)
 * Copyright Subin Siby - http://subinsb.com
 * 
 * ------------------
 * Licensed under MIT
 * ------------------
 * 
 * A JavaScript plugin to record, play & download microphone input sound from the user.
 * NEEDS recorder.js and recorderWorker.js to work - https://github.com/mattdiamond/Recorderjs
 * 
 * To use MP3 conversion, NEEDS mp3Worker.js, libmp3lame.min.js and recorderWorker.js from https://github.com/nusofthq/Recordmp3js/tree/master/js
 *
 * Full Documentation & Support - http://subinsb.com/html5-record-mic-voice
*/

(function(window){
  window.Fr = window.Fr || {};
	Fr.voice = {
    workerPath: "js/recorderWorker.js",

    stream: false,
    
    init_called: false,

    browser_support: true,
    
    /**
     * Initialize. Set up variables.
     */
    init: function(){
    	try {
    		// Fix up for prefixing
    		window.AudioContext = window.AudioContext||window.webkitAudioContext;
    		navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
    		window.URL = window.URL || window.webkitURL;
    		if(navigator.getUserMedia === false){
          this.browser_support = false;
          alert('Web Audio API is not fully supported in this browser :-(');
    		}
    		this.context = new AudioContext();
    	}catch(e) {
        this.browser_support = false;
    		alert('Web Audio API is not supported in this browser :-(');
    	}
    },
    
    /**
     * Start recording audio
     */
    record: function(output, callback){
    	callback = callback || function(){};
      if(this.init_called === false){
    		this.init();
    		this.init_called = true;
    	}
      if (this.browser_support) {
        $that = this;
      	navigator.getUserMedia({audio: true}, function(stream){
      		var input = $that.context.createMediaStreamSource(stream);
      		if(output === true){
            input.connect($that.context.destination);
      		}
      		$that.recorder = new Recorder(input, {
            workerPath : $that.workerPath
      		});
      		$that.stream = stream;
      		$that.recorder.record();
      		callback(stream);
      	}, function() {
      		alert('No live audio input');
      	});
      }
    },
    
    /**
     * Stop recording audio
     */
    stop: function(){
      if (this.recorder) {
      	this.recorder.stop();
      	this.stream.getTracks().forEach(function (track) {
          track.stop();
        });
      	return this;
      }
    },
    
    /**
     * Export the recorded audio to blob URL
     */
    replay: function(callback, type){
      if (this.recorder) {
        this.recorder.exportWAV(function(blob) {
          if(type == "URL"){
            var url = URL.createObjectURL(blob);
            callback(url);
          }
        });
      }
    }
  };
})(window);
