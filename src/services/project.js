import { errors } from 'lts-server'
import { searchSyntax, filterSyntax, sortOrderSyntax } from '../db/mongoose/index.js'
import axios from 'axios'

const { HttpBadRequestError } = errors

export default ({ db, config }) => {
	const { mongoose } = db
	const { Project, Asset, Customer, Certifier } = mongoose

	const getProjects = (query) => {
		const findQuery = {}
		const andQuery = []
		const searchQuery = searchSyntax(query.search, ['name', 'address', 'phone'])
		const filterQuery = filterSyntax(query.filter)
		const sortQuery = sortOrderSyntax(query.sort)

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

		return Project.find(findQuery, '-__v').sort(sortQuery).lean()
	}
	const getProjectsByPhotoAsset = (asset) => Project.find({ photos: { $elemMatch: { asset: asset } } }, { 'photos.$': 1 }).select('status').lean()
	const getProjectsByPDFAsset = (asset) => Project.find({ $or: [{ certificate45L: asset }, { baselineDesign179D: asset }, { wholeBuildingDesign179D: asset }, { buildingSummary179D: asset }, { softwareCertificate179D: asset }] }).select('status').lean()
	const createProject = async ({ projectID, originalProjectID, name, taxYear, legalEntity, state, inspectionDate, reportType, certifier, customer, software, draft, dwellingUnitName, dwellingUnitAddress, totalDwellingUnits, dwellingUnits, buildingDefaults, buildings, createdBy }) => {
		try {
			let softwareCertificate

			if (reportType === '179D') {
				softwareCertificate = software === 'eQuest 3.65' ? await Asset.findOne({ name: 'eQuest Software Certificate.pdf' }) : await Asset.findOne({ name: 'HAP Software Certificate.pdf' })
			}

			const project = await Project.create({ projectID, originalProjectID, name, taxYear, legalEntity, state, inspectionDate, reportType, status: 'inProgress', certifier, customer, dwellingUnitName, dwellingUnitAddress, totalDwellingUnits, dwellingUnits, software, draft, softwareCertificate179D: softwareCertificate && softwareCertificate.id, buildingDefaults, buildings, createdBy })
			
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
	const copyProject = async (projectToCopy) => {
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
			
			const project = await Project.create(projectToCopy)
			
			return await Project.findOne({ _id: project.id }, '-__v').lean()
		} catch (error) {
			throw new HttpBadRequestError('Bad request')
		}
	}
	const getProjectById = (id) => Project.findOne({ _id: id }, '-__v').lean()

	const updateTasks = async (id, status) => {
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
		
					const updatedStage = await axios.request({
						baseURL: config.pms.apiUrl,
						url: `/Projects/${projectId}/PipelineStage`,
						method: 'put',
						data: JSON.stringify(stage),
						headers: {
							'Content-Type': 'application/json',
							'Authorization': `Basic ${config.pms.apiKey}`
						}
					})
		
					return { task: updatedTask.data, stage: updatedStage.data }
				}

			}

		} catch (error) {
			throw new HttpBadRequestError('Task not found')
		}
	}

	const getProjectByProjectID = async (id) => {
		let project = {}

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
	
						for (let i = 0; i < words.length; i++) {
							if (reportType === '179D') {
								certifier = await Certifier.findOne({ name: { $regex: new RegExp(words[i]), $options: 'i' }, licenses: { $elemMatch: { state: projectFields['PROJECT_FIELD_15'] } } })
							} else {
								certifier = await Certifier.findOne({ name: { $regex: new RegExp(words[i]), $options: 'i' } })
							}
							
							if (certifier) { break }
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
			
					project = {
						projectID: id,
						originalProjectID: id,
						name: projectName,
						taxYear: projectFields['PROJECT_FIELD_10'],
						legalEntity: projectFields['PROJECT_FIELD_11'],
						state: projectFields['PROJECT_FIELD_15'],
						inspectionDate: projectFields['PROJECT_FIELD_9'],
						certifier: certifier && certifier.id,
						customer: customer && customer.id,
						reportType,
						software: reportType === '45L' ? null : 'eQuest 3.65',
						draft: projectFields['PROJECT_FIELD_14'] === 'No' ? false : true
					}
	
					if (project.reportType === '179D') {
						project.buildingDefaults = {
							name: projectFields['Building_Name__c'],
							type: projectFields['Building_Type__c'],
							address: projectFields['PROJECT_FIELD_1'],
							area: projectFields['PROJECT_FIELD_2'],
							qualifyingCategories: projectFields['PROJECT_FIELD_3'] === 'Lighting (Permanent)' ? 'Lighting' : projectFields['PROJECT_FIELD_3'], 
							method: projectFields['PROJECT_FIELD_3'] === 'Lighting (Permanent)' ? 'Permanent' : null
							// buildingPossibleCategory: projectFields['PROJECT_FIELD_22']
						}
					}
			
					// console.log(project)	
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
		const { name, address, type, qualifyingCategories, area, rate, method, totalWatts, percentReduction, savingsRequirement, ashraeLpd, ashraeRequiredLpd } = { ...data }
		
		return Project.findOneAndUpdate({ _id: id, 'buildings._id': buildingId }, { 
			'$set': { 
				'buildings.$.name': name, 
				'buildings.$.address': address, 
				'buildings.$.type': type, 
				'buildings.$.qualifyingCategories': qualifyingCategories, 
				'buildings.$.area': area, 
				'buildings.$.rate': rate, 
				'buildings.$.method': method, 
				'buildings.$.totalWatts': totalWatts, 
				'buildings.$.percentReduction': percentReduction,
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
		console.log(noCopies)
		const buildingToCopy = setDefaultValues(building, noCopies)
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
			if (!['name', 'type', 'address'].includes(prop)) {
				obj[prop] = typeof obj[prop] === 'string' 
					? '' : Array.isArray(obj[prop]) 
						? [] 
						: typeof obj[prop] === 'number' 
							? 0 
							: typeof obj[prop] === 'object' && obj[prop] !== null 
								? {} 
								: obj[prop]
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

	return {
		getProjects,
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
		updateProjectPhoto,
		updateProjectPhotoChange,
		deleteProjectPhoto,
		copyProject,
		copyBuilding,
		updateTasks
	}
}