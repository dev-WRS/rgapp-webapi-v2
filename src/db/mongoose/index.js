import fs from 'fs'
import path from 'path'
import mongoose from 'mongoose'

import hydrate from './hydrate.js'

const __dirname = () => {
	return path.join(process.cwd(), 'src', 'db', 'mongoose')
}
const capitalized = str => (str.length > 0) ? `${str[0].toUpperCase()}${str.substring(1, str.length)}` : str

const names = fs.readdirSync(path.join(__dirname(), 'models'))
	.filter(item => item !== 'index.js')
	.map(item => ({
		filename: item,
		name: item.substring(0, item.indexOf('.'))
	}))

mongoose.Promise = global.Promise

const loadModels = async () => {
	const modules = await Promise.all(names.map(({ filename }) => import(`./models/${filename}`)))

	return names.reduce((values, { name }, index) => {
		values[capitalized(name)] = modules[index].default
		return values
	}, {})
}

export const searchSyntax = (searchValue, columns) => {
	return searchValue ? columns.map(item => { return { [item]: { $regex: searchValue } }}) : null
}

export const filterSyntax = (queryFilters) => {
	const filters = queryFilters && (Array.isArray(queryFilters) ? filters : JSON.parse(queryFilters))

	if (filters) {
		return filters.map(item => { return { [item.name]: { ['$' + [item.operator]]: item.value } }})
	}

	return null
}

export const sortOrderSyntax = (sortValue) => { 
	if (sortValue) {
		const field = sortValue.substr(1, sortValue.length - 1)
		const order = (sortValue.substr(0, 1) == '-') ? '-' : ''

		return order.concat(field)
	}
	return null
}

export default async ({ config }) => {
	let models = {}

	try {
		const { uri } = config.db.mongoose

		mongoose.connect(uri, { 
			useNewUrlParser: true
		})

		models = await loadModels()
		await hydrate({ config, models })
		
		if (global.jestRuntime !== true) {
			console.log(`MongoDB connected to ${uri} & initialized successfully`)
		}
	}
	catch (error) {
		console.log('MongoDB connection failed', error)
	}

	return models
}