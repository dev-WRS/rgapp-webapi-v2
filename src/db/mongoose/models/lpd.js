import mongoose from 'mongoose'

const lpdSchema = new mongoose.Schema({
	key: {
		type: String,
		required: true,
		unique: true
	},
	taxYear: {
		type: Number,
		required: true
	},
	buildingType: {
		type: String,
		required: true,
		enum: ['Automotive Facility', 'Convention Center', 'Court House', 'Dining: Bar Lounge/Leisure', 'Dining: Cafeteria/Fast Food', 'Dining: Family', 'Dormitory', 'Exercise Center', 'Gymnasium', 'Hospital/Healthcare', 'Hotel', 'Library', 'Manufacturing Facility', 'Motel', 'Motion Picture Theatre', 'Multi-Family', 'Museum', 'Office', 'Parking Garage', 'Penitentiary', 'Performing Arts Theatre', 'Police/Fire Station', 'Post Office', 'Religious Building', 'Retail', 'School/University', 'Sports Arena', 'Town Hall', 'Transportation', 'Warehouse', 'Workshop']
	},
	lpd: {
		type: Number,
		required: true
	}
})

const Lpd = mongoose.model('Lpd', lpdSchema)

export default Lpd