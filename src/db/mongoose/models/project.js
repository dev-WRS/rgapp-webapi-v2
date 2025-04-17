import mongoose from 'mongoose'

const projectSchema = new mongoose.Schema({
	projectID: {
		type: String,
		required: true,
		unique: true
	},
	originalProjectID: {
		type: String
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
		enum: ['Multistate', 'AL', 'MT', 'AK', 'NE', 'DC', 'AZ', 'NV', 'AR', 'NH', 'CA', 'NJ', 'CO', 'NM', 'CT', 'NY', 'DE', 'NC', 'FL', 'ND', 'GA', 'OH', 'HI', 'OK', 'ID', 'OR', 'IL', 'PA', 'IN', 'RI', 'IA', 'SC', 'KS', 'SD', 'KY', 'TN', 'LA', 'TX', 'ME', 'UT', 'MD', 'VT', 'MA', 'VA', 'MI', 'WA', 'MN', 'WV', 'MS', 'WI', 'MO', 'WY']
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
	status: {
		type: String,
		enum: ['inProgress', 'readyForReview', 'approved', 'closed']
	},
	certifier: {
		type: mongoose.Types.ObjectId,
		ref: 'Certifier'
	},
	customer: {
		type: mongoose.Types.ObjectId,
		ref: 'Customer'
	},
	photos: [{
		asset: {
			type: mongoose.Types.ObjectId,
			ref: 'Asset'
		},
		description: {
			type: String,
			required: true
		},
		position: {
			type: Number,
			default: 0
		}
	}],
	// Specific fields for 45L
	dwellingUnitName: {
		type: String
		//required: true
	},
	dwellingUnitAddress: {
		type: String
		//required: true
	},
	totalDwellingUnits: {
		type: Number
		//required: true
	},
	dwellingUnits: [{
		address: {
			type: String,
			required: true
		},
		type: {
			type: String
		},
		model: {
			type: String
		},
		building: {
			type: String
		},
		unit: {
			type: String
		}
	}],
	certificate45L: {
		type: mongoose.Types.ObjectId,
		ref: 'Asset'
	},
	// Specific fields for 179D 
	software: {
		type: String,
		enum: ['eQuest 3.65', 'Hourly Analysis Program (HAP) v5.10.', null]
	},
	draft: {
		type: Boolean,
		default: true
	},
	buildingDefaults: {
		name: {
			type: String
		},
		address: {
			type: String
		},
		type: {
			type: String
		},
		qualifyingCategories: [{
			type: String,
			enum: ['Lighting', 'HVAC', 'HVAC + L', 'HVAC + ENV', 'L+ENV', 'Envelope', 'Whole Building', 'TBD']
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
			enum: ['Permanent', 'Interim Whole Building', 'Interim Space-by-Space', null]
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
			enum: ['Lighting', 'HVAC', 'HVAC + L', 'HVAC + ENV', 'L+ENV', 'Envelope', 'Whole Building', 'TBD']
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
	report: {
		type: mongoose.Types.ObjectId,
		ref: 'Asset'
	},
	baselineDesign179D: {
		type: mongoose.Types.ObjectId,
		ref: 'Asset'
	},
	wholeBuildingDesign179D: {
		type: mongoose.Types.ObjectId,
		ref: 'Asset'
	},
	buildingSummary179D: {
		type: mongoose.Types.ObjectId,
		ref: 'Asset'
	},
	softwareCertificate179D: {
		type: mongoose.Types.ObjectId,
		ref: 'Asset'
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

const Project = mongoose.model('Project', projectSchema)

export default Project