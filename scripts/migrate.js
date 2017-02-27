require('es6-promise').polyfill();
require('isomorphic-fetch');

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

    // get page count for github issues api call, create a promise
    // for each page, iterate over resulting arrays and build issue
    // object as well as issue id arrays
    // function findAllIssues() {
    //   let issuesPromises = [];
    //   let getPageCount = new Promise((resolve, reject) => {
    //     github.get(`${issuesUrl}&page=1`, (issues) => {
    //       let pageCount = Math.ceil(issues[0].number / 100);
    //       // need if else for success/fail
    //       resolve(pageCount);
    //     });
    //   });
    //
    //   function buildIssuesPromises(num) {
    //     while (num > 0) {
    //       issuesPromises.push(get100Issues(num));
    //       num -= 1;
    //     }
    //     return issuesPromises;
    //   }
    //
    //   function get100Issues(num) {
    //     return new Promise((resolve, reject) => {
    //       github.get(`${issuesUrl}&page=${num}`, (issues) => {
    //         // need if else for success/fail
    //         resolve(issues);
    //       });
    //     });
    //   }
    //
    //   function buildIssueObjects(arr) {
    //     arr.map(issues => {
    //       issues.map(issue => {
    //         buildIssueObject(issue);
    //         allIssueIds.push(issue.number);
    //       })
    //     })
    //     allIssues.objects = allIssueObjects;
    //     allIssues.ids = allIssueIds;
    //     res.reply(allIssueIds);
    //   }
    //
    //   getPageCount.then(num => {
    //     return buildIssuesPromises(num);
    //   }).then((promises) => {
    //     return Promise.all(promises);
    //   }).then(data => {
    //     buildIssueObjects(data);
    //   }).catch(err => {
    //     res.reply(err);
    //   })
    // }

    // fetch(`${issuesUrl}&page=1`)
    //   .then(response => {
    //     console.log(response.status);
    //     return response.json();
    //   })
    //   .then(issues => {
    //     let pageCount = Math.ceil(issues[0].number / 100);
    //     console.log(pageCount);
    //   });

    let issuesPromises = [];
    let commentsPromises = [];

    let issuesPageCount = new Promise((resolve, reject) => {
      github.get(`${issuesUrl}&page=1`, (issues) => {
        let pageCount = Math.ceil(issues[0].number / 100);
        // need if else for success/fail
        resolve(pageCount);
      });
    });

    function buildIssuesPromises(num) {
      while (num > 0) {
        issuesPromises.push(get100Issues(num));
        num -= 1;
      }
      return issuesPromises;
    }

    function get100Issues(num) {
      return new Promise((resolve, reject) => {
        github.get(`${issuesUrl}&page=${num}`, (issues) => {
          // need if else for success/fail
          resolve(issues);
        });
      });
    }

    function buildIssueObjects(arr) {
      arr.map(issues => {
        issues.map(issue => {
          if (!issue.hasOwnProperty('pull_request')) {
            buildIssueObject(issue);
            allIssueIds.push(issue.number);
          }
        })
      })
      allIssues.objects = allIssueObjects;
      allIssues.ids = allIssueIds;
    }

    function buildIssueObject(array) {
      let issueObject = {};
      issueObject.number = array.number;
      issueObject.title = array.title;
      issueObject.url = array.url;
      issueObject.storyPoints = findStoryPoints(array.labels);
      issueObject.state = array.state;
      issueObject.priority = findPriority(array.labels);
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

    let commentsPageCount = fetch(`${commentsUrl}&page=1`).then(res => {
      let url = res.headers.get('Link').split(" ")[2];
      return url.split("&page=")[1].charAt(0);
    }).catch(err => {
      res.reply(err);
    });

    function buildCommentsPromises(num) {
      while (num > 0) {
        commentsPromises.push(scan100Comments(num));
        num -= 1;
      }
      return commentsPromises;
    }

    function scan100Comments(num) {
      return new Promise((resolve, reject) => {
        github.get(`${commentsUrl}&page=${num}`, (comments) => {
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

    // function createAgmItems(unlinkedIssues){
      // unlinkedIssues.map(num => {
      //   if (num < 2) {
      //     let match = matchIssueObject(num, allIssueObjects);
      //     return createItemThenComment(match);
      //   }
      // });
      //  let match = matchIssueObject(32, allIssueObjects);
      //  testPromiseChain(match);
    // }

    let agmPromises = [];

    function buildAgmPromises(unlinkedIssues) {
      unlinkedIssues.map(num => {
        if (num < 3) {
          let match = matchIssueObject(num, allIssueObjects);
          agmPromises.push(createAgmItem(match));
        }
      });
      return agmPromises;
    }

    function createAgmItem(match) {
      return new Promise((resolve, reject) => {
        let resourceOptions = createResourceOptions(match);
        agm.resource(resourceOptions, function(err, body) {
          if (err) {
            console.log(err);
            reject(err);
          } else {
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
    }

    // function createItemThenComment(match) {
    //   let createAgmItem = new Promise((resolve, reject) => {
    //     let resourceOptions = createResourceOptions(match);
    //     agm.resource(resourceOptions, function(err, body) {
    //       if (err) {
    //         console.log(err);
    //         reject(err);
    //       } else {
    //         // agmDetails - Item id, API id, Url, Terminal Message
    //         let agmDetails = [
    //           body.data[0].item_id,
    //           body.data[0].id,
    //           match.url,
    //           `Item Created. AGM Client ID: ${body.data[0].item_id}. Github Issue: ${match.number}`
    //         ]
    //
    //         resolve(agmDetails);
    //       };
    //     });
    //   });
    //
    //   function postGithubComment(data) {
    //     console.log(data[3]);
    //     let comment = {"body": `Linked to Agile Manager ID #${data[0]} (API ID #${data[1]})`}
    //     let commentSuccess = "Github Comment Created"
    //
    //     let postComment = new Promise((resolve, reject) => {
    //       github.post (`${data[2]}/comments`, comment, function(err, reply) {
    //         if (err) {
    //           reject(err);
    //         } else {
    //           resolve(commentSuccess);
    //         }
    //       });
    //     });
    //   }
    //
    //   createAgmItem.then(data => {
    //     console.log(data);
    //     // postGithubComment(data);
    //   }).catch(err => {
    //     res.reply(err);
    //   })
    // }

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
              theme_id: '6209',
              story_priority: obj.priority,
              status: convertState(obj.state) //New, In Progress, In Testing, or Done
          }]
      };
    }

    function convertState(state) {
      if (state === 'closed') {
        return 'Done';
      } else {
        return 'New';
      }
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
      return buildAgmPromises(unlinkedIssues);
    }).then(promises => {
      return Promise.all(promises);
    }).then(data => {
      console.log(data);
    }).catch(err => {
      res.reply(err);
    })

    // let p1 = Promise.all([findAllIssues, findLinkedIssues]);
    //
    // p1.then(values => {
    //   return _.difference(values[0].ids, values[1]);
    // }).then(data => {
    //   // res.reply(createAgmItems(data));
    // }).catch(err => {
    //   res.reply(err);
    // })
  });
};
