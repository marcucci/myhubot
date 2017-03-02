require('es6-promise').polyfill();
require('isomorphic-fetch');

const GITHUB = require('githubot')
const _      = require('lodash');
const Q      = require('q');

module.exports = (robot) => {
  robot.respond(/link issues/i, (res) => {
    const AGM       = require('agilemanager-api');
    let AGM_options = {
      clientId: process.env.AGM_clientId,
      clientSecret: process.env.AGM_clientSecret,
      apiURL: process.env.AGM_apiUrl
    };
    let agm         = new AGM(AGM_options);

    agm.login(function (err, body) {
      if (err) {
        console.log('error on login');
        console.log(JSON.stringify(err));
      };
    });

    let issuesUrl        = "https://github.hpe.com/api/v3/repos/Centers-of-Excellence/EA-Marketplace-Design-Artifacts/issues?state=all&per_page=100";
    let commentsUrl      = "https://github.hpe.com/api/v3/repos/Centers-of-Excellence/EA-Marketplace-Design-Artifacts/issues/comments?state=all&per_page=100";
    let linkedIssues     = [];
    let allIssueIds      = [];
    let allIssueObjects  = [];
    let issuesPromises   = [];
    let commentsPromises = [];

    //get page count of github issues (max 100 issues per page)
    let issuesPageCount = new Promise((resolve, reject) => {
      GITHUB.get(`${issuesUrl}&page=1`, (issues) => {
        let pageCount = Math.ceil(issues[0].number / 100);
        // need if else for success/fail
        resolve(pageCount);
      });
    });

    //use page count to build array of 'getIssues' promises
    function buildIssuesPromises(num) {
      while (num > 0) {
        issuesPromises.push(get100Issues(num));
        num -= 1;
      }
      return issuesPromises;
    }

    function get100Issues(num) {
      return new Promise((resolve, reject) => {
        GITHUB.get(`${issuesUrl}&page=${num}`, (issues) => {
          // need if else for success/fail
          resolve(issues);
        });
      });
    }

    function buildIssueObjects(arr) {
      arr.map(issues => {
        //issues = array of objects
        //filter out pull requests and invalid issues
        let filtered = _.filter(issues, function(i) { return !i.hasOwnProperty('pull_request') && isValid(i.labels) });
        filtered.map(issue => {
          buildIssueObject(issue);
          allIssueIds.push(issue.number);
        })
      })
    }

    function isValid(labels) {
      if (labels.length > 0) {
        for (label of labels) {
          if (label.name.includes('invalid')) {
            return false;
          }
        }
      }
      return true;
    }

    function buildIssueObject(i) {
      let issueObject = {};
      issueObject.number = i.number;
      issueObject.title = i.title;
      issueObject.url = i.url;
      issueObject.storyPoints = findStoryPoints(i.labels);
      issueObject.state = convertState(i.state);
      issueObject.priority = findPriority(i.labels);
      allIssueObjects.push(issueObject);
    }

    function findStoryPoints(labels) {
      if (labels.length > 0) {
        for(label of labels) {
          if (label.name.includes("story points")) {
            return label.name.split(": ")[1];
          }
        }
      }
      return null;
    }

    function convertState(state) {
      if (state === 'closed') {
        return 'Done';
      } else {
        return 'New';
      }
    }

    function findPriority(labels) {
      for(label of labels) {
        if (label.name.includes("priority")) {
          switch (label.name) {
            case 'high priority':
              return '1-High';
              break;
            case 'medium priority':
              return '2-Medium';
              break;
            case 'low priority':
              return '3-Low'
              break;
          }
        }
      }
      return null;
    }

    //get page count of all issues' comments, max 100 comments per page.
    //github api includes "Link" in header which specifies last page #.
    //link does not appear if results fit on single page, so this
    //function will need to be edited to account for single page.
    let commentsPageCount = fetch(`${commentsUrl}&page=1`).then(res => {
      let url = res.headers.get('Link').split(" ")[2];
      return url.split("&page=")[1].charAt(0);
    }).catch(err => {
      res.reply(err);
    });

    //use page count to build array of 'scanComments' promises
    function buildCommentsPromises(num) {
      while (num > 0) {
        commentsPromises.push(scan100Comments(num));
        num -= 1;
      }
      return commentsPromises;
    }

    function scan100Comments(num) {
      return new Promise((resolve, reject) => {
        GITHUB.get(`${commentsUrl}&page=${num}`, (comments) => {
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
    }

    function createAgmItem(match) {
      let resourceOptions = createResourceOptions(match);

      return new Promise((resolve, reject) => {
        agm.resource(resourceOptions, function(err, body) {
          if (err) {
            reject(err);
          } else {
            let agmDetails = [
              body.data[0].item_id,
              body.data[0].id,
              match.url,
              `Item Created. AGM Client ID: ${body.data[0].item_id}; API ID: ${body.data[0].id}. Github Issue: ${match.number}`,
              match.number
            ]

            resolve(agmDetails);
          };
        });
      });
    }

    function createResourceOptions(obj){
      return {
          workspaceId: '1003',
          resource: 'backlog_items',
          method: 'POST',
          data: [{
              name: obj.title,
              subtype: 'user_story',
              story_points: obj.storyPoints,
              application_id: '53',
              team_id: '159',
              // theme_id: '6209',
              story_priority: obj.priority,
              status: obj.state //New, In Progress, In Testing, or Done
          }]
      };
    }

    //if no unlinked issues, return msg. Otherwise continue
    //promise chain, creating agm user stories and posting github
    //comments containing agm info for respective user story
    function createAgmItems(unlinkedIssues){
      if (unlinkedIssues.length === 0) {
        res.reply('All Issues Linked.')
      } else {
        return Q.all(unlinkedIssues.map(i => {
          let match = matchIssueObject(i, allIssueObjects);
          return createAgmItem(match);
        })).then(result => {
          result.forEach(arr => {
            console.log(arr[3]);
          })
          return Q.all(result.map(i => {
            return postGithubComment(i);
          }))
        }).then(result => {
          result.forEach(msg => {
            console.log(msg);
          })
        })
      }
    }

    function matchIssueObject(num, issues){
      let match = issues.filter(function(obj) {
        return obj.number == num;
      });
      return match[0];
    }

    function postGithubComment(data) {
      let comment = {"body": `Linked to Agile Manager ID #${data[0]} (API ID #${data[1]})`}
      // let commentSuccess = `Github Issue #${data[4]} Comment Created`

      return new Promise((resolve, reject) => {
        GITHUB.post (`${data[2]}/comments`, comment, reply => {
          let issue = reply.issue_url.split('issues/')
          resolve(`Github Issue #${issue[1]} Comment Created`);
        });
      });
    }

    issuesPageCount.then(num => {
      return buildIssuesPromises(num);
    }).then(promises => {
      return Promise.all(promises);
    }).then(data => {
      buildIssueObjects(data);
    }).then(() => {
      return commentsPageCount;
    }).then(num => {
      return buildCommentsPromises(num);
    }).then(promises => {
      return Promise.all(promises);
    }).then(() => {
      return _.difference(allIssueIds, linkedIssues);
    }).then(unlinkedIssues => {
      return createAgmItems(unlinkedIssues);
    }).catch(err => {
      console.error(err);
    })
  });
};
