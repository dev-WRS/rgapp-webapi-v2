import supertest from 'supertest'
import createApp, { jwt } from 'lts-server'

const RootFeature = loadFeature('./features/Root.feature', { tagFilter: 'not (@unfinished or @excluded)' })
const timeout = 99999

defineFeature(RootFeature, test => {
	let app, request

	beforeAll(async () => {
		app = await createApp()
		request = supertest(app)
	}, timeout)

	test('Get root route without api key', ({ given, when, then }) => {
		let response

		when('a client performs a get method to root route', async () => {
			response = await request.get('/')
		})

		then('it should receive a "401" status code response', () => {
			expect(String(response.statusCode)).toEqual('401')
		})
	}, timeout)

	test('Get root route with invalid api key', ({ given, when, then }) => {
		let apiKey, response

		given('a invalid api key', () => {
			apiKey = 'Invalid api key'
		})

		when('a client performs a get method to root route', async () => {
			response = await request.get('/')
				.set('X-API-Key', `apikey ${apiKey}`)
		})

		then('it should receive a "401" status code response', () => {
			expect(String(response.statusCode)).toEqual('401')	
		})
	}, timeout)

	test('Get root route with valid api key', ({ given, when, then }) => {
		const apiKeyPrefix = 'apiKeyPrefix'
		const apiKeySuffix = 'apiKeySecret'

		let apiKey, response

		given('a valid api key', () => {
			apiKey = `${apiKeyPrefix}.${apiKeySuffix}`
		})

		when('a client performs a get method to root route', async () => {
			response = await request.get('/')
				.set('X-API-Key', `apikey ${apiKey}`)
		})

		then('it should receive a "200" status code response', () => {
			expect(String(response.statusCode)).toEqual('200')
		})
	}, timeout)

	test('Get jwt route without access token', ({ given, when, then }) => {
		let response

		when('a client performs a get method to root route', async () => {
			response = await request.get('/jwt')
		})

		then('it should receive a "401" status code response', () => {
			expect(String(response.statusCode)).toEqual('401')
		})
	}, timeout)

	test('Get jwt route with invalid access token', ({ given, when, then }) => {
		let accessToken, response

		given('a invalid access token', () => {
			accessToken = 'Invalid token'
		})

		when('a client performs a get method to root route', async () => {
			response = await request.get('/jwt')
				.set('Authorization', `Bearer ${accessToken}`)
		})

		then('it should receive a "401" status code response', () => {
			expect(String(response.statusCode)).toEqual('401')
		})
	}, timeout)

	test('Get jwt route with valid access token', ({ given, when, then }) => {
		let accessToken, response

		given('a valid access token', () => {
			const issuer = app.get('config').issuer
			
			accessToken = jwt().sign({ id: 1 }, {
				issuer,
				subject: 'user@email.com', 
				audience: 'audience'
			})
		})

		when('a client performs a get method to root route', async () => {
			response = await request.get('/jwt')
				.set('Authorization', `Bearer ${accessToken}`)
		})

		then('it should receive a "200" status code response', () => {
			expect(String(response.statusCode)).toEqual('200')
		})
	}, timeout)
})