require('dotenv').config();
const fetch = require('node-fetch');
global.fetch = fetch;
const { Scraper } = require('agent-twitter-client');
const fs = require('fs');

async function runTests() {
    console.log('🧪 Starting Twitter API Tests...');

    const scraper = new Scraper({
        fetch: fetch
    });

    try {
        // Test 1: Login
        console.log('\n Test 1: Twitter Login');
        await scraper.login(
            process.env.TWITTER_USERNAME,
            process.env.TWITTER_PASSWORD,
            process.env.TWITTER_EMAIL
        );
        console.log('Login successful');

        // Test 2: Send Simple Tweet
        console.log('\n Test 2: Sending Simple Tweet');
        const tweetText = `Hello world! This is a test tweet. ${Date.now()}`;
        await scraper.sendTweet(tweetText);
        console.log('Simple tweet sent successfully');

        // Test 3: Send Tweet with Image
        // console.log('\n Test 3: Sending Tweet with Image');
        // try {
        //     const imageBuffer = fs.readFileSync('./test-image.jpg');
        //     const mediaData = [
        //         {
        //             file: imageBuffer,
        //             type: 'image/jpeg',
        //         },
        //     ];
        //     await scraper.sendTweet(
        //         'Check out this test image! ' + Date.now(),
        //         undefined,
        //         mediaData
        //     );
        //     console.log('Tweet with image sent successfully');
        // } catch (error) {
        //     console.error('Image tweet failed:', error.message);
        // }

        // Test 4: Fetch Timeline
        console.log('\n Test 4: Fetching Timeline');
        const timeline = await scraper.fetchHomeTimeline(5);
        console.log('Timeline fetched successfully');
        console.log(`Retrieved ${timeline.length} tweets:`);
        timeline.forEach(tweet => {
            console.log(`- Tweet ID: ${tweet.id}`);
            console.log(`  Author: ${tweet.author}`);
            console.log(`  Content: ${tweet.text}\n`);
        });

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.response) {
            console.error('Error details:', error.response.data);
        }
    }
}

// Run tests
console.log('🤖 Starting Twitter API Test Suite...');
runTests().catch(error => {
    console.error('❌ Unhandled error:', error);
    process.exit(1);
});