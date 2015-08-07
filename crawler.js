phantom.injectJs('underscore-min.js');

var webPage = require('webpage');
var page = webPage.create();

var queue = [];
var visited = {};
var httpStatus = null;

var count = 0;

var TIMEOUT_WAIT_CONTENT = 1 * 1000;

//var target = 'http://phantomjs.org/';
var target = 'http://www.examplesite.com/index.php';

page.onError = function(){

};

page.onResourceReceived = function(res){
	if (res.contentType && res.contentType.indexOf('html') !== -1 && httpStatus === null){
		httpStatus = res.status;
	}
};

queue.push(target);
visited[target] = true;

var visit = function(){
	if (queue.length === 0){
		//console.log('Visited', count);
		phantom.exit();
	}

	var url = _.first(queue);
	queue = _.tail(queue);

	//console.log('Processing', url);

	httpStatus = null;

	page.open(url, function(status){
		if (status === 'fail'){
			_.defer(visit);
			return;
		}

		if (httpStatus >= 400){
			_.defer(visit);
			return;	
		}

		//console.log(httpStatus);

		count++;

		var onContent = function(){
			
			var hasJQuery = page.evaluate(function(){
				return !!window.jQuery;
			});

			if (!hasJQuery){
				page.injectJs('jquery-1.11.3.min.js');
			}

			var hasURIJs = page.evaluate(function(){
				return !!window.URI;
			});

			if (!hasURIJs){
				page.injectJs('URI.min.js');
			}

			var isDynamic = page.evaluate(function(){
				return jQuery('form').length > 0;
			});

			if (isDynamic){
				console.log(url, ', dynamic');
			}
			else {
				console.log(url, ', static');
			}

			//console.log('Crawling', url);

			var hrefs = page.evaluate(function(){
				try {
					var $anchors = jQuery('a');

					var hrefs = jQuery.map($anchors, function(anchor){
						try {
							var href = jQuery(anchor).attr('href');
							var uri = new URI(href);
							uri.fragment('');
							var absolute = uri.absoluteTo(location.href).toString();
						}
						catch(e){
							return null;
						}

						return absolute;
					});

					return hrefs;
				}
				catch(e){
					return [];
				}
			});

			_.each(hrefs, function(href){
				if (href === null){
					return;
				}

				var isSameHost = page.evaluate(function(url, href){
					var currentHost = new URI(url).host();
					var nextHost = new URI(href).host();

					return currentHost === nextHost;
				}, url, href);

				if (isSameHost && !visited[href]){
					queue.push(href);
					visited[href] = true;
				}
			});

			//console.log('');

			_.defer(visit);
		};

		setTimeout(onContent, TIMEOUT_WAIT_CONTENT);
	});
};

visit();