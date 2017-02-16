api = process.env.github_api_url;
owner = process.env.github_owner;
repo = process.env.github_repo

module.exports = {
    gitApi: api,
    gitOwner: owner,
    gitRepo: repo,
}
