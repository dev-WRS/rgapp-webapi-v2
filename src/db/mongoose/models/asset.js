import mongoose from 'mongoose'
import mongooseLeanVirtuals from 'mongoose-lean-virtuals'

const assetSchema = new mongoose.Schema({
	name: {
		type: String,
		required: true
	},
	format: {
		type: String
	},
	size: {
		type: String
	},
	origin: {
		type: String,
		enum: ['customer', 'certifier', 'project']
	},
	bucket: {
		type: String,
		required: true
	},
	key: {
		type: String,
		required: true
	},
	guid: {
		type: String
	},
	createDate: {
		type: Date,
		default: Date.now
	},
	createdBy: {
		type: mongoose.Types.ObjectId,
		ref: 'User'
	}
})

assetSchema.virtual('id').get((value, type, doc) => doc._id.toHexString())

assetSchema.plugin(mongooseLeanVirtuals)

const Asset = mongoose.model('Asset', assetSchema)

export default Asset