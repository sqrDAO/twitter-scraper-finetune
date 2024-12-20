// TwitterCrawlAPI.js
import Logger from "./Logger.js";
import fetch from "node-fetch";
import DataOrganizer from "./DataOrganizer.js";

class TwitterCrawlAPI {
  constructor(username, apiKey) {
    this.username = username;
    this.apiKey = apiKey;
    this.baseUrl = process.env.RAPIDAPI_URL;
    this.host = new URL(`${this.baseUrl}`).host;
    this.dataOrganizer = new DataOrganizer("pipeline", username); // Initialize DataOrganizer
    this.paths = this.dataOrganizer.getPaths();
  }

  async getUserId() {
    const url = new URL(`${this.baseUrl}/user`);
    url.searchParams.set("username", this.username.toLocaleLowerCase());

    const response = await fetch(url, {
      headers: {
        "x-rapidapi-host": this.host,
        "x-rapidapi-key": this.apiKey,
      },
    });

    if (!response.ok) {
      const errorData = await response.text(); // Capture error response body
      const errorMessage = `API request failed with status ${response.status}: ${errorData}`;
      throw new Error(errorMessage); // Include error details in the error message
    }
    const jsonData = await response.json();

    return {
      userId: jsonData.result?.data?.user?.result?.rest_id || null,
      totalTweets:
        jsonData.result?.data?.user?.result?.legacy?.statuses_count || null,
    };
  }

  async collectTweets() {
    try {
      let allTweets = [];
      let bottomCursor = null;

      const { userId, totalTweets } = await this.getUserId();
      console.log(`User ID: ${userId} - Total Tweets: ${totalTweets}`);

      if (!userId) {
        Logger.error(`❌ User ID not found for username: ${this.username}`);
        return;
      }

      let count = 0;
      const step = 20;
      do {
        const url = new URL(`${this.baseUrl}/user-tweets`);
        url.searchParams.set("user", userId);
        url.searchParams.set("count", step);
        if (bottomCursor) {
          url.searchParams.set("cursor", bottomCursor);
        }

        const response = await fetch(url, {
          headers: {
            "x-rapidapi-host": this.host,
            "x-rapidapi-key": this.apiKey,
          },
        });

        if (!response.ok) {
          const errorData = await response.text(); // Capture error response body
          const errorMessage = `API request failed with status ${response.status}: ${errorData}`;
          throw new Error(errorMessage); // Include error details in the error message
        }

        const jsonData = await response.json();
        const tweets = this.extractTweetsFromResponse(jsonData);
        allTweets = allTweets.concat(tweets);
        bottomCursor = jsonData?.cursor?.bottom;

        count += step;
        console.log(`Collected ${count}/${totalTweets} for @${this.username}`);
      } while (totalTweets > count);

      const processedTweets = allTweets
        .map(async (tweet) => await this.processTweetData(tweet))
        .filter((tweet) => tweet !== null);

      // Save the processed tweets to the raw data directory
      await this.dataOrganizer.saveTweets(processedTweets);
      return processedTweets;
    } catch (error) {
      Logger.error(`Failed to collect tweets: ${error.message}`);
      // ... other error handling, maybe retry logic
      throw error; // Re-throw the error to be handled at a higher level.
    }
  }

  extractTweetsFromResponse(jsonData) {
    const extractedTweets = [];

    const instructions = jsonData?.result?.timeline?.instructions;

    if (instructions) {
      for (const instruction of instructions) {
        if (instruction.type === "TimelineAddEntries") {
          for (const entry of instruction.entries) {
            if (entry?.content?.itemContent?.tweet_results?.result) {
              extractedTweets.push(
                entry.content.itemContent.tweet_results.result
              );
              continue;
            }

            if (
              entry?.content?.itemContent?.tweet_results?.result
                ?.retweeted_status_result?.result
            ) {
              extractedTweets.push(
                entry.content.itemContent.tweet_results.result
                  .retweeted_status_result.result
              );
              continue;
            }
          }
        }
      }
    }
    return extractedTweets.filter((tweet) => tweet.legacy);
  }

  async processTweetData(tweet) {
    if (!tweet || !tweet.rest_id) return null; //Important
    const legacyTweet = tweet.legacy;
    const full_text = await this.getFullTextTweet(legacyTweet.rest_id);

    try {
      const createdAt = new Date(legacyTweet.created_at);
      const timestamp = createdAt.getTime();

      return {
        id: tweet.rest_id,
        text: full_text, // Use full_text for complete tweet content
        username: this.username,
        timestamp,
        createdAt: createdAt.toISOString(),
        isReply: Boolean(legacyTweet.reply_count > 0),
        isRetweet: legacyTweet.retweeted,
        likes: legacyTweet.favorite_count,
        retweetCount: legacyTweet.retweet_count,
        replies: legacyTweet.reply_count,
        photos:
          legacyTweet.extended_entities?.media?.filter(
            (media) => media.type === "photo"
          ) || [], // Updated for photos
        videos:
          legacyTweet.extended_entities?.media?.filter(
            (media) => media.type === "video"
          ) || [], // Updated for videos
        urls: legacyTweet.entities?.urls || [], //Updated for urls
        permanentUrl: `https://twitter.com/${this.username}/status/${tweet.rest_id}`, //Added permanentUrl
        hashtags: legacyTweet.entities?.hashtags || [],
        //Add other fields here if needed
      };
    } catch (error) {
      Logger.warn(
        `⚠️  Error processing tweet ${tweet?.rest_id}: ${error.message}`
      );
      return null;
    }
  }

  /**
   * Retrieves the full text of a tweet from the Twitter API.
   * @param {string} tweetId - The ID of the tweet to retrieve.
   * @returns {Promise<string>} The full text of the tweet.
   */
  async getFullTextTweet(tweetId) {
    try {
      // Construct the URL for the Twitter API request
      const url = new URL(`${this.baseUrl}/tweet`);
      url.searchParams.set("pid", tweetId);

      // Fetch the tweet data from the Twitter API
      const response = await fetch(url, {
        headers: {
          "x-rapidapi-host": this.host,
          "x-rapidapi-key": this.apiKey,
        },
      });

      // Check for errors in the response
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      // Parse the JSON response
      const jsonData = await response.json();

      // Extract the full text of the tweet from the response
      const full_text =
        jsonData.tweet?.note_tweet?.note_tweet_results?.result?.text ||
        jsonData.tweet.full_text;

      // Log the retrieved full text
      console.log(`\ntweetId: ${tweetId}, full_text: ${full_text}`);

      // Return the full text of the tweet
      return full_text;
    } catch (error) {
      // Log any errors encountered while fetching the tweet
      console.error("Error fetching tweet details:", error);
    }
  }
}

export default TwitterCrawlAPI;
