import supertest from 'supertest'
import createApp, { crypto } from 'lts-server'

const { generateHash, generateSalt } = crypto

const LoginFeature = loadFeature('./features/Login.feature', { tagFilter: 'not (@unfinished or @excluded)' })
const timeout = 99999
const { insertOrUpdate } = global.helpers.mongoose

defineFeature(LoginFeature, test => {
	const apiKey = 'apiKeyPrefix.apiKeySecret'
	const email = 'login@email.com'
	const password = 'sup3rS3cr3t'
	let app, request

	beforeAll(async () => {
		app = await createApp()
		request = supertest(app)

		const { User } = app.get('db').mongoose
		
		const salt = generateSalt()
		const hash = generateHash(password, salt)

		await insertOrUpdate(User, 'email', {
			email, salt, hash,
			emailVerified: false
		})
	}, timeout)

	test('Post login route with empty params', ({ given, and, when, then }) => {
		let endpoint, body, response

		given('I set /login service api endpoint', () => {
			endpoint = '/login'
		})

		and('I set empty params on request body', () => {
			body = null
		})

		when('I send a POST HTTP request', async () => {
			response = await request.post(endpoint)
				.set('X-API-Key', `apikey ${apiKey}`)
				.send(body)
		})

		then('I receive an bad request HTTP Response Code of "400"', () => {
			expect(response.statusCode).toEqual(400)
		})

		and('I receive an error message indicating the problem', () => {
			expect(response.body.message).not.toBeNull()
		})
	}, timeout)

	test('Post login route with invalid params', ({ given, and, when, then }) => {
		let endpoint, body, response

		given('I set /login service api endpoint', () => {
			endpoint = '/login'
		})

		and('I set invalid params on request body', () => {
			body = {
				mail: 'test'
			}
		})

		when('I send a POST HTTP request', async () => {
			response = await request.post(endpoint)
				.set('X-API-Key', `apikey ${apiKey}`)
				.send(body)
		})

		then('I receive an bad request HTTP Response Code of "400"', () => {
			expect(response.statusCode).toEqual(400)
		})

		and('I receive an error message indicating the problem', () => {
			expect(response.body.message).not.toBeNull()
		})
	}, timeout)

	test('Post login route with invalid email format', ({ given, and, when, then }) => {
		let endpoint, body, response

		given('I set /login service api endpoint', () => {
			endpoint = '/login'
		})

		and('I set invalid email format on request body', () => {
			body = {
				email: 'test'
			}
		})

		when('I send a POST HTTP request', async () => {
			response = await request.post(endpoint)
				.set('X-API-Key', `apikey ${apiKey}`)
				.send(body)	
		})

		then('I receive an bad request HTTP Response Code of "400"', () => {
			expect(response.statusCode).toEqual(400)	
		})

		and('I receive an error message indicating the problem', () => {
			expect(response.body.message).not.toBeNull()
		})
	})

	test('Post login route with wrong <case>', ({ given, and, when, then }) => {
		let endpoint, body, response

		given('I set /login service api endpoint', () => {
			endpoint = '/login'
		})

		and(/^I set credentials value\(s\) on request body (.*) & (.*)$/, (email, password) => {
			body = { email, password }
		})

		and(/^I set user email verified as (.*)$/, async (emailVerified) => {
			const { User } = app.get('db').mongoose

			await insertOrUpdate(User, 'email', { email, emailVerified })
		})

		when('I send a POST HTTP request', async () => {
			response = await request.post(endpoint)
				.set('X-API-Key', `apikey ${apiKey}`)
				.send(body)
		})

		then('I receive an unauthorized HTTP Response Code of "401"', () => {
			expect(response.statusCode).toEqual(401)
		})

		and('I receive an error message indicating the problem', () => {
			expect(response.body.message).not.toBeNull()
		})
	})

	test('Post login route with valid credentials', ({ given, and, when, then }) => {
		let endpoint, body, response

		given('I set /login service api endpoint', () => {
			endpoint = '/login'
		})

		and('I set valid credentials on request body', () => {
			body = { email, password }
		})

		when('I send a POST HTTP request', async () => {
			const { User } = app.get('db').mongoose

			await insertOrUpdate(User, 'email', { email, emailVerified: true })
			response = await request.post(endpoint)
				.set('X-API-Key', `apikey ${apiKey}`)
				.send(body)
		})

		then('I receive a valid HTTP Response Code of "200"', () => {
			expect(response.statusCode).toEqual(200)
		})

		and('I receive the user data', () => {
			expect(response.body.result).toMatchObject({ 
				email, 
				token: expect.anything()
			})
		})
	}, timeout)
})