import fs from 'fs'
import path from 'path'

const __dirname = () => {
	return path.join(process.cwd(), 'src', 'db', 'mongoose')
	// return global.jestRuntime !== true ? path.dirname(fileURLToPath(import.meta.url)) : __dirname
}

const readJsonFile = (filename) => {
	filename = path.join(__dirname(), filename)
	if (fs.existsSync(filename)) {
		const content = fs.readFileSync(filename)
		return JSON.parse(content)
	}
	return
}

const insertOrUpdate = (model, items, keyName) => Promise.all(
	items && items.map(item => {
		const query = { [keyName]: item[keyName] }
		const update = { $set: item }
		const options = { upsert: true }

		// return model.updateOne(query, update, options)
		return model.findOneAndUpdate(query, update, options)
	})	
)

export default async ({ models, config }) => {
	const { env } = config
	const { ApiKey, Vault, User, Role, Action, Deduction, Lpd } = models
	//TODO: Add hydratation here
	await insertOrUpdate(ApiKey, readJsonFile(path.join('fixtures', env, 'apiKey.json')), 'prefix')
	await insertOrUpdate(Vault, readJsonFile(path.join('fixtures', env, 'vault.json')), 'key')
	await insertOrUpdate(Deduction, readJsonFile(path.join('fixtures', env, 'deduction.json')), 'key')
	await insertOrUpdate(Lpd, readJsonFile(path.join('fixtures', env, 'lpd.json')), 'key')

	const rolesJson = readJsonFile(path.join('fixtures', env, 'role.json'))
	const usersJson = readJsonFile(path.join('fixtures', env, 'user.json'))

	const actions = await insertOrUpdate(Action, readJsonFile(path.join('fixtures', env, 'action.json')), 'key')

	rolesJson.map(item => {
		if (item.key == 'admin') {
			item.actions = actions.map(({ _id }) => _id)
		}
		return item
	})
	
	const roles = await insertOrUpdate(Role, rolesJson, 'key')

	usersJson.map(item => {
		const adminRole = roles.reduce((list, item) => {
			const asId = (({ _id }) => _id)
			if (item.key == 'admin') {
				list = item
			}
			return asId(list)
		})

		item.role = adminRole
		return item
	})

	await insertOrUpdate(User, usersJson, 'email')
}