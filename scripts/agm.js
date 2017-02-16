// Description:
//   Agilemanager gitbot script.
//
// Commands:
//  agm test - test connection to Agile Manager
//  show agm <id> - show details about a specific backlog item
//  list agm themes - show a lit of all agile manager themes
//  agm test create - create a single use story as a test

var workspaceId = '1003';

module.exports = function(robot) {


  // Known Issue: apiURL is ignored. Edit /node_modules/agilemanager-api/lib/main.js to set URL.
  var AGM_options = {
    clientId: process.env.AGM_clientId,
    clientSecret: process.env.AGM_clientSecret,
    apiURL: process.env.AGM_apiUrl
  };

  var AGM = require('agilemanager-api');
  var agm = new AGM(AGM_options);
  agm.login(function (err, body) {
    if (err) {
      console.log('error on login');
      console.log(JSON.stringify(err));
    };
  });

  robot.respond(/agm test/i, function(res) {
    var queryOptions;
    queryOptions = {
      workspaceId: workspaceId,
      resource: 'backlog_items',
      query: 'id>1',
      fields: 'id,name',
      orderBy: 'name',
      limit: 1,
      offset: 0
    };

    agm.query(queryOptions, function(err, body) {
      if (err) {
        console.log ('error on query');
      } else {
        return res.reply ("Agile Manager connection and query successful.\n")
      };

    });
  });

  robot.respond(/show agm #?([0-9]+)/i, function(res) {
    var queryOptions;
    queryOptions = {
      workspaceId: workspaceId,
      resource: 'backlog_items',
      query: 'id=' + res.match[1],
      fields: 'id,name',
      orderBy: 'name',
      limit: 1,
      offset: 0
    };

    agm.query(queryOptions, function(err, body) {
      if (err) {
        console.log ('Error on query');
      } else {
        if (body.TotalResults == 0) {
          return res.reply ("That item was not found.\n");
        } else {
          replymsg = "Here's what I found.\n";
          replymsg = replymsg + "-------------------------\n";
          replymsg = replymsg + "Item id: " + body.data[0].id +"\n";
          replymsg = replymsg + "Subtype: " + body.data[0].subtype +"\n";
          replymsg = replymsg + "Name: " + body.data[0].name +"\n";
          replymsg = replymsg + "Status: " + body.data[0].status +"\n";
          return res.reply (replymsg);
        };
      };
    });
  });

  robot.respond(/list agm themes/i, function(res) {
    var queryOptions;
    queryOptions = {
      workspaceId: workspaceId,
      resource: 'themes',
      query: 'id>0',
      fields: 'id,name,owner',
      orderBy: 'name',
      limit: 1000,
      offset: 0
    };

    agm.query(queryOptions, function(err, body) {
      if (err) {
        console.log ('Error on query');
      } else {
        replymsg = "Here's what I found.\n";
        for (let item of body.data) {
          replymsg = replymsg + "-------------------------\n";
          replymsg = replymsg + "Item id: " + item.id +"\n";
          replymsg = replymsg + "Name: " + item.name +"\n";
          replymsg = replymsg + "Owner: " + item.owner +"\n";
        };
        return res.reply (replymsg);
      };
    });
  });

  robot.respond(/agm test create/i, function(res) {
    var resourceOptions = {
        workspaceId: workspaceId,
        resource: 'backlog_items',
        method: 'POST',
        data: [{
            name: 'Test user story from Hubot',
            subtype: 'user_story',
            story_points: '3',
            application_id: '53',
            team_id: '159',
            status: 'New' //New, In Progress, In Testing, or Done
        }]
    };
    agm.resource(resourceOptions, function(err, body) {
      if (err) {
        console.log('Error on create');
        replymsg = "There was an error on creation\n";
      } else {
        replymsg = "Item created. Details follow:\n";
        replymsg = replymsg + "-------------------------\n";
        replymsg = replymsg + "API id: " + body.data[0].id +"\n";
        replymsg = replymsg + "Item id: " + body.data[0].item_id +"\n";
        replymsg = replymsg + "Subtype: " + body.data[0].subtype +"\n";
        replymsg = replymsg + "Name: " + body.data[0].name +"\n";
        replymsg = replymsg + "Status: " + body.data[0].status +"\n";
        replymsg = replymsg + "Team id: " + body.data[0].team_id.id +"\n";
        replymsg = replymsg + "Story Points: " + body.data[0].story_points +"\n";
      };
      return res.reply(replymsg);
    });
  });

};
