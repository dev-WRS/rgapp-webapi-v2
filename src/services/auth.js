import { errors } from 'lts-server'

const { HttpBadRequestError } = errors

export default ({ db, config }) => {
	const { mongoose } = db
	const { User } = mongoose

	const createUser = async ({ email, salt, hash, secureCode, secureCodeExpDate }) => {
		try {
			return await User.create({ email, salt, hash, secureCode, secureCodeExpDate })
		} catch (error) {
			if (error.code == 11000 && error.keyPattern['email']) {
				throw new HttpBadRequestError('Email is already registered to an account')
			} else {
				throw new HttpBadRequestError('Bad request')
			}
		}
	}

	const updateUser = (filter, update) => User.findOneAndUpdate(filter, update, { returnDocument: 'after' }).populate({ path: 'role', select: '_id, name', model: 'Role' })
	const getUserById = (id) => User.findOne({ _id: id }).populate('role', '-__v')
	// const getUserByEmail = (email, emailVerified = true) => User.findOne({ email, emailVerified })
	const getUserByEmail = (email) => User.findOne({ email })
	const getOrCreateUserByEmail = (email, item) => User.findOneAndUpdate({ email },
		{ $setOnInsert: item },
		{ upsert: true, new: true, runValidators: true }
	)
	const getUserByCode = ({ email, secureCode }) => User.findOne({ email, secureCode })

	return {
		createUser,
		updateUser,
		getUserById,
		getUserByEmail,
		getOrCreateUserByEmail,
		getUserByCode
	}
}