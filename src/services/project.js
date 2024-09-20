import { errors } from 'lts-server'
import { searchSyntax, filterSyntax } from '../db/mongoose/index.js'
import axios from 'axios'
import moment from 'moment'

const { HttpBadRequestError } = errors

export default ({ db, config }) => {
	const { mongoose } = db
	const { Project, Asset, Customer, Certifier, CertifiedBuilding } = mongoose

	const getProjects = async (query) => {
		const findQuery = {}
		const andQuery = []
		const searchQuery = searchSyntax(query.search, ['name', 'address', 'phone'])
		const filterQuery = filterSyntax(query.filter)

		if (searchQuery) {
			andQuery.push({
				$or: searchQuery
			}) 
		}

		if (filterQuery) {
			andQuery.push(...filterQuery)
		}

		if (andQuery.length > 0) {
			findQuery.$and = andQuery
		}

		try {
			return await Project.aggregate([
				{ $match: findQuery },
				{
					$lookup: {
						from: 'assets',
						localField: 'report',
						foreignField: '_id',
						as: 'reportData'
					}
				},
				{
					$unwind: {
						path: '$reportData',
						preserveNullAndEmptyArrays: true
					}
				},
				{
					$project: {
						_id: 1,
						projectID: 1,
						originalProjectID: 1,
						name: 1,
						taxYear: 1,
						legalEntity: 1,
						state: 1,
						inspectionDate: 1,
						reportType: 1,
						status: 1,
						certifier: 1,
						customer: 1,
						photos: 1,
						dwellingUnitName: 1,
						dwellingUnitAddress: 1,
						totalDwellingUnits: 1,
						dwellingUnits: 1,
						certificate45L: 1,
						software: 1,
						draft: 1,
						buildingDefaults: 1,
						buildings: 1,
						baselineDesign179D: 1,
						wholeBuildingDesign179D: 1,
						buildingSummary179D: 1,
						softwareCertificate179D: 1,
						report: 1,
						createdBy: 1,
						createDate: 1,
						reportCreateDate: '$reportData.createDate'
					}
				}
			])
		} catch (error) {
			console.error('Error en getProjects:', error)
			throw error
		}

		// return Project.find(findQuery, '-__v').sort(sortQuery).lean()
	}
	
	const getProjectByReportDates = async (startDate, endDate) => {
		try {
			const reports = await Asset.find({
				'createDate': {
					$gte: startDate,
					$lte: endDate
				}
			})
			const reportIds = reports.map(report => report._id)
			const projects = await Project.find({
				'report': { $in: reportIds }
			}).lean()
		
			return projects
		} catch (error) {
			throw new HttpBadRequestError(`Error fetching projects with report created between ${startDate} and ${endDate}`)
		}
	}
	const getProjectsByPhotoAsset = (asset) => Project.find({ photos: { $elemMatch: { asset: asset } } }, { 'photos.$': 1 }).select('status').lean()
	const getProjectsByPDFAsset = (asset) => Project.find({ $or: [{ certificate45L: asset }, { baselineDesign179D: asset }, { wholeBuildingDesign179D: asset }, { buildingSummary179D: asset }, { softwareCertificate179D: asset }] }).select('status').lean()
	const createProject = async ({ projectID, originalProjectID, name, taxYear, legalEntity, state, inspectionDate, reportType, certifier, customer, software, draft, dwellingUnitName, dwellingUnitAddress, totalDwellingUnits, dwellingUnits, buildingDefaults, buildings, createdBy }) => {
		try {
			let softwareCertificate

			if (reportType === '179D') {
				softwareCertificate = software === 'eQuest 3.65' ? await Asset.findOne({ name: 'eQuest Software Certificate.pdf' }) : await Asset.findOne({ name: 'HAP Software Certificate.pdf' })
			}

			const createDate = moment(new Date()).format('YYYY-MM-DD HH:mm:ss')
			
			const project = await Project.create({ projectID, originalProjectID, name, taxYear, legalEntity, state, inspectionDate, reportType, status: 'inProgress', certifier, customer, dwellingUnitName, dwellingUnitAddress, totalDwellingUnits, dwellingUnits, software, draft, softwareCertificate179D: softwareCertificate && softwareCertificate.id, buildingDefaults, buildings, createdBy, createDate })
			
			return await Project.findOne({ _id: project.id }, '-__v').lean()
		} catch (error) {
			switch (error.code) {
			case 11000:
				if (error.keyPattern['name']) {
					throw new HttpBadRequestError(`A project with name ${error.keyValue['name']} already exists`)
				} else if (error.keyPattern['projectID']) {
					throw new HttpBadRequestError(`A project with Project ID ${error.keyValue['projectID']} already exists`)
				}
				break
			default:
				throw new HttpBadRequestError('Bad request')
			}
		}
	}
	const copyProject = async (projectToCopy, userId, assetStorage, Asset) => {
		try {
			const matchingProjects = await Project.find({ projectID: { $regex: projectToCopy.projectID, $options: '$i' } }).sort({ projectID: 1 }).lean()
			const projectIdToCopy = matchingProjects.length === 0 ? projectToCopy.projectID : matchingProjects[matchingProjects.length - 1].projectID
			const projectNameToCopy = matchingProjects.length === 0 ? projectToCopy.name : matchingProjects[matchingProjects.length - 1].name
			const match = projectIdToCopy.match(/ \((\d+)\)$/)
			let copiedProjectId = projectIdToCopy
			let originalProjectID = projectIdToCopy
			let copiedName = projectNameToCopy
			let copyCount = 1
			if (match) {
				const currentCopyCount = parseInt(match[1], 10)
				copyCount = currentCopyCount + 1
				copiedProjectId = copiedProjectId.replace(/ \(\d+\)$/, '')
				copiedName = copiedName.replace(/ \(\d+\)$/, '')
			}
			copiedProjectId += ` (${copyCount})`
			copiedName += ` (${copyCount})`

			projectToCopy.projectID = copiedProjectId
			projectToCopy.originalProjectID = originalProjectID
			projectToCopy.name = copiedName

			const createDate = moment(new Date()).format('YYYY-MM-DD HH:mm:ss')
			projectToCopy.createDate = createDate

			const photos = []

			if (projectToCopy.photos && projectToCopy.photos.length > 0) {
				for (const photo of projectToCopy.photos) {
					const asset = await Asset.getAssetById(photo.asset)
					if (asset) {
						const { name, bucket, key, format, size } = asset
						const stream = await assetStorage.getObjectStream({ bucket, key })

						const dateName = new Date().getTime()
						const newName = getFileNameAndExtension(name)
						const newKey = getFileNameAndExtension(key)

						const assetCopy = await Asset.createAsset({ name: `${newName[0]}-${dateName}.${newName[1]}`,
							format, size, bucket, key: `${newKey[0]}-${dateName}.${newKey[1]}`, createdBy: userId })

						await assetStorage.uploadObjectStream({
							contentEncoding: config.aws.contentEncoding,
							bucket: config.aws.bucketName,
							key: `${newKey[0]}-${dateName}.${newKey[1]}`
						}, stream)

						photos.push({ asset: assetCopy.id, description: photo.description, id: assetCopy.id })
					}
				}
			}

			projectToCopy.photos = photos
			
			const project = await Project.create(projectToCopy)
			
			return await Project.findOne({ _id: project.id }, '-__v').lean()
		} catch (error) {
			throw new HttpBadRequestError('Bad request')
		}
	}
	const getProjectById = (id) => Project.findOne({ _id: id }, '-__v').lean()

	const updateTasks = async (id, status, reportType) => {
		try {
			const { data: opportunity } = await axios.request({
				baseURL: config.pms.apiUrl,
				url: `/Opportunities/${id}/Links`,
				method: 'get',
				headers: {
					'Authorization': `Basic ${config.pms.apiKey}`
				}
			})

			if (opportunity) {
				const link = opportunity.find(item => item['LINK_OBJECT_NAME'] === 'Project') || {} 
				const projectId = link.LINK_OBJECT_ID

				const tasksData = await axios.request({
					baseURL: config.pms.apiUrl,
					url: `/Projects/${projectId}/Tasks?brief=false&count_total=false`,
					method: 'get',
					headers: {
						'Authorization': `Basic ${config.pms.apiKey}`
					}
				})
				if (tasksData && tasksData.data.length > 0) {
					const tasks = tasksData.data
					const task = tasks.find((t) => t['TITLE'] === 'Submit Reports')
					const taskId = task.TASK_ID.toString()
		
					const taskPut = { TASK_ID: taskId, STATUS: status === 'inProgress' ? 'WAITING' : 'COMPLETED' }
		
					const updatedTask = await axios.request({
						baseURL: config.pms.apiUrl,
						url: `/Tasks/${taskId}`,
						method: 'put',
						data: JSON.stringify(taskPut),
						headers: {
							'Content-Type': 'application/json',
							'Authorization': `Basic ${config.pms.apiKey}`
						}
					})

					const taskRepBrand = reportType === '45L' 
						? tasks.find((t) => t['TITLE'] === 'Perform initial report review')
						: tasks.find((t) => t['TITLE'] === 'Add Report Brand & Perform Initial review')

					if (!taskRepBrand) {
						if (reportType !== '45L') {
							const today = new Date()		
							const stage = {
								PIPELINE_ID: 903682,
								STAGE_ID: 3688488,
								ACTIVITYSET_ASSIGNMENT: {
									ACTIVITYSET_ID: 1497234,
									START_DATE: today,
									END_DATE: today,
									ACTIVITY_ASSIGNMENTS: [
										{
											ACTIVITY_ID: 3208731,
											RESPONSIBLE_USER_ID: 295846,
											ASSIGNED_TEAM_ID: null
										}
									]
								}
							}
				
							await axios.request({
								baseURL: config.pms.apiUrl,
								url: `/Projects/${projectId}/PipelineStage`,
								method: 'put',
								data: JSON.stringify(stage),
								headers: {
									'Content-Type': 'application/json',
									'Authorization': `Basic ${config.pms.apiKey}`
								}
							})
						} else {
							const taskPost = {
								TITLE: 'Perform initial report review',
								CATEGORY_ID: 847612,
								DUE_DATE: new Date(),
								COMPLETED: false,
								PERCENT_COMPLETE: 0,
								RESPONSIBLE_USER_ID: 2005164,
								OWNER_USER_ID: 2005164,
								PROJECT_ID: projectId,
								STAGE_ID: 4216736
							}

							const createdTask = await axios.request({
								baseURL: config.pms.apiUrl,
								url: '/Tasks',
								method: 'post',
								data: JSON.stringify(taskPost),
								headers: {
									'Content-Type': 'application/json',
									'Authorization': `Basic ${config.pms.apiKey}`
								}
							})

							const taskId = createdTask.data['TASK_ID'].toString()
							const linkPost = {
								OBJECT_NAME: 'Task',
								OBJECT_ID: taskId,
								LINK_OBJECT_NAME: 'Project',
								LINK_OBJECT_ID: projectId
							}

							await axios.request({
								baseURL: config.pms.apiUrl,
								url: `/Tasks/${taskId}/Links`,
								method: 'post',
								data: JSON.stringify(linkPost),
								headers: {
									'Content-Type': 'application/json',
									'Authorization': `Basic ${config.pms.apiKey}`
								}
							})
						}
					}
		
					return { task: updatedTask.data, stage: 'done' }
				}

			}

		} catch (error) {
			throw new HttpBadRequestError('Task not found')
		}
	}
	const createCertifiedBuilding = async (project) => {
		try {
			const certifier = await Certifier.findOne({ _id: project.certifier });
			const customer = await Customer.findOne({ _id: project.customer });

			// Construir los datos comunes
			const certifiedBuildingData = {
			_id: project._id,
			name: project.name,
			projectId:
				project.originalProjectID === undefined ||
				project.originalProjectID === ""
				? project.projectID
				: project.originalProjectID,
			taxYear: project.taxYear,
			legalEntity: project.legalEntity,
			state: project.state,
			inspectionDate: project.inspectionDate,
			reportType: project.reportType,
			certifiedDate: new Date(),
			certifier: certifier.name,
			customer: customer.name,
			};

			if (project.reportType === '45L') {
				certifiedBuildingData.totalDwellingUnits = project.totalDwellingUnits;
			} else {
				certifiedBuildingData.buildings = project.buildings;
			}

			const options = { upsert: true, new: true };

			await CertifiedBuilding.findOneAndUpdate(
				{ _id: certifiedBuildingData._id },
				certifiedBuildingData,
				options
			);

		} catch (error) {
			throw new HttpBadRequestError('Certified Building not created');
		}
	};

	const parseIntSafe = (value) => {
		if (!value) return 0
		const parsed = parseInt(value, 10)
		return isNaN(parsed) ? 0 : parsed
	}

	const getProjectByProjectID = async (id) => {
		let project = {}
		const definedStates = ['Multistate','AL', 'MT', 'AK', 'NE', 'DC', 'AZ', 'NV', 'AR', 'NH', 'CA', 'NJ', 'CO', 'NM', 'CT', 'NY', 'DE', 'NC', 'FL', 'ND', 'GA', 'OH', 'HI', 'OK', 'ID', 'OR', 'IL', 'PA', 'IN', 'RI', 'IA', 'SC', 'KS', 'SD', 'KY', 'TN', 'LA', 'TX', 'ME', 'UT', 'MD', 'VT', 'MA', 'VA', 'MI', 'WA', 'MN', 'WV', 'MS', 'WI', 'MO', 'WY']

		try {
			const { data: opportunity } = await axios.request({
				baseURL: config.pms.apiUrl,
				url: `/Opportunities/${id}/Links`,
				method: 'get',
				headers: {
					'Authorization': `Basic ${config.pms.apiKey}`
				}
			})

			if (opportunity) {
				const link = opportunity.find(item => item['LINK_OBJECT_NAME'] === 'Project') || {} 
				const projectID = link.LINK_OBJECT_ID

				const { data } = await axios.request({
					baseURL: config.pms.apiUrl,
					url: `/Projects/${projectID}`,
					method: 'get',
					headers: {
						'Authorization': `Basic ${config.pms.apiKey}`
					}
				})
		
				if (data) {
					const projectFields = Object.fromEntries(
						data.CUSTOMFIELDS.map(({ ['FIELD_NAME']: key, ...item }) => [key, item.FIELD_VALUE])
					)
					const reportType = data.CATEGORY_ID === 7143324 || data.CATEGORY_ID === 7143325 || data.CATEGORY_ID === 7143326 ? '45L' : '179D'
					let certifier
	
					if (projectFields['PROJECT_FIELD_7']) {
						const certifierName = projectFields['PROJECT_FIELD_7']
						const words = certifierName.split(' ')

						for (const word of words) {
							if (reportType === '179D') {
								certifier = await Certifier.findOne({ name: { $regex: new RegExp(word), $options: 'i' }, licenses: { $elemMatch: { state: projectFields['PROJECT_FIELD_15'] } } })
							} else {
								certifier = await Certifier.findOne({ name: { $regex: new RegExp(word), $options: 'i' } })
							}

							if (certifier) {
								break
							}
						}
					}

					let projectName = data.PROJECT_NAME
					let customerName

					if (projectName) {
						customerName = projectName.match(/\((.*)\)/) ? projectName.match(/\((.*)\)/).pop() : null
						let projectYear = projectName.match(/(\d{4}-\d{4}|\d{4})/g) ? projectName.match(/(\d{4}-\d{4}|\d{4})/g).pop() : null

						projectName = projectYear ? projectName.slice(0, projectName.indexOf(projectYear)).trim() : projectName.slice(0, projectName.indexOf('(' + customerName)).trim() 
					}
			
					let customer 
			
					if (projectFields['PROJECT_FIELD_18'] == 'WRS') {
						customer = await Customer.findOne({ name: 'Walker Reid Strategies' })
					} else {
						customer = await Customer.findOne({ name: customerName })
					}

					const stateFromInsightly = definedStates.includes(projectFields['PROJECT_FIELD_15']) ? projectFields['PROJECT_FIELD_15'] : 'Multistate'
			
					project = {
						projectID: id,
						originalProjectID: id,
						name: projectName,
						taxYear: parseIntSafe(projectFields['PROJECT_FIELD_10']),
						legalEntity: projectFields['PROJECT_FIELD_11'],
						state: stateFromInsightly,
						inspectionDate: projectFields['PROJECT_FIELD_9'],
						certifier: certifier && certifier.id,
						customer: customer && customer.id,
						reportType,
						software: reportType === '45L' ? null : 'eQuest 3.65',
						draft: projectFields['PROJECT_FIELD_14'] !== 'No'
					}

					let qualifyingCategories = null
					if (project.taxYear >= 2023) {
						qualifyingCategories = 'Whole Building'
					} else if (!['25%', '50%', 'Possible 25%', 'Possible 50%'].includes(projectFields['PROJECT_FIELD_3'])) {
						qualifyingCategories = projectFields['PROJECT_FIELD_3'] === 'Lighting (Permanent)' ? 'Lighting' : projectFields['PROJECT_FIELD_3']
					}
	
					if (project.reportType === '179D') {
						project.buildingDefaults = {
							name: projectFields['Building_Name__c'],
							type: projectFields['Building_Type__c'],
							address: projectFields['PROJECT_FIELD_1'],
							area: projectFields['PROJECT_FIELD_2'],
							qualifyingCategories: qualifyingCategories
							// buildingPossibleCategory: projectFields['PROJECT_FIELD_22']
						}
					}
				}
			}
		} catch (error) {
			if (error.response.status == 404 && (error.response.statusText === 'Project Not Found' || error.response.statusText === 'Opportunity Not Found')) {
				throw new HttpBadRequestError('Project not found')
			}
		}

		return project
	}
	const updateProject = ({ id }, { ...filter }) => Project.findOneAndUpdate({ _id: id }, { ...filter }, { returnDocument: 'after' }).lean()
	const addProjectBuilding = ({ id }, { ...data }) => Project.findOneAndUpdate({ _id: id }, { '$push': { 'buildings': { ...data } } }, { returnDocument: 'after' }).lean()
	const addProjectBuildings = ({ id }, data) => Project.findOneAndUpdate({ _id: id }, { '$push': { 'buildings': { $each: data } } }, { returnDocument: 'after' }).lean()
	const updateProjectBuilding = ({ id }, { buildingId }, { ...data }) => {
		const { name, address, type, qualifyingCategories, area, rate, pwRate, method, totalWatts, percentReduction, percentSaving, savingsRequirement, ashraeLpd, ashraeRequiredLpd } = { ...data }
		
		return Project.findOneAndUpdate({ _id: id, 'buildings._id': buildingId }, { 
			'$set': { 
				'buildings.$.name': name, 
				'buildings.$.address': address, 
				'buildings.$.type': type, 
				'buildings.$.qualifyingCategories': qualifyingCategories, 
				'buildings.$.area': area, 
				'buildings.$.rate': rate, 
				'buildings.$.pwRate': pwRate,
				'buildings.$.method': method, 
				'buildings.$.totalWatts': totalWatts, 
				'buildings.$.percentReduction': percentReduction,
				'buildings.$.percentSaving': percentSaving,
				'buildings.$.savingsRequirement': savingsRequirement,
				'buildings.$.ashraeLpd': ashraeLpd,
				'buildings.$.ashraeRequiredLpd': ashraeRequiredLpd
			} }, { returnDocument: 'after' }).lean()
	}
	const copyBuilding = async (id, buildingId) => {
		const project = await getProjectById(id)

		if (!project) { throw new HttpBadRequestError('Project not found') }
		
		let building = await project.buildings.find(building => building._id == buildingId)

		if (!building) { throw new HttpBadRequestError('Building not found') }

		const noCopies = findBuildingNumber(project.buildings, building.name)
		
		const buildingToCopy = project.taxYear >= 2023 ? setDefaultValues2023(building, noCopies) :	setDefaultValues(building, noCopies)
		
		delete buildingToCopy._id

		return Project.findOneAndUpdate({ _id: id }, { '$push': { 'buildings': { ...buildingToCopy } } }, { returnDocument: 'after' }).lean()
	}
	const deleteProjectBuilding = ({ id }, { buildingId }) => Project.findOneAndUpdate({ _id: id }, { '$pull': { 'buildings': { '_id': buildingId } } }, { returnDocument: 'after' }).lean()
	const addProjectDwellingUnit = ({ id }, { ...data }) => Project.findOneAndUpdate({ _id: id }, { '$push': { 'dwellingUnits': { ...data } } }, { returnDocument: 'after' }).lean()
	const addProjectDwellingUnits = ({ id }, data) => Project.findOneAndUpdate({ _id: id }, { '$push': { 'dwellingUnits': { $each: data } } }, { returnDocument: 'after' }).lean()
	const updateProjectDwellingUnit = ({ id }, { unitId }, { ...data }) => {
		const { model, address, type, building, unit } = { ...data }
		
		return Project.findOneAndUpdate({ _id: id, 'dwellingUnits._id': unitId }, { 
			'$set': { 
				'dwellingUnits.$.model': model, 
				'dwellingUnits.$.address': address, 
				'dwellingUnits.$.type': type, 
				'dwellingUnits.$.building': building, 
				'dwellingUnits.$.unit': unit 
			} }, { returnDocument: 'after' }).lean()
	}
	const deleteProjectDwellingUnit = ({ id }, { unitId }) => Project.findOneAndUpdate({ _id: id }, { '$pull': { 'dwellingUnits': { '_id': unitId } } }, { returnDocument: 'after' }).lean()
	const addProjectPhoto = ({ id }, { ...data }) => Project.findOneAndUpdate({ _id: id }, { '$push': { 'photos': { ...data } } }, { returnDocument: 'after' }).lean()
	const addProjectMultiplePhoto = ({ id }, data) => Project.findOneAndUpdate({ _id: id }, { '$push': { 'photos': { $each: data } } }, { returnDocument: 'after' }).lean()
	const updateProjectPhoto = ({ id }, { photoId }, { description }) => Project.findOneAndUpdate({ _id: id, 'photos._id': photoId }, { '$set': { 'photos.$.description': description } }, { returnDocument: 'after' }).lean()
	const updateProjectPhotoChange = ({ id }, { photoId }, { assetId }) => Project.findOneAndUpdate({ _id: id, 'photos.asset': photoId }, { '$set': { 'photos.$.asset': assetId } }, { returnDocument: 'after' }).lean()
	const deleteProjectPhoto = ({ id }, { photoId }) => Project.findOneAndUpdate({ _id: id }, { '$pull': { 'photos': { '_id': photoId } } }, { returnDocument: 'after' }).lean()
	const deleteProject = async ({ id }) => {
		const project = await Project.findOne({ _id: id })
		const { photos, report } = project
		const pdfs = ['certificate45L', 'baselineDesign179D', 'wholeBuildingDesign179D', 'buildingSummary179D']

		if (photos) {
			await Promise.all(photos.map(photo => Asset.deleteOne({ _id: photo.asset })))
		}

		await Promise.all(pdfs.map(pdf => project[pdf] && Asset.deleteOne({ _id: project[pdf] })))

		if (report) {
			await Asset.deleteOne({ _id: report })	
		}

		return await project.deleteOne()
	}

	function setDefaultValues (obj, noCopies) {
		Object.keys(obj).forEach(prop => {
			let value
			if (!['name', 'type', 'address'].includes(prop)) {
				if (typeof obj[prop] === 'string') {
					value = ''
				} else if (Array.isArray(obj[prop])) {
					value = []
				} else if (typeof obj[prop] === 'number') {
					value = 0
				} else if (typeof obj[prop] === 'object' && obj[prop] !== null) {
					value = {}
				} else {
					value = obj[prop]
				}
				obj[prop] = value
			}
			if (prop === 'name') {
				obj[prop] = `${obj[prop]} (Copy ${noCopies})`
			}
		})
		return obj
	}

	function setDefaultValues2023 (obj, noCopies) {
		Object.keys(obj).forEach(prop => {
			let value
			if (!['name', 'type', 'address', 'area', 'percentSaving', 'rate', 'pwRate'].includes(prop)) {
				if (typeof obj[prop] === 'string') {
					value = ''
				} else if (Array.isArray(obj[prop])) {
					value = []
				} else if (typeof obj[prop] === 'number') {
					value = 0
				} else if (typeof obj[prop] === 'object' && obj[prop] !== null) {
					value = {}
				} else {
					value = obj[prop]
				}
				obj[prop] = value
			}
			if (prop === 'name') {
				obj[prop] = `${obj[prop]} (Copy ${noCopies})`
			}
		})
		return obj
	}

	function findBuildingNumber (buildings, searchValue) {
		let maxNumber = 0

		buildings.forEach((building) => {
			if (building.name.includes(searchValue)) {
				const regex = /Copy (\d+)/i
				const match = building.name.match(regex)
				if (match) {
					const number = parseInt(match[1])
					if (number > maxNumber) {
						maxNumber = number
					}
				}
			}
		})

		return maxNumber > 0 ? maxNumber + 1 : 1
	}

	const getFileNameAndExtension = (originalname) => {
		const nameSplitted = originalname.split('.')
		
		if (nameSplitted.length >= 2) {
			const extension = nameSplitted.pop()
			const fileName = nameSplitted.join('.')
			return [fileName, extension]
		} else {
			return [originalname, '']
		}
	}

	return {
		getProjects,
		getProjectByReportDates,
		getProjectsByPhotoAsset,
		getProjectsByPDFAsset,
		createProject,
		getProjectById,
		getProjectByProjectID,
		updateProject,
		deleteProject,
		addProjectBuilding,
		addProjectBuildings,
		updateProjectBuilding,
		deleteProjectBuilding,
		addProjectDwellingUnit,
		addProjectDwellingUnits,
		updateProjectDwellingUnit,
		deleteProjectDwellingUnit,
		addProjectPhoto,
		addProjectMultiplePhoto,
		updateProjectPhoto,
		updateProjectPhotoChange,
		deleteProjectPhoto,
		copyProject,
		copyBuilding,
		updateTasks,
		getFileNameAndExtension,
		createCertifiedBuilding
	}
}