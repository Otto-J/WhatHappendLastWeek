import { Elysia } from 'elysia'
import { Service } from './service'

const service = new Service()

const app = new Elysia()
  .post('/fetchLastWeekPodcast', ctx => service.fetchLastWeekPodcast(ctx))
  .get('/', ctx => service.hello(ctx))
  .post('/fetchMp3', ctx => service.fetchMp3(ctx))
  .get('/rss', ctx => service.rss(ctx))
  .listen(3000)

console.log(
  `🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`,
)
