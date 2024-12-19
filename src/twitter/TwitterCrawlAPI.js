// TwitterCrawlAPI.js
import Logger from './Logger.js';
import fetch from 'node-fetch';
import DataOrganizer from './DataOrganizer.js';


class TwitterCrawlAPI {
    constructor(username, apiKey) {
        this.username = username;
        this.apiKey = apiKey;
        this.baseUrl = 'https://twitter241.p.rapidapi.com';
        this.dataOrganizer = new DataOrganizer("pipeline", username); // Initialize DataOrganizer
        this.paths = this.dataOrganizer.getPaths();

    }

    async collectTweets() {
        try {
            let allTweets = [];
            let bottomCursor = null;

            do {
                const url = new URL(`${this.baseUrl}/user-tweets`);
                url.searchParams.set('user', this.username);
                url.searchParams.set('count', 100);
                if (bottomCursor) {
                    url.searchParams.set('cursor', bottomCursor);
                }

                const response = await fetch(url, {
                    headers: {
                        'x-rapidapi-host': 'twitter241.p.rapidapi.com',
                        'x-rapidapi-key': this.apiKey,
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


            } while (bottomCursor);

            const processedTweets = allTweets.map(tweet => this.processTweetData(tweet)).filter(tweet => tweet !== null);


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
                            extractedTweets.push(entry.content.itemContent.tweet_results.result);
                            continue;
                        }

                        if (entry?.content?.itemContent?.tweet_results?.result?.retweeted_status_result?.result) {
                            extractedTweets.push(entry.content.itemContent.tweet_results.result.retweeted_status_result.result);
                            continue;
                        }
                    }
                }
            }
        }
        return extractedTweets.filter(tweet => tweet.legacy);
    }



    processTweetData(tweet) {
        if (!tweet || !tweet.rest_id) return null; //Important
        const legacyTweet = tweet.legacy;

        try {
            const createdAt = new Date(legacyTweet.created_at);
            const timestamp = createdAt.getTime();


            return {
                id: tweet.rest_id,
                text: legacyTweet.full_text, // Use full_text for complete tweet content
                createdAt: createdAt.toISOString(),
                timestamp,
                likes: legacyTweet.favorite_count,
                retweetCount: legacyTweet.retweet_count,
                replies: legacyTweet.reply_count,
                isRetweet: legacyTweet.retweeted,
                permanentUrl: `https://twitter.com/${this.username}/status/${tweet.rest_id}`, //Added permanentUrl
                photos: legacyTweet.extended_entities?.media?.filter(media => media.type === 'photo') || [], // Updated for photos
                videos: legacyTweet.extended_entities?.media?.filter(media => media.type === 'video') || [], // Updated for videos
                urls: legacyTweet.entities?.urls || [], //Updated for urls
                hashtags: legacyTweet.entities?.hashtags || [],
                //Add other fields here if needed
            };
        } catch (error) {
            Logger.warn(`⚠️  Error processing tweet ${tweet?.rest_id}: ${error.message}`);
            return null;
        }
    }
    // ... other methods ...
}


export default TwitterCrawlAPI;

