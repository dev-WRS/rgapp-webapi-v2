import mongoose from 'mongoose'

const apiKeySchema = new mongoose.Schema({
	prefix: {
		type: String,
		unique: true
	},
	name: {
		type: String
	},
	salt: {
		type: String
	},
	hash: {
		type: String
	},
	status: {
		type: String
	},
	scope: {
		type: String
	}
})

const ApiKey = mongoose.model('ApiKey', apiKeySchema)

// WebApp
// 87a5cfa3.40057b3ec212c3e8f5c8145f0086cf38

export default ApiKey