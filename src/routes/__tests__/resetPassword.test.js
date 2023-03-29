import supertest from 'supertest'
import createApp, { crypto, jwt } from 'lts-server'

const { generateHash, generateSalt } = crypto

const ResetPasswordFeature = loadFeature('./features/ResetPassword.feature', { tagFilter: 'not (@unfinished or @excluded)' })
const timeout = 99999
const { findOneAndUpdate } = global.helpers.mongoose

defineFeature(ResetPasswordFeature, test => {
	const apiKey = 'apiKeyPrefix.apiKeySecret'
	const email = 'resetPassword@email.com'
	const password = 'sup3rS3cr3t'
	let app, request, accessToken, user

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

	test('Post reset password route with invalid access token', ({ given, and, when, then }) => {
		let endpoint, body, response, invalidAccessToken

		given('I set /reset-password service api endpoint', () => {
			endpoint = '/reset-password'
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

		then('I receive an unauthorized HTTP Response Code of "401"', () => {
			expect(response.statusCode).toEqual(401)
		})

		and('I receive an error message indicating the problem', () => {
			expect(response.body.message).not.toBeNull()
		})
	}, timeout)
	
	test('Post reset password route with empty params', ({ given, and, when, then }) => {
		let endpoint, body, response

		given('I set /reset-password service api endpoint', () => {
			endpoint = '/reset-password'
		})

		and('I set empty params on request body', () => {
			body = null
		})

		when('I send a POST HTTP request', async () => {
			response = await request.post(endpoint)
				.set('X-API-Key', `apikey ${apiKey}`)
				.set('Authorization', `Bearer ${accessToken}`)
				.send(body)
		})

		then('I receive an bad request HTTP Response Code of "400"', (arg0) => {
			expect(response.statusCode).toEqual(400)
		})

		and('I receive an error message indicating the problem', () => {
			expect(response.body.message).not.toBeNull()
		})
	}, timeout)

	test('Post reset password route with invalid params', ({ given, and, when, then }) => {
		let endpoint, body, response

		given('I set /reset-password service api endpoint', () => {
			endpoint = '/reset-password'
		})

		and('I set invalid params on request body', () => {
			body = {
				mail: 'test'
			}
		})

		when('I send a POST HTTP request', async () => {
			response = await request.post(endpoint)
				.set('X-API-Key', `apikey ${apiKey}`)
				.set('Authorization', `Bearer ${accessToken}`)
				.send(body)
		})

		then('I receive an bad request HTTP Response Code of "400"', () => {
			expect(response.statusCode).toEqual(400)
		})

		and('I receive an error message indicating the problem', () => {
			expect(response.body.message).not.toBeNull()
		})
	}, timeout)

	test('Post reset password route with invalid email format', ({ given, and, when, then }) => {
		let endpoint, body, response

		given('I set /reset-password service api endpoint', () => {
			endpoint = '/reset-password'
		})

		and('I set invalid email format on request body', () => {
			body = {
				email: 'test'
			}
		})

		when('I send a POST HTTP request', async () => {
			response = await request.post(endpoint)
				.set('X-API-Key', `apikey ${apiKey}`)
				.set('Authorization', `Bearer ${accessToken}`)
				.send(body)
		})

		then('I receive an bad request HTTP Response Code of "400"', () => {
			expect(response.statusCode).toEqual(400)
		})

		and('I receive an error message indicating the problem', () => {
			expect(response.body.message).not.toBeNull()
		})
	}, timeout)

	test('Post reset password route with wrong user email', ({ given, and, when, then }) => {
		let endpoint, body, response

		given('I set /reset-password service api endpoint', () => {
			endpoint = '/reset-password'
		})

		and('I set wrong user email on request body', () => {
			body = {
				email: 'bad@email.com',
				newPassword: `${password}plus`
			}
		})

		when('I send a POST HTTP request', async () => {
			response = await request.post(endpoint)
				.set('X-API-Key', `apikey ${apiKey}`)
				.set('Authorization', `Bearer ${accessToken}`)
				.send(body)
		})

		then('I receive an unauthorized HTTP Response Code of "401"', () => {
			expect(response.statusCode).toEqual(401)
		})

		and('I receive an error message indicating the problem', () => {
			expect(response.body.message).not.toBeNull()
		})
	}, timeout)

	test('Post reset password route with valid value(s)', ({ given, and, when, then }) => {
		let endpoint, body, response

		given('I set /reset-password service api endpoint', () => {
			endpoint = '/reset-password'
		})

		and('I set valid value(s) on request body', () => {
			body = {
				email,
				newPassword: `${password}plus`
			}
		})

		when('I send a POST HTTP request', async () => {
			response = await request.post(endpoint)
				.set('X-API-Key', `apikey ${apiKey}`)
				.set('Authorization', `Bearer ${accessToken}`)
				.send(body)
		})

		then('I receive a valid HTTP Response Code of "200"', () => {
			expect(response.statusCode).toEqual(200)
		})

		and('I get updated values from the user', async () => {
			const { User } = app.get('db').mongoose
			const user = await User.findOne({ email })

			expect(user.hash).toEqual(generateHash(`${password}plus`, user.salt))
		})
	}, timeout)
})