export default {
	port: 5800,
	db: {
		mongoose: {
			uri: 'mongodb://localhost:27017/wrrg-dev'
		}
	},
	tpl: {
		appUrl: 'http://localhost:3000'
	},
	aws: {
		bucketName: 'rgapp-assets-bucket',
		contentEncoding: 'gzip'
	},
	smtp: {
		sender: 'Loopthy Corp." <dev@loopthy.com>'
	},
	phrase: '64de7105327308a7d2359fa531b523184d595f79645ec513322437af4b38b008'
}