(function($) {
    $.extend({
        voice: {
            workerPath: "js/recorderWorker.js",
            initCalled: false,
            stream: false,
            init: function() {
                try {
                    window.AudioContext = window.AudioContext || window.webkitAudioContext;
                    navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
                    window.URL = window.URL || window.webkitURL;
                    if (navigator.getUserMedia === false) {
                        console.log('getUserMedia() is not supported in your browser');
                    }
                    $.voice.context = new AudioContext();
                } catch (e) {
                    console.log('Web Audio API is not supported in this browser');
                }
            },
            record: function(callback) {
                if ($.voice.initCalled === false) {
                    this.init();
                    $.voice.initCalled = true;
                }
                navigator.getUserMedia({
                    audio: true
                }, function(stream) {
                    var input = $.voice.context.createMediaStreamSource(stream);
                    $.voice.recorder = new Recorder(input, {
                        workerPath: $.voice.workerPath
                    });
                    $.voice.stream = stream;
                    $.voice.recorder.record();
                    callback(stream);
                }, function() {
                    console.log('No live audio input');
                });
            },
            stop: function() {
                $.voice.recorder.stop();
                $.voice.stream.stop();
                return $.voice;
            },
            replay: function(callback, type) {
                $.voice.recorder.exportWAV(function(blob) {
                    if (type === "" || type === "blob") {
                        callback(blob);
                    } else if (type === "URL") {
                        var url = URL.createObjectURL(blob);
                        callback(url);
                    }
                });
            }
        }
    });
})(jQuery);