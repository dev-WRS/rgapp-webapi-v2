export default ({ db, config }) => {
	const { mongoose } = db
	const { Lpd } = mongoose

	const getLpds = () => Lpd.find().sort('-taxYear').lean()

	return {
		getLpds
	}
}