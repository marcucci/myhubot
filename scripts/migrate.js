
github = require('githubot')

module.exports = (robot) => {
  robot.respond(/list agm linkages/i, (res) => {
    const url = "https://github.hpe.com/api/v3/repos/Centers-of-Excellence/EA-Marketplace-Design-Artifacts/issues/comments?status=all&per_page=100000";
    let replyMsg;

    let filterComments = new Promise((resolve, reject) => {
      github.get(url, (comments) => {
        for(comment of comments) {
          if (comment.body.includes("Linked to Agile Manager ID #")) {
            let agmId = comment.body.split("#");
            let id = comment.id;
            replyMsg = replyMsg + "Linkage found: Issue "+ id + " linked to " + agmId[1] + " in Agile Manager.\n";
          }
        }
        resolve(replyMsg);
      });
    });

    filterComments.then(msg => {
      if (msg) {
        res.reply(msg);
      } else {
        res.reply("No linkages found.");
      }
    })
  });
};
