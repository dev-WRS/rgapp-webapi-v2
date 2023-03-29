import mongoose from 'mongoose'

const deductionSchema = new mongoose.Schema({
	key: {
		type: String,
		required: true,
		unique: true
	},
	taxYear: {
		type: Number,
		required: true
	},
	method: {
		type: String,
		required: true,
		enum: ['Permanent', 'Interim Whole Building', 'Interim Space-by-Space']
	},
	qualifyingCategory: {
		type: String,
		required: true,
		enum: ['Lightning', 'HVAC', 'Envelope', 'Whole Building']
	},
	savingsRequirement: {
		type: Number
	},
	taxDeduction: {
		type: Number
	}
})

const Deduction = mongoose.model('Deduction', deductionSchema)

export default Deduction