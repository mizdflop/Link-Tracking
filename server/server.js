Articles = new Mongo.Collection("articles");
Sites = new Mongo.Collection("sites");
var Cheerio = Meteor.npmRequire('cheerio');


function getFullArticleMeta ( url, siteName ){
	var obj = {};
	var result = HTTP.call( "GET", url );
	$ = Cheerio.load(result.content);
	obj.siteName = siteName;
	obj.url = url;
	obj.title = $("meta[property='og:title']").attr("content");
	obj.image = $("meta[property='og:image']").attr("content");
	obj.description = $("meta[property='og:description']").attr("content");
	obj.linkCanonical = $("link[rel='canonical']").attr('href');
	obj.timestamp = Date.now();
	obj.fbData = [];
	Articles.insert( obj );
}


function faceBookOpenGraphCall ( url ){
	var fbAPI = "http://api.facebook.com/method/links.getStats";
	var obj = Articles.find( { url: url }).fetch();
	if (obj.timestamp < Date.now() - (48 * 60 * 60 * 1000) ) { return ; }
	if( !obj[0].linkCanonical ) { console.log ("oops"); return; }
	result = HTTP.call ("GET", fbAPI, {params: {urls: url, format: "json"}});
	if (result.error){
		console.log(result.error);
	}
	var likeCount = result.data[0].like_count;  
	var shareCount = result.data[0].share_count; 
	Articles.update(
		{ linkCanonical: obj[0].linkCanonical},
		{ 
			$push: { fbData: 
				{
					timestamp: Date.now(), 
					likeCount: likeCount,
					shareCount: shareCount
				}
			}
		}

	); 
}



function startScraping() {
	_.each (Sites.find().fetch(), function( site ) {
		var result = HTTP.call( "GET", site.rssFeed );
		$ = Cheerio.load(result.content, {xmlMode: true});
		$('item').each(function(i, elem){
			var url = $(this).find('link').text();
			//console.log (url );
			if ( url.match(/^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/ ) ){
				//console.log (  Articles.find({url: url }).count() );
				if ( Articles.find({url: url }).count()==0){
					getFullArticleMeta( url, site.siteName );
				} else {
					faceBookOpenGraphCall ( url );
				}
			}
		});
	});
}


Meteor.publish('getArticles', function( hoursago, endtime, sites){
	return Articles.find(
	{
		timestamp: { $gt: Date.now() - (parseInt(hoursago) * 60 * 60 * 1000) },
		//timestamp: { $lt: parseInt(endtime) },
		//siteName: { $in: sites }
	}
	);
});
Meteor.publish('allSites', function(){
	return Sites.find();
});

Meteor.methods({
	addSite: function(siteName, rssFeed){
		Sites.insert({
			siteName: siteName,
			rssFeed: rssFeed
		});
	},
	removeSite: function(id){
		Sites.remove({_id: id});


	}
});



SyncedCron.add({
  name: 'Go get articles',
  schedule: function(parser) {
    // parser is a later.parse object
    return parser.text('every 10 minutes');
  },
  job: function() {
  	startScraping();
  }
});

SyncedCron.start();
