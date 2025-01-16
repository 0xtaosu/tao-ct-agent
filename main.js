require('dotenv').config();
const { Scraper } = require('agent-twitter-client');
const axios = require('axios');

class TwitterReplyBot {
    constructor() {
        this.scraper = new Scraper();
        this.processedTweets = new Set();
    }

    async initialize() {
        try {
            await this.scraper.login(
                process.env.TWITTER_USERNAME,
                process.env.TWITTER_PASSWORD,
                process.env.TWITTER_EMAIL
            );
            console.log('Successfully logged in to Twitter');
        } catch (error) {
            console.error('Failed to initialize:', error);
            throw error;
        }
    }

    async getDeepSeekResponse(tweetContent) {
        try {
            const response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
                model: "deepseek-chat",
                messages: [{
                    role: "user",
                    content: `Please provide a friendly and engaging response to this tweet: "${tweetContent}". 
                             Keep the response under 280 characters.`
                }],
                max_tokens: 150
            }, {
                headers: {
                    'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            });

            return response.data.choices[0].message.content;
        } catch (error) {
            console.error('DeepSeek API error:', error);
            return null;
        }
    }

    async monitorAndReply() {
        try {
            // Get timeline of tweets from followed accounts
            const timeline = await this.scraper.fetchHomeTimeline(20);

            for (const tweet of timeline) {
                // Skip if we've already processed this tweet
                if (this.processedTweets.has(tweet.id)) continue;

                // Skip retweets and replies
                if (tweet.isRetweet || tweet.isReply) continue;

                console.log(`Processing tweet: ${tweet.text}`);

                // Get AI response
                const aiResponse = await this.getDeepSeekResponse(tweet.text);

                if (aiResponse) {
                    // Reply to the tweet
                    await this.scraper.sendTweet(aiResponse, tweet.id);
                    console.log(`Replied to tweet ${tweet.id} with: ${aiResponse}`);
                }

                // Mark tweet as processed
                this.processedTweets.add(tweet.id);
            }

            // Limit the size of processed tweets set
            if (this.processedTweets.size > 1000) {
                const iterator = this.processedTweets.values();
                for (let i = 0; i < 500; i++) {
                    this.processedTweets.delete(iterator.next().value);
                }
            }

        } catch (error) {
            console.error('Error in monitoring tweets:', error);
        }
    }

    async start() {
        await this.initialize();

        // Run the monitoring loop every 5 minutes
        setInterval(() => this.monitorAndReply(), 5 * 60 * 1000);

        // Start first monitoring immediately
        this.monitorAndReply();
    }
}

// Start the bot
const bot = new TwitterReplyBot();
bot.start().catch(console.error);
