import mongoose from 'mongoose'

const customerSchema = new mongoose.Schema({
	name: {
		type: String,
		required: true,
		unique: true
	},
	address: {
		type: String
	},
	phone: {
		type: String
	},
	guid: {
		type: String
	},
	primaryColor: {
		type: String,
		required: true
	},
	logo: {
		type: mongoose.Types.ObjectId,
		ref: 'Asset',
		required: true
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

const Customer = mongoose.model('Customer', customerSchema)

export default Customer