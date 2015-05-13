var express = require('express');
var superagent = require('superagent');
var cheerio = require('cheerio');
var eventproxy = require('eventproxy');
var async = require('async');
var utility = require('utility');
//var util = require('util');

var app = express();
var url = require('url');

var linkurl = 'https://cnodejs.org/';

app.get('/async', function(req, res){
  console.log('async demo');

  // 并发连接数的计数器
  var concurrencyCount = 0;
  var fetchUrl = function (url, callback) {
    // delay 的值在 2000 以内，是个随机的整数
    var delay = parseInt((Math.random() * 10000000) % 2000, 10);
    concurrencyCount++;
    console.log('现在的并发数是', concurrencyCount, '，正在抓取的是', url, '，耗时' + delay + '毫秒');
    setTimeout(function () {
      concurrencyCount--;
      callback(null, url + ' html content');
    }, delay);
  }; 
  var urls = [];
  for (var i=0; i < 30; i++) {
    urls.push('http://datasource_' + i);
  }

  async.mapLimit(urls, 5, function (url, callback) {
  fetchUrl(url, callback);
  }, function (err, result) {
    console.log('final:');
    console.log(result);
  }); 

});

app.get('/md5', function(req, res){
  var q = req.query.q;
  var md5Value = utility.md5(q);

  res.send(md5Value);
});


console.log('superagent, eventproxy, cheerio demo');
app.get('/eventproxy', function(req, res){
  superagent.get(linkurl)
    .end(function (err, sres) {
      if (err) {
        return console.error(err);
      }
      
      var topicUrls = [];

      var $ = cheerio.load(sres.text);
      var items = [];
      $('#topic_list .topic_title').each(function(idx, element) {
        var $element = $(element);
        items.push({
          title:$element.attr('title'),
          href:$element.attr('href')
        });
        var href = url.resolve(linkurl, $element.attr('href'));
        topicUrls.push(href);
      });
      //res.send(items);
      console.log(topicUrls);

      var ep = new eventproxy();

      ep.after('topic_html', topicUrls.length, function(topics) {
        topics = topics.map(function (topicPair) {
          var topicUrl = topicPair[0];
          var topicHtml = topicPair[1];
          var $ = cheerio.load(topicHtml);
          return ({
            title:$('.topic_full_title').text().trim(),
            href: topicUrl,
            comment1: $('.reply_content').eq(0).text().trim(),
          });
        });
        console.log('final:');
        console.log(topics);
      });

      topicUrls.forEach(function(topicUrl) {
        superagent.get(topicUrl).end(function(err, res) {
          console.log('fetch ' + topicUrl + 'successful');
          ep.emit('topic_html', [topicUrl, res.text]);
        });
      });
                
    });
});

 
app.listen(3000, function(req, res){
  console.log('app is running at port 3000');
});
