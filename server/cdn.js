Meteor.startup(function(url){
  //WebAppInternals.setBundledJsCssPrefix("http://d1mbeue1dr0bel.cloudfront.net/wekan");
  WebAppInternals.setBundledJsCssUrlRewriteHook((url) => {
    //let version = '2.0.0'
    if(process.env.USE_CDN === "true") {
      let urlCdn = process.env.USE_CDN_URL;
      if(url && url.indexOf('.css') === -1) {
        return urlCdn + url;
      }
      return `/wekan${url}`;
    }
    return url;
  });
});
