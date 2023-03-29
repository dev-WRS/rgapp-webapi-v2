import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
	email: {
		type: String,
		required: true,
		unique: true
	},
	name: {
		type: String,
		required: true
	},
	phone: {
		type: String
	},
	salt: {
		type: String
	},
	hash: {
		type: String
	},
	emailVerified: { 
		type: Boolean, 
		default: false 
	},
	active: { 
		type: Boolean, 
		default: false 
	},
	secureCode: {
		type: String
	},
	secureCodeExpDate: {
		type: Date
	},
	guid: {
		type: String
	},
	role: {
		type: mongoose.Types.ObjectId,
		ref: 'Role'
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

const User = mongoose.model('User', userSchema)

export default User