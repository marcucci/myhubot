
const github = require('githubot')
const _ = require('lodash');
const commentsUrl = "https://github.hpe.com/api/v3/repos/Centers-of-Excellence/EA-Marketplace-Design-Artifacts/issues/comments?state=all&per_page=100000";
const putUrl = "https://github.hpe.com/api/v3/repos/Centers-of-Excellence/EA-Marketplace-Design-Artifacts/issues/comments?state=all&per_page=100000";
const issuesUrl = "https://github.hpe.com/api/v3/repos/Centers-of-Excellence/EA-Marketplace-Design-Artifacts/issues?state=all&per_page=100000";

module.exports = (robot) => {
  robot.respond(/list agm linkages/i, (res) => {
    let linkedIssues = [];
    let allIssueIds = [];
    let allIssueObjects = [];
    let allIssues = {};

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

    // function createAgmItems(ids){
    //   for(id of ids) {
    //
    //   }
    // }

    Promise.all([findAllIssues, findLinkedIssues]).then(values => {
      let unLinkedIssueIds = _.difference(values[0].ids, values[1]);
      res.reply(unLinkedIssueIds);
    })
  });
};
