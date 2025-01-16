require('dotenv').config();
const fetch = require('node-fetch');
global.fetch = fetch;
const { Scraper } = require('agent-twitter-client');
const axios = require('axios');

class TwitterReplyBot {
    constructor() {
        console.log('Initializing Twitter Reply Bot...');
        this.scraper = new Scraper({
            fetch: fetch
        });
        this.processedTweets = new Set();
    }

    async initialize() {
        try {
            console.log('Attempting to login to Twitter...');
            await this.scraper.login(
                process.env.TWITTER_USERNAME,
                process.env.TWITTER_PASSWORD,
                process.env.TWITTER_EMAIL
            );
            console.log('✅ Successfully logged in to Twitter');
        } catch (error) {
            console.error('❌ Failed to initialize:', error.message);
            throw error;
        }
    }

    async getDeepSeekResponse(tweetContent) {
        try {
            console.log('🤖 Requesting AI response for tweet:', tweetContent);
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

            const aiResponse = response.data.choices[0].message.content;
            console.log('✨ Generated AI response:', aiResponse);
            return aiResponse;
        } catch (error) {
            console.error('❌ DeepSeek API error:', error.message);
            if (error.response) {
                console.error('Error details:', error.response.data);
            }
            return null;
        }
    }

    async monitorAndReply() {
        try {
            console.log('\n🔍 Checking timeline for new tweets...');
            const timeline = await this.scraper.fetchHomeTimeline(20);
            console.log(`📋 Found ${timeline.length} tweets in timeline`);

            for (const tweet of timeline) {
                if (this.processedTweets.has(tweet.id)) {
                    console.log(`⏭️ Skipping already processed tweet: ${tweet.id}`);
                    continue;
                }

                if (tweet.isRetweet || tweet.isReply) {
                    console.log(`⏭️ Skipping retweet/reply: ${tweet.id}`);
                    continue;
                }

                console.log('\n📝 Processing tweet:', {
                    id: tweet.id,
                    author: tweet.author,
                    text: tweet.text
                });

                const aiResponse = await this.getDeepSeekResponse(tweet.text);

                if (aiResponse) {
                    console.log('📤 Attempting to send reply...');
                    await this.scraper.sendTweet(aiResponse, tweet.id);
                    console.log('✅ Successfully replied to tweet', tweet.id);
                }

                this.processedTweets.add(tweet.id);
                console.log(`✅ Marked tweet ${tweet.id} as processed`);
            }

            if (this.processedTweets.size > 1000) {
                console.log('🧹 Cleaning up processed tweets cache...');
                const iterator = this.processedTweets.values();
                for (let i = 0; i < 500; i++) {
                    this.processedTweets.delete(iterator.next().value);
                }
                console.log(`📊 Processed tweets cache size: ${this.processedTweets.size}`);
            }

        } catch (error) {
            console.error('❌ Error in monitoring tweets:', error.message);
            if (error.response) {
                console.error('Error details:', error.response.data);
            }
        }
    }

    async start() {
        try {
            await this.initialize();
            console.log('\n🚀 Starting monitoring loop...');

            // Run the monitoring loop every 5 minutes
            setInterval(() => {
                console.log('\n⏰ Running scheduled check...');
                this.monitorAndReply();
            }, 5 * 60 * 1000);

            // Start first monitoring immediately
            console.log('▶️ Running initial check...');
            await this.monitorAndReply();

        } catch (error) {
            console.error('❌ Fatal error:', error.message);
            process.exit(1);
        }
    }
}

// Start the bot
console.log('🤖 Twitter Reply Bot Starting...');
const bot = new TwitterReplyBot();
bot.start().catch(error => {
    console.error('❌ Unhandled error:', error);
    process.exit(1);
});
