import mongoose from 'mongoose'

const certifiedBuildingSchema = new mongoose.Schema({
    projectId: {
		type: String,
		required: true,
	},
	name: {
		type: String,
		required: true
	},
    taxYear: {
		type: Number,
		required: true
	},
    legalEntity: {
		type: String,
		required: true
	},
    state: {
		type: String,
		required: true,
		enum: ['Multistate','AL', 'MT', 'AK', 'NE', 'DC', 'AZ', 'NV', 'AR', 'NH', 'CA', 'NJ', 'CO', 'NM', 'CT', 'NY', 'DE', 'NC', 'FL', 'ND', 'GA', 'OH', 'HI', 'OK', 'ID', 'OR', 'IL', 'PA', 'IN', 'RI', 'IA', 'SC', 'KS', 'SD', 'KY', 'TN', 'LA', 'TX', 'ME', 'UT', 'MD', 'VT', 'MA', 'VA', 'MI', 'WA', 'MN', 'WV', 'MS', 'WI', 'MO', 'WY']
	},
    inspectionDate: {
		type: String
	},
	reportType: {
		type: String,
		enum: ['179D', '45L']
	},
	privateProject: {
		type: Boolean,
		default: true
	},
    certifiedDate: {
		type: Date
	},
    certifier: {
		type: String
	},
    customer: {
		type: String
	},
    totalDwellingUnits: {
		type: Number
	},
    buildings: [{
		name: {
			type: String,
			required: true
		},
		address: {
			type: String,
			required: true
		},
		type: {
			type: String
		},
		qualifyingCategories: [{
			type: String,
			enum: ['Lighting', 'HVAC', 'HVAC + L', 'HVAC + ENV', 'L + ENV', 'Envelope', 'Whole Building']
		}],
		area: {
			type: Number
		},
		rate: {
			type: Number
		},
		pwRate: {
			type: Number
		},
		method: {
			type: String,
			enum: ['Permanent', 'Interim Whole Building', 'Interim Space-by-Space']
		},
		totalWatts: {
			type: Number
		},
		percentReduction: {
			type: Number
		},
		percentSaving: {
			type: Number
		},
		savingsRequirement: {
			type: Object
		},
		ashraeLpd: {
			type: Number
		},
		ashraeRequiredLpd: {
			type: Number
		}
	}],    
});

const CertifiedBuilding = mongoose.model('CertifiedBuilding', certifiedBuildingSchema)

export default CertifiedBuilding