import supertest from 'supertest'
import createApp, { crypto, jwt } from 'lts-server'

const { generateHash, generateSalt } = crypto

const AuthenticateFeature = loadFeature('./features/Authenticate.feature', { tagFilter: 'not (@unfinished or @excluded)' })
const timeout = 99999
const { findOneAndUpdate } = global.helpers.mongoose

defineFeature(AuthenticateFeature, test => {
	const apiKey = 'apiKeyPrefix.apiKeySecret'
	let app, request

	beforeAll(async () => {
		app = await createApp()
		request = supertest(app)
	}, timeout)

	test('Post authenticate route with no access token', ({ given, and, when, then }) => {
		let endpoint, body, response

		given('I set /authenticate service api endpoint', () => {
			endpoint = '/authenticate'
		})

		// eslint-disable-next-line no-empty-function
		and('I set no access token', () => {})

		when('I send a POST HTTP request', async () => {
			response = await request.post(endpoint)
				.set('X-API-Key', `apikey ${apiKey}`)
				.send(body)
		})

		then('I receive an bad request HTTP Response Code of 401', () => {
			expect(response.statusCode).toEqual(401)
		})

		and('I receive an error message indicating the problem', () => {
			expect(response.body.message).not.toBeNull()
		})
	}, timeout)

	test('Post authenticate route with wrong token', ({ given, and, when, then }) => {
		let endpoint, body, response, invalidAccessToken

		given('I set /authenticate service api endpoint', () => {
			endpoint = '/authenticate'
		})

		and('I set invalid access token', () => {
			invalidAccessToken = 'InvalidToken'
		})

		when('I send a POST HTTP request', async () => {
			response = await request.post(endpoint)
				.set('X-API-Key', `apikey ${apiKey}`)
				.set('Authorization', `Bearer ${invalidAccessToken}`)
				.send(body)
		})

		then('I receive an unauthorized HTTP Response Code of 401', () => {
			expect(response.statusCode).toEqual(401)
		})

		and('I receive an error message indicating the problem', () => {
			expect(response.body.message).not.toBeNull()
		})
	}, timeout)

	test('Post authenticate route with valid token', ({ given, and, when, then }) => {
		let endpoint, body, response, validAccessToken

		given('I set /authenticate service api endpoint', () => {
			endpoint = '/authenticate'
		})

		and('I set valid access token', async () => {
			const email = 'authenticate@email.com'
			const password = 'sup3rS3cr3t'
			let user

			const { User } = app.get('db').mongoose
		
			const salt = generateSalt()
			const hash = generateHash(password, salt)

			user = await findOneAndUpdate(User, 'email', {
				email, salt, hash,
				emailVerified: true
			})

			const issuer = app.get('config').issuer
				
			validAccessToken = jwt().sign({ id: user.id }, {
				issuer,
				subject: email, 
				audience: 'audience'
			})
		})

		when('I send a POST HTTP request', async () => {
			response = await request.post(endpoint)
				.set('X-API-Key', `apikey ${apiKey}`)
				.set('Authorization', `Bearer ${validAccessToken}`)
				.send(body)
		})

		then('I receive a valid HTTP Response Code of 200', () => {
			expect(response.statusCode).toEqual(200)
		})

		and('I receive the user data', () => {
			expect(response.body.message).not.toBeNull()
		})
	}, timeout)
})