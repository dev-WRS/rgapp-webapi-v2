import { errors } from 'lts-server'
import { searchSyntax, filterSyntax } from '../db/mongoose/index.js'
import axios from 'axios'
import moment from 'moment'
import ExcelJS from 'exceljs'
import pkg from 'file-saver';
const { saveAs } = pkg;

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
						privateProject: 1,
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
	const createProject = async ({ projectID, originalProjectID, name, taxYear, legalEntity, state, inspectionDate, reportType, privateProject, certifier, customer, software, draft, dwellingUnitName, dwellingUnitAddress, totalDwellingUnits, dwellingUnits, buildingDefaults, buildings, createdBy }) => {
		try {
			let softwareCertificate

			if (reportType === '179D') {
				softwareCertificate = software === 'eQuest 3.65' ? await Asset.findOne({ name: 'eQuest Software Certificate.pdf' }) : await Asset.findOne({ name: 'HAP Software Certificate.pdf' })
			}

			const createDate = moment(new Date()).format('YYYY-MM-DD HH:mm:ss')
			
			const project = await Project.create({ projectID, originalProjectID, name, taxYear, legalEntity, state, inspectionDate, reportType, privateProject, status: 'inProgress', certifier, customer, dwellingUnitName, dwellingUnitAddress, totalDwellingUnits, dwellingUnits, software, draft, softwareCertificate179D: softwareCertificate && softwareCertificate.id, buildingDefaults, buildings, createdBy, createDate })
			
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
				privateProject: project.privateProject != undefined ? project.privateProject : project.reportType === '45L' ? true : false,
				certifiedDate: new Date(),
				certifier: certifier.name,
				customer: customer.name,
			};

			if (project.reportType === '45L') {
				certifiedBuildingData.totalDwellingUnits = project.totalDwellingUnits;
			} else {
				certifiedBuildingData.buildings = project.buildings ?? [];
			}

			const options = { upsert: true, new: true };

			const certifiedBuildings = await CertifiedBuilding.findOneAndUpdate(
				{ _id: certifiedBuildingData._id },
				certifiedBuildingData,
				options
			);

			return certifiedBuildings;

		} catch (error) {
			throw new HttpBadRequestError('Certified Building not created: ' + error);
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

					const privateProject = data.CATEGORY_ID === 851052 || data.CATEGORY_ID === 851064 || data.CATEGORY_ID === 7343869 || data.CATEGORY_ID === 7343870 ? false : true;
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
						privateProject: privateProject,
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
	const addProjectPhoto = async ({ id }, { ...data }) => {
		const project = await Project.findById(id);
		const currentLength = project.photos.length;

		const photosWithPosition = [{...data, position: data.position = currentLength}]

		return Project.findOneAndUpdate(
			{ _id: id },
			{ '$push': { 'photos': { $each: photosWithPosition } } },
			{ returnDocument: 'after' }
		).lean();
	}

	const addProjectMultiplePhoto = async ({ id }, data) => {
		const project = await Project.findById(id);
		const currentLength = project.photos.length;

		const photosWithPosition = data.map((photo, index) => ({
			...photo,
			position: currentLength + index
		}));

		return Project.findOneAndUpdate(
			{ _id: id },
			{ '$push': { 'photos': { $each: photosWithPosition } } },
			{ returnDocument: 'after' }
		).lean();
	};
	const updateProjectPhoto = ({ id }, { photoId }, { description }) => Project.findOneAndUpdate({ _id: id, 'photos._id': photoId }, { '$set': { 'photos.$.description': description } }, { returnDocument: 'after' }).lean()
	const updateProjectPhotoChange = ({ id }, { photoId }, { assetId }) => Project.findOneAndUpdate({ _id: id, 'photos.asset': photoId }, { '$set': { 'photos.$.asset': assetId } }, { returnDocument: 'after' }).lean()
	const deleteProjectPhoto = ({ id }, { photoId }) => Project.findOneAndUpdate({ _id: id }, { '$pull': { 'photos': { '_id': photoId } } }, { returnDocument: 'after' }).lean()
	
	const reorderProjectPhotos = async ({ id }, photos) => {
		const bulkOps = photos.map((photo, index) => ({
			updateOne: {
				filter: { _id: id, 'photos._id': photo.id },
				update: { '$set': { 'photos.$.position': photo.position ?? index } }
			}
		}));

		await Project.bulkWrite(bulkOps);

		return Project.findOne({ _id: id }).lean();
	};

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

	const getCertifiedBuildings = async (query) => {
		const findQuery = {}
		const andQuery = []
		const searchQuery = searchSyntax(query.search, ['name', 'address', 'phone'])
		const filterQuery = filterSyntax(query.filter)

		if (searchQuery) {
			andQuery.push({
				$or: searchQuery,
			})
		}

		if (filterQuery) {
			andQuery.push(...filterQuery)
		}

		let sortQuery = {}
		if (query.sortBy) {
			const order = query.order === 'desc' ? -1 : 1
			sortQuery[query.sortBy] = order
		}

		try {
			return CertifiedBuilding.find(findQuery, '-__v').sort(sortQuery).lean()
		} catch (error) {
			throw new HttpBadRequestError(error.message)
		}
	}

	const getCertifiedBuildingsById = (id) => CertifiedBuilding.findOne({ _id: id }, '-__v').lean()

	const exportToExcel = async (certifiedBuilding) => {
		const openCB = "\u2B1C"; // Open checkbox ▢
		const markedCB = "\u2B1B"; // Filled checkbox ■

		const workbook = new ExcelJS.Workbook();
		const worksheet = workbook.addWorksheet("Form 7205");

		worksheet.columns = [
			{ key: "A", width: 12 },
			{ key: "B", width: 12 },
			{ key: "C", width: 12 },
			{ key: "D", width: 12 },
			{ key: "E", width: 12 },
			{ key: "F", width: 12 },
			{ key: "G", width: 12 },
			{ key: "H", width: 12 },
			{ key: "I", width: 12 },
			{ key: "J", width: 12 },
			{ key: "K", width: 12 },
			{ key: "L", width: 12 },
			{ key: "M", width: 15 },
			{ key: "N", width: 12 },
			{ key: "O", width: 8.14 },
			{ key: "P", width: 5 },
			{ key: "Q", width: 12 },
			{ key: "R", width: 12 },
			{ key: "S", width: 12 },
			{ key: "T", width: 12 },
			{ key: "U", width: 12 },
			{ key: "V", width: 12 },
			{ key: "W", width: 12 },
			{ key: "X", width: 12 },
		];

		// Row 1: Title
		worksheet.mergeCells("A1:X1");
		worksheet.getRow(1).height = 57;
		const titleCell = worksheet.getCell("A1");
		titleCell.value = "FORM 7205 (REV DEC 2023) REPORT";
		titleCell.alignment = { vertical: "middle", horizontal: "center" };
		titleCell.font = { bold: true, size: 20, color: { argb: "FFFFFFFF" } };
		titleCell.fill = {
		type: "pattern",
		pattern: "solid",
		fgColor: { argb: "FF424A22" },
		};

		// Row 2
		worksheet.mergeCells("A2:B2");
		worksheet.getRow(2).height = 29.25;
		const nameCell = worksheet.getCell("A2");
		nameCell.value = "Name(s) shown on return";
		nameCell.alignment = { vertical: "middle", horizontal: "left" };
		nameCell.font = { bold: true, size: 11 };
		nameCell.fill = {
		type: "pattern",
		pattern: "solid",
		fgColor: { argb: "FFD8E4BC" },
		};

		worksheet.mergeCells("C2:S2");
		worksheet.getCell("C2").style = {
		fill: {
			type: "pattern",
			pattern: "solid",
			fgColor: { argb: "FFFDF6E6" },
		},
		alignment: { vertical: "middle", horizontal: "left" },
		};
		// Leave cells C2:S2 blank

		worksheet.mergeCells("T2:U2");
		const idNumberLabelCell = worksheet.getCell("T2");
		idNumberLabelCell.value = "Identifying Number";
		idNumberLabelCell.alignment = { vertical: "middle", horizontal: "center" };
		idNumberLabelCell.font = { bold: true, size: 11 };
		idNumberLabelCell.fill = {
		type: "pattern",
		pattern: "solid",
		fgColor: { argb: "FFD8E4BC" },
		};

		worksheet.mergeCells("V2:X2");
		const idNumberCell = worksheet.getCell("V2");
		idNumberCell.value = "XX-XXXXXXX";
		idNumberCell.alignment = { vertical: "middle", horizontal: "center" };
		idNumberCell.font = { bold: true, size: 11 };

		// Row 3
		worksheet.mergeCells("A3:H3");
		worksheet.getRow(3).height = 24.75;
		const deductionCell = worksheet.getCell("A3");
		deductionCell.value =
		"Claiming deduction as (check one): Designer of energy efficient property (EEP)";
		deductionCell.alignment = { vertical: "middle", horizontal: "left" };
		deductionCell.font = { size: 11 };

		const designerCheckCell = worksheet.getCell("I3");
		designerCheckCell.alignment = { vertical: "middle", horizontal: "center" };
		// Set up certifiedBuilding validation for checkbox
		designerCheckCell.dataValidation = {
		type: "list",
		allowBlank: false,
		formulae: ['"' + openCB + "," + markedCB + '"'],
		showDropDown: true,
		};
		designerCheckCell.value = certifiedBuilding.privateProject == false ? openCB : markedCB;

		worksheet.mergeCells("J3:L3");
		const ownerLabelCell = worksheet.getCell("J3");
		ownerLabelCell.value = "Building owner";
		ownerLabelCell.alignment = { vertical: "middle", horizontal: "left" };
		ownerLabelCell.font = { bold: true, size: 11 };

		const ownerCheckCell = worksheet.getCell("M3");
		ownerCheckCell.alignment = { vertical: "middle", horizontal: "center" };
		ownerCheckCell.dataValidation = {
		type: "list",
		allowBlank: false,
		formulae: ['"' + openCB + "," + markedCB + '"'],
		showDropDown: true,
		};
		ownerCheckCell.value = certifiedBuilding.privateProject == false  ? markedCB : openCB;

		worksheet.mergeCells("N3:X3");
		const duplicateDesignerCell = worksheet.getCell("N3");
		duplicateDesignerCell.value = "Designer of energy efficient property (EEP)";
		duplicateDesignerCell.alignment = {
		vertical: "middle",
		horizontal: "left",
		};
		duplicateDesignerCell.font = { bold: true, size: 11 };

		// Part I Header
		worksheet.mergeCells("A4:B4");
		worksheet.getRow(4).height = 24.75;
		const partICell = worksheet.getCell("A4");
		partICell.value = "Part I";
		partICell.alignment = { vertical: "middle", horizontal: "left" };
		partICell.font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } };
		partICell.fill = {
		type: "pattern",
		pattern: "solid",
		fgColor: { argb: "FF595959" },
		};

		worksheet.mergeCells("C4:X4");
		const partITitleCell = worksheet.getCell("C4");
		partITitleCell.value = "Building and EEP Information (see instructions)";
		partITitleCell.alignment = { vertical: "middle", horizontal: "left" };
		partITitleCell.font = { bold: true, size: 12 };
		partITitleCell.fill = {
		type: "pattern",
		pattern: "solid",
		fgColor: { argb: "FFD8E4BC" },
		};

		// Table Headers (Row 5)
		worksheet.getCell("A5").value = "1";
		worksheet.getCell("A5").font = { bold: true };
		worksheet.getCell("A5").alignment = { vertical: "top", horizontal: "left" };
		worksheet.getRow(5).height = 90.75;
		worksheet.getRow(5).alignment = {
		vertical: "top",
		horizontal: "left",
		wrapText: true,
		};

		worksheet.mergeCells("B5:F5");
		const headerAFCell = worksheet.getCell("B5");
		headerAFCell.value = "(a) Address of building";
		headerAFCell.alignment = { vertical: "middle", horizontal: "center" };
		headerAFCell.font = { bold: true };

		worksheet.mergeCells("G5:H5");
		const headerGHCell = worksheet.getCell("G5");
		headerGHCell.value = "(b) Date EEP placed in service";
		headerGHCell.alignment = { vertical: "middle", horizontal: "center" };
		headerGHCell.font = { bold: true };

		worksheet.mergeCells("I5:K5");
		const headerIKCell = worksheet.getCell("I5");
		headerIKCell.value =
		"(c) Energy efficient commercial building property (EECBP) system computed energy savings percentage, or energy efficient building retrofit property (EEBRP) energy use intensity reduction";
		headerIKCell.alignment = { vertical: "middle", horizontal: "center" };
		headerIKCell.font = { bold: true };

		worksheet.mergeCells("L5:M5");
		const headerLMCell = worksheet.getCell("L5");
		headerLMCell.value =
		"(d) Check if Increased Deduction criteria met (see instructions)";
		headerLMCell.alignment = { vertical: "middle", horizontal: "center" };
		headerLMCell.font = { bold: true };

		worksheet.mergeCells("N5:P5");
		const headerNPCell = worksheet.getCell("N5");
		headerNPCell.value =
		"(e) Check if EEBRP installed under a Qualified Retrofit Plan";
		headerNPCell.alignment = { vertical: "middle", horizontal: "center" };
		headerNPCell.font = { bold: true };

		worksheet.mergeCells("Q5:R5");
		const headerQRCell = worksheet.getCell("Q5");
		headerQRCell.value = "(f) Potential amount per square foot";
		headerQRCell.alignment = { vertical: "middle", horizontal: "center" };
		headerQRCell.font = { bold: true };

		worksheet.mergeCells("S5:U5");
		const headerSUCell = worksheet.getCell("S5");
		headerSUCell.value = "(g) Building square footage";
		headerSUCell.alignment = { vertical: "middle", horizontal: "center" };
		headerSUCell.font = { bold: true };

		worksheet.mergeCells("V5:X5");
		const headerVXCell = worksheet.getCell("V5");
		headerVXCell.value =
		"(h) Potential section 179D deduction amount (multiply column 1(f) by column 1(g))";
		headerVXCell.alignment = { vertical: "middle", horizontal: "center" };
		headerVXCell.font = { bold: true };

		// Building Data (Rows 6–10)
		const startRow = 6;
		certifiedBuilding.buildings.forEach((building, index) => {
		const rowNumber = startRow + index;
		worksheet.getRow(rowNumber).height = 24.75;

		// Building Number
		const buildingNumberCell = worksheet.getCell(`A${rowNumber}`);
		buildingNumberCell.value = getBuildingCode(index);
		buildingNumberCell.alignment = {
			vertical: "middle",
			horizontal: "right",
		};
		buildingNumberCell.font = { bold: true };

		// Address (Merged B-F)
		worksheet.mergeCells(`B${rowNumber}:F${rowNumber}`);
		const addressCell = worksheet.getCell(`B${rowNumber}`);
		addressCell.value = building.address;
		addressCell.alignment = { vertical: "middle", horizontal: "center" };

		// Date EEP placed in service (Merged G-H)
		worksheet.mergeCells(`G${rowNumber}:H${rowNumber}`);
		const datePlacedCell = worksheet.getCell(`G${rowNumber}`);
		datePlacedCell.value = certifiedBuilding.taxYear; // Assuming taxYear is used here
		datePlacedCell.alignment = { vertical: "middle", horizontal: "center" };

		// Energy savings percentage (Merged I-K)
		worksheet.mergeCells(`I${rowNumber}:K${rowNumber}`);
		const percentSavingCell = worksheet.getCell(`I${rowNumber}`);
		percentSavingCell.value = building.percentSaving / 100;
		percentSavingCell.alignment = {
			vertical: "middle",
			horizontal: "center",
		};
		percentSavingCell.numFmt = "0.00%";

		// Check if Increased Deduction criteria met (Merged L-M)
		worksheet.mergeCells(`L${rowNumber}:M${rowNumber}`);
		const increasedDeductionCell = worksheet.getCell(`L${rowNumber}`);
		increasedDeductionCell.alignment = {
			vertical: "middle",
			horizontal: "center",
		};
		increasedDeductionCell.value = openCB;
		increasedDeductionCell.dataValidation = {
			type: "list",
			allowBlank: false,
			formulae: ['"' + openCB + "," + markedCB + '"'],
			showDropDown: true,
		};
		increasedDeductionCell.font = { size: 11 };

		// Check if EEBRP installed (Merged N-P)
		worksheet.mergeCells(`N${rowNumber}:P${rowNumber}`);
		const eeBRPCell = worksheet.getCell(`N${rowNumber}`);
		eeBRPCell.alignment = { vertical: "middle", horizontal: "center" };
		eeBRPCell.value = openCB;
		eeBRPCell.dataValidation = {
			type: "list",
			allowBlank: false,
			formulae: ['"' + openCB + "," + markedCB + '"'],
			showDropDown: true,
		};
		eeBRPCell.font = { size: 11 };

		// Potential amount per square foot (Merged Q-R)
		worksheet.mergeCells(`Q${rowNumber}:R${rowNumber}`);
		const potentialAmountCell = worksheet.getCell(`Q${rowNumber}`);
		potentialAmountCell.alignment = {
			vertical: "middle",
			horizontal: "center",
		};
		// Formula: IF(1(d)=markedCB, key "pwRate", key "rate")
		const increasedDeductionRef = `L${rowNumber}`;
		potentialAmountCell.value = {
			formula: `IF(${increasedDeductionRef}="${markedCB}", ${building.pwRate}, ${building.rate})`,
		};
		potentialAmountCell.numFmt =
			'_($* #,##0.00_);_($* (#,##0.00);_($* "-"??_);_(@_)';

		// Building square footage (Merged S-U)
		worksheet.mergeCells(`S${rowNumber}:U${rowNumber}`);
		const areaCell = worksheet.getCell(`S${rowNumber}`);
		areaCell.value = building.area;
		areaCell.alignment = { vertical: "middle", horizontal: "center" };
		areaCell.numFmt = "#,##0";

		// Potential section 179D deduction amount (Merged V-X)
		worksheet.mergeCells(`V${rowNumber}:X${rowNumber}`);
		const deductionAmountCell = worksheet.getCell(`V${rowNumber}`);
		deductionAmountCell.alignment = {
			vertical: "middle",
			horizontal: "center",
		};
		// Formula: 1(g) * 1(f)
		const potentialAmountRef = `Q${rowNumber}`;
		const areaRef = `S${rowNumber}`;
		deductionAmountCell.value = {
			formula: `${potentialAmountRef}*${areaRef}`,
		};
		deductionAmountCell.numFmt =
			'_($* #,##0.00_);_($* (#,##0.00);_($* "-"??_);_(@_)';
		});

		// Part II Header (Row 11)
		const partIIStartRow = startRow + certifiedBuilding.buildings.length;
		const partIIRow = partIIStartRow + 1;

		worksheet.mergeCells(`A${partIIRow}:B${partIIRow}`);
		worksheet.getRow(partIIRow).height = 24.75;
		const partIICell = worksheet.getCell(`A${partIIRow}`);
		partIICell.value = "Part II";
		partIICell.alignment = { vertical: "middle", horizontal: "left" };
		partIICell.font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } };
		partIICell.fill = {
		type: "pattern",
		pattern: "solid",
		fgColor: { argb: "FF595959" },
		};

		worksheet.mergeCells(`C${partIIRow}:X${partIIRow}`);
		const partIITitleCell = worksheet.getCell(`C${partIIRow}`);
		partIITitleCell.value =
		"Computation of Energy Efficient Commercial Buildings Deduction Amount (see instructions)";
		partIITitleCell.alignment = { vertical: "middle", horizontal: "left" };
		partIITitleCell.font = { bold: true, size: 12 };
		partIITitleCell.fill = {
		type: "pattern",
		pattern: "solid",
		fgColor: { argb: "FFD8E4BC" },
		};

		// Table Headers (Row 12)
		const header2Row = partIIRow + 1;

		worksheet.getCell(`A${header2Row}`).value = "2";
		worksheet.getCell(`A${header2Row}`).font = { bold: true };
		worksheet.getCell(`A${header2Row}`).alignment = {
		vertical: "top",
		horizontal: "left",
		};
		worksheet.getRow(header2Row).height = 81.75;

		worksheet.mergeCells(`B${header2Row}:E${header2Row}`);
		const header2aCell = worksheet.getCell(`B${header2Row}`);
		header2aCell.value =
		"(a) Total per square foot amount claimed in prior years (see instructions)";
		header2aCell.alignment = { vertical: "middle", horizontal: "center" };
		header2aCell.font = { bold: true };

		worksheet.mergeCells(`F${header2Row}:J${header2Row}`);
		const header2bCell = worksheet.getCell(`F${header2Row}`);
		header2bCell.value =
		"(b) Subtract column 2(a) from the maximum amount allowed (see instructions)";
		header2bCell.alignment = { vertical: "middle", horizontal: "center" };
		header2bCell.font = { bold: true };

		worksheet.mergeCells(`K${header2Row}:L${header2Row}`);
		const header2cCell = worksheet.getCell(`K${header2Row}`);
		header2cCell.value =
		"(c) Check if the amount in column 2(b) is greater than or equal to column 1(f)";
		header2cCell.alignment = { vertical: "middle", horizontal: "center" };
		header2cCell.font = { bold: true };

		worksheet.mergeCells(`M${header2Row}:Q${header2Row}`);
		const header2dCell = worksheet.getCell(`M${header2Row}`);
		header2dCell.value =
		"(d) If column 2(c) is checked, enter the amount from column 1(h). Skip columns 2(e) and 2(f), and go to column 2(g)";
		header2dCell.alignment = { vertical: "middle", horizontal: "center" };
		header2dCell.font = { bold: true };

		worksheet.mergeCells(`R${header2Row}:U${header2Row}`);
		const header2eCell = worksheet.getCell(`R${header2Row}`);
		header2eCell.value =
		"(e) Check if the amount from column 2(b) is less than the amount in column 1(f)";
		header2eCell.alignment = { vertical: "middle", horizontal: "center" };
		header2eCell.font = { bold: true };

		worksheet.mergeCells(`V${header2Row}:X${header2Row}`);
		const header2fCell = worksheet.getCell(`V${header2Row}`);
		header2fCell.value =
		"(f) If column 2(e) is checked, multiply column 2(b) by column 1(g)";
		header2fCell.alignment = { vertical: "middle", horizontal: "center" };
		header2fCell.font = { bold: true };

		worksheet.getRow(header2Row).alignment = {
		vertical: "top",
		horizontal: "left",
		wrapText: true,
		};

		// Rows 13 and on (Building Data for Part II)
		const partIIDataStartRow = header2Row + 1;
		certifiedBuilding.buildings.forEach((building, index) => {
		const rowNumber = partIIDataStartRow + index;
		const sumRowStartNumber = rowNumber;
		worksheet.getRow(rowNumber).height = 24.75;
		// Building Number
		const buildingNumberCell = worksheet.getCell(`A${rowNumber}`);
		buildingNumberCell.value = getBuildingCode(index);
		buildingNumberCell.alignment = {
			vertical: "middle",
			horizontal: "right",
		};
		buildingNumberCell.font = { bold: true };

		// Column 2(a): Empty cell for user input
		worksheet.mergeCells(`B${rowNumber}:E${rowNumber}`);
		worksheet.getCell(`B${rowNumber}`).style = {
			numFmt: '_($* #,##0.00_);_($* (#,##0.00);_($* "-"??_);_(@_)',
			border: { bottom: { style: "thin" } },
		};

		// Column 2(b): Formula: Max allowed amount - value in 2(a)
		worksheet.mergeCells(`F${rowNumber}:J${rowNumber}`);
		const col2bCell = worksheet.getCell(`F${rowNumber}`);
		col2bCell.alignment = { vertical: "middle", horizontal: "center" };
		col2bCell.numFmt = '_($* #,##0.00_);_($* (#,##0.00);_($* "-"??_);_(@_)';

		// Assuming maximum amount is from Table I column 1(f)
		const potentialAmountPerSqFtRef = `Q${startRow + index}`;

		const col2aRef = `B${rowNumber}`;
		col2bCell.value = {
			formula: `${potentialAmountPerSqFtRef}-${col2aRef}`,
		};

		// Column 2(c): Check if 2(b) >= 1(f)
		worksheet.mergeCells(`K${rowNumber}:L${rowNumber}`);
		const col2cCell = worksheet.getCell(`K${rowNumber}`);
		col2cCell.alignment = { vertical: "middle", horizontal: "center" };
		// Display "■" or "▢" based on formula
		col2cCell.value = {
			formula: `IF(${col2bCell.address}>=${potentialAmountPerSqFtRef},"${markedCB}","${openCB}")`,
		};

		// Column 2(d): If 2(c) is markedCB, get value from 1(h)
		worksheet.mergeCells(`M${rowNumber}:Q${rowNumber}`);
		const col2dCell = worksheet.getCell(`M${rowNumber}`);
		col2dCell.alignment = { vertical: "middle", horizontal: "center" };

		const deductionAmountRef = `V${startRow + index}`;
		col2dCell.value = {
			formula: `IF(${col2cCell.address}="${markedCB}",${deductionAmountRef},"")`,
		};
		col2dCell.numFmt = '_($* #,##0.00_);_($* (#,##0.00);_($* "-"??_);_(@_)';

		// Column 2(e): Check if 2(b) < 1(f)
		worksheet.mergeCells(`R${rowNumber}:U${rowNumber}`);
		const col2eCell = worksheet.getCell(`R${rowNumber}`);
		col2eCell.alignment = { vertical: "middle", horizontal: "center" };
		// Display "■" or "▢" based on formula
		col2eCell.value = {
			formula: `IF(${col2bCell.address}<${potentialAmountPerSqFtRef},"${markedCB}","${openCB}")`,
		};

		// Column 2(f): If 2(e) is markedCB, multiply 2(b) by 1(g)
		worksheet.mergeCells(`V${rowNumber}:X${rowNumber}`);
		const col2fCell = worksheet.getCell(`V${rowNumber}`);
		col2fCell.alignment = { vertical: "middle", horizontal: "center" };

		const areaRef = `S${startRow + index}`;
		col2fCell.value = {
			formula: `IF(${col2eCell.address}="${markedCB}",${col2bCell.address}*${areaRef},"")`,
		};
		col2fCell.numFmt = '_($* #,##0.00_);_($* (#,##0.00);_($* "-"??_);_(@_)';
		});

		// Table 2B
		const table2BHeaderRow = partIIDataStartRow + certifiedBuilding.buildings.length + 1;

		// Table 2B Headers
		worksheet.getCell(`A${table2BHeaderRow}`).value = "";
		worksheet.getRow(table2BHeaderRow).height = 68.25;

		worksheet.mergeCells(`B${table2BHeaderRow}:E${table2BHeaderRow}`);
		const header2gCell = worksheet.getCell(`B${table2BHeaderRow}`);
		header2gCell.value =
		"(g) Cost of EEP placed in service during the tax year (see instructions if building ownership percentage is less than 100%)";
		header2gCell.alignment = { vertical: "middle", horizontal: "center" };
		header2gCell.font = { bold: true };

		worksheet.mergeCells(`F${table2BHeaderRow}:J${table2BHeaderRow}`);
		const header2hCell = worksheet.getCell(`F${table2BHeaderRow}`);
		header2hCell.value =
		"(h) Enter the greater of column 2(d) or column 2(f) (see instructions if building ownership percentage is less than 100%)";
		header2hCell.alignment = { vertical: "middle", horizontal: "center" };
		header2hCell.font = { bold: true };

		worksheet.mergeCells(`K${table2BHeaderRow}:N${table2BHeaderRow}`);
		const header2iCell = worksheet.getCell(`K${table2BHeaderRow}`);
		header2iCell.value = "(i) Enter the lesser of column 2(g) or column 2(h)";
		header2iCell.alignment = { vertical: "middle", horizontal: "center" };
		header2iCell.font = { bold: true };

		worksheet.mergeCells(`O${table2BHeaderRow}:T${table2BHeaderRow}`);
		const header2jCell = worksheet.getCell(`O${table2BHeaderRow}`);
		header2jCell.value =
		"(j) Designers enter the amount of the section 179D deduction allocated to you as the designer (see instructions)";
		header2jCell.alignment = { vertical: "middle", horizontal: "center" };
		header2jCell.font = { bold: true };

		worksheet.mergeCells(`U${table2BHeaderRow}:X${table2BHeaderRow}`);
		const header2kCell = worksheet.getCell(`U${table2BHeaderRow}`);
		header2kCell.value =
		"(k) Section 179D deduction for the building (designers, enter the lesser of column 2(i) or column 2(j); building owners, enter the amount from column 2(i))";
		header2kCell.alignment = { vertical: "middle", horizontal: "center" };
		header2kCell.font = { bold: true };
		worksheet.getRow(table2BHeaderRow).alignment = {
		vertical: "top",
		horizontal: "left",
		wrapText: true,
		};

		// Rows for Table 2B
		const table2BDataStartRow = table2BHeaderRow + 1;
		certifiedBuilding.buildings.forEach((building, index) => {
		const rowNumber = table2BDataStartRow + index;
		worksheet.getRow(rowNumber).height = 24.75;

		// Building Number
		const buildingNumberCell = worksheet.getCell(`A${rowNumber}`);
		buildingNumberCell.value = getBuildingCode(index);
		buildingNumberCell.alignment = {
			vertical: "middle",
			horizontal: "right",
		};
		buildingNumberCell.font = { bold: true };

		// Column 2(g): Empty cell for user input
		worksheet.mergeCells(`B${rowNumber}:E${rowNumber}`);
		worksheet.getCell(`B${rowNumber}`).style = {
			numFmt: '_($* #,##0.00_);_($* (#,##0.00);_($* "-"??_);_(@_)',
			border: { bottom: { style: "thin" } },
		};

		// Column 2(h): Formula: MAX(2(d), 2(f))
		worksheet.mergeCells(`F${rowNumber}:J${rowNumber}`);
		const col2hCell = worksheet.getCell(`F${rowNumber}`);
		col2hCell.alignment = { vertical: "middle", horizontal: "center" };

		const col2dRef = `M${partIIDataStartRow + index}`;
		const col2fRef = `V${partIIDataStartRow + index}`;

		col2hCell.value = {
			formula: `MAX(${col2dRef},${col2fRef})`,
		};
		col2hCell.numFmt = '_($* #,##0.00_);_($* (#,##0.00);_($* "-"??_);_(@_)';

		// Column 2(i): MIN(2(g), 2(h))
		worksheet.mergeCells(`K${rowNumber}:N${rowNumber}`);
		const col2iCell = worksheet.getCell(`K${rowNumber}`);
		col2iCell.alignment = { vertical: "middle", horizontal: "center" };

		const col2gRef = `B${rowNumber}`; // User input
		col2iCell.value = {
			formula: `MIN(${col2gRef},${col2hCell.address})`,
		};
		col2iCell.numFmt = '_($* #,##0.00_);_($* (#,##0.00);_($* "-"??_);_(@_)';

		// Column 2(j): Empty cell for user input
		worksheet.mergeCells(`O${rowNumber}:T${rowNumber}`);
		worksheet.getCell(`O${rowNumber}`).style = {
			numFmt: '_($* #,##0.00_);_($* (#,##0.00);_($* "-"??_);_(@_)',
			border: { bottom: { style: "thin" } },
		};

		// Column 2(k): If certifiedBuilding.ownerType == "public", MIN(2(i), 2(j)); else 2(i)
		worksheet.mergeCells(`U${rowNumber}:X${rowNumber}`);
		const col2kCell = worksheet.getCell(`U${rowNumber}`);
		col2kCell.alignment = { vertical: "middle", horizontal: "center" };

		const col2jRef = `O${rowNumber}`; // User input

		if (certifiedBuilding.privateProject == false ) {
			col2kCell.value = {
			formula: `MIN(${col2iCell.address},${col2jRef})`,
			};
		} else {
			col2kCell.value = {
			formula: `${col2iCell.address}`,
			};
		}
		col2kCell.numFmt = '_($* #,##0.00_);_($* (#,##0.00);_($* "-"??_);_(@_)';
		});

		const endRow = table2BDataStartRow + certifiedBuilding.buildings.length;
		const formulaRange = `U${table2BDataStartRow}:X${endRow - 1}`;
		worksheet.mergeCells(`B${endRow}:S${endRow}`);
		worksheet.getCell(`B${endRow}`).value =
		"Total section 179D deduction. Add amounts from column 2(k). Enter here and on the appropriate line of your return. See instructions . . . . . . . . . . . . . . . . . . . .";
		worksheet.getCell(`B${endRow}`).font = { bold: true };
		worksheet.getCell(`B${endRow}`).alignment = {
		vertical: "middle",
		horizontal: "left",
		};
		worksheet.getCell(`T${endRow}`).value = "3";
		worksheet.getCell(`T${endRow}`).font = { bold: true };
		worksheet.mergeCells(`U${endRow}:X${endRow}`);
		worksheet.getRow(endRow).height = 24.75;
		worksheet.getCell(`A${endRow}`).value = "3";
		worksheet.getCell(`A${endRow}`).font = { bold: true };
		worksheet.getCell(`A${endRow}`).alignment = {
		vertical: "top",
		horizontal: "left",
		};
		const sumTotalCell = worksheet.getCell(`U${endRow}`);
		sumTotalCell.value = { formula: `SUM(${formulaRange})` };
		sumTotalCell.numFmt = '_($* #,##0.00_);_($* (#,##0.00);_($* "-"??_);_(@_)';

		// Part III Header
		const partIIIStartRow = table2BDataStartRow + certifiedBuilding.buildings.length + 1;

		worksheet.mergeCells(`A${partIIIStartRow}:B${partIIIStartRow}`);
		const partIIICell = worksheet.getCell(`A${partIIIStartRow}`);
		partIIICell.value = "Part III";
		partIIICell.alignment = { vertical: "middle", horizontal: "left" };
		partIIICell.font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } };
		partIIICell.fill = {
		type: "pattern",
		pattern: "solid",
		fgColor: { argb: "FF595959" },
		};

		worksheet.mergeCells(`C${partIIIStartRow}:X${partIIIStartRow}`);
		const partIIITitleCell = worksheet.getCell(`C${partIIIStartRow}`);
		partIIITitleCell.value =
		"Certification Information for Each Property Listed in Part I (see instructions)";
		partIIITitleCell.alignment = { vertical: "middle", horizontal: "left" };
		partIIITitleCell.font = { bold: true, size: 12 };
		partIIITitleCell.fill = {
		type: "pattern",
		pattern: "solid",
		fgColor: { argb: "FFD8E4BC" },
		};
		worksheet.getRow(partIIIStartRow).height = 24.75;
		// Table Headers (Row 25)
		const partIIIHeaderRow = partIIIStartRow + 1;

		worksheet.getCell(`A${partIIIHeaderRow}`).value = "4";
		worksheet.getCell(`A${partIIIHeaderRow}`).font = { bold: true };
		worksheet.getCell(`A${partIIIHeaderRow}`).alignment = {
		vertical: "top",
		horizontal: "left",
		};

		worksheet.mergeCells(`B${partIIIHeaderRow}:G${partIIIHeaderRow}`);
		const header3aCell = worksheet.getCell(`B${partIIIHeaderRow}`);
		header3aCell.value =
		"(a) Name of Qualified Individual completing certification";
		header3aCell.alignment = { vertical: "middle", horizontal: "center" };
		header3aCell.font = { bold: true };

		worksheet.mergeCells(`H${partIIIHeaderRow}:I${partIIIHeaderRow}`);
		const header3bCell = worksheet.getCell(`H${partIIIHeaderRow}`);
		header3bCell.value = "(b) Date of certification";
		header3bCell.alignment = { vertical: "middle", horizontal: "center" };
		header3bCell.font = { bold: true };

		worksheet.mergeCells(`J${partIIIHeaderRow}:O${partIIIHeaderRow}`);
		const header3cCell = worksheet.getCell(`J${partIIIHeaderRow}`);
		header3cCell.value = "(c) Employer of Qualified Individual";
		header3cCell.alignment = { vertical: "middle", horizontal: "center" };
		header3cCell.font = { bold: true };

		worksheet.mergeCells(`P${partIIIHeaderRow}:X${partIIIHeaderRow}`);
		const header3dCell = worksheet.getCell(`P${partIIIHeaderRow}`);
		header3dCell.value = "(d) Address of Qualified Individual";
		header3dCell.alignment = { vertical: "middle", horizontal: "center" };
		header3dCell.font = { bold: true };
		worksheet.getRow(partIIIHeaderRow).size = 68.25;
		worksheet.getRow(partIIIHeaderRow).alignment = {
		vertical: "top",
		horizontal: "left",
		wrapText: true,
		};
		worksheet.getRow(partIIIHeaderRow).height = 42;

		// Rows 26 onwards (Certifier Information)
		const partIIIDataRow = partIIIHeaderRow + 1;

		worksheet.getCell(`A${partIIIDataRow}`).value = "A"; // Assuming only one certifier
		worksheet.getCell(`A${partIIIDataRow}`).alignment = {
		vertical: "middle",
		horizontal: "right",
		};
		worksheet.getCell(`A${partIIIDataRow}`).font = { bold: true };
		worksheet.getRow(partIIIDataRow).height = 24.75;

		worksheet.mergeCells(`B${partIIIDataRow}:G${partIIIDataRow}`);
		const certifierNameCell = worksheet.getCell(`B${partIIIDataRow}`);
		certifierNameCell.value = certifiedBuilding.certifier;
		certifierNameCell.alignment = { vertical: "middle", horizontal: "left" };

		worksheet.mergeCells(`H${partIIIDataRow}:I${partIIIDataRow}`);
		const certifiedDateCell = worksheet.getCell(`H${partIIIDataRow}`);
		certifiedDateCell.value = new Date(certifiedBuilding.certifiedDate);
		certifiedDateCell.numFmt = "MM/DD/YYYY";
		certifiedDateCell.alignment = { vertical: "middle", horizontal: "center" };

		worksheet.mergeCells(`J${partIIIDataRow}:O${partIIIDataRow}`);
		const employerCell = worksheet.getCell(`J${partIIIDataRow}`);
		employerCell.value = "Walker Reid Strategies, Inc.";
		employerCell.alignment = { vertical: "middle", horizontal: "left" };

		worksheet.mergeCells(`P${partIIIDataRow}:X${partIIIDataRow}`);
		const addressCell = worksheet.getCell(`P${partIIIDataRow}`);
		addressCell.value =
		"1225 Broken Sound Parkway NW Ste C Boca Raton, FL 33487";
		addressCell.alignment = { vertical: "middle", horizontal: "left" };

		// Part IV Header
		const partIVStartRow = partIIIDataRow + 2;
		worksheet.getRow(partIVStartRow).height = 24.75;
		worksheet.mergeCells(`A${partIVStartRow}:B${partIVStartRow}`);
		const partIVCell = worksheet.getCell(`A${partIVStartRow}`);
		partIVCell.value = "Part IV";
		partIVCell.alignment = { vertical: "middle", horizontal: "left" };
		partIVCell.font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } };
		partIVCell.fill = {
		type: "pattern",
		pattern: "solid",
		fgColor: { argb: "FF595959" },
		};

		worksheet.mergeCells(`C${partIVStartRow}:X${partIVStartRow}`);
		const partIVTitleCell = worksheet.getCell(`C${partIVStartRow}`);
		partIVTitleCell.value =
		"Designer Allocation Information for Each Property Listed in Part I (to be completed by Designer only)";
		partIVTitleCell.alignment = { vertical: "middle", horizontal: "left" };
		partIVTitleCell.font = { bold: true, size: 12 };
		partIVTitleCell.fill = {
		type: "pattern",
		pattern: "solid",
		fgColor: { argb: "FFD8E4BC" },
		};

		// Table Headers (Row 28)
		const partIVHeaderRow = partIVStartRow + 1;
		worksheet.getRow(partIVHeaderRow).height = 42;

		worksheet.getCell(`A${partIVHeaderRow}`).value = "5";
		worksheet.getCell(`A${partIVHeaderRow}`).alignment = {
		vertical: "top",
		horizontal: "left",
		};
		worksheet.getCell(`A${partIVHeaderRow}`).font = { bold: true };

		worksheet.mergeCells(`B${partIVHeaderRow}:G${partIVHeaderRow}`);
		const header4aCell = worksheet.getCell(`B${partIVHeaderRow}`);
		header4aCell.value = "(a) Identified owner of building";
		header4aCell.alignment = { vertical: "middle", horizontal: "center" };
		header4aCell.font = { bold: true };

		worksheet.mergeCells(`H${partIVHeaderRow}:I${partIVHeaderRow}`);
		const header4bCell = worksheet.getCell(`H${partIVHeaderRow}`);
		header4bCell.value = "(b) Date of allocation";
		header4bCell.alignment = { vertical: "middle", horizontal: "center" };
		header4bCell.font = { bold: true };

		worksheet.mergeCells(`J${partIVHeaderRow}:O${partIVHeaderRow}`);
		const header4cCell = worksheet.getCell(`J${partIVHeaderRow}`);
		header4cCell.value =
		"(c) Name of building owner's authorized representative completing allocation";
		header4cCell.alignment = { vertical: "middle", horizontal: "center" };
		header4cCell.font = { bold: true };

		worksheet.mergeCells(`P${partIVHeaderRow}:X${partIVHeaderRow}`);
		const header4dCell = worksheet.getCell(`P${partIVHeaderRow}`);
		header4dCell.value =
		"(d) Address of building owner's authorized representative";
		header4dCell.alignment = { vertical: "middle", horizontal: "center" };
		header4dCell.font = { bold: true };
		worksheet.getRow(partIVHeaderRow).alignment = {
		vertical: "top",
		horizontal: "left",
		wrapText: true,
		};

		// Rows 29 onwards (Allocation Information)
		if (certifiedBuilding.privateProject == false ) {
		const rowNumber = partIVHeaderRow + 1;
		worksheet.getRow(rowNumber).height = 24.75;

		// Building Number
		const buildingNumberCell = worksheet.getCell(`A${rowNumber}`);
		buildingNumberCell.value = "A"; // Assuming a single building entry
		buildingNumberCell.alignment = {
			vertical: "middle",
			horizontal: "right",
		};
		buildingNumberCell.font = { bold: true };

		// Column 4(a): building.name (or certifiedBuilding.name in this context)
		worksheet.mergeCells(`B${rowNumber}:G${rowNumber}`);
		const col4aCell = worksheet.getCell(`B${rowNumber}`);
		col4aCell.value = certifiedBuilding.name;
		col4aCell.alignment = { vertical: "middle", horizontal: "left" };

		// Column 4(b): taxYear
		worksheet.mergeCells(`H${rowNumber}:I${rowNumber}`);
		const col4bCell = worksheet.getCell(`H${rowNumber}`);
		col4bCell.value = certifiedBuilding.taxYear;
		col4bCell.alignment = { vertical: "middle", horizontal: "center" };

		// Column 4(c): Empty
		worksheet.mergeCells(`J${rowNumber}:O${rowNumber}`);
		worksheet.getCell(`J${rowNumber}`).style = {
			alignment: { vertical: "middle" },
			border: { bottom: { style: "thin" } },
		};

		// Column 4(d): Empty
		worksheet.mergeCells(`P${rowNumber}:X${rowNumber}`);
		worksheet.getCell(`P${rowNumber}`).style = {
			alignment: { vertical: "middle" },
			border: { bottom: { style: "thin" } },
		};
		}

		worksheet.getRow(5).eachCell((cell) => {
		cell.alignment = { wrapText: true, vertical: "top" };
		});
		const borderStyle = {
		top: { style: "thin" },
		left: { style: "thin" },
		bottom: { style: "thin" },
		right: { style: "thin" },
		};
		// Loop through all rows and cells
		worksheet.eachRow((row) => {
		row.eachCell((cell) => {
			// Apply the border style to each cell
			cell.border = borderStyle;
		});
		});
		worksheet.views = [{ state: "normal", zoomScale: 80 }];

		const buffer = await workbook.xlsx.writeBuffer();
		return buffer;
	};

	const getBuildingCode = (index) => {
		const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
		const lettersCount = alphabet.length;

		let code = "";
		index++;

		while (index > 0) {
			let mod = (index - 1) % lettersCount;
			code = alphabet[mod] + code;
			index = Math.floor((index - 1) / lettersCount);
		}

		return code;
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
		createCertifiedBuilding,
		getCertifiedBuildings,
		getCertifiedBuildingsById,
		exportToExcel,
		reorderProjectPhotos
	}
}