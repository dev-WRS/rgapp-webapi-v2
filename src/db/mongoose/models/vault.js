import mongoose from 'mongoose'

const vaultSchema = new mongoose.Schema({
	key: {
		type: String,
		unique: true
	},
	value: {
		type: String
	}
})

const Vault = mongoose.model('Vault', vaultSchema)

export default Vault