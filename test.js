require('dotenv').config();
const fetch = require('node-fetch');

async function sendTweet(text) {
    const tweetEndpoint = 'https://api2.apidance.pro/graphql/CreateTweet';
    
    const payload = {
        variables: {
            tweet_text: text,
            dark_request: false,
            semantic_annotation_ids: [],
            includePromotedContent: false
        }
    };

    const headers = {
        'apikey': process.env.APIDANCE_API_KEY,
        'AuthToken': process.env.TWITTER_AUTH_TOKEN,
        'Content-Type': 'application/json'
    };

    console.log('Request Headers:', {
        ...headers,
        'AuthToken': headers.AuthToken ? headers.AuthToken.substring(0, 10) + '...' : 'undefined'
    });
    
    console.log('Request Payload:', JSON.stringify(payload, null, 2));

    try {
        const response = await fetch(tweetEndpoint, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload),
            redirect: 'follow'
        });

        console.log('Response Status:', response.status);
        console.log('Response Headers:', Object.fromEntries(response.headers.entries()));

        // 尝试以不同方式读取响应
        let result;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            result = await response.json();
        } else {
            result = await response.text();
        }

        if (!response.ok) {
            console.error('Error response:', result);
            throw new Error(`HTTP error! status: ${response.status}, message: ${JSON.stringify(result)}`);
        }

        console.log('Response Type:', typeof result);
        console.log('Raw response:', result);
        return result;
    } catch (error) {
        console.error('Tweet error:', error);
        throw error;
    }
}

// 测试函数
async function runTest() {
    try {
        if (!process.env.TWITTER_AUTH_TOKEN) {
            throw new Error('TWITTER_AUTH_TOKEN is not set in environment variables');
        }
        if (!process.env.APIDANCE_API_KEY) {
            throw new Error('APIDANCE_API_KEY is not set in environment variables');
        }

        const tweetText = `Test tweet ${Date.now()}`;
        const result = await sendTweet(tweetText);
        console.log('Tweet sent successfully:', result);
    } catch (error) {
        console.error('Test failed:', error);
        process.exit(1);  // 添加错误退出码
    }
}

runTest();