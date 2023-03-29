import supertest from 'supertest'
import createApp, { crypto, jwt } from 'lts-server'

const { generateHash, generateSalt } = crypto

const ProjectFeature = loadFeature('./features/Project.feature', { tagFilter: 'not (@unfinished or @excluded)' })
const timeout = 99999
const { findOneAndUpdate, findAndDelete } = global.helpers.mongoose

defineFeature(ProjectFeature, test => {
	const apiKey = 'apiKeyPrefix.apiKeySecret'
	const email = 'project@email.com'
	const password = 'sup3rS3cr3t'
	// const bucket = 's3bucket'
	// const key = 's3key'
	let app, request, accessToken, user

	// const projectID = '13808958'
	const name = 'Larimer County, CO 2021'
	const taxYear = '2021'
	const legalEntity = 'Bryan Construction, Inc'
	const state = 'CO'
	const inspectionDate = '3/9-3/10/2022'
	const reportType = '179D'
	const software = 'eQuest 3.65'
	const buildings = [{
		name: 'Larimer County E. O. Center',
		address: '4872 Endeavor Drive, 1st Foor Johnstown, CO 80534',
		type: 'County',
		qualifyingCategories: ['Whole Building'],
		area: '11000',
		rate: '180',
		method: 'Permanent'
	}, {
		name: 'LC Horsetooth Res. Guest Cabins',
		address: '4200 W. County Road 38E Fort Collins, CO 80526',
		type: 'County',
		qualifyingCategories: ['HVAC', 'Lighting'],
		area: '2500',
		rate: '180',
		method: 'Permanent'
	}]

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

	test('Get available projects with invalid access token', ({ given, and, when, then }) => {
		let endpoint, response, invalidAccessToken

		given('I set /projects service api endpoint', () => {
			endpoint = '/projects'
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

	test('Get available projects with valid access token', ({ given, and, when, then }) => {
		let endpoint, response

		given('I set /projects service api endpoint', () => {
			endpoint = '/projects'
		})

		when('I send a GET HTTP request', async () => {
			response = await request.get(endpoint)
				.set('X-API-Key', `apikey ${apiKey}`)
				.set('Authorization', `Bearer ${accessToken}`)
		})

		then('I receive a valid HTTP Response Code of "200"', () => {
			expect(response.statusCode).toEqual(200)
		})

		and('I get a list of all projects', async () => {
			expect(response.body.result).not.toBeNull()
		})
	}, timeout)

	test('Get project with valid id', ({ given, when, then, and }) => {
		const projectID = '13808960'
		let endpoint, response, project

		given('I set /projects/:id service api endpoint', () => {
			endpoint = '/projects/:id '
		})

		and('I set a valid project id', async () => {
			const { Project } = app.get('db').mongoose
			project = await Project.create({ projectID, name: '[GET] ' + name, taxYear, legalEntity, state, inspectionDate, reportType, software, buildings, createdBy: user.id })

			endpoint = endpoint.replace(/:id/i, project.id)
		})

		when('I send a GET HTTP request', async () => {
			response = await request.get(endpoint)
				.set('X-API-Key', `apikey ${apiKey}`)
				.set('Authorization', `Bearer ${accessToken}`)
		})

		then('I receive a valid HTTP Response Code of "200"', async () => {
			expect(response.statusCode).toEqual(200)
			const { Project } = app.get('db').mongoose
			await findAndDelete(Project, 'name', { name: project.name })
		})

		and('I get a project with same id', async () => {
			expect(response.body.result.id).toEqual(project.id)
		})
	}, timeout)

	test('Add a valid 45L project', ({ given, when, then, and }) => {
		let endpoint, response, project, customer, certifier

		const customerName = 'Coastal Beverage Company, Inc.'
		const customerAddress = '461 N Corporate Drive, Wilmington, NC 28401'
		const customerPhone = '9107993011'
		const customerColor = 'afeeee'
		const logo = '6290ee255e8d0151627c4b98'

		const certifierName = 'Juana Ali, PhD'
		const certifieAddress = '1225 Broken Sound Parkway NW Ste C, Boca Raton, FL 33487'
		const certifiePhone = '8006621793'
		const signature = '6290ee255e8d0151627c4b98'

		const projectID = '1234567890'
		const name = 'Home Builders'
		const taxYear = '2021'
		const legalEntity = 'Home Builder at Sample, LLC'
		const state = 'MD'
		const inspectionDate = '05/10/2022'
		const reportType = '45L'
		const dwellingUnitName = 'Wormald Homes'
		const dwellingUnitAddress = ''
		const totalDwellingUnits = 10

		const dwellingUnits = [{	
			model: 'Crawford 21770',  
			address: '11112 Fen View Lane , Monrovia, MD 21770'
		}, {
			model: 'Crawford 21770',  
			address: '11118 Fen View Lane , Monrovia, MD 21770'
		}, {
			model: 'Crawford 21770',  
			address: '11122 Fen View Lane , Monrovia, MD 21770'
		}, {
			model: 'Crawford 21770',  
			address: '4744 Plum Road , Monrovia, MD 21770'
		}, {
			model: 'Crawford 21770',  
			address: '4754 Plum Road , Monrovia, MD 21770'
		}, {
			model: 'Crawford 21770',  
			address: '4756 Plum Road , Monrovia, MD 21770'
		}, {
			model: 'Crawford 21770',  
			address: '4804 Siding Court , Monrovia, MD 21770'
		}, {
			model: 'Crawford C 21770',  
			address: '11059 Emerald Crown Drive , Monrovia, MD 21770'
		}, {
			model: 'Eastwood 21770',  
			address: '4732 Plum Road , Monrovia, MD 21770'
		}, {
			model: 'Eastwood D 21770',  
			address: '4703 Monrovia Blvd , Monrovia, MD 21770'
		}]

		given('I set /projects service api endpoint', () => {
			endpoint = '/projects'
		})

		and('I set the project info', async () => {	
			const { Customer, Certifier, Project } = app.get('db').mongoose
			
			customer = await Customer.create({ name: customerName, address: customerAddress, phone: customerPhone, primaryColor: customerColor, logo, createdBy: user.id })
			certifier = await Certifier.create({ name: certifierName, address: certifieAddress, phone: certifiePhone, signature, createdBy: user.id })

			await findAndDelete(Project, 'projectID', { projectID })

			project = {
				projectID,
				name,
				taxYear,
				legalEntity,
				state,
				inspectionDate,
				reportType,
				certifier: certifier.id,
				customer: customer.id,
				dwellingUnitName,
				dwellingUnitAddress,
				totalDwellingUnits,
				dwellingUnits
			}
		})

		when('I send a POST HTTP request', async () => {
			response = await request.post(endpoint)
				.set('X-API-Key', `apikey ${apiKey}`)
				.set('Authorization', `Bearer ${accessToken}`)
				.send(project)
		})

		then('I receive a valid HTTP Response Code of "200"', async () => {
			expect(response.statusCode).toEqual(200)
			const { Customer } = app.get('db').mongoose
			await findAndDelete(Customer, 'name', { customerName })

			const { Certifier } = app.get('db').mongoose
			await findAndDelete(Certifier, 'name', { certifierName })
		})

		and('I receive the created project', () => {
			expect(response.body.result).toMatchObject(expect.objectContaining({
				id: expect.anything(),
				projectID,
				name,
				taxYear,
				legalEntity,
				state,
				inspectionDate,
				reportType,
				certifier: certifier.id,
				customer: customer.id,
				dwellingUnitName,
				dwellingUnitAddress,
				totalDwellingUnits,
				createdBy: user.id
			}))
		})
	}, timeout)

	test('Add a valid 179D project', ({ given, when, then, and }) => {
		const projectID = '232333332222'
		let endpoint, response, project, customer, certifier

		const customerName = 'Walker Reid Strategies'
		const customerAddress = '1225 Broken Sound Parkway NW Ste C, Boca Raton, FL 33487'
		const customerPhone = '8006621793'
		const customerColor = 'afeeee'
		const logo = '6290ee255e8d0151627c4b98'

		const certifierName = 'Alaa Ali, PhD'
		const certifieAddress = '1225 Broken Sound Parkway NW Ste C, Boca Raton, FL 33487'
		const certifiePhone = '8006621793'
		const signature = '6290ee255e8d0151627c4b98'

		given('I set /projects service api endpoint', () => {
			endpoint = '/projects'
		})

		and('I set the project info', async () => {	
			const { Customer, Certifier, Project } = app.get('db').mongoose
			
			customer = await Customer.create({ name: customerName, address: customerAddress, phone: customerPhone, primaryColor: customerColor, logo, createdBy: user.id })
			certifier = await Certifier.create({ name: certifierName, address: certifieAddress, phone: certifiePhone, signature, createdBy: user.id })

			await findAndDelete(Project, 'name', { name })

			project = {
				projectID,
				name,
				taxYear,
				legalEntity,
				state,
				inspectionDate,
				reportType,
				certifier: certifier.id,
				customer: customer.id,
				software,
				buildings: [{
					name: 'Larimer County E. O. Center',
					address: '4872 Endeavor Drive, 1st Foor Johnstown, CO 80534',
					type: 'County',
					qualifyingCategories: ['Whole Building'],
					area: '11000',
					rate: '180',
					method: 'Permanent'
				}, {
					name: 'LC Horsetooth Res. Guest Cabins',
					address: '4200 W. County Road 38E Fort Collins, CO 80526',
					type: 'County',
					qualifyingCategories: ['HVAC', 'Lighting'],
					area: '2500',
					rate: '180',
					method: 'Permanent'
				}]
			}
		})

		when('I send a POST HTTP request', async () => {
			response = await request.post(endpoint)
				.set('X-API-Key', `apikey ${apiKey}`)
				.set('Authorization', `Bearer ${accessToken}`)
				.send(project)
		})

		then('I receive a valid HTTP Response Code of "200"', async () => {
			expect(response.statusCode).toEqual(200)
			const { Customer } = app.get('db').mongoose
			await findAndDelete(Customer, 'name', { customerName })

			const { Certifier } = app.get('db').mongoose
			await findAndDelete(Certifier, 'name', { certifierName })
		})

		and('I receive the created project', () => {
			expect(response.body.result).toMatchObject(expect.objectContaining({
				id: expect.anything(),
				projectID,
				name,
				taxYear,
				legalEntity,
				state,
				inspectionDate,
				reportType,
				certifier: certifier.id,
				customer: customer.id,
				software,
				createdBy: user.id
			}))
		})
	}, timeout)
})