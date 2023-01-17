import { Service, Inject } from 'typedi'
import axiosRetry from 'axios-retry'
import axios from 'axios'
import { TwitterApi } from 'twitter-api-v2'

axiosRetry(axios, { retries: 3 })

type Meta = {
  result_count: number
  next_token: string
}

type Data = {
  context_annotations?: {
    entity: {
      name: string,
    },
  } []
}

export type TwitterResponse = {
  meta: Meta
  data: Data[]
}

@Service()
export class Twitter {
  constructor(
    @Inject('TWITTER_API') private readonly twitterApi: TwitterApi,
  ) {}

  async tweets(userId: string, paginationToken?: string): Promise<TwitterResponse> {
    const response = await this.twitterApi.v2.userTimeline(userId, {
      exclude: ['replies', 'retweets'],
      max_results: 100,
      'tweet.fields': 'context_annotations,entities',
      pagination_token: paginationToken,
    })

    return {
      meta: response.meta as Meta,
      data: response.tweets.map(t => ({
        ...t,
        created_at: new Date(t.created_at as string),
      })) as Data[],
    }
  }
}
