
github = require('githubot')

const gitApi = require('../lib/config').gitApi;
const gitOwner = require('../lib/config').gitOwner;
const gitRepo = require('../lib/config').gitRepo;

module.exports = (robot) => {
  robot.respond(/list agm linkages/i, (res) => {
    let replyMsg;
    let issueIndex = [];
    let url = gitApi + "/repos/" + gitOwner + "/" + gitRepo + "/issues";
    github.get(url, (issues) => {
      for (issue of issues) {
        issueIndex.push (issue.number);
      }
      return issueIndex;
    });
    console.log (issueIndex);
    for (id of issueIndex) {
      url = url + "/" + id + "/comments";
      console.log ("here");
      github.get("" + url, (comments) => {
        var agmId, comment, i, len, x;
        for (x = i = 0, len = comments.length; i < len; x = ++i) {
          comment = comments[x];
          console.log ("here2");
          if (comment.body.includes("Linked to Agile Manager ID #")) {
            agmId = comment.body.split("#");
            replyMsg = replyMsg + "Linkage found. Issue "+ id + "linked to " + agmId[1] + " in Agile Manager.\n";
          }
        }
      });
    };
    if (replyMsg) {
      res.reply(replyMsg);
    } else {
      res.reply("No linkages found.");
    }
  });
};
