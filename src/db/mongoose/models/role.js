import mongoose from 'mongoose'

const roleSchema = new mongoose.Schema({
	key: {
		type: String,
		required: true,
		unique: true
	},
	name: {
		type: String,
		required: true,
		unique: true
	},
	description: {
		type: String,
		required: true
	},
	actions: [{
		type: mongoose.Types.ObjectId,
		ref: 'Action'
	}]
})

const Role = mongoose.model('Role', roleSchema)

export default Role