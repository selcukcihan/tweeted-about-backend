import 'reflect-metadata'
import { Container } from 'typedi'
import { S3Client } from '@aws-sdk/client-s3'
import { TwitterApi } from 'twitter-api-v2'
import { Crawler } from '../business/crawler'
import { Tokens } from '../business/tokens'

Container.set('S3_CLIENT', new S3Client({ region: 'eu-west-1' }))
Container.set('S3_BUCKET', process.env.BUCKET)

async function handler(event: any) {
  console.log(`Started processing...\nPayload: ${JSON.stringify(event, null, 2)}`)

  const tokens = await new Tokens().get(event.requestContext.authorizer.principalId)

  Container.set('TWITTER_API', new TwitterApi({
    appKey: process.env.TWITTER_APP_KEY as string,
    appSecret: process.env.TWITTER_APP_SECRET as string,
    ...tokens,
  }))

  const crawler = Container.get(Crawler)
  const topics = await crawler.run(event.queryStringParameters.twitterUserId)

  return {
    statusCode: 200,
    body: JSON.stringify(topics),
    headers: {
      "Access-Control-Allow-Origin": "https://tweeted-about.selcukcihan.com",
      "Access-Control-Allow-Credentials": true
    }
  }
}

export { handler }
