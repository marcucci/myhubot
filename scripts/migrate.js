
const github      = require('githubot')
const _           = require('lodash');
const issuesUrl   = "https://github.hpe.com/api/v3/repos/Centers-of-Excellence/EA-Marketplace-Design-Artifacts/issues?state=all&per_page=100000";
const commentsUrl = "https://github.hpe.com/api/v3/repos/Centers-of-Excellence/EA-Marketplace-Design-Artifacts/issues/comments?state=all&per_page=100000";
const putUrl      = "https://github.hpe.com/api/v3/repos/Centers-of-Excellence/EA-Marketplace-Design-Artifacts/issues/comments?state=all&per_page=100000";

module.exports = (robot) => {
  robot.respond(/list agm linkages/i, (res) => {
    const AGM           = require('agilemanager-api');
    let linkedIssues    = [],
        allIssueIds     = [],
        allIssueObjects = [],
        allIssues       = {},
        AGM_options     = {
          clientId: process.env.AGM_clientId,
          clientSecret: process.env.AGM_clientSecret,
          apiURL: process.env.AGM_apiUrl
        },
        agm             = new AGM(AGM_options);

    // let AGM_options = {
    //   clientId: process.env.AGM_clientId,
    //   clientSecret: process.env.AGM_clientSecret,
    //   apiURL: process.env.AGM_apiUrl
    // };
    // let agm = new AGM(AGM_options);

    agm.login(function (err, body) {
      if (err) {
        console.log('error on login');
        console.log(JSON.stringify(err));
      };
    });

    let findLinkedIssues = new Promise((resolve, reject) => {
      github.get(commentsUrl, (comments) => {
        for(comment of comments) {
          if (comment.body.includes("Linked to Agile Manager ID #")) {
            let id = comment.issue_url.split('/issues/');
            linkedIssues.push(parseInt(id[1]));
          }
        }
        // need if else for success/fail
        resolve(linkedIssues);
      });
    });

    let findAllIssues = new Promise((resolve, reject) => {
      github.get(issuesUrl, (issues) => {
        issues.map(issue => {
          buildIssueObject(issue);
          allIssueIds.push(issue.number);
        })
        allIssues.objects = allIssueObjects;
        allIssues.ids = allIssueIds;
        // need if else for success/fail
        resolve(allIssues);
      });
    });

    function buildIssueObject(array) {
      let issueObject = {};
      issueObject.number = array.number;
      issueObject.title = array.title;
      issueObject.url = array.url;
      issueObject.storyPoints = findStoryPoints(array.labels)
      allIssueObjects.push(issueObject);
    }

    function findStoryPoints(labels) {
      for(label of labels) {
        if (label.name.includes("story points")) {
          return label.name.split(": ")[1]; //string
        }
      }
      return null;
    }

    // let postComment = new Promise((resolve, reject) => {
    //   github.put(putUrl, body, (response) => {
    //     // if (response.body === body) {
    //     //   resolve()
    //     // }
    //
    //   });
    // });

    // git: number (issue), title, iterate labels (find name with story points),

    function createAgmItems(unlinkedIssues){
      // unlinkedIssues.map((num) => {
      //   let match = matchIssueObject(num, allIssueObjects);
      //   createAgmItem(match);
      // });
       let match = matchIssueObject(2, allIssueObjects);
       createAgmItem(match);
    }

    // working method
    function createAgmItem(match){
      let resourceOptions = createResourceOptions(match);
      agm.resource(resourceOptions, function(err, body) {
        if (err) {
          console.log('Error on create');
          replymsg = "There was an error on creation\n";
        } else {
          replymsg = "Item created. Details follow:\n";
          replymsg += "-------------------------\n";
          replymsg += "API id: " + body.data[0].id +"\n";
          replymsg += "Item id: " + body.data[0].item_id +"\n";
          replymsg += "Subtype: " + body.data[0].subtype +"\n";
          replymsg += "Name: " + body.data[0].name +"\n";
          replymsg += "Status: " + body.data[0].status +"\n";
          replymsg += "Team id: " + body.data[0].team_id.id +"\n";
          replymsg += "Story Points: " + body.data[0].story_points +"\n";
        };
        return res.reply(replymsg);
      });
    }

    // refactored to promise, es6 template strings
    // let createAgmItem = new Promise((resolve, reject) => {
    //   let resourceOptions = createResourceOptions(match);
    // // need resolve/reject criteria
    //   agm.resource(resourceOptions, function(err, body) {
    //     if (err) {
    //       console.log('Error on create');
    //       replymsg = "There was an error on creation\n";
    //     } else {
    //       replymsg = `Item created. Details follow:
    //       -------------------------
    //       API id: ${body.data[0].id}
    //       Item id: ${body.data[0].item_id}
    //       Subtype: ${body.data[0].subtype}
    //       Name: ${body.data[0].name}
    //       Status: ${body.data[0].status}
    //       Team id: ${body.data[0].team_id.id}
    //       Story Points: ${body.data[0].story_points}`
    //     };
    //     return res.reply(replymsg);
    //   });
    // });

    function matchIssueObject(num, issues){
      let match = issues.filter(function(obj) {
        return obj.number == num;
      });
      return match[0];
    }

    function createResourceOptions(obj){
      return {
          workspaceId: '1003',
          resource: 'backlog_items',
          method: 'POST',
          data: [{
              name: obj.title,
              subtype: 'user_story',
              story_points: obj.story_points,
              application_id: '53',
              team_id: '159',
              status: 'New' //New, In Progress, In Testing, or Done
          }]
      };
    }
    
  //   Promise.all([findAllIssues, findLinkedIssues]).then(values => {
  //     return _.difference(values[0].ids, values[1]);
  //   }).then(data => {
  //     // createAgmItems(data);
  //     res.reply(data);
  //   })
  //   // .catch(err => {})
  // });

    let p1 = Promise.all([findAllIssues, findLinkedIssues]);

    p1.then(values => {
      return _.difference(values[0].ids, values[1]);
    }).then(data => {
      // createAgmItems(data);
      res.reply(data);
    })
    // .catch(err => {})
  });

  // robot.respond(/test GH write/i, function(res) {
  //   let url = "https://github.hpe.com/api/v3/repos/david-marcucci/Test/issues/1/comments"
  //   body = {"body": "Comment from Gitbot"}
  //   github.post (url, body, function(testres) {
  //     res.reply (JSON.stringify(testres));
  //   });
  // });

};
