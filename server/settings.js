
Meteor.startup(() => {

  /*Meteor.settings = Meteor.settings || {};
  Meteor.settings.ecoUrl = url;*/

  Meteor.settings = Meteor.settings ? Meteor.settings : {};
  Meteor.settings.public = Meteor.settings.public ? Meteor.settings.public : {};

  Meteor.settings.public.ecoUrl = process.env.ECO_URL;

});
