// 'use strict';
require('es6-promise').polyfill();
require('isomorphic-fetch');

const GITHUB     = require('githubot')
const _          = require('lodash');
const Q          = require('q');
const featureIds = require('../lib/featureIds');
let agm          = require('../lib/agmLogin.js').agm;
let agmLogin     = require('../lib/agmLogin.js').agmLogin;

module.exports = (robot) => {
  //convert github issue state to agm syntax
  function convertState(state) {
    return (state === 'closed' ? 'Done' : 'New');
  }

  //find github issue story points and return integer
  function findStoryPoints(labels) {
    let obj = _.find(labels, l => l.name.includes('story points'));

    return (obj === undefined ? null : obj.name.split(': ')[1]);
  }

  //convert github issue priority to agm syntax
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

  //use issue feature label to find appropriate feature id
  function findFeatureId(i) {
    let feature = _.find(i.labels, l => l.name.includes('Feature'));

    if (feature === undefined) {
      return null;
    }

    //find featureIds object via issue's feature name
    let obj = _.find(featureIds, f => f.gh_label === feature.name)

    //if no assigned sprint, use 'no sprint' feature id
    if (i.milestone === null) {
      return obj['No Sprint'];
    }

    //use sprint # to find feature id
    let sprint = i.milestone.title.split('- ')[1];
    return obj[sprint];
  }

  function findReleaseId(i) {
    if (i.milestone === null) {
      return null;
    }

    let releases = {
      'Sprint 1' : '1073',
      'Sprint 2' : '1073',
      'Sprint 3' : '1074',
      'Sprint 4' : '1074',
      'Sprint 5' : '1075',
      'Sprint 6' : '1075'
    }

    let sprint = i.milestone.title.split('- ')[1];
    return releases[sprint];
  }

  function getIssueComments(issueUrl) {
    return new Promise(function(resolve, reject) {
      GITHUB.get(`${issueUrl}/comments`, comments => {
        // need if else for success/fail
        resolve(comments);
      });
    });
  }

  robot.respond(/link issues/i, res => {
    let issuesUrl        = "https://github.hpe.com/api/v3/repos/Centers-of-Excellence/EA-Marketplace-Design-Artifacts/issues?state=all&per_page=100";
    let commentsUrl      = "https://github.hpe.com/api/v3/repos/Centers-of-Excellence/EA-Marketplace-Design-Artifacts/issues/comments?state=all&per_page=100";
    let linkedIssues     = [];
    let allIssueIds      = [];
    let allIssueObjects  = [];
    let issuesPromises   = [];
    let commentsPromises = [];

    //get page count of github issues (max 100 issues per page)
    let issuesPageCount = new Promise((resolve, reject) => {
      GITHUB.get(`${issuesUrl}&page=1`, issues => {
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
        GITHUB.get(`${issuesUrl}&page=${num}`, issues => {
          // need if else for success/fail
          resolve(issues);
        });
      });
    }

    function buildIssueObjects(arr) {
      arr.map(issues => {
        //issues = array of objects
        //filter out pull requests and invalid issues
        let filtered = _.filter(issues, i => !i.hasOwnProperty('pull_request') && isValid(i.labels));
        filtered.map(issue => {
          buildIssueObject(issue);
          allIssueIds.push(issue.number);
        })
      })
    }

    function isValid(labels) {
      let obj = _.find(labels, l => l.name.includes('invalid'));

      return (obj === undefined ? true : false);
    }

    function buildIssueObject(i) {
      let issueObject = {};
      issueObject.number = i.number;
      issueObject.title = i.title;
      issueObject.url = i.url;
      issueObject.storyPoints = findStoryPoints(i.labels);
      issueObject.state = convertState(i.state);
      issueObject.priority = findPriority(i.labels);
      issueObject.featureId = findFeatureId(i);
      issueObject.releaseId = findReleaseId(i);
      allIssueObjects.push(issueObject);
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
        GITHUB.get(`${commentsUrl}&page=${num}`, comments => {
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
              status: obj.state, //New, In Progress, In Testing, or Done
              feature_id: obj.featureId,
              release_id: obj.releaseId
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

    agmLogin.then(() => {
      return issuesPageCount;
    }).then(num => {
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

  robot.respond(/update issue #?([0-9]+)/i, res => {
    //user enters github issue number in command
    let num         = res.match[1];
    let issueUrl    = `https://github.hpe.com/api/v3/repos/Centers-of-Excellence/EA-Marketplace-Design-Artifacts/issues/${num}`;
    let issueObject = {};
    let apiId;

    function getAgmId(comments) {
      for (c of comments) {
        if (c.body.includes('Linked to Agile Manager')) {
          return c.body.split('API ID #')[1].slice(0, -1);
        }
      }
    }

    function getIssue() {
      return new Promise((resolve, reject) => {
        GITHUB.get(issueUrl, issue => {
          // need if else for success/fail
          buildIssueObject(issue);
          resolve(issueObject);
        });
      });
    }

    function buildIssueObject(i) {
      issueObject.title = i.title;
      issueObject.storyPoints = findStoryPoints(i.labels);
      issueObject.state = convertState(i.state);
      issueObject.priority = findPriority(i.labels);
      issueObject.featureId = findFeatureId(i);
      issueObject.releaseId = findReleaseId(i);
    }

    function updateAgmItem(id, obj) {
      let resourceOptions = createResourceOptions(id, obj);

      return new Promise((resolve, reject) => {
        agm.resource(resourceOptions, function(err, body) {
          if (err) {
            reject(err);
          } else {
            resolve(`AGM Item #${apiId} Updated.`);
          };
        });
      });
    }

    function createResourceOptions(id, obj){
      return {
          workspaceId: '1003',
          resource: 'backlog_items',
          entityId: id,
          method: 'PUT',
          data: {
              name: obj.title,
              story_points: obj.storyPoints,
              story_priority: obj.priority,
              status: obj.state, //New, In Progress, In Testing, or Done
              feature_id: obj.featureId,
              release_id: obj.releaseId
          }
      };
    }

    agmLogin.then(() => {
      return getIssueComments(issueUrl);
    }).then(data => {
      apiId = getAgmId(data);
    }).then(() => {
      return getIssue();
    }).then(obj => {
      return updateAgmItem(apiId, obj);
    }).then(msg => {
      res.reply(msg);
    }).catch(err => {
      res.reply(err);
    })
  });

  robot.router.post('/hubot/gitbot/issues', (req, res) => {
    let action      = req.body.action;
    let issue       = req.body.issue;
    let issueUrl    = issue.url;
    let issueObject = {};
    let apiId;

    res.end('Successfully obtained issue info');

    //build object with issue attributes
    function buildIssueObject(i) {
      issueObject.number      = i.number;
      issueObject.title       = i.title;
      issueObject.storyPoints = findStoryPoints(i.labels);
      issueObject.state       = convertState(i.state);
      issueObject.priority    = findPriority(i.labels);
      issueObject.featureId   = findFeatureId(i);
      issueObject.releaseId   = findReleaseId(i);
    }

    // //use issue feature label to find appropriate feature id
    // function findFeatureId(i) {
    //   let feature = _.find(i.labels, l => l.name.includes('Feature'));
    //
    //   if (feature === undefined) {
    //     return null;
    //   }
    //
    //   //find featureIds object via issue's feature name
    //   let obj = _.find(featureIds, f => f.gh_label === feature.name)
    //
    //   //if no assigned sprint, use 'no sprint' feature id
    //   if (i.milestone === null) {
    //     return obj['No Sprint'];
    //   }
    //
    //   //use sprint # to find feature id
    //   let sprint = i.milestone.title.split('- ')[1];
    //   return obj[sprint];
    // }
    //
    // function findReleaseId(i) {
    //   if (i.milestone === null) {
    //     return null;
    //   }
    //
    //   let releases = {
    //     'Sprint 1' : '1073',
    //     'Sprint 2' : '1073',
    //     'Sprint 3' : '1074',
    //     'Sprint 4' : '1074',
    //     'Sprint 5' : '1075',
    //     'Sprint 6' : '1075'
    //   }
    //
    //   let sprint = i.milestone.title.split('- ')[1];
    //   return releases[sprint];
    // }

    function createAgmItem(obj) {
      let resourceOptions = postOptions(obj);

      return new Promise((resolve, reject) => {
        agm.resource(resourceOptions, function(err, body) {
          if (err) {
            reject(err);
          } else {
            let agmDetails = [
              body.data[0].item_id,
              body.data[0].id,
              `Item Created. AGM Client ID: ${body.data[0].item_id}; API ID: ${body.data[0].id}. Github Issue: ${obj.number}`
            ]

            resolve(agmDetails);
          };
        });
      });
    }

    function postOptions(obj){
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
              story_priority: obj.priority,
              status: obj.state,
              feature_id: obj.featureId,
              release_id: obj.releaseId
          }]
      };
    }

    function postGithubComment(data) {
      let comment = {"body": `Linked to Agile Manager ID #${data[0]} (API ID #${data[1]})`}

      return new Promise((resolve, reject) => {
        GITHUB.post (`${issueUrl}/comments`, comment, reply => {
          let issue = reply.issue_url.split('issues/')[1];
          resolve(`Github Issue #${issue} Comment Created`);
        });
      });
    }

    //scan comments for agm api id
    function getAgmId(comments) {
      for (c of comments) {
        if (c.body.includes('Linked to Agile Manager')) {
          return c.body.split('API ID #')[1].slice(0, -1);
        }
      }
    }

    function updateAgmItem(obj, id) {
      let resourceOptions = putOptions(obj, id);

      return new Promise((resolve, reject) => {
        agm.resource(resourceOptions, function(err, body) {
          if (err) {
            reject(err);
          } else {
            resolve(`AGM Item #${apiId} Updated.`);
          };
        });
      });
    }

    function putOptions(obj, id){
      return {
          workspaceId: '1003',
          resource: 'backlog_items',
          entityId: id,
          method: 'PUT',
          data: {
              name: obj.title,
              story_points: obj.storyPoints,
              story_priority: obj.priority,
              status: obj.state, //New, In Progress, In Testing, or Done
              feature_id: obj.featureId
          }
      };
    }

    //start script
    buildIssueObject(issue);

    if (action === 'opened') {
      //screen for pull request?
      agmLogin.then(() => {
        return createAgmItem(issueObject);
      }).then(data => {
        console.log(data[2]);
        return postGithubComment(data);
      }).then(msg => {
        console.log(msg);
      }).catch(err => {
        console.log(err);
      })
    } else {
      //what if issue comments more than one page?
      agmLogin.then(() => {
        return getIssueComments(issueUrl);
      }).then(data => {
        apiId = getAgmId(data);
      }).then(() => {
        return updateAgmItem(issueObject, apiId);
      }).then(msg => {
        console.log(msg);
      }).catch(err => {
        console.error(err);
      })

    }

  });
};
