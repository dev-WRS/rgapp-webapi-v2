import { errors } from 'lts-server'
import { searchSyntax, filterSyntax, sortOrderSyntax } from '../db/mongoose/index.js'

const { HttpBadRequestError } = errors

export default ({ db, config }) => {
	const { mongoose } = db
	const { Certifier, Asset } = mongoose

	const getCertifiers = (query) => {
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

		return Certifier.find(findQuery, '-__v').sort(sortQuery).lean()
	}
	const getCertifiersLicenseByState = (state) => Certifier.find({ licenses: { $elemMatch: { state: state } } }, { 'licenses.$': 1 }).select('name address phone signature createdBy').lean()
	const createCertifier = async ({ name, address, phone, signature, licenses, createdBy }) => {
		try {
			const certifier = await Certifier.create({ name, address, phone, signature, licenses, createdBy })
			
			return await Certifier.findOne({ _id: certifier.id }, '-__v').lean()
		} catch (error) {
			if (error.code == 11000 && error.keyPattern['name']) {
				throw new HttpBadRequestError('Name is already registered to a certifier')
			} else {
				throw new HttpBadRequestError('Bad request')
			}
		}
	}
	const getCertifierById = (id) => Certifier.findOne({ _id: id }, '-__v').lean()
	const updateCertifier = async ({ id, ...filter }, update) => {
		const iterables = ['name', 'address', 'phone', 'signature', 'licenses']
		const certifier = await Certifier.findOne({ _id: id, ...filter })
		
		iterables.forEach(name => {
			if (update[name]) certifier[name] = update[name]
		})
		
		return await certifier.save()
	}

	const deleteCertifier = async ({ id }) => {
		const certifier = await Certifier.findOne({ _id: id })
		const { signature } = certifier

		if (signature) {
			await Asset.deleteOne({ _id: signature })
		}

		return await certifier.deleteOne()
	}

	return {
		getCertifiers,
		getCertifiersLicenseByState,
		createCertifier,
		getCertifierById,
		updateCertifier,
		deleteCertifier
	}
}