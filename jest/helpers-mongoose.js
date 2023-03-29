export const insertOrUpdate = (model, key, item) => {
	const query = { [key]: item[key] }
	const update = { $set: item }
	const options = { upsert: true }
	return model.updateOne(query, update, options)
}

export const findOne = (model, key, item) => {
	const query = { [key]: item[key] }
	return model.findOne(query)
}

export const findOneAndUpdate = (model, key, item) => {
	const query = { [key]: item[key] }
	const options = { upsert: true, returnDocument: 'after' }
	return model.findOneAndUpdate(query, item, options)
}

export const findAndDelete = (model, key, item) => {
	const query = { [key]: item[key] }
	return model.findOneAndDelete(query)
}