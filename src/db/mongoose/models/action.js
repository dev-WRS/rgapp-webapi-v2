import mongoose from 'mongoose'

const actionSchema = new mongoose.Schema({
	key: {
		type: String,
		required: true,
		unique: true
	},
	name: {
		type: String,
		required: true
	},
	group: {
		type: String
	}
})

const Action = mongoose.model('Action', actionSchema)

export default Action