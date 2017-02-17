
const github = require('githubot')
const _ = require('lodash');
const commentsUrl = "https://github.hpe.com/api/v3/repos/Centers-of-Excellence/EA-Marketplace-Design-Artifacts/issues/comments?state=all&per_page=100000";
const putUrl = "https://github.hpe.com/api/v3/repos/Centers-of-Excellence/EA-Marketplace-Design-Artifacts/issues/comments?state=all&per_page=100000";
const issuesUrl = "https://github.hpe.com/api/v3/repos/Centers-of-Excellence/EA-Marketplace-Design-Artifacts/issues?state=all&per_page=100000";
const workspaceId = '1003';

module.exports = (robot) => {
  robot.respond(/list agm linkages/i, (res) => {
    let linkedIssues = [],
        allIssueIds = [],
        allIssueObjects = [],
        allIssues = {};

    let AGM_options = {
      clientId: process.env.AGM_clientId,
      clientSecret: process.env.AGM_clientSecret,
      apiURL: process.env.AGM_apiUrl
    };
    let AGM = require('agilemanager-api');
    let agm = new AGM(AGM_options);
    // let resourceOptions = {
    //     workspaceId: workspaceId,
    //     resource: 'backlog_items',
    //     method: 'POST',
    //     data: [{
    //         name: 'Test user story from Hubot', // change
    //         subtype: 'user_story',
    //         story_points: '3', // change
    //         application_id: '53', //API ID
    //         team_id: '159',
    //         status: 'New' //New, In Progress, In Testing, or Done
    //     }]
    // };

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

    // findLinkedIssues.then(data => {
    //   if (linkedIssues.length > 0) {
    //     res.reply(linkedIssues);
    //   } else {
    //     res.reply("No linkages found.");
    //   }
    // })
    //
    // findAllIssues.then(data => {
    //   res.reply(allIssues)
    // })

    // git: number (issue), title, iterate labels (find name with story points),

    // agm.resource(resourceOptions, function(err, body) {
    //   if (err) {
    //     console.log('Error on create');
    //     replymsg = "There was an error on creation\n";
    //   } else {
    //     replymsg = "Item created. Details follow:\n";
    //     replymsg = replymsg + "-------------------------\n";
    //     replymsg = replymsg + "API id: " + body.data[0].id +"\n";
    //     replymsg = replymsg + "Item id: " + body.data[0].item_id +"\n";
    //     replymsg = replymsg + "Subtype: " + body.data[0].subtype +"\n";
    //     replymsg = replymsg + "Name: " + body.data[0].name +"\n";
    //     replymsg = replymsg + "Status: " + body.data[0].status +"\n";
    //     replymsg = replymsg + "Team id: " + body.data[0].team_id.id +"\n";
    //     replymsg = replymsg + "Story Points: " + body.data[0].story_points +"\n";
    //   };
    //   return res.reply(replymsg);
    // });

    function createAgmItems(unlinkedIssues){
      // for(num of unlinkedIssues){
      //   let match = matchIssueObject(num, allIssueObjects);
      //   createAgmItem(match);
      // }
       let match = matchIssueObject(2, allIssueObjects);
       createAgmItem(match);
    }

    function createAgmItem(match){
      let resourceOptions = createResourceOptions(match);
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
    }

    function matchIssueObject(num, issues){
      let match = issues.filter(function(obj) {
        return obj.number == num;
      });
      return match[0];
    }

    function createResourceOptions(obj){
      return {
          workspaceId: workspaceId,
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

    Promise.all([findAllIssues, findLinkedIssues]).then(values => {
      return _.difference(values[0].ids, values[1]);
    }).then(data => {
      // createAgmItems(data);
      res.reply(data);
    })
  });

  // robot.respond(/test GH write/i, function(res) {
  //   let url = "https://github.hpe.com/api/v3/repos/david-marcucci/Test/issues/1/comments"
  //   body = {"body": "Comment from Gitbot"}
  //   github.post (url, body, function(testres) {
  //     res.reply (JSON.stringify(testres));
  //   });
  // });

};
