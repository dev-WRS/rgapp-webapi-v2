import supertest from 'supertest'
import createApp, { crypto, jwt } from 'lts-server'

const { generateHash, generateSalt } = crypto

const RoleFeature = loadFeature('./features/Role.feature', { tagFilter: 'not (@unfinished or @excluded)' })
const timeout = 99999
const { findOneAndUpdate } = global.helpers.mongoose

defineFeature(RoleFeature, test => {
	const apiKey = 'apiKeyPrefix.apiKeySecret'
	const email = 'role@email.com'
	const password = 'sup3rS3cr3t'
	let app, request, accessToken, user, validRoleId, validActions = []

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

		const { Role } = app.get('db').mongoose
		const role = await Role.find({ key: 'admin' })
			
		validActions = role[0].actions
		validRoleId = role[0].id
	}, timeout)

	test('Get available roles with invalid access token', ({ given, and, when, then }) => {
		let endpoint, response, invalidAccessToken

		given('I set /roles service api endpoint', () => {
			endpoint = '/roles'
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

	test('Get available roles with valid access token', ({ given, and, when, then }) => {
		let endpoint, response

		given('I set /roles service api endpoint', () => {
			endpoint = '/roles'
		})

		when('I send a GET HTTP request', async () => {
			response = await request.get(endpoint)
				.set('X-API-Key', `apikey ${apiKey}`)
				.set('Authorization', `Bearer ${accessToken}`)
		})

		then('I receive a valid HTTP Response Code of "200"', () => {
			expect(response.statusCode).toEqual(200)
		})

		and('I get a list of all roles', async () => {
			expect(response.body.result).not.toBeNull()
		})
	}, timeout)

	test('Get role with valid id', ({ given, when, then, and }) => {
		let endpoint, response, validRoleId

		given('I set /roles service api endpoint', () => {
			endpoint = '/roles/:id '
		})

		and('I set a valid role id', async () => {
			const { Role } = app.get('db').mongoose
			const role = await Role.find()

			validRoleId = role[0].id

			endpoint = endpoint.replace(/:id/i, validRoleId)
		})

		when('I send a GET HTTP request', async () => {
			response = await request.get(endpoint)
				.set('X-API-Key', `apikey ${apiKey}`)
				.set('Authorization', `Bearer ${accessToken}`)
		})

		then('I receive a valid HTTP Response Code of "200"', () => {
			expect(response.statusCode).toEqual(200)
		})

		and('I get a role with same id', async () => {
			expect(response.body.result.id).toEqual(validRoleId)
		})
	}, timeout)

	test('Delete actions from valid role', ({ given, when, then, and }) => {
		let endpoint, body = {}, response

		given('I set /roles service api endpoint', () => {
			endpoint = '/roles/:id'
		})

		and('I have an specific role', async () => {
			endpoint = endpoint.replace(/:id/i, validRoleId)
			body.id = validRoleId
		})

		and('I remove actions from the role', () => {
			body.actions = []
		})

		when('I send a PUT HTTP request', async () => {
			response = await request.put(endpoint)
				.set('X-API-Key', `apikey ${apiKey}`)
				.set('Authorization', `Bearer ${accessToken}`)
				.send(body)
		})

		then('I receive a valid HTTP Response Code of "200"', () => {
			expect(response.statusCode).toEqual(200)
		})

		and('I get a role with same id', async () => {
			expect(response.body.result.id).toEqual(validRoleId)
		})

		and('I get an empty list of actions', async () => {
			expect(response.body.result.actions).toHaveLength(0)
		})
	}, timeout)

	test('Set actions to a valid role', ({ given, when, then, and }) => {
		let endpoint, body = {}, response

		given('I set /roles service api endpoint', () => {
			endpoint = '/roles/:id'
		})

		and('I have an specific role', async () => {
			endpoint = endpoint.replace(/:id/i, validRoleId)
			body.id = validRoleId
		})

		and('I set actions to the role', () => {
			body.actions = validActions
		})

		when('I send a PUT HTTP request', async () => {
			response = await request.put(endpoint)
				.set('X-API-Key', `apikey ${apiKey}`)
				.set('Authorization', `Bearer ${accessToken}`)
				.send(body)
		})

		then('I receive a valid HTTP Response Code of "200"', () => {
			expect(response.statusCode).toEqual(200)
		})

		and('I get a role with same id', async () => {
			expect(response.body.result.id).toEqual(validRoleId)
		})

		and('I get a list of actions > 0', async () => {
			expect(response.body.result.actions).toHaveLength(validActions.length)
		})
	}, timeout)
	
})