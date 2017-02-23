const github      = require('githubot')
const _           = require('lodash');
const issuesUrl   = "https://github.hpe.com/api/v3/repos/Centers-of-Excellence/EA-Marketplace-Design-Artifacts/issues?state=all&per_page=100";
const commentsUrl = "https://github.hpe.com/api/v3/repos/Centers-of-Excellence/EA-Marketplace-Design-Artifacts/issues/comments?state=all&per_page=100";

module.exports = (robot) => {
  robot.respond(/link issues/i, (res) => {
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

    // let checkPagination = new Promise((resolve, reject) => {
    //     let page = 1
    //
    //     github.get(`${issuesUrl}&page=${page}`, (arr) => {
    //
    //       issues.map(issue => {
    //         buildIssueObject(issue);
    //         allIssueIds.push(issue.number);
    //       })
    //       allIssues.objects = allIssueObjects;
    //       allIssues.ids = allIssueIds;
    //       // need if else for success/fail
    //       resolve(allIssues);
    //     });
    // })

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

    function createAgmItems(unlinkedIssues){
      // unlinkedIssues.map((num) => {
      //   let match = matchIssueObject(num, allIssueObjects);
      //   createItemThenComment(match);
      // });
      //  let match = matchIssueObject(32, allIssueObjects);
      //  testPromiseChain(match);
    }

    function testPromiseChain(match) {
      let createAgmItem = new Promise((resolve, reject) => {
        let resourceOptions = createResourceOptions(match);
        agm.resource(resourceOptions, function(err, body) {
          if (err) {
            reject(err);
          } else {
            // replymsg = `Item created. Details follow:
            // -------------------------
            // API id: ${body.data[0].id}
            // Item id: ${body.data[0].item_id}
            // Subtype: ${body.data[0].subtype}
            // Name: ${body.data[0].name}
            // Status: ${body.data[0].status}
            // Team id: ${body.data[0].team_id.id}
            // Story Points: ${body.data[0].story_points}`

            // agmDetails - Item id, API id, Url, Terminal Message
            let agmDetails = [
              body.data[0].item_id,
              body.data[0].id,
              match.url,
              `Item Created. AGM Client ID: ${body.data[0].item_id}. Github Issue: ${match.number}`
            ]

            resolve(agmDetails);
          };
        });
      });

      function postGithubComment(data) {
        console.log(data[3]);
        let comment = {"body": `Linked to Agile Manager ID #${data[0]} (API ID #${data[1]})`}
        let commentSuccess = "Github Comment Created"

        let postComment = new Promise((resolve, reject) => {
          github.post (`${data[2]}/comments`, comment, function(err, reply) {
            if (err) {
              reject(err);
            } else {
              resolve(commentSuccess);
            }
          });
        });
      }

      createAgmItem.then(data => {
        postGithubComment(data);
      }).catch(err => {
        res.reply(err);
      })
    }

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

    let p1 = Promise.all([findAllIssues, findLinkedIssues]);

    p1.then(values => {
      return _.difference(values[0].ids, values[1]);
    }).then(data => {
      // res.reply(createAgmItems(data));
    }).catch(err => {
      res.reply(err);
    })
  });
};
