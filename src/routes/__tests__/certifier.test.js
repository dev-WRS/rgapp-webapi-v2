import supertest from 'supertest'
import createApp, { crypto, jwt } from 'lts-server'

const { generateHash, generateSalt } = crypto

const CertifierFeature = loadFeature('./features/Certifier.feature', { tagFilter: 'not (@unfinished or @excluded)' })
const timeout = 99999
const { findOneAndUpdate, findAndDelete } = global.helpers.mongoose

defineFeature(CertifierFeature, test => {
	const apiKey = 'apiKeyPrefix.apiKeySecret'
	const email = 'certifier@email.com'
	const password = 'sup3rS3cr3t'
	const bucket = 's3bucket'
	const key = 's3key'
	let app, request, accessToken, user

	const name = 'Alaa Ali, PhD'
	const address = '1225 Broken Sound Parkway NW Ste C, Boca Raton, FL 33487'
	const phone = '8006621793'
	const signature = '6290ee255e8d0151627c4b98'

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

	test('Get available certifiers with invalid access token', ({ given, and, when, then }) => {
		let endpoint, response, invalidAccessToken

		given('I set /certifiers service api endpoint', () => {
			endpoint = '/certifiers'
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

	test('Get available certifiers with valid access token', ({ given, and, when, then }) => {
		let endpoint, response

		given('I set /certifiers service api endpoint', () => {
			endpoint = '/certifiers'
		})

		when('I send a GET HTTP request', async () => {
			response = await request.get(endpoint)
				.set('X-API-Key', `apikey ${apiKey}`)
				.set('Authorization', `Bearer ${accessToken}`)
		})

		then('I receive a valid HTTP Response Code of "200"', () => {
			expect(response.statusCode).toEqual(200)
		})

		and('I get a list of all certifiers', async () => {
			expect(response.body.result).not.toBeNull()
		})
	}, timeout)

	test.skip('Add a valid certifier', ({ given, when, then, and }) => {
		let endpoint, response, certifier

		given('I set /certifiers service api endpoint', () => {
			endpoint = '/certifiers'
		})

		and('I set the certifier info', async () => {
			const filename = 'Alaa Ali, PhD - Signature.jpeg'
			const format = 'jpeg'
			const size = '44 KB'
			
			certifier = {
				name,
				address,
				phone,
				signature: {
					name: filename,
					format,
					size,
					bucket, key
				},
				licenses: [{
					state: 'TX',
					number: 'PE 113637'
				}, {
					state: 'FL',
					number: 'PE 189288'
				}],
				createdBy: user.id
			}
		})

		when('I send a POST HTTP request', async () => {
			const { Certifier } = app.get('db').mongoose

			await findAndDelete(Certifier, 'name', { name })

			response = await request.post(endpoint)
				.set('X-API-Key', `apikey ${apiKey}`)
				.set('Authorization', `Bearer ${accessToken}`)
				.send(certifier)
		})

		then('I receive a valid HTTP Response Code of "200"', () => {
			expect(response.statusCode).toEqual(200)
		})

		and('I receive the created certifier', () => {
			expect(response.body.result).toMatchObject(expect.objectContaining({
				id: expect.anything(),
				name,
				address,
				phone,
				signature: expect.anything(),
				licenses: expect.arrayContaining([expect.objectContaining({
					id: expect.anything(),
					state: expect.anything(),
					number: expect.anything()
				})]),
				createdBy: user.id
			}))
		})
	}, timeout)

	test('Get certifier with valid id', ({ given, when, then, and }) => {
		let endpoint, response, certifier

		given('I set /certifiers/:id service api endpoint', () => {
			endpoint = '/certifiers/:id '
		})

		and('I set a valid certifier id', async () => {
			const { Certifier } = app.get('db').mongoose
			certifier = await Certifier.create({ name: '[GET] ' + name, address, phone, signature, createdBy: user.id })

			endpoint = endpoint.replace(/:id/i, certifier.id)
		})

		when('I send a GET HTTP request', async () => {
			response = await request.get(endpoint)
				.set('X-API-Key', `apikey ${apiKey}`)
				.set('Authorization', `Bearer ${accessToken}`)
		})

		then('I receive a valid HTTP Response Code of "200"', async () => {
			expect(response.statusCode).toEqual(200)
			const { Certifier } = app.get('db').mongoose
			await findAndDelete(Certifier, 'name', { name: certifier.name })
		})

		and('I get a certifier with same id', async () => {
			expect(response.body.result.id).toEqual(certifier.id)
		})
	}, timeout)

	test.skip('Update a valid certifier', ({ given, when, then, and }) => {
		const newName = '[NEW] ' + name  
		const body = {}
		let endpoint, response, certifier

		given('I set /certifiers/:id service api endpoint', () => {
			endpoint = '/certifiers/:id'
		})

		and('I have an specific certifier', async () => {
			const { Certifier } = app.get('db').mongoose
			certifier = await Certifier.create({ name: '[UPDATE] ' + name, address, phone, signature, createdBy: user.id })

			endpoint = endpoint.replace(/:id/i, certifier.id)
		})

		and('I set a new certifier name', () => {
			body.name = newName
		})

		when('I send a PUT HTTP request', async () => {
			response = await request.put(endpoint)
				.set('X-API-Key', `apikey ${apiKey}`)
				.set('Authorization', `Bearer ${accessToken}`)
				.send(body)
		})

		then('I receive a valid HTTP Response Code of "200"', async () => {
			expect(response.statusCode).toEqual(200)
			const { Certifier } = app.get('db').mongoose
			await findAndDelete(Certifier, 'name', { name: newName })
		})

		and('I receive the updated certifier', () => {
			expect(response.body.result).toMatchObject(expect.objectContaining({
				id: certifier.id,
				name: body.name,
				address, 
				phone, 
				createdBy: user.id
			}))
		})
	}, timeout)

	test('Delete a valid certifier', ({ given, and, when, then }) => {
		let endpoint, response, certifier

		given('I set /certifiers/:id service api endpoint', () => {
			endpoint = '/certifiers/:id'
		})

		and('I have an specific certifier', async () => {
			const { Certifier } = app.get('db').mongoose
			certifier = await Certifier.create({ name: '[DELETE] ' + name, address, phone, signature, createdBy: user.id })

			endpoint = endpoint.replace(/:id/i, certifier.id)
		})

		when('I send a DELETE HTTP request', async () => {
			response = await request.delete(endpoint)
				.set('X-API-Key', `apikey ${apiKey}`)
				.set('Authorization', `Bearer ${accessToken}`)
		})

		then('I receive a valid HTTP Response Code of "200"', async () => {
			expect(response.statusCode).toEqual(200)
			const { Certifier } = app.get('db').mongoose
			await findAndDelete(Certifier, 'name', { name: certifier.name })
		})

		and('I receive the deleted certifier id', () => {
			expect(response.body.result).toMatchObject(expect.objectContaining({
				id: certifier.id
			}))
		})
	}, timeout)
})