export default {
	port: 5900,
	db: {
		mongoose: {
			uri: 'mongodb://localhost:27017/wrrg-testing'
		}
	},
	tpl: {
		appUrl: 'https://rgapp.loopthy.com'
	},
	aws: {
		bucketName: 'rgapp-assets-bucket',
		contentEncoding: 'gzip'
	},
	smtp: {
		sender: 'Loopthy Corp." <dev@loopthy.com>'
	},
	phrase: 'aebcee2b9f02e34f6fb997e60caaa77986cc93ba69328f08394cdfd01ab57930'
}