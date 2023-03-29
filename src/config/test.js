export default {
	port: 58000,
	db: {
		mongoose: {
			uri: 'mongodb://localhost:27017/wrrg-test'
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
	phrase: 'f50cbd1ec8cb70a0ff0b6dad306b91441efa172a9250b284e208872305bdc424'
}