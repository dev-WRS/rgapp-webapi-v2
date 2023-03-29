jest.mock('multer', () => {
	const multer = () => ({
		single: (fieldname) => (req, res, next) => {
			req[fieldname] = {
				originalname: 'Sample.jpg',
				mimetype: 'image/jpeg',
				size: 1000,
				buffer: Buffer.from(''),
				bucket: 's3bucket', 
				key: 's3key'
			}
			next()
		}
	})
	multer.memoryStorage = () => jest.fn()
	return multer
})