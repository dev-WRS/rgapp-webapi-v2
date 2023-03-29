import supertest from 'supertest'
import createApp, { crypto, jwt } from 'lts-server'

const { generateHash, generateSalt } = crypto

const UserFeature = loadFeature('./features/User.feature', { tagFilter: 'not (@unfinished or @excluded)' })
const timeout = 99999
const { findOne, findOneAndUpdate, findAndDelete } = global.helpers.mongoose

defineFeature(UserFeature, test => {
	const apiKey = 'apiKeyPrefix.apiKeySecret'
	
	let app, request, accessToken, authUser, validUserId

	const name = 'Test User'
	const email = 'tuser@email.com'
	const phone = '(910) 799-3011'

	beforeAll(async () => {
		app = await createApp()
		request = supertest(app)

		const { User, Role } = app.get('db').mongoose
		
		const email = 'user@email.com'
		const password = 'sup3rS3cr3t'
		const salt = generateSalt()
		const hash = generateHash(password, salt)

		const role = await Role.findOne({ key: 'admin' })

		authUser = await findOneAndUpdate(User, 'email', {
			email, salt, hash,
			emailVerified: true,
			role: role.id
		})

		const issuer = app.get('config').issuer
			
		accessToken = jwt().sign({ id: authUser.id }, {
			issuer,
			subject: email, 
			audience: 'audience'
		})
	}, timeout)

	test('Get available actions with invalid access token', ({ given, and, when, then }) => {
		let endpoint, response, invalidAccessToken

		given('I set /user/actions service api endpoint', () => {
			endpoint = '/users/actions'
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

	test('Get available actions with valid access token', ({ given, when, then, and }) => {
		let endpoint, response

		given('I set /user/actions service api endpoint', () => {
			endpoint = '/users/actions'
		})

		when('I send a GET HTTP request', async () => {
			response = await request.get(endpoint)
				.set('X-API-Key', `apikey ${apiKey}`)
				.set('Authorization', `Bearer ${accessToken}`)	
		})

		then('I receive a valid HTTP Response Code of "200"', () => {
			expect(response.statusCode).toEqual(200)	
		})

		and('I get a list of user actions', () => {
			expect(response.body.result).not.toBeNull()	
		})
	})

	test('Get available users with invalid access token', ({ given, and, when, then }) => {
		let endpoint, response, invalidAccessToken

		given('I set /users service api endpoint', () => {
			endpoint = '/users'
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

	test('Get available users with valid access token', ({ given, and, when, then }) => {
		let endpoint, response

		given('I set /users service api endpoint', () => {
			endpoint = '/users'
		})

		when('I send a GET HTTP request', async () => {
			response = await request.get(endpoint)
				.set('X-API-Key', `apikey ${apiKey}`)
				.set('Authorization', `Bearer ${accessToken}`)
		})

		then('I receive a valid HTTP Response Code of "200"', () => {
			expect(response.statusCode).toEqual(200)
		})

		and('I get a list of all users', async () => {
			expect(response.body.result).not.toBeNull()
		})
	}, timeout)

	test('Add a valid user', ({ given, when, then, and }) => {
		let endpoint, response, user, role

		given('I set /users service api endpoint', () => {
			endpoint = '/users'
		})

		and('I set the user info', async () => {
			const { Role } = app.get('db').mongoose
			role = await findOne(Role, 'name', { name: 'Admin' })
			
			user = {
				name,
				email,
				phone,
				role: role.id,
				createdBy: authUser.id
			}
		})

		when('I send a POST HTTP request', async () => {
			const { User } = app.get('db').mongoose
			await findAndDelete(User, 'name', { name })

			response = await request.post(endpoint)
				.set('X-API-Key', `apikey ${apiKey}`)
				.set('Authorization', `Bearer ${accessToken}`)
				.send(user)
		})

		then('I receive a valid HTTP Response Code of "200"', () => {
			expect(response.statusCode).toEqual(200)
		})

		and('I receive the created user', () => {
			expect(response.body.result.message).toEqual('An invitation email has been sent to the user\'s mailbox containing a security code to confirm their address.')
		})
	}, timeout)

	test('Get user with valid id', ({ given, when, then, and }) => {
		let endpoint, response

		given('I set /users/:id service api endpoint', () => {
			endpoint = '/users/:id '
		})

		and('I set a valid user id', async () => {
			const { User } = app.get('db').mongoose
			const user = await User.find()

			validUserId = user[0].id

			endpoint = endpoint.replace(/:id/i, validUserId)
		})

		when('I send a GET HTTP request', async () => {
			response = await request.get(endpoint)
				.set('X-API-Key', `apikey ${apiKey}`)
				.set('Authorization', `Bearer ${accessToken}`)
		})

		then('I receive a valid HTTP Response Code of "200"', () => {
			expect(response.statusCode).toEqual(200)
		})

		and('I get a user with same id', async () => {
			expect(response.body.result.id).toEqual(validUserId)
		})
	}, timeout)

	test('Update a valid user', ({ given, when, then, and }) => {
		const newName = name  
		const body = {}
		let endpoint, response, user

		given('I set /users/:id service api endpoint', () => {
			endpoint = '/users/:id'
		})

		and('I have an specific user', async () => {
			const { User } = app.get('db').mongoose
			user = await User.create({ name, email: 'update' + email, phone, createdBy: authUser.id })

			endpoint = endpoint.replace(/:id/i, user.id)
		})

		and('I set a new user name', () => {
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
			const { User } = app.get('db').mongoose
			await findAndDelete(User, 'email', { email: 'update' + email })
		})

		and('I receive the updated user', () => {
			expect(response.body.result).toMatchObject(expect.objectContaining({
				id: user.id,
				name: body.name,
				email: 'update' + email, 
				phone, 
				active: false,
				emailVerified: false
			}))
		})
	}, timeout)

	test('Activate a valid user', ({ given, when, then, and }) => {
		let endpoint, response, user

		given('I set /users/:id/activate service api endpoint', () => {
			endpoint = '/users/:id/activate'
		})

		and('I have an specific user', async () => {
			const { User } = app.get('db').mongoose
			user = await User.create({ name, email: 'active' + email, phone, createdBy: authUser.id })

			endpoint = endpoint.replace(/:id/i, user.id)
		})

		when('I send a PUT HTTP request', async () => {
			response = await request.put(endpoint)
				.set('X-API-Key', `apikey ${apiKey}`)
				.set('Authorization', `Bearer ${accessToken}`)
		})

		then('I receive a valid HTTP Response Code of "200"', async () => {
			expect(response.statusCode).toEqual(200)
			const { User } = app.get('db').mongoose
			await findAndDelete(User, 'email', { email: 'active' + email })
		})

		and('I receive the activated user', () => {
			expect(response.body.result).toMatchObject(expect.objectContaining({
				id: user.id,
				name,
				email: 'active' + email, 
				phone, 
				active: true,
				emailVerified: false
			}))
		})
	}, timeout)

	test('Deactivate a valid user', ({ given, when, then, and }) => {
		let endpoint, response, user

		given('I set /users/:id/deactivate service api endpoint', () => {
			endpoint = '/users/:id/deactivate'
		})

		and('I have an specific user', async () => {
			const { User } = app.get('db').mongoose
			user = await User.create({ name, email: 'inactive' + email, phone, createdBy: authUser.id })

			endpoint = endpoint.replace(/:id/i, user.id)
		})

		when('I send a PUT HTTP request', async () => {
			response = await request.put(endpoint)
				.set('X-API-Key', `apikey ${apiKey}`)
				.set('Authorization', `Bearer ${accessToken}`)
		})

		then('I receive a valid HTTP Response Code of "200"', async () => {
			expect(response.statusCode).toEqual(200)
			const { User } = app.get('db').mongoose
			await findAndDelete(User, 'email', { email: 'inactive' + email })
		})

		and('I receive the deactivated user', () => {
			expect(response.body.result).toMatchObject(expect.objectContaining({
				id: user.id,
				name,
				email: 'inactive' + email, 
				phone, 
				active: false,
				emailVerified: false
			}))
		})
	}, timeout)

	test('Delete a valid user', ({ given, and, when, then }) => {
		let endpoint, response, user

		given('I set /users/:id service api endpoint', () => {
			endpoint = '/users/:id'
		})

		and('I have an specific user', async () => {
			const { User } = app.get('db').mongoose
			user = await User.create({ name, email: 'delete' + email , phone, createdBy: authUser.id })

			endpoint = endpoint.replace(/:id/i, user.id)
		})

		when('I send a DELETE HTTP request', async () => {
			response = await request.delete(endpoint)
				.set('X-API-Key', `apikey ${apiKey}`)
				.set('Authorization', `Bearer ${accessToken}`)
		})

		then('I receive a valid HTTP Response Code of "200"', async () => {
			expect(response.statusCode).toEqual(200)
			const { User } = app.get('db').mongoose
			await findAndDelete(User, 'email', { email: 'delete' + email })
		})

		and('I receive the deleted user id', () => {
			expect(response.body.result).toMatchObject(expect.objectContaining({
				id: user.id
			}))
		})
	}, timeout)
})