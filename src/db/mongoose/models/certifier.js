import mongoose from 'mongoose'

const certifierSchema = new mongoose.Schema({
	name: {
		type: String,
		required: true,
		unique: true
	},
	address: {
		type: String,
		required: true
	},
	phone: {
		type: String,
		required: true
	},
	guid: {
		type: String
	},
	signature: {
		type: mongoose.Types.ObjectId,
		ref: 'Asset',
		required: true
	},
	licenses: [{
		state: {
			type: String,
			enum: ['Multistate', 'AL', 'MT', 'AK', 'NE', 'DC', 'AZ', 'NV', 'AR', 'NH', 'CA', 'NJ', 'CO', 'NM', 'CT', 'NY', 'DE', 'NC', 'FL', 'ND', 'GA', 'OH', 'HI', 'OK', 'ID', 'OR', 'IL', 'PA', 'IN', 'RI', 'IA', 'SC', 'KS', 'SD', 'KY', 'TN', 'LA', 'TX', 'ME', 'UT', 'MD', 'VT', 'MA', 'VA', 'MI', 'WA', 'MN', 'WV', 'MS', 'WI', 'MO', 'WY']
		},
		number: {
			type: String
		}
	}],
	createDate: {
		type: Date,
		default: Date.now
	},
	createdBy: {
		type: mongoose.Types.ObjectId,
		ref: 'User'
	}
})

const Certifier = mongoose.model('Certifier', certifierSchema)

export default Certifier