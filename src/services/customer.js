import { errors } from 'lts-server'
import { searchSyntax, filterSyntax, sortOrderSyntax } from '../db/mongoose/index.js'

const { HttpBadRequestError } = errors

export default ({ db, config }) => {
	const { mongoose } = db
	const { Customer, Asset } = mongoose

	const getCustomers = (query) => {
		const findQuery = {}
		const andQuery = []
		const searchQuery = searchSyntax(query.search, ['name', 'address', 'phone'])
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

		return Customer.find(findQuery, '-__v').sort(sortQuery).lean()
	}
	const createCustomer = async ({ name, address, phone, primaryColor, logo, createdBy }) => {
		try {
			const customer = await Customer.create({ name, address, phone, primaryColor, logo, createdBy })
			
			return await Customer.findOne({ _id: customer.id }, '-__v').lean()
		} catch (error) {
			if (error.code == 11000 && error.keyPattern['name']) {
				throw new HttpBadRequestError('Name is already registered to a customer')
			} else {
				throw new HttpBadRequestError('Bad request')
			}
		}
	}
	const getCustomerById = (id) => Customer.findOne({ _id: id }, '-__v').lean()
	const updateCustomer = async ({ id, ...filter }, update) => {
		const iterables = ['name', 'address', 'phone', 'logo', 'primaryColor']
		const customer = await Customer.findOne({ _id: id, ...filter })

		iterables.forEach(name => {
			if (update[name]) customer[name] = update[name]
		})

		return await customer.save()
	}
	const deleteCustomer = async ({ id }) => {
		const customer = await Customer.findOne({ _id: id })
		const { logo } = customer

		if (logo) {
			await Asset.deleteOne({ _id: logo })
		}

		return await customer.deleteOne()
	}

	return {
		getCustomers,
		createCustomer,
		getCustomerById,
		updateCustomer,
		deleteCustomer
	}
}