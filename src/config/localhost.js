export default {
	port: 5800,
	db: {
		mongoose: {
			uri: 'mongodb://localhost:27017/wrrg'
		}
	},
	tpl: {
		appUrl: 'http://localhost:3000'
	},
	aws: {
		bucketName: 'rgapp-assets-bucket-production',
		contentEncoding: 'gzip'
	},
	smtp: {
		sender: 'Walker Reid Strategies" <no-reply@walkerreid.com>'
	},
	phrase: 'cbccc26abe0bf86da100afbed0886e10f9409e0f5663295a5b055b2d1edb3dcd'
}