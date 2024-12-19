// index.js
import dotenv from 'dotenv';
dotenv.config();

import TwitterCrawlAPI from './TwitterCrawlAPI.js';
import Logger from './Logger.js';

// ... (Error handling remains the same)


// Argument parsing (removed - using env variables only)
const username = process.env.TWITTER_USERNAME; // Twitter username (User ID) from .env
const apiKey = process.env.RAPIDAPI_KEY;   // RapidAPI key from .env


if (!username) {
  Logger.error('❌ Please provide a Twitter username (user ID) in the .env file');
  process.exit(1);
}

if (!apiKey) {
  Logger.error('❌ Please provide a RapidAPI key in the .env file');
  process.exit(1);
}


// ... (Rest of the code remains the same - initialization, cleanup, running collection)

const twitterCrawl = new TwitterCrawlAPI(username, apiKey);

// ... (cleanup function and signal handling)


twitterCrawl.collectTweets()
  .then(analytics => {
    // ... (handling results and exit)
  })
  .catch(error => {
    // ... (error handling and exit)
  });
