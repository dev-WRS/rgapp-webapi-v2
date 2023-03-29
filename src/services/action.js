export default ({ db, config }) => {
	const { mongoose } = db
	const { Action } = mongoose

	const getActions = () => Action.find().lean()

	return {
		getActions
	}
}