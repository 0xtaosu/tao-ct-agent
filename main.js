require('dotenv').config();
const fetch = require('node-fetch');
const axios = require('axios');
const express = require('express');
const app = express();

class TwitterReplyBot {
    constructor() {
        console.log('Initializing Twitter Reply Bot...');
        this.processedTweets = new Set();
        this.initCsvFile();
        this.initWebhook();
    }

    /**
     * 初始化CSV文件
     * 创建用于存储推文数据的CSV文件
     */
    initCsvFile() {
        const fs = require('fs');
        const csvHeader = 'timestamp,tweet_id,tweet_content,ai_response,is_replied\n';
        const dataDir = './data';
        this.csvPath = `${dataDir}/twitter_replies.csv`;

        try {
            // 创建数据目录
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir);
            }

            // 如果文件不存在，创建并写入表头
            if (!fs.existsSync(this.csvPath)) {
                fs.writeFileSync(this.csvPath, csvHeader);
                console.log('✅ CSV文件初始化成功');
            }
        } catch (error) {
            console.error('❌ CSV文件初始化失败:', error);
            process.exit(1);
        }
    }

    /**
     * 保存推文数据到CSV
     * @param {Object} data - 推文数据对象
     */
    saveTweetData(data) {
        const fs = require('fs');
        const { timestamp, tweetId, tweetContent, aiResponse, isReplied } = data;

        // 转义CSV中的逗号和换行符
        const escapeCsv = (text) => {
            if (typeof text !== 'string') return text;
            return `"${text.replace(/"/g, '""')}"`;
        };

        const csvLine = `${timestamp},${tweetId},${escapeCsv(tweetContent)},${escapeCsv(aiResponse)},${isReplied}\n`;

        try {
            fs.appendFileSync(this.csvPath, csvLine);
            console.log('✅ 数据已保存到CSV');
        } catch (error) {
            console.error('❌ 保存数据失败:', error);
        }
    }

    /**
     * 调用 DeepSeek API 获取 AI 回复
     * @param {string} tweetContent - 需要回复的推文内容
     * @returns {Promise<string|null>} AI 生成的回复或 null（如果发生错误）
     */
    async getDeepSeekResponse(tweetContent) {
        try {
            console.log('🤖 正在为推文生成 AI 回复:', tweetContent);
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
            console.log('✨ AI 回复生成成功:', aiResponse);
            return aiResponse;
        } catch (error) {
            console.error('❌ DeepSeek API 错误:', error.message);
            if (error.response) {
                console.error('错误详情:', error.response.data);
            }
            return null;
        }
    }

    /**
     * 发送推文或回复
     * @param {string} text - 推文内容
     * @param {string|null} replyToId - 要回复的推文 ID
     * @returns {Promise<string>} API 响应结果
     */
    async sendTweet(text, replyToId = null) {
        const tweetEndpoint = 'https://api2.apidance.pro/graphql/CreateTweet';

        const payload = {
            variables: {
                tweet_text: text,
                dark_request: false,
                semantic_annotation_ids: []
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
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.text();
            return result;
        } catch (error) {
            console.error('❌ Tweet error:', error);
            throw error;
        }
    }

    /**
     * 初始化webhook服务
     */
    initWebhook() {
        app.use(express.json());

        app.post('/webhook/twitter', async (req, res) => {
            try {
                console.log("=== 收到新的 Webhook 请求 ===");
                console.log("请求数据:", JSON.stringify(req.body, null, 2));

                const tweetData = this.extractTweetData(req.body);
                await this.processTweet(tweetData);

                res.json({
                    status: "success",
                    message: "Data processed and saved",
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                console.error('❌ Webhook处理错误:', error);
                res.status(500).json({
                    status: "error",
                    message: error.message
                });
            }
        });

        const PORT = process.env.PORT || 5000;
        app.listen(PORT, () => {
            console.log(`🚀 Webhook服务器运行在端口 ${PORT}`);
        });
    }

    /**
     * 从webhook数据中提取推文信息
     * @param {Object} data - webhook推送的数据
     * @returns {Object} 处理后的推文数据
     */
    extractTweetData(data) {
        const tweet = data.tweet || {};
        const user = data.user || {};

        return {
            timestamp: new Date(tweet.publish_time * 1000).toISOString(),
            tweetId: tweet.id_str,
            tweetContent: tweet.text,
            userName: user.name,
            userDescription: user.description,
            eventType: data.push_type
        };
    }

    /**
     * 处理单条推文
     * @param {Object} tweetData - 推文数据
     */
    async processTweet(tweetData) {
        try {
            // 检查是否已处理过该推文
            if (this.processedTweets.has(tweetData.tweetId)) {
                console.log(`⏭️ 跳过已处理的推文: ${tweetData.tweetId}`);
                return;
            }

            console.log(`\n📝 处理推文: ${tweetData.tweetId}`);
            console.log(`内容: ${tweetData.tweetContent}`);

            // 获取 AI 回复
            const aiResponse = await this.getDeepSeekResponse(tweetData.tweetContent);

            if (!aiResponse) {
                throw new Error('生成 AI 回复失败');
            }

            // 发送回复
            await this.sendTweet(aiResponse, tweetData.tweetId);
            console.log('✅ 回复发送成功');

            // 标记推文为已处理
            this.processedTweets.add(tweetData.tweetId);

            // 保存数据到CSV
            this.saveTweetData({
                timestamp: tweetData.timestamp,
                tweetId: tweetData.tweetId,
                tweetContent: tweetData.tweetContent,
                aiResponse,
                isReplied: true
            });

        } catch (error) {
            console.error('❌ 处理推文失败:', error);

            // 记录失败信息
            this.saveTweetData({
                ...tweetData,
                aiResponse: error.message,
                isReplied: false
            });
        }
    }

    /**
     * 启动机器人
     */
    async start() {
        try {
            console.log('\n🚀 机器人启动中...');
            console.log('📡 等待 Webhook 推送数据...');
        } catch (error) {
            console.error('❌ 致命错误:', error.message);
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
