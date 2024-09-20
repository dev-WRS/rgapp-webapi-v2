import _ from 'lodash'
// import converter from 'convert-svg-to-png'
// import sizeOf from 'buffer-image-size'

// import svg2img from 'svg2img'
import sharp from 'sharp'

import { middlewares, validator, errors } from 'lts-server'
import moment from 'moment-timezone'

import Template45L from '../pdf-templates/45L.js'
import Template179DPermanet from '../pdf-templates/179DPermanent.js'
import Template179DInterim from '../pdf-templates/179DInterim.js'
import Template179DPermanetInterim from '../pdf-templates/179DPermanentInterim.js'
import Template179D2023 from '../pdf-templates/179D2023.js'
import createTheme from '../pdf-templates/theme.js'

import { generateS3Key } from '../helpers.js'

// const { convert: svg2png } = converter
const { HttpBadRequestError } = errors

const { withScope, withPassport } = middlewares
const { validatorRequest, check } = validator

// const svg2png = (svg, options = {}) => new Promise((resolve, reject) => {
// 	options.format = 'png'
// 	svg2img(svg, options, (error, buffer) => {
// 		(error)	? reject(error) : resolve(buffer)
// 	})
// })

const svg2png = (svg) => sharp(svg, { density: 300 })
	.png()
	.toBuffer()

const errorMsgChangeStatus = (source, target) => `Project cannot transition from status ${source} to ${target}`

const asProjectResponse = (
	{ _id, projectID, originalProjectID, name, taxYear, legalEntity, state, inspectionDate, reportType, status,
		certifier, customer, photos, dwellingUnitName, dwellingUnitAddress, totalDwellingUnits, dwellingUnits, 
		certificate45L, software, draft, buildingDefaults, buildings, baselineDesign179D, wholeBuildingDesign179D,
		buildingSummary179D, softwareCertificate179D, report, createdBy, createDate, reportCreateDate
	}) => ({ 
	id: _id, projectID, originalProjectID, name, taxYear, legalEntity, state, inspectionDate, reportType, status, certifier, customer, 
	photos: photos 
		? photos.map(({ _id, asset, description }) => ({ id: _id, asset, description }))
		: [], 
	dwellingUnitName, dwellingUnitAddress, totalDwellingUnits, 
	dwellingUnits: dwellingUnits 
		? dwellingUnits.map(({ _id, address, type, model, building, unit }) => ({ id: _id, address, type, model, building, unit })) 
		: [], 
	certificate45L, software, draft, buildingDefaults,
	buildings: buildings 
		? buildings.map((
			{ _id, name, address, type, qualifyingCategories, area, rate, pwRate, method, totalWatts, percentReduction,
				percentSaving, savingsRequirement }) => ({ id: _id, name, address, type, qualifyingCategories, area, rate, pwRate, method, totalWatts,
			percentReduction, percentSaving, savingsRequirement })) 
		: [], 
	baselineDesign179D, wholeBuildingDesign179D, buildingSummary179D, softwareCertificate179D, report, createdBy,
	createDate: createDate ? moment(createDate).tz('America/New_York').format('MM/DD/YYYY HH:mm') : '-',
	reportCreateDate: reportCreateDate ? moment(reportCreateDate).tz('America/New_York').format('MM/DD/YYYY HH:mm') : '-' })

const asProjectByIDResponse = ({ _id, projectID, originalProjectID, name, taxYear, legalEntity, state, inspectionDate, reportType, status, certifier, customer, software, draft, dwellingUnitName, dwellingUnitAddress, totalDwellingUnits, buildingDefaults, softwareCertificate179D, report, createdBy }) => ({ 
	id: _id, projectID, originalProjectID, name, taxYear, legalEntity, state, inspectionDate, reportType, status, certifier, customer, software, draft, 
	dwellingUnitName, dwellingUnitAddress, totalDwellingUnits, 
	buildingDefaults,
	softwareCertificate179D,
	report, 
	createdBy })

const asAsset = (file) => {
	if (file) {
		const { originalname: name, mimetype: format, size, bucket, key } = file
		return { name, format, size, bucket, key }
	}
	return
}

const checkFile = (name, message) => {
	return check(name)
		.custom((value, { req }) => {
			return !_.isEmpty(value) || !!req.file
		})
		.withMessage(message)
}

export default ({ passport, config, services, assetStorage, multerUpload, router }) => {
	const { Project, Asset, Customer, Certifier } = services

	const asBuffer = (id) => Asset.getAssetById(id)
		.then(({ bucket, key, format }) => {
			return assetStorage.getObject({ bucket, key })
				.then(async (item) => {
					if (format === 'image/svg+xml') {
						item.body = await svg2png(item.body)
						// const scale = 10
						// try {
						// 	item.body = await svg2png(item.body, {
						// 		scale
						// 	})
						// }
						// catch (error) {
						// 	const { width, height } = sizeOf(item.body)
						// 	// const optWidth = 138
						// 	// const optHeight = 32

						// 	item.body = await svg2png(item.body, {
						// 		// width: Math.round(optWidth * height / optHeight), 
						// 		// height: optHeight
						// 		width, height, scale
						// 	})	
						// }
					}
					item.body._isBuffer = true
					return item.body
				})
		})

	router.get('/projects',
		withScope('webapp'),
		withPassport(passport, config)('apikey'),
		withPassport(passport, config)('jwt'),
		async (req, res, next) => {
			try {
				const query = req.query
				const projects = await Project.getProjects(query)

				res.json({ result: projects.map(asProjectResponse) })
			}
			catch (error) {
				next(error)
			}
		}
	)

	router.post('/projects/reportsByDates',
		withScope('webapp'),
		withPassport(passport, config)('apikey'),
		withPassport(passport, config)('jwt'),
		async (req, res, next) => {
			try {
				
				const { startDate, endDate } = req.body
				let parts = startDate.split('-')

				let year = +parts[0]
				let month = +parts[1] - 1
				let day = +parts[2]
				const start = new Date(year, month, day)
				start.setHours(0, 0, 0, 0)

				parts = endDate.split('-')
				year = +parts[0]
				month = +parts[1] - 1
				day = +parts[2]
				const end = new Date(year, month, day)
				end.setHours(23, 59, 59, 999)

				const projects = await Project.getProjectByReportDates(start, end)

				res.json({ result: projects.map(asProjectResponse) })
			} catch (err) {
				next(err)
			}
		}
	)

	router.get('/projects/:projectID/lookup',
		withScope('webapp'),
		withPassport(passport, config)('apikey'),
		withPassport(passport, config)('jwt'),
		async (req, res, next) => {
			try {
				const { projectID } = req.params
				const project = await Project.getProjectByProjectID(projectID)

				res.json({ result: asProjectByIDResponse(project) })
			}
			catch (error) {
				next(error)
			}
		}
	)

	router.get('/projects/:id',
		withScope('webapp'),
		withPassport(passport, config)('apikey'),
		withPassport(passport, config)('jwt'),
		async (req, res, next) => {
			try {
				const { id } = req.params
				const project = await Project.getProjectById(id)

				res.json({ result: asProjectResponse(project) })
			}
			catch (error) {
				next(error)
			}
		}
	)

	router.post('/projects',
		withScope('webapp'),
		withPassport(passport, config)('apikey'),
		withPassport(passport, config)('jwt'),
		validatorRequest([
			check('name')
				.not().isEmpty()
				.withMessage('name is required')
		]),
		async (req, res, next) => {
			try {
				const { id } = req.user
				const { projectID, originalProjectID, name, taxYear, legalEntity, state, inspectionDate, reportType, certifier, customer, dwellingUnitName, dwellingUnitAddress, totalDwellingUnits, dwellingUnits, software, draft, buildingDefaults, buildings } = req.body
				
				const project = await Project.createProject({ projectID, originalProjectID, name, taxYear, legalEntity, state, inspectionDate, reportType, certifier, customer, dwellingUnitName, dwellingUnitAddress, totalDwellingUnits, dwellingUnits, software, draft, buildingDefaults, buildings, createdBy: id })

				res.json({ result: asProjectResponse(project) })

			} catch (error) {
				next(error)
			}
		}
	)

	router.post('/projects/:id/copy',
		withScope('webapp'),
		withPassport(passport, config)('apikey'),
		withPassport(passport, config)('jwt'),
		async (req, res, next) => {
			try {
				const { id } = req.params
				const { id: userId } = req.user
				let project = await Project.getProjectById(id)				

				if (project) {
					delete project._id
					const projectToCopy = await Project.copyProject(project, userId, assetStorage, Asset)

					res.json({ result: asProjectResponse(projectToCopy) })
				}
			}
			catch (error) {
				next(error)
			}
		}
	)

	router.put('/projects/:id',
		withScope('webapp'),
		withPassport(passport, config)('apikey'),
		withPassport(passport, config)('jwt'),
		validatorRequest([
			check('name')
				.not().isEmpty()
				.withMessage('name is required')
		]),
		async (req, res, next) => {
			try {
				const { id } = req.params
				const data = req.body
				
				const project = await Project.updateProject({ id }, { ...data })

				res.json({ result: asProjectResponse(project) })
			}
			catch (error) {
				next(error)
			}
		}
	)

	router.put('/projects/:id/status',
		withScope('webapp'),
		withPassport(passport, config)('apikey'),
		withPassport(passport, config)('jwt'),
		validatorRequest([
			check('status')
				.not().isEmpty()
				.withMessage('status is required')
		]),
		async (req, res, next) => {
			try {
				const { id } = req.params
				const { status } = req.body

				const statusOptions = {
					inProgress: 'In Progress',
					readyForReview: 'Ready For Review',
					approved: 'Dale',
					closed: 'Closed'
				}

				const { status: currentStatus } = await Project.getProjectById(id)
				let error = false

				switch (currentStatus) {
				case 'readyForReview':
					error = status !== 'approved' && status !== 'inProgress'
					break
				case 'approved':
					error = status !== 'closed' && status !== 'inProgress'
					break
				case 'closed':
					error = status !== 'inProgress'
					break
				default:
					error = status !== 'readyForReview'
					break
				}

				if (error) {
					throw new HttpBadRequestError(errorMsgChangeStatus(statusOptions[currentStatus], statusOptions[status]))
				}

				const project = await Project.updateProject({ id }, { status })

				await Project.updateTasks(project.originalProjectID ,status, project.reportType)

				if (status === 'approved') {
					await Project.createCertifiedBuilding(project)
				}
				
				res.json({ result: asProjectResponse(project) })
			}
			catch (error) {
				next(error)
			}
		}
	)

	router.put('/projects/:id/dwellingUnit',
		withScope('webapp'),
		withPassport(passport, config)('apikey'),
		withPassport(passport, config)('jwt'),
		validatorRequest([
			check('dwellingUnitName')
				.not().isEmpty()
				.withMessage('dwelling unit name is required'),
			check('totalDwellingUnits')
				.not().isEmpty()
				.withMessage('total dwelling units is required')
		]),
		async (req, res, next) => {
			try {
				const { id } = req.params
				const data = req.body
				
				const project = await Project.updateProject({ id }, { ...data })

				res.json({ result: asProjectResponse(project) })
			}
			catch (error) {
				next(error)
			}
		}
	)

	router.put('/projects/:id/certifier',
		withScope('webapp'),
		withPassport(passport, config)('apikey'),
		withPassport(passport, config)('jwt'),
		validatorRequest([
			check('certifier')
				.not().isEmpty()
				.withMessage('certifier is required')
		]),
		async (req, res, next) => {
			try {
				const { id } = req.params
				const data = req.body
				
				const project = await Project.updateProject({ id }, { ...data })

				res.json({ result: asProjectResponse(project) })
			}
			catch (error) {
				next(error)
			}
		}
	)

	router.put('/projects/:id/customer',
		withScope('webapp'),
		withPassport(passport, config)('apikey'),
		withPassport(passport, config)('jwt'),
		validatorRequest([
			check('customer')
				.not().isEmpty()
				.withMessage('customer is required')
		]),
		async (req, res, next) => {
			try {
				const { id } = req.params
				const data = req.body
				
				const project = await Project.updateProject({ id }, { ...data })

				res.json({ result: asProjectResponse(project) })
			}
			catch (error) {
				next(error)
			}
		}
	)

	router.put('/projects/:id/certificate45L',
		withScope('webapp'),
		withPassport(passport, config)('apikey'),
		withPassport(passport, config)('jwt'),
		multerUpload.single('file'),
		validatorRequest([
			checkFile('file', 'file is not valid')
		]),
		async (req, res, next) => {
			try {
				const { id: userId } = req.user
				const { id } = req.params
				let pdf = asAsset(req.file)

				if (pdf) {
					const asset = await Asset.createAsset({ ...pdf, origin: 'project', createdBy: userId })
					pdf = asset.id
				}

				const project = await Project.updateProject({ id }, { certificate45L: pdf })

				res.json({ result: asProjectResponse(project) })
			}
			catch (error) {
				next(error)
			}
		}
	)

	router.put('/projects/:id/baselineDesign179D',
		withScope('webapp'),
		withPassport(passport, config)('apikey'),
		withPassport(passport, config)('jwt'),
		multerUpload.single('file'),
		validatorRequest([
			checkFile('file', 'file is not valid')
		]),
		async (req, res, next) => {
			try {
				const { id: userId } = req.user
				const { id } = req.params
				let pdf = asAsset(req.file)

				if (pdf) {
					const asset = await Asset.createAsset({ ...pdf, origin: 'project', createdBy: userId })
					pdf = asset.id
				}

				const project = await Project.updateProject({ id }, { baselineDesign179D: pdf })

				res.json({ result: asProjectResponse(project) })
			}
			catch (error) {
				next(error)
			}
		}
	)

	router.put('/projects/:id/wholeBuildingDesign179D',
		withScope('webapp'),
		withPassport(passport, config)('apikey'),
		withPassport(passport, config)('jwt'),
		multerUpload.single('file'),
		validatorRequest([
			checkFile('file', 'file is not valid')
		]),
		async (req, res, next) => {
			try {
				const { id: userId } = req.user
				const { id } = req.params
				let pdf = asAsset(req.file)

				if (pdf) {
					const asset = await Asset.createAsset({ ...pdf, origin: 'project', createdBy: userId })
					pdf = asset.id
				}

				const project = await Project.updateProject({ id }, { wholeBuildingDesign179D: pdf })

				res.json({ result: asProjectResponse(project) })
			}
			catch (error) {
				next(error)
			}
		}
	)

	router.put('/projects/:id/buildingSummary179D',
		withScope('webapp'),
		withPassport(passport, config)('apikey'),
		withPassport(passport, config)('jwt'),
		multerUpload.single('file'),
		validatorRequest([
			checkFile('file', 'file is not valid')
		]),
		async (req, res, next) => {
			try {
				const { id: userId } = req.user
				const { id } = req.params
				let pdf = asAsset(req.file)

				if (pdf) {
					const asset = await Asset.createAsset({ ...pdf, origin: 'project', createdBy: userId })
					pdf = asset.id
				}

				const project = await Project.updateProject({ id }, { buildingSummary179D: pdf })

				res.json({ result: asProjectResponse(project) })
			}
			catch (error) {
				next(error)
			}
		}
	)

	router.put('/projects/:id/softwareCertificate179D',
		withScope('webapp'),
		withPassport(passport, config)('apikey'),
		withPassport(passport, config)('jwt'),
		multerUpload.single('file'),
		validatorRequest([
			checkFile('file', 'file is not valid')
		]),
		async (req, res, next) => {
			try {
				const { id: userId } = req.user
				const { id } = req.params
				let pdf = asAsset(req.file)

				if (pdf) {
					const asset = await Asset.createAsset({ ...pdf, origin: 'project', createdBy: userId })
					pdf = asset.id
				}

				const project = await Project.updateProject({ id }, { softwareCertificate179D: pdf })

				res.json({ result: asProjectResponse(project) })
			}
			catch (error) {
				next(error)
			}
		}
	)

	router.get('/projects/:id',
		withScope('webapp'),
		withPassport(passport, config)('apikey'),
		withPassport(passport, config)('jwt'),
		async (req, res, next) => {
			try {
				const { id } = req.params
				const project = await Project.getProjectById(id)

				res.json({ result: asProjectResponse(project) })
			}
			catch (error) {
				next(error)
			}
		}
	)

	// router.get('/projects/:id/buildings',
	// 	withScope('webapp'),
	// 	withPassport(passport, config)('apikey'),
	// 	withPassport(passport, config)('jwt'),
	// 	async (req, res, next) => {
	// 		try {
	// 			const { id } = req.params
	// 			const project = await Project.getProjectBuildings({ id })

	// 			res.json({ result: asProjectResponse(project) })
	// 		}
	// 		catch (error) {
	// 			next(error)
	// 		}
	// 	}
	// )

	router.post('/projects/:id/buildings',
		withScope('webapp'),
		withPassport(passport, config)('apikey'),
		withPassport(passport, config)('jwt'),
		async (req, res, next) => {
			try {
				const { id } = req.params
				const data = req.body
				
				const project = await Project.addProjectBuildings({ id }, data)

				res.json({ result: asProjectResponse(project) })
			}
			catch (error) {
				next(error)
			}
		}
	)

	router.post('/projects/:id/buildings/:buildingId/copy',
		withScope('webapp'),
		withPassport(passport, config)('apikey'),
		withPassport(passport, config)('jwt'),
		async (req, res, next) => {
			try {
				const id = req.params.id
				const buildingId = req.params.buildingId
		
				if (id && buildingId) {
					const buildingToCopy = await Project.copyBuilding(id, buildingId)

					res.json({ result: asProjectResponse(buildingToCopy) })
				}
			}
			catch (error) {
				next(error)
			}
		}
	)

	router.put('/projects/:id/buildings/:buildingId',
		withScope('webapp'),
		withPassport(passport, config)('apikey'),
		withPassport(passport, config)('jwt'),
		async (req, res, next) => {
			try {
				const { id, buildingId } = req.params
				const data = req.body
				
				const project = await Project.updateProjectBuilding({ id }, { buildingId }, { ...data })

				res.json({ result: asProjectResponse(project) })
			}
			catch (error) {
				next(error)
			}
		}
	)

	router.delete('/projects/:id/buildings',
		withScope('webapp'),
		withPassport(passport, config)('apikey'),
		withPassport(passport, config)('jwt'),
		async (req, res, next) => {
			try {
				const { id } = req.params
				const buildings = req.body
				let project = {}

				for (let index = 0; index < buildings.length; index++) {
					const item = buildings[index]
					try {
						const buildingId = item.id

						project = await Project.deleteProjectBuilding({ id }, { buildingId })
					} catch (error) {
						next(error)
					}
				}
				
				res.json({ result: asProjectResponse(project) })
			}
			catch (error) {
				next(error)
			}
		}
	)

	router.post('/projects/:id/dwellingUnits',
		withScope('webapp'),
		withPassport(passport, config)('apikey'),
		withPassport(passport, config)('jwt'),
		async (req, res, next) => {
			try {
				const { id } = req.params
				const data = req.body
				
				const project = await Project.addProjectDwellingUnits({ id }, data)

				res.json({ result: asProjectResponse(project) })
			}
			catch (error) {
				next(error)
			}
		}
	)

	router.put('/projects/:id/dwellingUnits/:unitId',
		withScope('webapp'),
		withPassport(passport, config)('apikey'),
		withPassport(passport, config)('jwt'),
		validatorRequest([
			check('address')
				.not().isEmpty()
				.withMessage('dwelling unit address is required')
		]),
		async (req, res, next) => {
			try {
				const { id, unitId } = req.params
				const data = req.body
				
				const project = await Project.updateProjectDwellingUnit({ id }, { unitId }, { ...data })

				res.json({ result: asProjectResponse(project) })
			}
			catch (error) {
				next(error)
			}
		}
	)

	router.delete('/projects/:id/dwellingUnits',
		withScope('webapp'),
		withPassport(passport, config)('apikey'),
		withPassport(passport, config)('jwt'),
		async (req, res, next) => {
			try {
				const { id } = req.params
				const dwellingUnits = req.body
				let project = {}

				for (let index = 0; index < dwellingUnits.length; index++) {
					const item = dwellingUnits[index]
					try {
						const unitId = item.id

						project = await Project.deleteProjectDwellingUnit({ id }, { unitId })
					} catch (error) {
						next(error)
					}
				}
				
				res.json({ result: asProjectResponse(project) })
			}
			catch (error) {
				next(error)
			}
		}
	)

	router.post('/projects/:id/photos',
		withScope('webapp'),
		withPassport(passport, config)('apikey'),
		withPassport(passport, config)('jwt'),
		multerUpload.single('asset'),
		validatorRequest([
			check('description')
				.not().isEmpty()
				.withMessage('description is required')
		]),
		async (req, res, next) => {
			try {
				const { id: userId } = req.user
				const { id } = req.params
				const { description } = req.body
				let photo = asAsset(req.file)

				if (photo) {
					const asset = await Asset.createAsset({ ...photo, origin: 'project', createdBy: userId })
					photo = asset.id
				}

				const project = await Project.addProjectPhoto({ id }, { asset: photo, description })

				res.json({ result: asProjectResponse(project) })
			}
			catch (error) {
				next(error)
			}
		}
	)

	router.post('/projects/:id/photosMultiple',
		withScope('webapp'),
		withPassport(passport, config)('apikey'),
		withPassport(passport, config)('jwt'),
		multerUpload.array('asset', 20),
		async (req, res, next) => {
			try {
				const { id: userId } = req.user
				const { id } = req.params
				const photos = req.files
				const assetIdsDescription = []

				for (const file of photos) {
					const photo = asAsset(file)
					if (photo) {
						const asset = await Asset.createAsset({ ...photo, origin: 'project', createdBy: userId })
						assetIdsDescription.push({ asset: asset.id, description: '' })
					}
				}

				const project = await Project.addProjectMultiplePhoto({ id }, assetIdsDescription)
				res.json({ result: asProjectResponse(project) })
			} catch (error) {
				next(error)
			}
		})

	router.put('/projects/:id/photos/:photoId',
		withScope('webapp'),
		withPassport(passport, config)('apikey'),
		withPassport(passport, config)('jwt'),
		validatorRequest([
			check('description')
				.not().isEmpty()
				.withMessage('description is required')
		]),
		async (req, res, next) => {
			try {
				const { id, photoId } = req.params
				const { description } = req.body
				
				const project = await Project.updateProjectPhoto({ id }, { photoId }, { description })

				res.json({ result: asProjectResponse(project) })
			}
			catch (error) {
				next(error)
			}
		}
	)

	router.put('/projects/:id/photos/:photoId/change',
		withScope('webapp'),
		withPassport(passport, config)('apikey'),
		withPassport(passport, config)('jwt'),
		multerUpload.single('asset'),
		async (req, res, next) => {
			try {
				const { id, photoId } = req.params
				let assetId = ''

				const { id: userId } = req.user
				let photo = asAsset(req.file)

				if (photo) {
					const asset = await Asset.createAsset({ ...photo, origin: 'project', createdBy: userId })
					assetId = asset.id
				}

				const assetToDelete = await Asset.getAssetById(photoId)
				if (assetToDelete) {
					const { bucket, key } = assetToDelete
					await assetStorage.deleteObject({ bucket, key })
				}
				
				const project = await Project.updateProjectPhotoChange({ id }, { photoId }, { assetId })

				await Asset.deleteAsset({ id: photoId })

				res.json({ result: asProjectResponse(project) })
			}
			catch (error) {
				next(error)
			}
		}
	)

	router.delete('/projects/:id/photos/:photoId',
		withScope('webapp'),
		withPassport(passport, config)('apikey'),
		withPassport(passport, config)('jwt'),
		async (req, res, next) => {
			try {
				const { id, photoId } = req.params

				let project = await Project.getProjectById(id)
				let result = null

				if (project) {
					const photos = project.photos
					const photo = photos.find(photo => photo._id == photoId)
					const asset = await Asset.getAssetById(photo.asset)

					if (asset) {
						const { bucket, key } = asset
						await assetStorage.deleteObject({ bucket, key })
					}
					
					project = await Project.deleteProjectPhoto({ id }, { photoId })

					result = asProjectResponse(project)
				}
				
				res.json({ result })
			}
			catch (error) {
				next(error)
			}
		}
	)

	router.delete('/projects/:id',
		withScope('webapp'),
		withPassport(passport, config)('apikey'),
		withPassport(passport, config)('jwt'),
		async (req, res, next) => {
			try {
				const { id } = req.params
				const project = await Project.getProjectById(id)

				if (project) {
					const pdfs = ['certificate45L', 'baselineDesign179D', 'wholeBuildingDesign179D', 'buildingSummary179D']
					const photos = project.photos

					const deleteAssetStorage = (assetId) => Asset.getAssetById(assetId)
						.then(asset => {
							if (asset) {
								const { bucket, key } = asset
								return assetStorage.deleteObject({ bucket, key })
							}
							return
						})

					await Promise.all(photos.map(photo => {
						return deleteAssetStorage(photo.asset)
					}))	

					await Promise.all(pdfs.map(name => {
						if (project[name]) {
							return deleteAssetStorage(project[name])
						}
						return
					}))

					if (project.report) {
						await deleteAssetStorage(project.report)
					}
				}

				const { deletedCount } = await Project.deleteProject({ id })
				const result = (deletedCount === 1) ? { id } : null
				
				res.json({ result })
			}
			catch (error) {
				next(error)
			}
		}
	)

	router.post('/projects/deleteProjects',
		withScope('webapp'),
		withPassport(passport, config)('apikey'),
		withPassport(passport, config)('jwt'),
		async (req, res, next) => {
			try {
				const ids = req.body
				const result = []
				let allAssets = []
				let allKeys = []

				for (const id of ids) {
					const project = await Project.getProjectById(id)

					if (project) {
						const pdfs = ['certificate45L', 'baselineDesign179D', 'wholeBuildingDesign179D', 'buildingSummary179D']
						const photos = project.photos

						const photoAssets = photos.map(photo => photo.asset)

						const pdfAsset = pdfs.map(name => project[name]).filter(key => key !== undefined)

						if (project.report !== undefined) {
							allAssets.push(project.report)
						}

						const assetIds = [...photoAssets, ...pdfAsset]
						allAssets = allAssets.concat(assetIds)

						if (project.report !== undefined) {
							assetIds.push(project.report)
						}
						const keysFound = await Asset.getAssetKeysByIds(assetIds)
						allKeys = allKeys.concat(keysFound)
					}

					await Project.deleteProject({ id })
					result.push(id)
				}
				if (allKeys.length > 1000) {
					while (allKeys.length > 0) {
						const keysToDelete = allKeys.splice(0, 1000)
						await assetStorage.deleteObjects({ bucket: 'rgapp-assets-bucket-production', keys: keysToDelete })
					}
				} else {
					await assetStorage.deleteObjects({ bucket: 'rgapp-assets-bucket-production', keys: allKeys })
				}

				res.json({ result })
			} catch (error) {
				next(error)
			}
		}
	)

	router.put('/projects/:id/report',
		withScope('webapp'),
		withPassport(passport, config)('apikey'),
		withPassport(passport, config)('jwt'),
		async (req, res, next) => {
			try {
				const { id: userId } = req.user
				const { id } = req.params
				let project = await Project.getProjectById(id)
				let reportTitle, reportSubtitle1, reportSubtitle2
				let Template

				if (project.reportType === '45L') {
					reportTitle = 'Internal Revenue Code'
					reportSubtitle1 = '§ 45L'
					reportSubtitle2 = 'New Energy Efficient Home Credit'

					Template = Template45L
				}
				else if (project.reportType === '179D') {
					reportTitle = 'EPAct 2005'
					reportSubtitle1 = '26 USC § 179D'
					reportSubtitle2 = 'Federal Energy Tax Deduction'

					if (project.buildings.length > 0) {
						
						if (parseInt(project.taxYear) >= 2023) {
							Template = Template179D2023
						} else {
							const exists = { permanent: false, interim: false }
						
							for (let i = 0, ln = project.buildings.length; i < ln && (!exists.permanent || !exists.interim); i++) {
								const { method } = project.buildings[i]
								if (!exists.permanent && method === 'Permanent') exists.permanent = true
								if (!exists.interim && (method === 'Interim Whole Building' || method === 'Interim Space-by-Space')) exists.interim = true
							}
	
							if (exists.permanent && exists.interim) {
								Template = Template179DPermanetInterim
							}
							else if (exists.permanent) {
								Template = Template179DPermanet
							}
							else if (exists.interim) {
								Template = Template179DInterim
							}
						}
					}
				}

				if (Template) {
					let photos = []
					let pdfFiles = {}

					const [customer, certifier] = await Promise.all([
						Customer.getCustomerById(project.customer),
						Certifier.getCertifierById(project.certifier)
					])

					const [logo, signature] = await Promise.all([
						asBuffer(customer.logo),
						asBuffer(certifier.signature)
					])

					if (project.photos && project.photos.length > 0) {
						photos = await Promise.allSettled(project.photos.map(({ asset, description }) => asBuffer(asset)
							.then((item) => ({
								description,
								image: item
							}))))
							.then((images) => images
								.filter(({ status }) => status === 'fulfilled')
								.map(({ value }) => value)
							)
					}

					if (project.certificate45L) {
						const pdfBuffer = await asBuffer(project.certificate45L)
						pdfFiles.certificate45L = {
							title: 'Certificate',
							pdf: pdfBuffer 
						}
					}
					if (project.baselineDesign179D) {
						const pdfBuffer = await asBuffer(project.baselineDesign179D)
						pdfFiles.baselineDesign179D = {
							pdf: pdfBuffer
						}
					}
					if (project.wholeBuildingDesign179D) {
						const pdfBuffer = await asBuffer(project.wholeBuildingDesign179D)
						pdfFiles.wholeBuildingDesign179D = {
							pdf: pdfBuffer
						}
					}
					if (project.buildingSummary179D) {
						const pdfBuffer = await asBuffer(project.buildingSummary179D)
						pdfFiles.buildingSummary179D = {
							pdf: pdfBuffer
						}
					}
					if (project.softwareCertificate179D) {
						const pdfBuffer = await asBuffer(project.softwareCertificate179D)
						pdfFiles.softwareCertificate179D = {
							pdf: pdfBuffer
						}
					}

					const theme = createTheme(customer.primaryColor)
					
					const pdf = await Template({
						theme,
						reportTitle,
						reportSubtitle1,
						reportSubtitle2,
						project,
						customer,
						certifier,
						logo,
						signature,
						photos,
						pdfFiles
					})

					const stream = await pdf.asStream()

					const { bucket, key } = await assetStorage.uploadObjectStream({
						contentEncoding: config.aws.contentEncoding,
						bucket: config.aws.bucketName,
						key: generateS3Key('.pdf')
					}, stream)

					const report = await Asset.createAsset({
						name: `${project.name}-report.pdf`,
						format: 'application/pdf',
						size: stream.byteLength,
						origin: 'project',
						bucket, key,
						createdBy: userId
					})

					if (project.report) {
						const asset = await Asset.getAssetById(project.report)

						if (asset) {
							await assetStorage.deleteObject({ bucket: asset.bucket, key: asset.key })
							await Asset.deleteAsset({ id: asset.id })	
						}
					}

					project = await Project.updateProject({ id }, { report: report.id })

					res.json({ result: asProjectResponse(project) })
				}
				else {
					throw new HttpBadRequestError('Report couldn\'t been generated')
				}
			}
			catch (error) {
				next(error)
			}
		}
	)

	return router
}