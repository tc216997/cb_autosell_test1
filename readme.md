## Instructions

## Before step 1, you should have [NodeJS](https://nodejs.org/en/), [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli), and [Git](https://git-scm.com/downloads) installed.

### Step 1. log into heroku dashboard and create an app page (remember the name, only dashes, numbers and lowercase letters are allowed)
### Also create a github repository for this app.

### Step 2. Login into heroku with your username and pw via command line

### Step 3. Initialize an empty git
`git init`

### Step 4. connecting your local repo to the remote repo on github
`git remote add origin *repository url*`

### Step 5. Stage the file for commit to local repo.
`git add .`

### Step 6. Commit the changes that have been staged in the local repo.
`git commit -m "any-commit-message-you-want"`

### Step 7. Push to remote repo on github
`git push origin master`

### Step 8. Attaching the repo to heroku's git
`heroku git:remote -a the-name-of-the-app-you-set-on-heroku`

### Step 9. Push to heroku branch
`git push heroku master`

### Step 10. Store the passphrase into environment variable on Heroku Dyno 
`heroku config:set PASSPHRASE=*secret passphrase you received from coinbase*`

### Step 11. Store the api_secret into environment variable on Heroku Dyno 
`heroku config:set API_SECRET=*api secret you received from coinbase*`

### Step 12. Store the api_key into environment variable on Heroku Dyno 
`heroku config:set API_KEY=*api key you have received from coinbase*`

#### We can check the status of the bot and whether the deployment was a success by entering 
`heroku ps` 
#### in the console. (it should say worker.x: up timestamp)

#### We can also check the logs by entering 
`heroku logs` 
#### in the console.

#### We can stop the bot by entering
`heroku ps:scale worker=0`
#### in the console.

### Remember, each time we change the source file, we would have to push the changes to the heroku branch and restart the bot in order for the changes to take effect.

