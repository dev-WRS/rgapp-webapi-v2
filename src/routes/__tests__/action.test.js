import supertest from 'supertest'
import createApp, { crypto, jwt } from 'lts-server'

const { generateHash, generateSalt } = crypto

const ActionFeature = loadFeature('./features/Action.feature', { tagFilter: 'not (@unfinished or @excluded)' })
const timeout = 99999
const { findOneAndUpdate } = global.helpers.mongoose

defineFeature(ActionFeature, test => {
	const apiKey = 'apiKeyPrefix.apiKeySecret'
	const email = 'action@email.com'
	const password = 'sup3rS3cr3t'
	let app, request, accessToken, user

	beforeAll(async () => {
		app = await createApp()
		request = supertest(app)

		const { User, Role } = app.get('db').mongoose
		
		const salt = generateSalt()
		const hash = generateHash(password, salt)

		const role = await Role.findOne({ key: 'admin' })

		user = await findOneAndUpdate(User, 'email', {
			email, salt, hash,
			emailVerified: true,
			role: role.id
		})

		const issuer = app.get('config').issuer
			
		accessToken = jwt().sign({ id: user.id }, {
			issuer,
			subject: email, 
			audience: 'audience'
		})
	}, timeout)

	test('Get available actions with invalid access token', ({ given, and, when, then }) => {
		let endpoint, response, invalidAccessToken

		given('I set /actions service api endpoint', () => {
			endpoint = '/actions'
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
	})

	test('Get available actions', ({ given, when, then, and }) => {
		let endpoint, response

		given('I set /actions service api endpoint', () => {
			endpoint = '/actions'
		})

		when('I send a GET HTTP request', async () => {
			response = await request.get(endpoint)
				.set('X-API-Key', `apikey ${apiKey}`)
				.set('Authorization', `Bearer ${accessToken}`)	
		})

		then('I receive a valid HTTP Response Code of "200"', () => {
			expect(response.statusCode).toEqual(200)	
		})

		and('I get a list of actions', () => {
			expect(response.body.result).not.toBeNull()	
		})
	})
})