Meteor.startup(() => {

  if (process.env.USE_SSL === 'true' ) {

    console.log(Assets.absoluteFilePath())
    SSL(
      Assets.getText("./finneg.com.key"),
      Assets.getText("./STAR_finneg_com.crt"),
      8081
    )
  }

});
