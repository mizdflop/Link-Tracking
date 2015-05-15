Template.addRemoveSite.helpers({



});
Template.addRemoveSite.events({
	'click #addSite': function(){
		Meteor.call("addSite", $('#siteName').val(), $('#rssFeed').val() );
	},
	'click .removeSite': function(elem){
		Meteor.call("removeSite", this._id);
	}


})
