import supertest from 'supertest'
import createApp, { crypto } from 'lts-server'

const { generateHash, generateSalt, generateSecureCode } = crypto

const EmailVerifyFeature = loadFeature('./features/EmailVerify.feature', { tagFilter: 'not (@unfinished or @excluded)' })
const timeout = 99999
const { insertOrUpdate } = global.helpers.mongoose

defineFeature(EmailVerifyFeature, test => {
	const apiKey = 'apiKeyPrefix.apiKeySecret'
	const email = 'emailVerify@email.com'
	const password = 'sup3rS3cr3t'
	let app, request, secureCode

	beforeAll(async () => {
		app = await createApp()
		request = supertest(app)

		const { User } = app.get('db').mongoose
		
		secureCode = generateSecureCode()

		const salt = generateSalt()
		const hash = generateHash(password, salt)

		await insertOrUpdate(User, 'email', {
			email, salt, hash,
			emailVerified: false,
			secureCode
		})
	}, timeout)

	test('Post email verify route with empty params', ({ given, and, when, then }) => {
		let endpoint, body, response

		given('I set /email-verify service api endpoint', () => {
			endpoint = '/email-verify'
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

	test('Post email verify route with invalid params', ({ given, and, when, then }) => {
		let endpoint, body, response

		given('I set /email-verify service api endpoint', () => {
			endpoint = '/email-verify'
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

	test('Post email verify route with invalid email format', ({ given, and, when, then }) => {
		let endpoint, body, response

		given('I set /email-verify service api endpoint', () => {
			endpoint = '/email-verify'
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
	}, timeout)

	test('Post email verify route with wrong <case>', ({ given, and, when, then }) => {
		let endpoint, body, response

		given('I set /email-verify service api endpoint', () => {
			endpoint = '/email-verify'
		})

		and(/^I set (.*) & (.*) on request body$/, (email, secureCode) => {
			body = { email, secureCode }
		})

		and(/^I set secure expiration date based on (.*)$/, async (isSecureCodeExpired) => {
			const config = app.get('config')
			const { User } = app.get('db').mongoose
			const currentDate = new Date()
			const secureCodeExpDate = new Date(currentDate.getTime() + (((isSecureCodeExpired == 'true') ? -1 : 1) * 60000 * config.codeExpInMinutes))
			
			await insertOrUpdate(User, 'email', { email, secureCodeExpDate })
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
	}, timeout)

	test('Post email verify route with valid value(s)', ({ given, and, when, then }) => {
		let endpoint, body, response

		given('I set /email-verify service api endpoint', () => {
			endpoint = '/email-verify'
		})

		and('I set a secure code with valid expiration date', async () => {
			const config = app.get('config')
			const { User } = app.get('db').mongoose
			const currentDate = new Date()
			const secureCodeExpDate = new Date(currentDate.getTime() + (config.codeExpInMinutes * 60000))

			await insertOrUpdate(User, 'email', { email, emailVerified: false, secureCodeExpDate })	
		})

		and('I set valid value(s) on request body', () => {
			body = { email, secureCode }
		})

		when('I send a POST HTTP request', async () => {
			response = await request.post(endpoint)
				.set('X-API-Key', `apikey ${apiKey}`)
				.send(body)
		})

		then('I receive a valid HTTP Response Code of "200"', () => {
			expect(response.statusCode).toEqual(200)
		})

		and('I receive a verified user email', () => {
			expect(response.body.result).toMatchObject({ 
				email, 
				emailVerified: true
			})
		})
	}, timeout)
})