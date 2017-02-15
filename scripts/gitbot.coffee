# Description:
#   Main gitbot script.
#

github = require('githubot')
github_api_url = process.env.github_api_url
owner = process.env.github_owner
repo = process.env.github_repo

module.exports = (robot) ->

  robot.respond /link issue #?([0-9]+) to #?([0-9]+)/i, (res) ->
    source  = res.match[1]
    target  = res.match[2]
    url     = "/repos/#{owner}/#{repo}/issues/#{source}/comments"
    source_message = {"body": "Linked this item to ##{target}"}
    target_message = {"body": "Linked this item from ##{source}"}

    # check for invalid linking
    if target == source
      res.reply("You can not link an item to itself!")
      return

    # see if items exist
    github.get "#{github_api_url}/repos/#{owner}/#{repo}/issues/#{target}", (targetissue) ->
      if targetissue.number is target
          res.reply("Unable to find target issue. Looking for #{target} and found #{targetissue.number}")
          return
      for label, x in targetissue.labels
        if label.name is "epic"
          res.reply("Your target issue is an epic. It can not have a parent.")
          return

    # see if items exist
    github.get "#{github_api_url}/repos/#{owner}/#{repo}/issues/#{source}", (sourceissue) ->
      if sourceissue.number is source
          res.reply("Unable to find source issue.")
          return

    # use https://developer.github.com/v3/issues/comments/ to post a comments
      res.reply "If I worked I'd link  ##{source} to ##{target}."

# Get Issue details
  robot.respond /info issue #?([0-9]+)/i, (res) ->
    id = res.match[1]
    url     = "#{github_api_url}/repos/#{owner}/#{repo}/issues/#{id}"

    # see if items exist
    #console.log "Looking at #{url}"

    github.get "#{url}", (issue) ->

      reply = "Here's the info you requested.\n"
      reply = reply + "Issue title: #{issue.title}\n"
      reply = reply + "Issue status: #{issue.state}\n"
      storypoints = ["not assigned"]

      # Determine story points & Story type
      for label, x in issue.labels
        if label.name.includes("story points")
          storypoints = label.name.split(": ")
        if label.name in ["epic","user story","spike"]
          reply = reply + "Issue type: #{label.name}\n"

      reply = reply + "Assigned story points: #{storypoints[1]}\n"
      res.reply "\n#{reply}"

# List comments with agile linkage
  robot.respond /agm linkage on #?([0-9]+)/i, (res) ->
    id = res.match[1]
    url = "#{github_api_url}/repos/#{owner}/#{repo}/issues/#{id}/comments"

    github.get "#{url}", (comments) ->

      for comment, x in comments
        if comment.body.includes("Linked to Agile Manager ID #")
          agmId = comment.body.split("#")
          res.reply "Linkage found. Linked to #{agmId[1]} in Agile Manager."
      if not (agmId)
        res.reply "No Linkage found."

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
