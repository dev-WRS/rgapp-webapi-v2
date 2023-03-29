export default {
	port: 5900,
	db: {
		mongoose: {
			uri: 'mongodb://localhost:27017/wrrg'
		}
	},
	tpl: {
		appUrl: 'https://reports.walkerreid.com'
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