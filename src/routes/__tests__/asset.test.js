import supertest from 'supertest'
import createApp, { crypto, jwt } from 'lts-server'

const { generateHash, generateSalt } = crypto

const AssetFeature = loadFeature('./features/Asset.feature', { tagFilter: 'not (@unfinished or @excluded)' })
const timeout = 99999
const { findOneAndUpdate, findAndDelete } = global.helpers.mongoose

defineFeature(AssetFeature, test => {
	const apiKey = 'apiKeyPrefix.apiKeySecret'
	const email = 'asset@email.com'
	const password = 'sup3rS3cr3t'
	const bucket = 's3bucket'
	const key = 's3key'
	let app, request, accessToken, user

	const filename = 'Sample.jpg'//'IMG90987898.jpeg'
	const format = 'jpeg'
	const size = '1 MB'

	beforeAll(async () => {
		app = await createApp()
		request = supertest(app)

		const { User } = app.get('db').mongoose

		const salt = generateSalt()
		const hash = generateHash(password, salt)

		user = await findOneAndUpdate(User, 'email', {
			email, salt, hash,
			emailVerified: true
		})

		const issuer = app.get('config').issuer

		accessToken = jwt().sign({ id: user.id }, {
			issuer,
			subject: email,
			audience: 'audience'
		})
	}, timeout)

	test('Get available assets with invalid access token', ({ given, and, when, then }) => {
		let endpoint, response, invalidAccessToken

		given('I set /assets service api endpoint', () => {
			endpoint = '/assets'
		})

		and('I set invalid access token', () => {
			invalidAccessToken = 'InvalidToken'
		})

		when('I send a GET HTTP request', async () => {
			response = await request.get(endpoint)
				.set('X-API-Key', `apikey ${apiKey}`)
				.set('Authorization', `Bearer ${invalidAccessToken}`)
		})

		then('I receive an unauthorized HTTP Response Code of "401"', () => {
			expect(response.statusCode).toEqual(401)
		})

		and('I receive an error message indicating the problem', () => {
			expect(response.body.message).not.toBeNull()
		})
	}, timeout)

	test('Get available assets with valid access token', ({ given, and, when, then }) => {
		let endpoint, response

		given('I set /assets service api endpoint', () => {
			endpoint = '/assets'
		})

		when('I send a GET HTTP request', async () => {
			response = await request.get(endpoint)
				.set('X-API-Key', `apikey ${apiKey}`)
				.set('Authorization', `Bearer ${accessToken}`)
		})

		then('I receive a valid HTTP Response Code of "200"', () => {
			expect(response.statusCode).toEqual(200)
		})

		and('I get a list of all assets', async () => {
			expect(response.body.result).not.toBeNull()
		})
	}, timeout)

	test('Add a valid asset', ({ given, when, then, and }) => {
		let endpoint, response, filePath

		given('I set /assets service api endpoint', () => {
			endpoint = '/assets'
		})

		and('I set the asset info', async () => {
			filePath = `src/routes/__tests__/assets/${filename}`
		})

		when('I send a POST HTTP request', async () => {
			const { Asset } = app.get('db').mongoose
			await findAndDelete(Asset, 'name', { name: filename })

			response = await request.post(endpoint)
				.attach('file', filePath)
				.set('X-API-Key', `apikey ${apiKey}`)
				.set('Authorization', `Bearer ${accessToken}`)
				.set('Content-Type', 'multipart/form-data')
		})

		then('I receive a valid HTTP Response Code of "200"', async () => {
			expect(response.statusCode).toEqual(200)
			const { Asset } = app.get('db').mongoose
			await findAndDelete(Asset, 'name', { name: response.body.name })
		})

		and('I receive the created asset', () => {
			expect(response.body.result).toMatchObject(expect.objectContaining({
				id: expect.anything(),
				name: expect.anything(),
				format: expect.anything(),
				size: expect.anything(),
				createDate: expect.anything(),
				createdBy: user.id
			}))
		})
	}, timeout)

	test.skip('Get asset with valid id', ({ given, when, then, and }) => {
		let endpoint, response, asset

		given('I set /assets/:id service api endpoint', () => {
			endpoint = '/assets/:id '
		})

		and('I set a valid asset id', async () => {
			const { Asset } = app.get('db').mongoose
			asset = await Asset.create({ name: filename, format, size, bucket, key })

			endpoint = endpoint.replace(/:id/i, asset.id)
		})

		when('I send a GET HTTP request', async () => {
			response = await request.get(endpoint)
				.set('X-API-Key', `apikey ${apiKey}`)
				.set('Authorization', `Bearer ${accessToken}`)
		})

		then('I receive a valid HTTP Response Code of "200"', async () => {
			expect(response.statusCode).toEqual(200)
			const { Asset } = app.get('db').mongoose
			await findAndDelete(Asset, 'name', { name: filename })
		})

		and('I get a asset with same id', async () => {
			expect(response.body.result.id).toEqual(asset.id)
		})
	}, timeout)

	test('Delete valid asset(s)', ({ given, and, when, then }) => {
		let endpoint, response, asset1, asset2

		given('I set /assets service api endpoint', () => {
			endpoint = '/assets'
		})

		and('I have specific asset(s)', async () => {
			const { Asset } = app.get('db').mongoose
			asset1 = await Asset.create({ name: filename, format, size, bucket, key })
			asset2 = await Asset.create({ name: filename + '_2', format, size, bucket, key })
		})

		when('I send a DELETE HTTP request', async () => {
			response = await request.delete(endpoint)
				.set('X-API-Key', `apikey ${apiKey}`)
				.set('Authorization', `Bearer ${accessToken}`)
				.send([{ id: asset1.id }, { id: asset2.id }])
		})

		then('I receive a valid HTTP Response Code of "200"', async () => {
			expect(response.statusCode).toEqual(200)
			const { Asset } = app.get('db').mongoose
			await findAndDelete(Asset, 'name', { name: filename })
			await findAndDelete(Asset, 'name', { name: filename + '_2' })
		})

		and('I receive the deleted asset id(s)', () => {
			expect(response.body.result).toMatchObject(expect.arrayContaining([expect.objectContaining({
				id: asset1.id
			}), 
			expect.objectContaining({
				id: asset2.id
			})]))
		})
	}, timeout)

	test('Delete restricted asset(s)', ({ given, and, when, then }) => {
		let endpoint, response, asset1, asset2

		given('I set /assets service api endpoint', () => {
			endpoint = '/assets'
		})

		and('I have specific asset(s)', async () => {
			const { Asset } = app.get('db').mongoose
			const customerOrigin = 'customer'
			const certifierOrigin = 'certifier'

			asset1 = await Asset.create({ name: filename, format, size, bucket, key, origin: customerOrigin })
			asset2 = await Asset.create({ name: filename + '_2', format, size, bucket, key, origin: certifierOrigin })
		})

		when('I send a DELETE HTTP request', async () => {
			response = await request.delete(endpoint)
				.set('X-API-Key', `apikey ${apiKey}`)
				.set('Authorization', `Bearer ${accessToken}`)
				.send([{ id: asset1.id }, { id: asset2.id }])
		})

		then('I receive a valid HTTP Response Code of "200"', async () => {
			expect(response.statusCode).toEqual(200)
			const { Asset } = app.get('db').mongoose
			await findAndDelete(Asset, 'name', { name: filename })
			await findAndDelete(Asset, 'name', { name: filename + '_2' })
		})

		and('I receive the warning message(s)', () => {
			expect(response.body.result).toMatchObject([expect.objectContaining({
				warningMessage: 'Asset(s) associated with a customer or certifier cannot be deleted'
			}), 
			expect.objectContaining({
				warningMessage: 'Asset(s) associated with a customer or certifier cannot be deleted'
			})])
		})
	}, timeout)

	test('Delete valid and restricted asset(s)', ({ given, and, when, then }) => {
		let endpoint, response, asset1, asset2, asset3

		given('I set /assets service api endpoint', () => {
			endpoint = '/assets'
		})

		and('I have valid and restricted asset(s)', async () => {
			const { Asset } = app.get('db').mongoose
			const customerOrigin = 'customer'
			const certifierOrigin = 'certifier'

			asset1 = await Asset.create({ name: filename, format, size, bucket, key, origin: customerOrigin })
			asset2 = await Asset.create({ name: filename + '_2', format, size, bucket, key, origin: certifierOrigin })
			asset3 = await Asset.create({ name: filename + '_3', format, size, bucket, key })
		})

		when('I send a DELETE HTTP request', async () => {
			response = await request.delete(endpoint)
				.set('X-API-Key', `apikey ${apiKey}`)
				.set('Authorization', `Bearer ${accessToken}`)
				.send([{ id: asset1.id }, { id: asset2.id }, { id: asset3.id }])
		})

		then('I receive a valid HTTP Response Code of "200"', async () => {
			expect(response.statusCode).toEqual(200)
			const { Asset } = app.get('db').mongoose
			await findAndDelete(Asset, 'name', { name: filename })
			await findAndDelete(Asset, 'name', { name: filename + '_2' })
			await findAndDelete(Asset, 'name', { name: filename + '_3' })
		})

		and('I receive the warning message(s) and asset id(s)', () => {
			expect(response.body.result).toMatchObject([expect.objectContaining({
				warningMessage: 'Asset(s) associated with a customer or certifier cannot be deleted'
			}), 
			expect.objectContaining({
				warningMessage: 'Asset(s) associated with a customer or certifier cannot be deleted'
			}), 
			expect.objectContaining({
				id: asset3.id
			})])
		})
	}, timeout)
})