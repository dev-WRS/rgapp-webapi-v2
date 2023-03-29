import { errors } from 'lts-server'
import { searchSyntax, filterSyntax, sortOrderSyntax } from '../db/mongoose/index.js'

const { HttpBadRequestError } = errors

export default ({ db, config }) => {
	const { mongoose } = db
	const { User } = mongoose

	const getUsers = (query) => {
		const findQuery = {}
		const andQuery = []
		const searchQuery = searchSyntax(query.search, ['name', 'email', 'phone'])
		const filterQuery = filterSyntax(query.filter)
		const sortQuery = sortOrderSyntax(query.sort)

		if (searchQuery) {
			andQuery.push({
				$or: searchQuery
			}) 
		}

		if (filterQuery) {
			andQuery.push(...filterQuery)
		}

		if (andQuery.length > 0) {
			findQuery.$and = andQuery
		}

		return User.find(findQuery).populate('role', '-__v -key -description -actions').sort(sortQuery).lean()
	}
	const getUserById = (id) => User.findOne({ _id: id }).populate('role', '-__v -key -description -actions').lean()
	const createUser = async ({ email, name, phone, role, secureCode, secureCodeExpDate, active, createdBy }) => {
		try {
			return await User.create({ email, name, phone, role, secureCode, secureCodeExpDate, active, createdBy })
		} catch (error) {
			if (error.code == 11000 && error.keyPattern['email']) {
				throw new HttpBadRequestError('Email is already registered to an account')
			} else {
				throw new HttpBadRequestError('Bad request')
			}
		}
	}
	const updateUser = ({ id }, { name, phone, role }) => User.findOneAndUpdate({ _id: id }, { name, phone, role }, { returnDocument: 'after' })
		.populate('role', '-__v -key -description -actions').lean()
	const updateUserActive = ({ id }, { active }) => User.findOneAndUpdate({ _id: id }, { active }, { returnDocument: 'after' })
		.populate('role', '-__v -key -description -actions').lean()
	const deleteUser = ({ id }) => User.deleteOne({ _id: id })

	return {
		getUsers,
		getUserById,
		createUser,
		updateUser,
		updateUserActive,
		deleteUser
	}
}