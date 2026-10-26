import { app } from './app.js'

const parsedPort = Number(process.env.PORT)
const port = Number.isInteger(parsedPort) && parsedPort > 0 ? parsedPort : 3000

app.listen(port, () => {
  console.log(`FoundIt API listening on port ${port}`)
})
