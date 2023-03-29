/* eslint-disable no-empty-function */
import { middlewares, errors } from 'lts-server'

import { auditEventLogger } from '../event-logger.js'

const { withScope, withPassport } = middlewares
const { HttpBadRequestError } = errors

// const errorMsgDeleteConstraint = (source, target) => `${source} could not be deleted because is associated with a ${target}`

const asAssetResponse = ({ id, name, format, size, origin, createDate, createdBy }) => ({ id, name, format, size, origin, createDate, createdBy })

export default ({ passport, config, services, assetStorage, multerUpload, router }) => {
	const { Asset, Project, AuditLog } = services
	const withAuditLogger = auditEventLogger(AuditLog)
	const category = 'asset'

	router.get('/assets',
		withScope('webapp'),
		withPassport(passport, config)('apikey'),
		withPassport(passport, config)('jwt'),
		async (req, res, next) => {
			try {
				const query = req.query
				const assets = await Asset.getAssets(query)
				
				res.json({ result: assets.map(asAssetResponse) })
			}
			catch (error) {
				next(error)
			}
		}
	)

	router.get('/assets/:id',
		withScope('webapp'),
		withPassport(passport, config)('apikey'),
		withPassport(passport, config)('jwt'),
		async (req, res, next) => {
			try {
				const { id } = req.params
				const { download } = req.query
				const asset = await Asset.getAssetById(id)

				if (asset) {
					const { name, bucket, key, format } = asset
					const stream = await assetStorage.getObjectStream({ bucket, key })

					if (download) {
						res.attachment(name)
					}
					else {
						res.writeHead(200, { 'Content-Type': format })
					}

					stream	
						.on('error', next)
						.on('end', next)

					stream.pipe(res)
				}
				else {
					throw new HttpBadRequestError('invalid asset')
				}
			}
			catch (error) {
				next(error)
			}
		}
	)

	router.post('/assets',
		withScope('webapp'),
		withPassport(passport, config)('apikey'),
		withPassport(passport, config)('jwt'),
		withAuditLogger({ 
			category,
			asResult: ({ result }) => ({ id: result ? result.id : null })
		}),
		multerUpload.single('file'),
		async (req, res, next) => {
			try {
				const { id } = req.user
				const { originalname: name, mimetype: format, size, bucket, key } = req.file
				const asset = await Asset.createAsset({ name, format, size, bucket, key, createdBy: id })

				res.json({ result: asAssetResponse(asset) })

			} catch (error) {
				next(error)
			}
		}
	)

	router.delete('/assets',
		withScope('webapp'),
		withPassport(passport, config)('apikey'),
		withPassport(passport, config)('jwt'),
		withAuditLogger({ category }),
		async (req, res, next) => {
			try {
				const assets = req.body
				const results = []

				for (let index = 0; index < assets.length; index++) {
					const item = assets[index]
					try {
						const id = item.id
						const asset = await Asset.getAssetById(id)

						if (asset) {
							const { origin, bucket, key } = asset

							if (origin === 'customer') {
								throw new HttpBadRequestError('Asset(s) associated with a customer or certifier cannot be deleted')
							}
							else if (origin === 'certifier') {
								throw new HttpBadRequestError('Asset(s) associated with a customer or certifier cannot be deleted')
							} 
							else if (origin === 'project') {
								let projects = await Project.getProjectsByPhotoAsset(asset.id)

								if (projects.length === 0) {
									projects = await Project.getProjectsByPDFAsset(asset.id)
								}

								const openProjects = projects.find(project => project.status !== 'closed')

								if (openProjects) {
									throw new HttpBadRequestError('Asset(s) associated to an Open project cannot be deleted')
								}
							}

							await assetStorage.deleteObject({ bucket, key })
							const { deletedCount } = await Asset.deleteAsset({ id })
							if (deletedCount === 1) {
								results.push({ id })
							}
						}
					} catch (error) {
						results.push({ warningMessage: error.message })
					}
				}
				
				res.json({ result: results })
			}
			catch (error) {
				next(error)
			}
		}
	)

	return router
}