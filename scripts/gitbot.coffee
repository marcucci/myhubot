# Description:
#   Main gitbot script.
#

github = require('githubot')

module.exports = (robot) ->

  robot.respond /link issue #?([0-9]+) to #?([0-9]+)/i, (res) ->
    source  = res.match[1]
    target  = res.match[2]
    owner   = "marcucci"
    repo    = "test"
    url     = "/repos/#{owner}/#{repo}/issues/#{source}/comments"
    source_message = {"body": "Linked this item to ##{target}"}
    target_message = {"body": "Linked this item from ##{source}"}

    # check for invalid linking
    if target == source
      res.reply("You can not link an item to itself!")
      return

    # see if items exist
    github.get "https://api.github.com/repos/#{owner}/#{repo}/issues/#{target}", (targetissue) ->
      if targetissue.number is target
          res.reply("Unable to find target issue. Looking for #{target} and found #{targetissue.number}")
          return

    # see if items exist
    github.get "https://api.github.com/repos/#{owner}/#{repo}/issues/#{source}", (sourceissue) ->
      if sourceissue.number is source
          res.reply("Unable to find source issue.")
          return

# use https://developer.github.com/v3/issues/comments/ to post a comments
    res.reply "If I worked I'd link  ##{source} to ##{target} making a post to #{url}"

# general purpose scrtips

  robot.hear /^hubot:? (.+)/i, (res) ->
    response = "Are you looking for me? I only respnd to #{robot.name}"
    response += " which is my actual name."
    res.reply response

  robot.respond /hello/i, (res) ->
    HelloReplies = ['Hello. I am here.', 'Hi', 'Hola', 'Yo', 'Hello']
    res.reply res.random HelloReplies

#   example scrtips to make sure things are working
#   These are from the scripting documentation: https://github.com/github/hubot/blob/master/docs/scripting.md

   robot.hear /badger/i, (res) ->
     res.send "Badgers? BADGERS? WE DON'T NEED NO STINKIN BADGERS"

   robot.respond /open the (.*) doors/i, (res) ->
     doorType = res.match[1]
     if doorType is "pod bay"
       res.reply "I'm afraid I can't let you do that."
     else
       res.reply "Opening #{doorType} doors"
