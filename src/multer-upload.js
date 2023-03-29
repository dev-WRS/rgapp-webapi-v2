import path from 'path'
import multer from 'multer'
import multerS3 from 'multer-s3'
// import { v4 } from 'uuid'
import { generateS3Key } from './helpers.js'

const exts = ['.pdf', '.png', '.jpg', '.jpeg', '.svg']

const fileFilter = (req, file, cb) => {
	const ext = path.extname(file.originalname)

	if (ext) {
		const lowerExt = ext.toLowerCase()
		cb(null, (exts.indexOf(lowerExt) !== -1))
	}
	else {
		cb(null, false)
	}
}

const metadata = (req, file, cb) => {
	cb(null, { fieldName: file.originalname })
}

const key = (req, file, cb) => {
	cb(null, generateS3Key(path.extname(file.originalname)))
}

const init = ({ config, storageProvider }) => {
	const upload = multer({
		fileFilter,
		storage: multerS3({
			s3: storageProvider, 
			key, metadata,
			// acl: 'public-read',
			contentEncoding: config.aws.contentEncoding,
			bucket: config.aws.bucketName
		})
	})
	return upload
}

export default init