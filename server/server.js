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
	var linkCanonical = obj[0].linkCanonical;
	result = HTTP.call ("GET", fbAPI, {params: {urls: url, format: "json"}});
	var likeCount = result.data[0].like_count;  
	var shareCount = result.data[0].share_count; 
	Articles.update(
		{ linkCanonical: linkCanonical},
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
			console.log (url );
			console.log (  Articles.find({url: url }).count() );
			if ( Articles.find({url: url }).count()==0){
				getFullArticleMeta( url, site.siteName );
			} else {
				faceBookOpenGraphCall ( url );
			}
		});
	});
}


Meteor.publish('getArticles', function( starttime, endtime, sites){
	return Articles.find(
	{
		timestamp: { $gt: parseInt(starttime) },
		timestamp: { $lt: parseInt(endtime) },
		//siteName: { $in: sites }
	});
});
Meteor.publish('allSites', function(){
	return Sites.find();
});

Meteor.methods({
	addWatcher: function(id){

	},
	removeWatcher: function(id){

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
