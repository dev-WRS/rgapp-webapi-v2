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
		bucketName: 'rgapp-assets-bucket',
		contentEncoding: 'gzip'
	},
	smtp: {
		sender: 'Loopthy Corp." <dev@loopthy.com>'
	},
	phrase: '4abbef4971c838ac88027e2de675f8e62c5da52872c0631ec17eaf26288b0003'
}