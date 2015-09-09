var $animation, $startvideo, $cursor, $i_1, $filebox, $selected_audio, $unselected_audio, $play, $audiofile, $selected_text, $unselected_text,
    $textfile, $i_2, $text, $i_3, $i_4, $pause, $i_5, $i_6, $i_7, $i_8, $i_9, $i_10, $i_11, $i_12, $i_13, $i_14, $right, $i_15, $i_16, $i_17,
    $i_18, $i_19, $i_20, $i_21, $i_22, $i_23, $i_24, $i_25, $simulation, $replay;

var reseted = 1;

// load audio files
var click = new Audio('click.mp3');
click.volume = 0.2;
var hobbit = new Audio('hobbit.mp3');

// based on http://stackoverflow.com/a/23429685/716001
function blurElement(element, size) {
     var filterVal = 'blur(' + size + 'px)';
     element
         .css('filter', filterVal)
         .css('webkitFilter', filterVal)
         .css('mozFilter', filterVal)
         .css('oFilter', filterVal)
         .css('msFilter', filterVal)
         .css('transition', 'all 0.5s ease-out')
         .css('-webkit-transition', 'all 0.5s ease-out')
         .css('-moz-transition', 'all 0.5s ease-out')
         .css('-o-transition', 'all 0.5s ease-out');

}

$(document).ready(function() {

    $animation = $('#animation');
    $startvideo = $('#startvideo');
    $cursor = $('#cursor');
    $i_1 = $('#i_1');
    $i_2 = $('#i_2');
    $i_3 = $('#i_3');
    $i_4 = $('#i_4');
    $i_5 = $('#i_5');
    $i_6 = $('#i_6');
    $i_7 = $('#i_7');
    $i_8 = $('#i_8');
    $i_9 = $('#i_9');
    $i_10 = $('#i_10');
    $i_11 = $('#i_11');
    $i_12 = $('#i_12');
    $i_13 = $('#i_13');
    $i_14 = $('#i_14');
    $i_15 = $('#i_15');
    $i_16 = $('#i_16');
    $i_17 = $('#i_17');
    $i_18 = $('#i_18');
    $i_19 = $('#i_19');
    $i_20 = $('#i_20');
    $i_21 = $('#i_21');
    $i_22 = $('#i_22');
    $i_23 = $('#i_23');
    $i_24 = $('#i_24');
    $i_25 = $('#i_25');
    $filebox = $('#filebox');
    $selected_audio = $('#selected_audio');
    $unselected_audio = $('#unselected_audio');
    $play = $('#play');
    $audiofile = $('#audiofile');
    $selected_text = $('#selected_text');
    $unselected_text = $('#unselected_text');
    $textfile = $('#textfile');
    $text = $('#text');
    $pause = $('#pause');
    $right = $('#right');
    $simulation = $('#simulation');
    $replay = $('#replay');


    // start video
    $simulation.click(function() {

        // hide play button
        $startvideo.addClass('hidden');

        // show 1st instruction
        $i_1.delay(500).fadeIn(1000);

        // // move cursor to audio button
        $cursor.delay(1500).fadeIn(200).animate({
            'left': '250px',
            'top': '371px'
        }, 1000, function() { // click audio button
            $i_1.hide();

            // play click sound
            click.play();

            // open file window
            $filebox.removeClass('hidden');
        }).animate({
            'left': '214px',
            'top': '102px'
        }, 1500, function() { // select audio file
            click.play();
            $unselected_audio.addClass('hidden');
            $selected_audio.removeClass('hidden');
        }).animate({
            'left': '495px',
            'top': '260px'
        }, 1500, function() { // click "Open"
            click.play();
            $filebox.addClass('hidden');
            $play.css({'color': '#4ba3d9'});
            $audiofile.addClass('selected');
            $i_2.delay(500).fadeIn(1000);
        }).delay(1500).animate({
            'left': '324px',
            'top': '371px'
        }, 1500, function() { // click text button
            $i_2.hide();
            click.play();
            $selected_audio.addClass('hidden');
            $unselected_audio.removeClass('hidden');
            $filebox.removeClass('hidden');
        }).animate({
            'left': '214px',
            'top': '128px'
        }, 1500, function() { // select text file
            click.play();
            $unselected_text.addClass('hidden');
            $selected_text.removeClass('hidden');
        }).animate({
            'left': '495px',
            'top': '260px'
        }, 1500, function() { // click "Open"
            click.play();
            $filebox.addClass('hidden');
            $textfile.addClass('selected');
            $text.removeClass('hidden');
            $i_3.delay(500).fadeIn(500, function() {
                blurElement($text, 2);
            }).delay(1000).fadeOut(1000);
            $i_4.delay(3000).fadeIn(1000);
        }).delay(6000).animate({
            'left': '60px',
            'top': '370px'
        }, 1500, function() { // start playing audio
            $i_3.hide();
            $i_4.hide();
            click.play();
            $play.addClass('hidden');
            $pause.removeClass('hidden');
            setTimeout(function() {hobbit.play();}, 500);
        }).animate({
            'left': '110px',
            'top': '390px'
        }, 1000, function() {
            $i_5.delay(6000).fadeIn(1000);
        }).delay(7000).animate({
            'left': '60px',
            'top': '370px'
        }, 1000, function() { // click pause
            $pause.addClass('hidden');
            $play.removeClass('hidden');
            click.play();
            hobbit.pause();
            $i_5.hide();
            $i_6.delay(1000).fadeIn(1000);
        }).delay(2000).animate({
            'left': '125px',
            'top': '360px'
        }, 1000, function() { // click jumpback
            click.play();
            $i_6.fadeOut(1000);
            $i_7.delay(1000).fadeIn(1000);
        }).delay(2000).animate({
            'left': '60px',
            'top': '370px'
        }, 1000, function() { // click play
            click.play();
            hobbit.currentTime = 2;
            hobbit.play();
            $play.addClass('hidden');
            $pause.removeClass('hidden');
            $i_7.delay(1000).fadeOut(1000);
        }).animate({
            'left': '110px',
            'top': '390px'
        }, 800, function() {
            $i_8.delay(1500).fadeIn(1000).delay(1000).fadeOut(1000);
            $i_9.delay(4500).fadeIn(1000).delay(1000).fadeOut(1000);
            $i_10.delay(13000).fadeIn(1000);
        }).delay(14500).animate({
            'left': '125px',
            'top': '360px'
        }, 1000, function() { // click jumpback
            click.play();
            $i_10.hide();
            hobbit.currentTime = 13;
            $i_11.delay(2000).fadeIn(1000).delay(1000).fadeOut(1000);
        }).delay(5000).animate({
            'left': '60px',
            'top': '370px'
        }, 800, function() { // click pause
            $pause.addClass('hidden');
            $play.removeClass('hidden');
            click.play();
            hobbit.pause();
            $i_12.delay(1000).fadeIn(1000).delay(1000).fadeOut(1000, function() {
                blurElement($text, 0); // unblur
            });
        }).delay(5000).animate({
            'left': '45px',
            'top': '132px'
        }, 1000).animate({ // underline a sentence
            'left': '328px',
            'top': '132px'
        }, 1500, function() {
            $i_13.fadeIn(1000).delay(1000).fadeOut(1000);
        }).delay(3000).animate({ // underline a word
            'left': '308px',
            'top': '132px'
        }, 500, function() {
            $i_14.fadeIn(1000);
        }).animate({
            'left': '340px',
            'top': '132px'
        }, 500).animate({
            'left': '315px',
            'top': '132px'
        }, 500).animate({
            'left': '340px',
            'top': '132px'
        }, 500).animate({
            'left': '315px',
            'top': '132px'
        }, 500).delay(1000).animate({
            'left': '325px',
            'top': '118px'
        }, 500, function () { // click on a word
            click.play();
            $right.removeClass('hidden');
            $i_14.hide();
            $i_15.delay(1000).fadeIn(1000).delay(1000).fadeOut(1000);
        }).delay(500).animate({
            'left': '630px',
            'top': '65px'
        }, 1000).animate({
            'left': '580px',
            'top': '65px'
        }, 1000).animate({
            'left': '670px',
            'top': '65px'
        }, 1000).animate({
            'left': '630px',
            'top': '65px'
        }, 1000, function() {
            $i_16.delay(500).fadeIn(1500).delay(1000).fadeOut(900);
            $simulation.delay(4000).fadeOut(900);

            $i_17.delay(5000).fadeIn(1000).delay(1000).fadeOut(900);
            $i_18.delay(8000).fadeIn(1000).delay(1500).fadeOut(900);
            $i_19.delay(11500).fadeIn(1000).delay(1500).fadeOut(900);
            $i_20.delay(15000).fadeIn(1000).delay(3500).fadeOut(900);
            $i_21.delay(20500).fadeIn(1000).delay(3500).fadeOut(900);
            $i_22.delay(26000).fadeIn(1000).delay(2500).fadeOut(900);
            $i_23.delay(30500).fadeIn(1000).delay(2500).fadeOut(900);
            $i_24.delay(35000).fadeIn(1000).delay(2000).fadeOut(900);
            $i_25.delay(39000).fadeIn(1000);

            $replay.delay(40000).fadeIn(3000);
        });
    });

    $replay.click(function() {
        // reset animation
        $replay.hide();
        $i_25.hide();
        $cursor.hide();
        $text.addClass('hidden');
        $selected_audio.addClass('hidden');
        $selected_text.addClass('hidden');
        $unselected_audio.removeClass('hidden');
        $unselected_text.removeClass('hidden');
        $audiofile.removeClass('selected');
        $textfile.removeClass('selected');
        $simulation.show();

        // play
        $simulation.click();
    });
});