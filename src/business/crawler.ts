import { Inject, Service } from 'typedi'
import { Twitter, TwitterResponse } from './twitter'
import { Tweet } from './models'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

const MAX_TWEET_COUNT = parseInt(process.env.MAX_TWEET_COUNT || '500')

@Service()
export class Crawler {
  constructor(
    private readonly twitter: Twitter,
    @Inject('S3_CLIENT') private readonly s3Client: S3Client,
    @Inject('S3_BUCKET') private readonly s3Bucket: string,
  ) {}

  async run(twitterUserId: string) {
    let paginationToken: string | undefined = undefined
    const tweets: Tweet[] = []
    let iteration = 0
    while (tweets.length < MAX_TWEET_COUNT) {
      iteration++

      const page: TwitterResponse = await this.twitter.tweets(twitterUserId, paginationToken)

      console.log(`Processing iteration ${iteration}: ${page.meta.result_count}`)
      paginationToken = page.meta.next_token
      if (page.data.length > 0) {
        tweets.push(...page.data.map(d => ({
          context: (d.context_annotations || []).map(c => c.entity.name.toLowerCase()),
        })))
      }

      if (!paginationToken) {
        break
      }
    }
    console.log(`Fetched ${tweets.length} tweets for ${twitterUserId}`)
    const topics = tweets
      .reduce((acc, cur) => (acc.concat(cur.context)), [] as string[])
      .reduce((acc, cur) => (acc.set(cur, (acc.get(cur) || 0) + 1)), new Map<string, number>())
    await this.s3Client.send(new PutObjectCommand({
      Body: JSON.stringify(topics),
      Key: `user/${twitterUserId}/topics.json`,
      Bucket: this.s3Bucket,
      ACL: 'public-read',
    }))
    console.log(`Stored ${topics.size} topics for ${twitterUserId}`)
  }
}
