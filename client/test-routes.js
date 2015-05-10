Articles = new Mongo.Collection("articles");
Sites = new Mongo.Collection("sites");
articleObj = {};
intervalTime = 10;

function changeRoute( params ){
  currentParams = Router.current().params;
  _.each (params, function( value, key, item ){
      currentParams[key] = value;
  });
  Router.go( 
   Router.current().route.getName(), currentParams, {
    query: EJSON.clone(Router.current().params.query)
  });

}

function initGraph( article ){
  var str = "#a" + article._id;
  var ticks = ['x'];
  var likes = ['likes'];

  //get dates and data points into arrays c3 is expecting
  var numberElements = Math.floor( Session.get("graphminutes") / intervalTime );
  for( var i = article.fbData.length-numberElements; i < article.fbData.length; i++){
    if (i < 0){
      var minutesToAccountFor = (numberElements + i) * intervalTime;
      console.log(minutesToAccountFor);
      ticks.push( minutesToAccountFor * -1) ;
      likes.push(0);

    } else {
      ticks.push(
        Math.round((Date.now() - article.fbData[i].timestamp) / 60000 * -1)
      );
      //console.log ( (Date.now() - article.fbData[i].timestamp) / 60000 * -1 );
      likes.push ( article.fbData[i].likeCount ) ; 
    }
  }
 //graph has been made and it's on the page
  if ( articleObj[article._id] && articleObj[article._id].graphed && $(str).length == undefined ){
   articleObj[article._id].chart.load({
      columns: [ likes ] 
    });
   return;
  }  
  //first time we're making this graph.
  articleObj[article._id] = article;
  articleObj[article._id].chart = c3.generate({
      bindto: str,
      data: {
          x: 'x',
          columns: [
            ticks, likes
          ]
      },
      size: { 
        width: 300,
        height: 225
      }, 
      grid: {
       x: { show: true }
      },
      axis: {
       x: { 
          label: "Likes, Last 20 minutes", 
          position: "inner-center"
       }
      }
    });
     //end chart
    articleObj[article._id].graphed = true;
}

Template.showResults.helpers({
  isChecked: function() {
    return Router.query.isSet( 'sites', this.siteName );
  },
  limitOptions: function(){
    return ["5", "10", "25", "50"];
  },
  isSelected: function(){
    return parseInt(Router.current().params.limit) == parseInt(this.valueOf()) ? true : false ;
  },
  divId: function(){
    return "a" + this._id;
  },
  pgain: function(){
    return Router.current().params.pgain;
  },
  pgaintime: function(){
    return Router.current().params.pgaintime;    
  },
  minlikes: function(){
    return Router.current().params.minlikes;    
  },
  graphminutes: function(){
    return Router.current().params.graphminutes;    
  },
  limit: function(){
    return Router.current().params.limit;    
  },  
  numberLikes: function(){
    var returnStr = "n/a";
    if ( this.fbData.length ){
      returnStr = _.last(this.fbData).likeCount
    }
    return returnStr;
  },
  offset: function(){
    return parseInt(Router.current().params.offset); 
  }  
});

Template.showResults.events({
  'change .selectSite': function( elem ){
    var currentElemnt = $(elem.target).attr("value");
    if ( $( elem.target).prop('checked') ){
      Router.query.add('sites', currentElemnt);
    } else {
      Router.query.remove('sites', currentElemnt);
    }
  },
  'change #limitSelector': function(elem) {
    changeRoute( {limit: $( elem.target ).val()} );
  },
  'click #setTheSlope': function() {
    changeRoute( {pgaintime: $('#pgaintime').val(), minlikes: $('#minlikes').val() });
  },
  'click #setGraphTime': function() {
    changeRoute( { graphminutes: $('#graphminutes').val() });
  },
  'click .next-link': function(){
    var newoffset = parseInt(Router.current().params.offset) + parseInt(Router.current().params.limit);    
    changeRoute( { offset: newoffset }  );
  },
  'click .prev-link': function(){
    var newoffset = parseInt(Router.current().params.offset) - parseInt(Router.current().params.limit);
    changeRoute( { offset: newoffset });
  },
  'click .watch-item': function(){
    Meteor.call('addWatcher', this._id);
  },
  'click .remove-watch': function(){
    Meteor.call('removeWatcher', this._id);
  }
});
Template.showResults.onRendered( function(){
    this.autorun( function(){
      _.each( Template.currentData().articles(), function(article) {
        initGraph (article);
      });
    });
})