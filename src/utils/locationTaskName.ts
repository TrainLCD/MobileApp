import {
  LOCATION_TASK_NAME_CANARY,
  LOCATION_TASK_NAME_PROD,
} from '../constants'
import { isDevApp } from './isDevApp'

export const locationTaskName = isDevApp
  ? LOCATION_TASK_NAME_CANARY
  : LOCATION_TASK_NAME_PROD
