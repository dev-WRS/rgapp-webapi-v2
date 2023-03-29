jest.mock('aws-sdk', () => {
	const mockObservable = (res) => ({
		on: (name, callback) => {
			if (name !== 'error') {
				callback()
			}
			return mockObservable(res)
		}
	})

	const mockStream = {
		pipe: (res) => mockObservable(res)
	}

	class S3 {
		getObject () {
			return {
				createReadStream: () => mockStream
			}
		}
		deleteObject (options, callback) {
			callback()
		}
	}

	return {
		S3
	}
})