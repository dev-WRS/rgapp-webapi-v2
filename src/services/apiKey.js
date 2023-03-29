export default ({ db }) => {
	const { mongoose } = db
	const { ApiKey } = mongoose

	return {
		getByPrefix: (prefix) => ApiKey.findOne({ prefix })
	}
}