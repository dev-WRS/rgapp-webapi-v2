import s3Storage from '../s3-storage.js'
import multer from '../multer-upload.js'

const init = async ({ config, services }) => {
	const assetStorage = await s3Storage({ config, services })
	const multerUpload = multer({ config, storageProvider: assetStorage.provider })
	
	return { multerUpload, assetStorage }
}

export default init