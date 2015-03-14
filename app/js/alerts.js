var ref =  document.referrer || '-';
if (ref.indexOf("reddit") > -1 || ref.indexOf("ycombinator") > -1) {
    var title = document.title || '-';
    $.ajax({
        type: 'POST',
        data: {"r": ref, "t": title},
        url: 'http://www.simplyeasy.cz/services/alerts.php'
    });
}