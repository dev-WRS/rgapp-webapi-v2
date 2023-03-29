import { defineFeature, loadFeature } from 'jest-cucumber'
import * as mongoose from './helpers-mongoose.js'

global.defineFeature = defineFeature
global.loadFeature = loadFeature

global.helpers = { mongoose }

global.jestRuntime = true