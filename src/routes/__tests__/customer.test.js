import supertest from 'supertest'
import createApp, { crypto, jwt } from 'lts-server'

const { generateHash, generateSalt } = crypto

const CustomerFeature = loadFeature('./features/Customer.feature', { tagFilter: 'not (@unfinished or @excluded)' })
const timeout = 99999
const { findOneAndUpdate, findAndDelete } = global.helpers.mongoose

defineFeature(CustomerFeature, test => {
	const apiKey = 'apiKeyPrefix.apiKeySecret'
	const email = 'customer@email.com'
	const password = 'sup3rS3cr3t'
	const bucket = 's3bucket'
	const key = 's3key'
	let app, request, accessToken, user

	const name = 'Coastal Beverage Company, Inc.'
	const address = '461 N Corporate Drive, Wilmington, NC 28401'
	const phone = '9107993011'
	const primaryColor = 'afeeee'
	const logo = '6290ee255e8d0151627c4b98'

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

	test('Get available customers with invalid access token', ({ given, and, when, then }) => {
		let endpoint, response, invalidAccessToken

		given('I set /customers service api endpoint', () => {
			endpoint = '/customers'
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

	test('Get available customers with valid access token', ({ given, and, when, then }) => {
		let endpoint, response

		given('I set /customers service api endpoint', () => {
			endpoint = '/customers'
		})

		when('I send a GET HTTP request', async () => {
			response = await request.get(endpoint)
				.set('X-API-Key', `apikey ${apiKey}`)
				.set('Authorization', `Bearer ${accessToken}`)
		})

		then('I receive a valid HTTP Response Code of "200"', () => {
			expect(response.statusCode).toEqual(200)
		})

		and('I get a list of all customers', async () => {
			expect(response.body.result).not.toBeNull()
		})
	}, timeout)

	test.skip('Add a valid customer', ({ given, when, then, and }) => {
		let endpoint, response, customer

		given('I set /customers service api endpoint', () => {
			endpoint = '/customers'
		})

		and('I set the customer info', async () => {			
			customer = {
				name,
				address,
				phone,
				brand: {
					logo: {
						name: 'Coastal Beverage Company, Inc. - Logo.png',
						format: 'png',
						size: '27 KB',
						bucket, key
					},
					theme: {
						colors: {
							primary: '323251',
							secondary: 'FFF'
						}
					}
				}
			}
		})

		when('I send a POST HTTP request', async () => {
			const { Customer } = app.get('db').mongoose
			await findAndDelete(Customer, 'name', { name })

			response = await request.post(endpoint)
				.set('X-API-Key', `apikey ${apiKey}`)
				.set('Authorization', `Bearer ${accessToken}`)
				.send(customer)
		})

		then('I receive a valid HTTP Response Code of "200"', async () => {
			expect(response.statusCode).toEqual(200)
			const { Customer } = app.get('db').mongoose
			await findAndDelete(Customer, 'name', { name })
		})

		and('I receive the created customer', () => {
			expect(response.body.result).toMatchObject(expect.objectContaining({
				id: expect.anything(),
				name,
				address,
				phone,
				brand: {
					logo: expect.anything(),
					theme: {
						colors: {
							primary: '323251',
							secondary: 'FFF'
						}
					}
				},
				createdBy: user.id
			}))
		})
	}, timeout)

	test('Get customer with valid id', ({ given, when, then, and }) => {
		let endpoint, response, customer

		given('I set /customers/:id service api endpoint', () => {
			endpoint = '/customers/:id '
		})

		and('I set a valid customer id', async () => {
			const { Customer } = app.get('db').mongoose
			customer = await Customer.create({ name: '[GET] ' + name, address, phone, primaryColor, logo, createdBy: user.id })

			endpoint = endpoint.replace(/:id/i, customer.id)
		})

		when('I send a GET HTTP request', async () => {
			response = await request.get(endpoint)
				.set('X-API-Key', `apikey ${apiKey}`)
				.set('Authorization', `Bearer ${accessToken}`)
		})

		then('I receive a valid HTTP Response Code of "200"', async () => {
			expect(response.statusCode).toEqual(200)
			const { Customer } = app.get('db').mongoose
			await findAndDelete(Customer, 'name', { name: customer.name })
		})

		and('I get a customer with same id', async () => {
			expect(response.body.result.id).toEqual(customer.id)
		})
	}, timeout)

	test.skip('Update a valid customer', ({ given, when, then, and }) => {
		const newName = '[NEW] ' + name  
		const body = {}
		let endpoint, response, customer

		given('I set /customers/:id service api endpoint', () => {
			endpoint = '/customers/:id'
		})

		and('I have an specific customer', async () => {
			const { Customer } = app.get('db').mongoose
			customer = await Customer.create({ name: '[UPDATE] ' + name, address, phone, primaryColor, logo, createdBy: user.id })

			endpoint = endpoint.replace(/:id/i, customer.id)
		})

		and('I set a new customer name', () => {
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
			const { Customer } = app.get('db').mongoose
			await findAndDelete(Customer, 'name', { name: newName })
		})

		and('I receive the updated customer', () => {
			expect(response.body.result).toMatchObject(expect.objectContaining({
				id: customer.id,
				name: body.name,
				address, 
				phone,
				createdBy: user.id
			}))
		})
	}, timeout)

	test('Delete a valid customer', ({ given, and, when, then }) => {
		let endpoint, response, customer

		given('I set /customers/:id service api endpoint', () => {
			endpoint = '/customers/:id'
		})

		and('I have an specific customer', async () => {
			const { Customer } = app.get('db').mongoose
			customer = await Customer.create({ name: '[DELETE] ' + name, address, phone, primaryColor, logo, createdBy: user.id })

			endpoint = endpoint.replace(/:id/i, customer.id)
		})

		when('I send a DELETE HTTP request', async () => {
			response = await request.delete(endpoint)
				.set('X-API-Key', `apikey ${apiKey}`)
				.set('Authorization', `Bearer ${accessToken}`)
		})

		then('I receive a valid HTTP Response Code of "200"', async () => {
			expect(response.statusCode).toEqual(200)
			const { Customer } = app.get('db').mongoose
			await findAndDelete(Customer, 'name', { name: customer.name })
		})

		and('I receive the deleted customer id', () => {
			expect(response.body.result).toMatchObject(expect.objectContaining({
				id: customer.id
			}))
		})
	}, timeout)
})