export default ({ db, config }) => {
	const { mongoose } = db
	const { Role } = mongoose

	const getRoles = () => Role.find().select('-__v -actions').lean()
	const getRoleById = (id) => Role.findOne({ _id: id }, '-__v').populate('actions', '-__v').lean()
	const updateRole = (filter, update) => Role.findOneAndUpdate(filter, update, { returnDocument: 'after' }).select('-__v').lean()

	return {
		getRoles,
		getRoleById,
		updateRole
	}
}