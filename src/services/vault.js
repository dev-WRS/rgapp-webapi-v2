export default ({ db }) => {
	const { mongoose } = db
	const { Vault } = mongoose

	return {
		getByKey: (key) => Vault.findOne({ key })
	}
}