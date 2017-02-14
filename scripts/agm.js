
module.exports = function(robot) {
  robot.respond(/agm test/i, function(res) {
    console.log("Setting up AGM objects\n");

// Known Issue: apiURL is ignored. Edit /node_modules/agilemanager-api/lib/main.js to set URL.
    var AGM_options = {
      clientId: process.env.AGM_clientId,
      clientSecret: process.env.AGM_clientSecret,
      apiURL: process.env.AGM_apiUrl
    };

    console.log(JSON.stringify(AGM_options));
    var AGM = require('agilemanager-api');
    var agm = new AGM(AGM_options);

    agm.login(function (err, body) {
      if (err) {
        console.log('error on login');
        console.log(JSON.stringify(err));
      };
    });

    var queryOptions;
    queryOptions = {
      workspaceId: '205790',
      resource: 'backlog_items',
      query: 'id<100',
      fields: 'id,name',
      orderBy: 'name',
      limit: 10,
      offset: 0
    };

    agm.query(queryOptions, function(err, body) {
      return res.reply("Query results: " +  JSON.stringify(body) + "\n")
    });
  });
};
