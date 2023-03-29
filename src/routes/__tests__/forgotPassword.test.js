import supertest from 'supertest'
import createApp, { crypto } from 'lts-server'

const { generateHash, generateSalt } = crypto

const ForgotPasswordFeature = loadFeature('./features/ForgotPassword.feature', { tagFilter: 'not (@unfinished or @excluded)' })
const timeout = 99999
const { insertOrUpdate, findAndDelete } = global.helpers.mongoose

defineFeature(ForgotPasswordFeature, test => {
	const apiKey = 'apiKeyPrefix.apiKeySecret'
	const email = 'forgot@mail.com'
	const password = 'Password1!'
	const salt = generateSalt()
	const hash = generateHash(password, salt)
	let app, request

	beforeAll(async () => {
		app = await createApp()
		request = supertest(app)
	}, timeout)

	test('Post forgot password route with empty params', ({ given, and, when, then }) => {
		let endpoint, body, response

		given('I set /send-code service api endpoint', () => {
			endpoint = '/send-code'
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
	})

	test('Post forgot password route with invalid params', ({ given, and, when, then }) => {
		let endpoint, body, response

		given('I set /send-code service api endpoint', () => {
			endpoint = '/send-code'
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

	test('Post forgot password route with wrong value(s)', ({ given, and, when, then }) => {
		let endpoint, body, response

		given('I set /send-code service api endpoint', () => {
			endpoint = '/send-code'
		})

		and('I set wrong value(s) on request body', () => {
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

	test('Post forgot password route with unexistent email', ({ given, and, when, then }) => {
		let endpoint, body, response

		given('I set /send-code service api endpoint', () => {
			endpoint = '/send-code'
		})

		and('I set unexisting email as part of the request body', async () => {
			const { User } = app.get('db').mongoose

			await findAndDelete(User, 'email', { email })

			body = {
				email
			}
		})

		when('I send a POST HTTP request', async () => {
			response = await request.post(endpoint)
				.set('X-API-Key', `apikey ${apiKey}`)
				.send(body)
		})

		then('I receive a valid HTTP Response Code of "200"', () => {
			expect(response.statusCode).toEqual(200)
		})

		and('I receive a success message', () => {
			expect(response.body.message).not.toBeNull()
		})
	}, timeout)

	test('Post forgot password route with existing but unverified email', ({ given, and, when, then }) => {
		let endpoint, body, response

		given('I set /send-code service api endpoint', () => {
			endpoint = '/send-code'
		})

		and('I set existing but unverified email as part of the request body', async () => {
			const { User } = app.get('db').mongoose

			await insertOrUpdate(User, 'email', { email, salt, hash, emailVerified: false })

			body = {
				email
			}
		})

		when('I send a POST HTTP request', async () => {
			response = await request.post(endpoint)
				.set('X-API-Key', `apikey ${apiKey}`)
				.send(body)
		})

		then('I receive a valid HTTP Response Code of "200"', () => {
			expect(response.statusCode).toEqual(200)
		})

		and('I receive a success message', () => {
			expect(response.body.message).not.toBeNull()
		})
	}, timeout)

	test('Post forgot password route with existing and verified email', ({ given, and, when, then }) => {
		let endpoint, body, response

		given('I set /send-code service api endpoint', () => {
			endpoint = '/send-code'
		})

		and('I set existing and verified email as part of the request body', async () => {
			const { User } = app.get('db').mongoose

			await insertOrUpdate(User, 'email', { email, salt, hash, emailVerified: true })

			body = {
				email
			}
		})

		when('I send a POST HTTP request', async () => {
			response = await request.post(endpoint)
				.set('X-API-Key', `apikey ${apiKey}`)
				.send(body)
		})

		then('I receive a valid HTTP Response Code of "200"', () => {
			expect(response.statusCode).toEqual(200)
		})

		and('I receive a success message', () => {
			expect(response.body.message).not.toBeNull()
		})
	}, timeout)
})