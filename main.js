require('dotenv').config();
const fetch = require('node-fetch');
const axios = require('axios');

class TwitterReplyBot {
    constructor() {
        console.log('Initializing Twitter Reply Bot...');
        this.processedTweets = new Set();
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

    async sendTweet(text, replyToId = null) {
        const tweetEndpoint = 'https://api2.apidance.pro/graphql/CreateTweet';
        
        const payload = {
            variables: {
                tweet_text: text,
                dark_request: false,
                semantic_annotation_ids: [],
                includePromotedContent: false
            }
        };

        if (replyToId) {
            payload.variables.reply = {
                in_reply_to_tweet_id: replyToId,
                exclude_reply_user_ids: []
            };
        }

        const headers = {
            'apikey': process.env.APIDANCE_API_KEY,
            'AuthToken': process.env.TWITTER_AUTH_TOKEN,
            'Content-Type': 'application/json'
        };

        try {
            const response = await fetch(tweetEndpoint, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(payload),
                redirect: 'follow'
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }

            const result = await response.text();
            return result;
        } catch (error) {
            console.error('❌ Tweet error:', error);
            throw error;
        }
    }

    async start() {
        try {
            console.log('\n🚀 Starting bot...');
            
            // 回复特定推文
            const tweetId = '1870409109964750937';
            const tweetContent = "I'm looking for a job in web3 industry. I have experience in Solidity, React, Node.js, and Python. DM me if you have any opportunities!";
            
            // 获取 AI 回复
            const aiResponse = await this.getDeepSeekResponse(tweetContent);
            
            if (aiResponse) {
                // 发送回复
                await this.sendTweet(aiResponse, tweetId);
                console.log('✅ Reply sent successfully');
            } else {
                console.error('❌ Failed to generate AI response');
            }

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
