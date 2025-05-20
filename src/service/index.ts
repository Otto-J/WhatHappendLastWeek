import { fetchMp3 } from './fetchMp3'
import { hello } from './hello'
import { fetchLastWeekPodcast } from './lastweek'
import { rss } from './rss'

export class Service {
  async fetchLastWeekPodcast(ctx: any) {
    return fetchLastWeekPodcast(ctx)
  }

  hello(ctx: any) {
    return hello(ctx)
  }

  async fetchMp3(ctx: any) {
    return fetchMp3(ctx)
  }

  async rss(ctx: any) {
    return rss(ctx)
  }
}
