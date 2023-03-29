export default ({ db, config }) => {
	const { mongoose } = db
	const { Deduction } = mongoose

	const getDeductions = () => Deduction.find().sort('-taxYear').lean()

	return {
		getDeductions
	}
}