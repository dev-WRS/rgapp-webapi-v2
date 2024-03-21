import { errors } from 'lts-server'
import { searchSyntax, filterSyntax, sortOrderSyntax } from '../db/mongoose/index.js'
import moment from 'moment'

const { HttpBadRequestError } = errors

const parseFilename = (filename) => {
	const i = filename.lastIndexOf('.')
	return {
		filename,
		name: filename.substring(0, i),
		ext: filename.substring(i + 1)
	}
}

export default ({ db, config }) => {
	const { mongoose } = db
	const { Asset } = mongoose

	const getAssets = (query) => {
		const findQuery = {}
		const andQuery = []
		const searchQuery = searchSyntax(query.search, ['name', 'format', 'size', 'origin'])
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

		return Asset.find(findQuery, '-__v').sort(sortQuery).lean({ virtuals: true })
	}
	const createAsset = async ({ name, format, size, origin, bucket, key, createdBy }) => {
		try {
			const parsed = parseFilename(name)
			const count = await Asset.find({ name: { $regex: new RegExp(`^${parsed.name}`, 'i') } }).count()
			
			if (count > 0) {
				name = `${parsed.name} ${count}.${parsed.ext}`
			}

			const createDate = moment(new Date()).format('YYYY-MM-DD HH:mm:ss')

			const asset = await Asset.create({ name, format, size, origin, bucket, key, createdBy, createDate })

			return await Asset.findOne({ _id: asset.id }, '-__v').lean({ virtuals: true })
		} catch (error) {
			throw new HttpBadRequestError('Bad request')
		}
	}
	const getAssetById = (id) => Asset.findOne({ _id: id }, '-__v').lean({ virtuals: true })
	const deleteAsset = ({ id }) => Asset.deleteOne({ _id: id })
	const getAssetKeysByIds = async (ids) => {
		const assets = await Asset.find({ _id: { $in: ids } }, 'key')
		const keys = assets.map(asset => asset.key)
	
		return keys
	}

	return {
		getAssets,
		createAsset,
		getAssetById,
		deleteAsset,
		getAssetKeysByIds
	}
}