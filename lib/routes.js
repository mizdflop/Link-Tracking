function orderBySlope( results, pgain, pgaintime, minlikes ){
	var jump = Math.floor(pgaintime / intervalTime);
	var newlist = [];
	_.each ( results , function(article){
		var arrLength = article.fbData.length;
		if(arrLength > jump  && article.fbData[arrLength-1].likeCount > minlikes){
			//console.log (self);
			newlist.push (article)
		}
	});	
	newlist = _.sortBy( newlist,  function(article){
		var arrLength = article.fbData.length;
		if ( arrLength > jump + 1 ){
			return ( article.fbData[arrLength-1].likeCount - article.fbData[jump+1].likeCount   ) * 100;
		}
	});
	return newlist.reverse();
}
Router.route('/home/', {
	onRun: function() {

		Router.go(
			'showresults',
			{
				sortrder: 2, 
				starttime: 5,
				endtime: 6,
				limit: 25,
				pgain: 12,
				pgaintime: 44,
			}, 
			{
				query: {
					sites: [1,2]

				}
			}
		); 
	}
});
Router.route('/showResults/sort/:sortrder/start/:starttime/end/:endtime/limit/:limit/offset/:offset/pgain/:pgain/pgaintime/:pgaintime/minlikes/:minlikes/graphminutes/:graphminutes', {
	waitOn: function(){
		 return [
		 	Meteor.subscribe('getArticles', this.params.starttime, this.params.endtime, this.params.query.sites ),
		 	Meteor.subscribe('allSites')
		 ]
	},

	data: function() { 
		Session.set("mylimit", parseInt(this.params.limit) );
		Session.set("graphminutes", parseInt(this.params.graphminutes));
		Session.set("offset", parseInt(this.params.offset));
		Session.set("pgaintime", parseInt(this.params.pgaintime));
		var sites = this.params.query.sites;
		var pgain = this.params.pgain;
		var minlikes = this.params.minlikes;


		return  { 
				sites: function() { return Sites.find(); }, 
				articles: function() { 
					var results = Articles.find({
							siteName: { $in: sites }
						},   {sort: {timestamp: -1},  } ).fetch(); 
					var ordered = orderBySlope( results, pgain, Session.get("pgaintime"), minlikes );
					//console.log (ordered);
					return ordered.slice(Session.get("offset"), Session.get("mylimit") + Session.get("offset"));
				} 
		} ; 
	
	},
	name: 'showResults',
	template: 'showResults', 
	action: function () {
	 	this.render('showResults');
 	}
});