// 'use strict';

// Description:
//   Agilemanager gitbot script.
//
// Commands:
//  agm test - test connection to Agile Manager
//  show agm <id> - show details about a specific backlog item
//  list agm themes - show a lit of all agile manager themes
//  agm test create - create a single use story as a test
const agmFields = 'id,name,item_id,status,author,creation_date,last_modified,subtype';
let agm         = require('../lib/agmLogin.js').agm;
let agmLogin    = require('../lib/agmLogin.js').agmLogin;

module.exports = (robot) => {
  // Known Issue: apiURL is ignored. Edit /node_modules/agilemanager-api/lib/main.js to set URL.

  robot.respond(/agm test connect/i, function(res) {
    // if (!robot.auth.hasRole(res.envelope.user,'trusted')) {
    //   return res.reply ("You are not authorized to make this request.")
    // };

    var queryOptions;
    queryOptions = {
      workspaceId: '1003',
      resource: 'backlog_items',
      query: 'id>1',
      fields: agmFields,
      orderBy: 'name',
      limit: 1,
      offset: 0
    };

    function testConnect(queryOptions) {
      return new Promise(function(resolve, reject) {
        agm.query(queryOptions, function(err, body) {
          if (err) {
            console.log ('error on query');
            reject(err);
          } else {
            resolve("Agile Manager connection and query successful")
          };
        });
      });
    }

    agmLogin(agm).then(() => {
      return testConnect(queryOptions);
    }).then(data => {
      res.reply(data);
    }).catch(err => {
      console.error(err)
    })
  });

  robot.respond(/show agm #?([0-9]+)/i, function(res) {
    var queryOptions, replymsg;
    queryOptions = {
      workspaceId: '1003',
      resource: 'backlog_items',
      query: 'id=' + res.match[1],
      fields: agmFields,
      orderBy: 'name',
      limit: 1,
      offset: 0
    };

    function queryItem(queryOptions) {
      return new Promise(function(resolve, reject) {
        agm.query(queryOptions, function(err, body) {
          if (err) {
            console.log ('Error on query');
          } else {
            if (body.TotalResults == 0) {
              return res.reply ("That item was not found.\n");
            } else {
              replymsg = "Here's what I found.\n";
              replymsg = replymsg + "-------------------------\n";
              replymsg = replymsg + "API id: " + body.data[0].id +"\n";
              replymsg = replymsg + "Item id: " + body.data[0].item_id +"\n";
              replymsg = replymsg + "Subtype: " + body.data[0].subtype +"\n";
              replymsg = replymsg + "Name: " + body.data[0].name +"\n";
              replymsg = replymsg + "Status: " + body.data[0].status +"\n";
              replymsg = replymsg + "Author: " + body.data[0].author +"\n";
              replymsg = replymsg + "Created: " + body.data[0].creation_date +"\n";
              replymsg = replymsg + "Modified: " + body.data[0].last_modified +"\n";
              return res.reply (replymsg);
            };
          };
        });
      });
    }

    agmLogin(agm).then(() => {
      return queryItem(queryOptions);
    }).then(data => {
      res.reply(data);
    }).catch(err => {
      console.error(err)
    })
  });

  robot.respond(/agm delete #?([0-9]+)/i, function(res) {
    var resourceOptions = {
        workspaceId: '1003',
        resource: 'backlog_items',
        entityId: res.match[1],
        method: 'DELETE'
    };

    function agmDelete(resourceOptions) {
      return new Promise(function(resolve, reject) {
        agm.resource(resourceOptions, function(err, body) {
          if (err) {
            console.log('Error on delete');
            reject(err);
          } else {
            resolve("Item deleted");
          };
        });
      });
    }

    agmLogin(agm).then(() => {
      return agmDelete(resourceOptions);
    }).then(data => {
      res.reply(data);
    }).catch(err => {
      console.error(err)
    })

  });
};
