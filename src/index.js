import createApp, { start } from 'lts-server'

const name = 'WRG.WebAPI'

start(createApp())
	.then(app => {
		const port = app.get('port') || 'DEBUG'
		console.log(`${name} listening on port ${port}`)
	})
	.catch(error => {
		console.error(name)
		console.error(error.stack)
		process.exit(1)
	})